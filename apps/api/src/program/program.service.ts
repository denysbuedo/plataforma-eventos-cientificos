import {programClock} from './program-time.js';
import {Injectable} from '@nestjs/common';
import {and,eq,desc,inArray,sql,ilike} from 'drizzle-orm';
import type {ProgramDraft,ProgramSession,ProgramSessionInput,ProgramSnapshot,PublicProgram,ProgramCandidates,MyParticipation} from '@sep/contracts';
import {DatabaseService,type DbTransaction} from '../database/database.service.js';
import {events,eventConfigurations,programDrafts as drafts,programPublications as publications,authorWorks as works,workVersions,people,sitePublications} from '../database/schema.js';
import {AuthorizationService} from '../identity/authorization.service.js';
import {lookupResearcher} from '../identity/researchers.controller.js';
import {AuditService} from '../common/audit.service.js';
import {ApiException,type RequestContext} from '../common/http.js';
import type {SaveProgramDto,ProgramCandidatesQuery} from './program.dto.js';
const accepted=['accepted','final_requested','final_submitted'];
const overlaps=(a:{startsAt:string;endsAt:string},b:{startsAt:string;endsAt:string})=>a.startsAt<b.endsAt&&b.startsAt<a.endsAt;
const roomKey=(value:string)=>value.normalize('NFKC').trim().replace(/\s+/gu,' ').toLocaleLowerCase('es');
@Injectable()
export class ProgramService {
 constructor(private readonly db:DatabaseService,private readonly auth:AuthorizationService,private readonly audit:AuditService){}
 private scope(c:RequestContext,t:typeof drafts|typeof publications){return and(eq(t.organizationId,c.organizationId),eq(t.eventId,c.eventId!));}
 private async event(tx:DbTransaction,c:RequestContext,edit=false){
  if(!c.eventId)throw new ApiException(404,'NOT_FOUND');const query=tx.select().from(events).where(and(eq(events.organizationId,c.organizationId),eq(events.id,c.eventId)));const [event]=await(edit?query.for('update'):query);if(!event)throw new ApiException(404,'NOT_FOUND');
  const [config]=await tx.select().from(eventConfigurations).where(and(eq(eventConfigurations.organizationId,c.organizationId),eq(eventConfigurations.eventId,c.eventId)));
  if(edit&&(event.status==='archived'||config&&['completed','cancelled'].includes(config.lifecycle)))throw new ApiException(409,'CONFLICT');return {event,config};
 }
 private async draft(tx:DbTransaction,c:RequestContext):Promise<ProgramDraft>{const {event,config}=await this.event(tx,c);const [draft]=await tx.select().from(drafts).where(this.scope(c,drafts));const [publication]=await tx.select().from(publications).where(this.scope(c,publications));return {sessions:draft?.sessions??[],timezone:draft?.timezone??event.timezone,startDate:config?.startDate??null,endDate:config?.endDate??null,revision:draft?.revision??0,publishedRevision:publication?.revision??null,publishedAt:publication?.publishedAt.toISOString()??null};}
 get(c:RequestContext){return this.auth.run(c,'submissions-manage',tx=>this.draft(tx,c));}
 candidates(c:RequestContext,q:ProgramCandidatesQuery):Promise<ProgramCandidates>{return this.auth.run(c,'submissions-manage',async tx=>{
  await this.event(tx,c);const where=and(eq(works.organizationId,c.organizationId),eq(works.eventId,c.eventId!),eq(works.hidden,false),sql`${works.status} IN ('accepted','final_requested','final_submitted')`,q.q.trim()?ilike(works.title,'%'+q.q.trim().replace(/[\%_]/g,'\\$&')+'%'):undefined);
  const [count]=await tx.select({total:sql<number>`count(*)::integer`}).from(works).where(where);const rows=await tx.select().from(works).where(where).orderBy(works.title,works.id).limit(q.limit).offset(q.offset);
  const versions=rows.length?await tx.selectDistinctOn([workVersions.workId]).from(workVersions).where(inArray(workVersions.workId,rows.map(w=>w.id))).orderBy(workVersions.workId,desc(workVersions.number)):[];
  return {data:rows.flatMap(row=>{const v=versions.find(v=>v.workId===row.id);return v?[{workId:row.id,title:v.content.title,versionNumber:v.number,authors:v.content.authors.map(a=>({id:a.id,name:a.fullName}))}]:[];}),total:count.total,limit:q.limit,offset:q.offset};
 });}
 private async prepare(tx:DbTransaction,c:RequestContext,inputs:ProgramSessionInput[],publish=false):Promise<ProgramSession[]>{
  const {config,event}=await this.event(tx,c),validTime=programClock(event.timezone);if(inputs.reduce((n,s)=>n+s.slots.length,0)>500)throw new ApiException(400,'VALIDATION_FAILED');
  const workIds=inputs.flatMap(s=>s.slots.map(p=>p.workId)),slotIds=inputs.flatMap(s=>s.slots.map(p=>p.id));if(new Set(workIds).size!==workIds.length||new Set(slotIds).size!==slotIds.length)throw new ApiException(409,'PROGRAM_CONFLICT');
  const rows=workIds.length?await tx.select().from(works).where(and(eq(works.organizationId,c.organizationId),eq(works.eventId,c.eventId!),inArray(works.id,workIds))).orderBy(works.id).for('update'):[];
  const versions=workIds.length?await tx.selectDistinctOn([workVersions.workId]).from(workVersions).where(and(eq(workVersions.organizationId,c.organizationId),eq(workVersions.eventId,c.eventId!),inArray(workVersions.workId,workIds))).orderBy(workVersions.workId,desc(workVersions.number)):[];
  const identities=new Map<string,string>(),moderators=new Map<string,{personId:string;name:string}>(),sessions:ProgramSession[]=[];
  for(const input of inputs){
   if(!validTime(input.date,input.startsAt)||!validTime(input.date,input.endsAt)||input.startsAt>=input.endsAt||config?.startDate&&input.date<config.startDate||config?.endDate&&input.date>config.endDate)throw new ApiException(400,'PROGRAM_INVALID');
   if(publish&&(input.titleEn.trim().length<2||!input.slots.length))throw new ApiException(409,'PROGRAM_INCOMPLETE');
   for(const id of input.moderatorIds){if(!moderators.has(id)){const found=await lookupResearcher(tx,id);if(!found)throw new ApiException(400,'RESEARCHER_UNAVAILABLE');moderators.set(id,{personId:id,name:found.name});}}
   const slots=[] as ProgramSession['slots'];for(const slot of input.slots){
    if(!validTime(input.date,slot.startsAt)||!validTime(input.date,slot.endsAt)||slot.startsAt>=slot.endsAt||slot.startsAt<input.startsAt||slot.endsAt>input.endsAt)throw new ApiException(400,'PROGRAM_INVALID');
    const work=rows.find(w=>w.id===slot.workId),v=versions.find(v=>v.workId===slot.workId),author=v?.content.authors.find(a=>a.id===slot.presenterAuthorId);if(!work||work.hidden||!accepted.includes(work.status)||!v||!author)throw new ApiException(409,'PROGRAM_WORK_UNAVAILABLE');
    const personId=work.authors.find(a=>a.id===author.id)?.personId??author.personId??null;
    identities.set(slot.id,personId?'person:'+personId:author.email?'email:'+author.email.trim().toLowerCase():'author:'+slot.workId+':'+author.id);
    slots.push({...slot,title:v.content.title,authors:v.content.authors.map(a=>a.fullName),presenterOptions:v.content.authors.map(a=>({id:a.id,name:a.fullName})),presenterName:author.fullName,presenterPersonId:personId,versionId:v.id,versionNumber:v.number});
   }
   slots.sort((a,b)=>a.startsAt.localeCompare(b.startsAt)||a.id.localeCompare(b.id));for(let i=1;i<slots.length;i++)if(overlaps(slots[i-1],slots[i]))throw new ApiException(409,'PROGRAM_CONFLICT');
   sessions.push({...input,moderators:input.moderatorIds.map(id=>moderators.get(id)!),slots});
  }
  for(let i=0;i<sessions.length;i++)for(let j=i+1;j<sessions.length;j++){const a=sessions[i],b=sessions[j];if(a.date!==b.date||!overlaps(a,b))continue;
   if(roomKey(a.room)===roomKey(b.room)||a.moderatorIds.some(id=>b.moderatorIds.includes(id)))throw new ApiException(409,'PROGRAM_CONFLICT');
   for(const p of a.slots){if(b.moderatorIds.some(id=>identities.get(p.id)==='person:'+id)&&overlaps(p,b))throw new ApiException(409,'PROGRAM_CONFLICT');for(const q of b.slots)if(identities.get(p.id)===identities.get(q.id)&&overlaps(p,q))throw new ApiException(409,'PROGRAM_CONFLICT');}
   for(const q of b.slots)if(a.moderatorIds.some(id=>identities.get(q.id)==='person:'+id)&&overlaps(q,a))throw new ApiException(409,'PROGRAM_CONFLICT');
  }
  return sessions.sort((a,b)=>a.date.localeCompare(b.date)||a.startsAt.localeCompare(b.startsAt)||a.room.localeCompare(b.room)||a.id.localeCompare(b.id));
 }
 save(c:RequestContext,dto:SaveProgramDto){return this.auth.run(c,'submissions-manage',async tx=>{const {event}=await this.event(tx,c,true),before=await this.draft(tx,c);if(before.revision!==dto.revision)throw new ApiException(409,'REVISION_CONFLICT');const sessions=await this.prepare(tx,c,dto.sessions);await tx.insert(drafts).values({organizationId:c.organizationId,eventId:c.eventId!,sessions,timezone:event.timezone,revision:dto.revision+1}).onConflictDoUpdate({target:[drafts.organizationId,drafts.eventId],set:{sessions,timezone:event.timezone,revision:dto.revision+1}});await this.audit.record(tx,c,'program.saved',c.eventId!);return this.draft(tx,c);});}
 publish(c:RequestContext,revision:number){return this.auth.run(c,'submissions-manage',async tx=>{
  const {event}=await this.event(tx,c,true),draft=await this.draft(tx,c);if(!revision||revision!==draft.revision)throw new ApiException(409,'REVISION_CONFLICT');if(draft.timezone!==event.timezone)throw new ApiException(409,'PROGRAM_TIMEZONE_CHANGED');
  const [site]=await tx.select({revision:sitePublications.revision}).from(sitePublications).where(and(eq(sitePublications.organizationId,c.organizationId),eq(sitePublications.eventId,c.eventId!)));if(event.status!=='published'||!site)throw new ApiException(409,'CALL_SITE_REQUIRED');if(!draft.sessions.length)throw new ApiException(409,'PROGRAM_INCOMPLETE');
  const sessions=await this.prepare(tx,c,draft.sessions,true);for(const s of sessions)for(const p of s.slots)if(draft.sessions.find(x=>x.id===s.id)?.slots.find(x=>x.id===p.id)?.versionId!==p.versionId)throw new ApiException(409,'PROGRAM_WORK_UNAVAILABLE');
  const publishedAt=new Date(),snapshot:ProgramSnapshot={sessions,timezone:event.timezone,revision,publishedAt:publishedAt.toISOString()};await tx.insert(publications).values({organizationId:c.organizationId,eventId:c.eventId!,snapshot,revision,publishedAt}).onConflictDoUpdate({target:[publications.organizationId,publications.eventId],set:{snapshot,revision,publishedAt}});await this.audit.record(tx,c,'program.published',c.eventId!);return this.draft(tx,c);
 });}
 withdraw(c:RequestContext,revision:number){return this.auth.run(c,'submissions-manage',async tx=>{await this.event(tx,c);await tx.select({id:events.id}).from(events).where(and(eq(events.organizationId,c.organizationId),eq(events.id,c.eventId!))).for('update');const draft=await this.draft(tx,c);if(draft.publishedRevision===null||draft.publishedRevision!==revision)throw new ApiException(409,'REVISION_CONFLICT');await tx.delete(publications).where(this.scope(c,publications));await this.audit.record(tx,c,'program.withdrawn',c.eventId!);return this.draft(tx,c);});}
 private async published(tx:DbTransaction,c:RequestContext){const {event,config}=await this.event(tx,c);if(event.status!=='published'||config?.lifecycle==='cancelled')return null;const [row]=await tx.select().from(publications).where(this.scope(c,publications));return row?.snapshot??null;}
 public(c:RequestContext):Promise<PublicProgram>{return this.db.scoped(c,async tx=>{const value=await this.published(tx,c);if(!value)throw new ApiException(404,'NOT_FOUND');return {timezone:value.timezone,revision:value.revision,publishedAt:value.publishedAt,sessions:value.sessions.map(s=>({id:s.id,titleEs:s.titleEs,titleEn:s.titleEn,topicEs:s.topicEs,topicEn:s.topicEn,date:s.date,startsAt:s.startsAt,endsAt:s.endsAt,room:s.room,modality:s.modality,moderators:s.moderators.map(m=>m.name),slots:s.slots.map(p=>({id:p.id,workId:p.workId,presenterAuthorId:p.presenterAuthorId,startsAt:p.startsAt,endsAt:p.endsAt,title:p.title,authors:p.authors,presenterName:p.presenterName,versionId:p.versionId,versionNumber:p.versionNumber}))}))};});}
 mine(c:RequestContext):Promise<MyParticipation>{return this.db.scoped({...c,organizationAdmin:false},async tx=>{if(!c.personId)throw new ApiException(401,'UNAUTHORIZED');const [person]=await tx.select().from(people).where(and(eq(people.id,c.personId),eq(people.active,true)));if(!person)throw new ApiException(401,'UNAUTHORIZED');const value=await this.published(tx,c),items:MyParticipation['items']=[];for(const s of value?.sessions??[]){const base={sessionId:s.id,sessionTitleEs:s.titleEs,sessionTitleEn:s.titleEn,date:s.date,room:s.room,modality:s.modality};if(s.moderatorIds.includes(c.personId))items.push({...base,slotId:null,title:'',startsAt:s.startsAt,endsAt:s.endsAt,role:'moderator'});for(const p of s.slots)if(p.presenterPersonId===c.personId)items.push({...base,slotId:p.id,title:p.title,startsAt:p.startsAt,endsAt:p.endsAt,role:'presenter'});}return {timezone:value?.timezone??null,publishedAt:value?.publishedAt??null,items:items.sort((a,b)=>a.date.localeCompare(b.date)||a.startsAt.localeCompare(b.startsAt))};});}
}
