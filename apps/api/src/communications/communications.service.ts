import type {AnyPgColumn} from 'drizzle-orm/pg-core';
import {Inject,Injectable} from '@nestjs/common';
import {and,desc,eq,isNull,sql} from 'drizzle-orm';
import type {EventAnnouncement,MailDeliveryPage,NotificationPage,NotificationPreferences} from '@sep/contracts';
import {DatabaseService,type DbTransaction} from '../database/database.service.js';
import {communicationContacts,eventAnnouncements as announcements,eventNotifications as notices,mailAttempts,mailDeliveries as deliveries,notificationPreferences as preferences,people} from '../database/schema.js';
import {AuthorizationService} from '../identity/authorization.service.js';
import {ApiException,type RequestContext} from '../common/http.js';
import {APP_CONFIG,type AppConfig} from '../config.js';
import {notificationTemplates,notificationTitle} from './templates.js';
import type {AnnouncementDto,MailQuery,NotificationQuery,SaveNotificationPreferencesDto} from './communications.dto.js';
type ContextTable={organizationId:AnyPgColumn;eventId:AnyPgColumn};
@Injectable()
export class CommunicationsService {
 constructor(private readonly db:DatabaseService,private readonly auth:AuthorizationService,@Inject(APP_CONFIG)private readonly config:AppConfig){}
 private scope(c:RequestContext,t:ContextTable){return and(eq(t.organizationId,c.organizationId),eq(t.eventId,c.eventId!));}
 private async person(tx:DbTransaction,c:RequestContext){
  if(!c.personId||!c.eventId)throw new ApiException(401,'UNAUTHORIZED');
  const [p]=await tx.select({id:people.id}).from(people).where(and(eq(people.id,c.personId),eq(people.active,true)));
  if(!p)throw new ApiException(401,'UNAUTHORIZED');
 }
 list(c:RequestContext,q:NotificationQuery,locale:'es'|'en'){return this.db.scoped({...c,organizationAdmin:false},async tx=>{
  await this.person(tx,c);const own=and(this.scope(c,notices),eq(notices.personId,c.personId!));
  const filter=and(own,q.filter==='unread'?isNull(notices.readAt):undefined);
  const [counts]=await tx.select({total:sql<number>`count(*)::integer`,unread:sql<number>`count(*) FILTER(WHERE ${notices.readAt} IS NULL)::integer`}).from(notices).where(own);
  const rows=await tx.select().from(notices).where(filter).orderBy(desc(notices.createdAt),desc(notices.id)).limit(q.limit).offset(q.offset);
  return {data:rows.map(v=>({id:v.id,kind:v.kind,title:notificationTitle(v.kind,locale),message:locale==='es'?v.messageEs:v.messageEn,target:v.target,resourceId:v.resourceId,category:v.category,createdAt:v.createdAt.toISOString(),readAt:v.readAt?.toISOString()??null})),total:q.filter==='unread'?counts.unread:counts.total,unread:counts.unread,offset:q.offset,limit:q.limit} satisfies NotificationPage;
 });}
 mark(c:RequestContext,id:string,read:boolean){return this.db.scoped({...c,organizationAdmin:false},async tx=>{
  await this.person(tx,c);const [v]=await tx.update(notices).set({readAt:read?sql`coalesce(${notices.readAt},now())`:null}).where(and(this.scope(c,notices),eq(notices.personId,c.personId!),eq(notices.id,id))).returning({id:notices.id});if(!v)throw new ApiException(404,'NOT_FOUND');return {updated:true};
 });}
 private async preferenceIn(tx:DbTransaction,c:RequestContext):Promise<NotificationPreferences>{
  await this.person(tx,c);const [v]=await tx.select().from(preferences).where(and(this.scope(c,preferences),eq(preferences.personId,c.personId!)));
  const [contact]=await tx.select({email:communicationContacts.email}).from(communicationContacts).where(eq(communicationContacts.personId,c.personId!));
  return {emailEnabled:v?.emailEnabled??true,optionalEmail:v?.optionalEmail??false,locale:v?.locale??'es',revision:v?.revision??0,verifiedEmail:contact?.email??null,mailAvailable:!!this.config.mail};
 }
 getPreferences(c:RequestContext){return this.db.scoped({...c,organizationAdmin:false},tx=>this.preferenceIn(tx,c));}
 savePreferences(c:RequestContext,d:SaveNotificationPreferencesDto){return this.db.scoped({...c,organizationAdmin:false},async tx=>{
  await tx.execute(sql`SELECT pg_advisory_xact_lock(hashtextextended(${'notice-preferences:'+c.eventId+':'+c.personId},0))`);
  const old=await this.preferenceIn(tx,c);if(old.revision!==d.revision)throw new ApiException(409,'REVISION_CONFLICT');
  const value={emailEnabled:d.emailEnabled,optionalEmail:d.optionalEmail,locale:d.locale,revision:d.revision+1};
  await tx.insert(preferences).values({organizationId:c.organizationId,eventId:c.eventId!,personId:c.personId!,...value}).onConflictDoUpdate({target:[preferences.organizationId,preferences.eventId,preferences.personId],set:value});
  return this.preferenceIn(tx,c);
 });}
 mail(c:RequestContext,q:MailQuery,locale:'es'|'en'){return this.auth.run(c,'communications-manage',async tx=>{
  const counts:MailDeliveryPage['counts']={pending:0,processing:0,retry:0,sent:0,failed:0,suppressed:0,blocked:0};
  const groups=await tx.select({status:deliveries.status,count:sql<number>`count(*)::integer`}).from(deliveries).where(this.scope(c,deliveries)).groupBy(deliveries.status);for(const g of groups)counts[g.status]=g.count;
  const rows=await tx.select({d:deliveries,kind:notices.kind,personName:people.name}).from(deliveries).innerJoin(notices,eq(notices.id,deliveries.notificationId)).leftJoin(people,eq(people.id,notices.personId)).where(and(this.scope(c,deliveries),q.status?eq(deliveries.status,q.status):undefined)).orderBy(desc(deliveries.createdAt),desc(deliveries.id)).limit(q.limit).offset(q.offset);
  return {data:rows.map(({d,kind,personName})=>({personName:personName??(locale==='es'?'Cuenta':'Account'),id:d.id,notificationId:d.notificationId,title:notificationTitle(kind,locale),recipient:d.recipient,status:d.status,attempts:d.attempts,errorCode:d.errorCode,createdAt:d.createdAt.toISOString(),nextAttemptAt:d.nextAttemptAt?.toISOString()??null,deliveredAt:d.deliveredAt?.toISOString()??null})),total:q.status?counts[q.status]:Object.values(counts).reduce((a,b)=>a+b,0),offset:q.offset,limit:q.limit,mailAvailable:!!this.config.mail,counts} satisfies MailDeliveryPage;
 });}
 attempts(c:RequestContext,id:string){return this.auth.run(c,'communications-manage',async tx=>{const [v]=await tx.select({id:deliveries.id}).from(deliveries).where(and(this.scope(c,deliveries),eq(deliveries.id,id)));if(!v)throw new ApiException(404,'NOT_FOUND');return {data:(await tx.select().from(mailAttempts).where(and(this.scope(c,mailAttempts),eq(mailAttempts.deliveryId,id))).orderBy(desc(mailAttempts.createdAt),desc(mailAttempts.id))).map(v=>({id:v.id,status:v.status,errorCode:v.errorCode,createdAt:v.createdAt.toISOString()}))};});}
 retry(c:RequestContext,id:string){return this.auth.run(c,'communications-manage',async tx=>{const r=await tx.execute<{ok:boolean}&Record<string,unknown>>(sql`SELECT sep_mail_retry(${id}::uuid) AS ok`);if(!r.rows[0]?.ok)throw new ApiException(409,'CONFLICT');return {queued:true};});}
 templates(c:RequestContext){return this.auth.run(c,'communications-manage',async()=>({data:Object.entries(notificationTemplates).map(([kind,[titleEs,titleEn]])=>({kind,titleEs,titleEn}))}));}
 announcementList(c:RequestContext){return this.auth.run(c,'communications-manage',async tx=>{const rows=await tx.select().from(announcements).where(this.scope(c,announcements)).orderBy(desc(announcements.createdAt)).limit(100);return {data:await Promise.all(rows.map(async v=>{const [count]=await tx.select({n:sql<number>`count(*)::integer`}).from(notices).where(and(this.scope(c,notices),eq(notices.sourceKey,'announcement:'+v.id)));return {...v,createdAt:v.createdAt.toISOString(),recipientCount:count.n} satisfies EventAnnouncement;}))};});}
 announce(c:RequestContext,d:AnnouncementDto){return this.auth.run(c,'communications-manage',async tx=>{
  if(d.messageEs.trim().length<10||d.messageEn.trim().length<10)throw new ApiException(400,'VALIDATION_FAILED');
  const id=d.id;
  await tx.execute(sql`SELECT pg_advisory_xact_lock(hashtextextended(${'announcement:'+id},0))`);
  const [existing]=await tx.select().from(announcements).where(and(this.scope(c,announcements),eq(announcements.id,id)));
  if(existing){if(existing.messageEs!==d.messageEs.trim()||existing.messageEn!==d.messageEn.trim()||existing.audience!==d.audience||existing.category!==d.category)throw new ApiException(409,'CONFLICT');return {id};}
  await tx.insert(announcements).values({id,organizationId:c.organizationId,eventId:c.eventId!,actorId:c.personId!,messageEs:d.messageEs.trim(),messageEn:d.messageEn.trim(),category:d.category,audience:d.audience});return {id};
 });}
}
