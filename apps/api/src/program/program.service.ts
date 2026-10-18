import {programClock} from './program-time.js';
import {randomUUID} from 'node:crypto';
import {Injectable} from '@nestjs/common';
import {and,eq,desc,inArray,sql,ilike} from 'drizzle-orm';
import type {ProgramDraft,ProgramSession,ProgramSessionInput,ProgramSnapshot,PublicProgram,ProgramCandidates,MyParticipation,ProgramActivity,ProgramActivityInput,ProgramSpaces} from '@sep/contracts';
import {DatabaseService,type DbTransaction} from '../database/database.service.js';
import {events,eventConfigurations,programDrafts as drafts,programPublications as publications,programSpaces as spaces,authorWorks as works,workVersions,people,sitePublications} from '../database/schema.js';
import {AuthorizationService} from '../identity/authorization.service.js';
import {lookupResearcher} from '../identity/researchers.controller.js';
import {AuditService} from '../common/audit.service.js';
import {ApiException,type RequestContext} from '../common/http.js';
import type {SaveProgramDto,ProgramCandidatesQuery,SaveProgramSpaceDto} from './program.dto.js';
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
 private async draft(tx:DbTransaction,c:RequestContext):Promise<ProgramDraft>{
  const {event,config}=await this.event(tx,c);const [draft]=await tx.select().from(drafts).where(this.scope(c,drafts));const [publication]=await tx.select().from(publications).where(this.scope(c,publications));
  const rooms=await tx.select().from(spaces).where(and(eq(spaces.organizationId,c.organizationId),eq(spaces.eventId,c.eventId!)));
  return {sessions:(draft?.sessions??[]).map(s=>({...s,type:s.type??'oral',participants:s.participants??[],room:rooms.find(r=>r.id===s.roomId)?.name??s.room,virtualRoom:rooms.find(r=>r.id===s.virtualRoomId)?.name??s.virtualRoom??null,roomLocation:rooms.find(r=>r.id===s.roomId)?.location??s.roomLocation??''})),activities:draft?.activities??[],timezone:draft?.timezone??event.timezone,startDate:config?.startDate??null,endDate:config?.endDate??null,revision:draft?.revision??0,publishedRevision:publication?.revision??null,publishedAt:publication?.publishedAt.toISOString()??null};
 }
 spaces(c:RequestContext):Promise<ProgramSpaces>{return this.auth.run(c,'submissions-manage',async tx=>{await this.event(tx,c);return {spaces:await tx.select({id:spaces.id,code:spaces.code,name:spaces.name,kind:spaces.kind,location:spaces.location,capacity:spaces.capacity,active:spaces.active,revision:spaces.revision}).from(spaces).where(and(eq(spaces.organizationId,c.organizationId),eq(spaces.eventId,c.eventId!))).orderBy(spaces.kind,spaces.code).limit(200)};});}
 async saveSpace(c:RequestContext,dto:SaveProgramSpaceDto,id?:string){
  try{return await this.auth.run(c,'submissions-manage',async tx=>{
   await this.event(tx,c,true);const rooms=(await tx.select().from(spaces).where(and(eq(spaces.organizationId,c.organizationId),eq(spaces.eventId,c.eventId!))).orderBy(spaces.code));const old=id?rooms.find(r=>r.id===id):undefined;
   if(id&&!old)throw new ApiException(404,'NOT_FOUND');if((old?.revision??0)!==dto.revision)throw new ApiException(409,'REVISION_CONFLICT');if(!old&&rooms.length>=200)throw new ApiException(409,'VALIDATION_FAILED');
   if(rooms.some(r=>r.id!==id&&(r.code===dto.code||r.kind===dto.kind&&roomKey(r.name)===roomKey(dto.name)&&roomKey(r.location)===roomKey(dto.location))))throw new ApiException(409,'PROGRAM_SPACE_DUPLICATE');
   const before=await this.draft(tx,c),used=old&&before.sessions.some(s=>s.roomId===id||s.virtualRoomId===id);if(used&&(!dto.active||dto.kind!==old.kind))throw new ApiException(409,'PROGRAM_SPACE_IN_USE');
   const values={code:dto.code,name:dto.name,kind:dto.kind,location:dto.location,capacity:dto.kind==='virtual'?null:dto.capacity,active:dto.active,revision:dto.revision+1},spaceId=id??randomUUID();
   if(old)await tx.update(spaces).set(values).where(eq(spaces.id,spaceId));else await tx.insert(spaces).values({id:spaceId,organizationId:c.organizationId,eventId:c.eventId!,...values});
   if(used){const sessions=before.sessions.map(s=>({...s,...(s.roomId===id?{room:dto.name,roomLocation:dto.location}:{}),...(s.virtualRoomId===id?{virtualRoom:dto.name,...(s.modality==='virtual'?{room:dto.name}:{})}:{})}));await tx.update(drafts).set({sessions,revision:before.revision+1}).where(this.scope(c,drafts));}
   await this.audit.record(tx,c,old?'program.space.updated':'program.space.created',c.eventId!,spaceId);return {...values,id:spaceId};
  });}catch(error){if((error as {cause?:{code?:string}}).cause?.code==='23505')throw new ApiException(409,'PROGRAM_SPACE_DUPLICATE');throw error;}
 }

 get(c:RequestContext){return this.auth.run(c,'submissions-manage',tx=>this.draft(tx,c));}
 candidates(c:RequestContext,q:ProgramCandidatesQuery):Promise<ProgramCandidates>{return this.auth.run(c,'submissions-manage',async tx=>{
  await this.event(tx,c);const where=and(eq(works.organizationId,c.organizationId),eq(works.eventId,c.eventId!),eq(works.hidden,false),sql`${works.status} IN ('accepted','final_requested','final_submitted')`,q.q.trim()?ilike(works.title,'%'+q.q.trim().replace(/[\%_]/g,'\\$&')+'%'):undefined);
  const [count]=await tx.select({total:sql<number>`count(*)::integer`}).from(works).where(where);const rows=await tx.select().from(works).where(where).orderBy(works.title,works.id).limit(q.limit).offset(q.offset);
  const versions=rows.length?await tx.selectDistinctOn([workVersions.workId]).from(workVersions).where(inArray(workVersions.workId,rows.map(w=>w.id))).orderBy(workVersions.workId,desc(workVersions.number)):[];
  return {data:rows.flatMap(row=>{const v=versions.find(v=>v.workId===row.id);return v?[{workId:row.id,title:v.content.title,versionNumber:v.number,authors:v.content.authors.map(a=>({id:a.id,name:a.fullName}))}]:[];}),total:count.total,limit:q.limit,offset:q.offset};
 });}
 private async prepare(tx:DbTransaction,c:RequestContext,inputs:ProgramSessionInput[],activityInputs:ProgramActivityInput[],publish=false):Promise<{sessions:ProgramSession[];activities:ProgramActivity[]}>{
  const {config,event}=await this.event(tx,c),validTime=programClock(event.timezone);if(inputs.reduce((n,s)=>n+s.slots.length,0)>500)throw new ApiException(400,'VALIDATION_FAILED');
  if(activityInputs.length>100||new Set(activityInputs.map(a=>a.id)).size!==activityInputs.length)throw new ApiException(400,'PROGRAM_ACTIVITY_INVALID');
  const rooms=await tx.select().from(spaces).where(and(eq(spaces.organizationId,c.organizationId),eq(spaces.eventId,c.eventId!),eq(spaces.active,true)));
  const workIds=inputs.flatMap(s=>s.slots.map(p=>p.workId)),slotIds=inputs.flatMap(s=>s.slots.map(p=>p.id));if(new Set(workIds).size!==workIds.length||new Set(slotIds).size!==slotIds.length)throw new ApiException(409,'PROGRAM_CONFLICT');
  const rows=workIds.length?await tx.select().from(works).where(and(eq(works.organizationId,c.organizationId),eq(works.eventId,c.eventId!),inArray(works.id,workIds))).orderBy(works.id).for('update'):[];
  const versions=workIds.length?await tx.selectDistinctOn([workVersions.workId]).from(workVersions).where(and(eq(workVersions.organizationId,c.organizationId),eq(workVersions.eventId,c.eventId!),inArray(workVersions.workId,workIds))).orderBy(workVersions.workId,desc(workVersions.number)):[];
  const identities=new Map<string,string>(),moderators=new Map<string,{personId:string;name:string}>(),sessions:ProgramSession[]=[];
  const person=async(id:string)=>{if(!moderators.has(id)){const found=await lookupResearcher(tx,id);if(!found)throw new ApiException(400,'RESEARCHER_UNAVAILABLE');moderators.set(id,{personId:id,name:found.name});}return moderators.get(id)!;};
  const activities:ProgramActivity[]=[];for(const a of activityInputs){if(publish&&inputs.some(s=>s.activityId===a.id)&&a.titleEn.trim().length<2)throw new ApiException(409,'PROGRAM_INCOMPLETE');const coordinators=[];for(const id of a.coordinatorIds)coordinators.push(await person(id));activities.push({...a,coordinators});}
  for(const input of inputs){
   const kind=input.type??'oral';if(input.activityId&&!activities.some(a=>a.id===input.activityId))throw new ApiException(400,'PROGRAM_ACTIVITY_INVALID');
   const physical=rooms.find(r=>r.id===input.roomId&&r.kind==='physical'),virtual=rooms.find(r=>r.id===input.virtualRoomId&&r.kind==='virtual');
   if(input.modality!=='virtual'&&!physical||input.modality!=='in_person'&&!virtual||input.modality==='virtual'&&input.roomId||input.modality==='in_person'&&input.virtualRoomId)throw new ApiException(400,'PROGRAM_SPACE_INVALID');
   const participants=[];if(new Set([...input.moderatorIds,...(input.participants??[]).map(p=>p.personId)]).size!==input.moderatorIds.length+(input.participants??[]).length)throw new ApiException(400,'VALIDATION_FAILED');
   for(const p of input.participants??[]){const found=await person(p.personId);participants.push({...p,name:found.name});}

   if(!validTime(input.date,input.startsAt)||!validTime(input.date,input.endsAt)||input.startsAt>=input.endsAt||config?.startDate&&input.date<config.startDate||config?.endDate&&input.date>config.endDate)throw new ApiException(400,'PROGRAM_INVALID');
   if(publish&&(input.titleEn.trim().length<2||(['oral','poster'].includes(kind)?!input.slots.length:!input.slots.length&&((input.descriptionEs?.trim().length??0)<10||!participants.length&&!input.moderatorIds.length))))throw new ApiException(409,'PROGRAM_INCOMPLETE');
   for(const id of input.moderatorIds)await person(id);
   const slots=[] as ProgramSession['slots'];for(const slot of input.slots){
    if(!validTime(input.date,slot.startsAt)||!validTime(input.date,slot.endsAt)||slot.startsAt>=slot.endsAt||slot.startsAt<input.startsAt||slot.endsAt>input.endsAt)throw new ApiException(400,'PROGRAM_INVALID');
    const format=slot.format??'oral',mode=slot.modality??(input.modality==='virtual'?'virtual':'in_person');if(kind==='poster'&&!['poster','e_poster'].includes(format)||kind!=='poster'&&['poster','e_poster'].includes(format)||mode==='virtual'&&input.modality==='in_person'||mode==='in_person'&&input.modality==='virtual')throw new ApiException(400,'PROGRAM_FORMAT_INVALID');
    const work=rows.find(w=>w.id===slot.workId),v=versions.find(v=>v.workId===slot.workId),author=v?.content.authors.find(a=>a.id===slot.presenterAuthorId);if(!work||work.hidden||!accepted.includes(work.status)||!v||!author)throw new ApiException(409,'PROGRAM_WORK_UNAVAILABLE');
    const personId=work.authors.find(a=>a.id===author.id)?.personId??author.personId??null;
    identities.set(slot.id,personId?'person:'+personId:author.email?'email:'+author.email.trim().toLowerCase():'author:'+slot.workId+':'+author.id);
    slots.push({...slot,format,modality:mode,displayCode:slot.displayCode??'',title:v.content.title,authors:v.content.authors.map(a=>a.fullName),presenterOptions:v.content.authors.map(a=>({id:a.id,name:a.fullName})),presenterName:author.fullName,presenterPersonId:personId,versionId:v.id,versionNumber:v.number});
   }
   slots.sort((a,b)=>a.startsAt.localeCompare(b.startsAt)||a.id.localeCompare(b.id));if(kind!=='poster')for(let i=1;i<slots.length;i++)if(overlaps(slots[i-1],slots[i]))throw new ApiException(409,'PROGRAM_CONFLICT');
   const codes=slots.map(p=>roomKey(p.displayCode??'')).filter(Boolean);if(new Set(codes).size!==codes.length)throw new ApiException(409,'PROGRAM_CONFLICT');
   sessions.push({...input,type:kind,activityId:input.activityId??null,roomId:physical?.id??null,virtualRoomId:virtual?.id??null,room:physical?.name??virtual!.name,virtualRoom:virtual?.name??null,roomLocation:physical?.location??'',participants,moderators:input.moderatorIds.map(id=>moderators.get(id)!),slots});
  }
  for(let i=0;i<sessions.length;i++)for(let j=i+1;j<sessions.length;j++){const a=sessions[i],b=sessions[j];if(a.date!==b.date||!overlaps(a,b))continue;
   const aPeople=[...a.moderatorIds,...(a.participants??[]).map(p=>p.personId)],bPeople=[...b.moderatorIds,...(b.participants??[]).map(p=>p.personId)];
   if(a.roomId&&a.roomId===b.roomId||a.virtualRoomId&&a.virtualRoomId===b.virtualRoomId||aPeople.some(id=>bPeople.includes(id)))throw new ApiException(409,'PROGRAM_CONFLICT');
   for(const p of a.slots){if(bPeople.some(id=>identities.get(p.id)==='person:'+id)&&overlaps(p,b))throw new ApiException(409,'PROGRAM_CONFLICT');for(const q of b.slots)if(identities.get(p.id)===identities.get(q.id)&&overlaps(p,q))throw new ApiException(409,'PROGRAM_CONFLICT');}
   for(const q of b.slots)if(aPeople.some(id=>identities.get(q.id)==='person:'+id)&&overlaps(q,a))throw new ApiException(409,'PROGRAM_CONFLICT');
  }
  return {activities,sessions:sessions.sort((a,b)=>a.date.localeCompare(b.date)||a.startsAt.localeCompare(b.startsAt)||a.room.localeCompare(b.room)||a.id.localeCompare(b.id))};
 }
 save(c:RequestContext,dto:SaveProgramDto){return this.auth.run(c,'submissions-manage',async tx=>{const {event}=await this.event(tx,c,true),before=await this.draft(tx,c);if(before.revision!==dto.revision)throw new ApiException(409,'REVISION_CONFLICT');const {sessions,activities}=await this.prepare(tx,c,dto.sessions,dto.activities??before.activities);await tx.insert(drafts).values({organizationId:c.organizationId,eventId:c.eventId!,sessions,activities,timezone:event.timezone,revision:dto.revision+1}).onConflictDoUpdate({target:[drafts.organizationId,drafts.eventId],set:{sessions,activities,timezone:event.timezone,revision:dto.revision+1}});await this.audit.record(tx,c,'program.saved',c.eventId!);return this.draft(tx,c);});}
 publish(c:RequestContext,revision:number){return this.auth.run(c,'submissions-manage',async tx=>{
  const {event}=await this.event(tx,c,true),draft=await this.draft(tx,c);if(!revision||revision!==draft.revision)throw new ApiException(409,'REVISION_CONFLICT');if(draft.timezone!==event.timezone)throw new ApiException(409,'PROGRAM_TIMEZONE_CHANGED');
  const [site]=await tx.select({revision:sitePublications.revision}).from(sitePublications).where(and(eq(sitePublications.organizationId,c.organizationId),eq(sitePublications.eventId,c.eventId!)));if(event.status!=='published'||!site)throw new ApiException(409,'CALL_SITE_REQUIRED');if(!draft.sessions.length)throw new ApiException(409,'PROGRAM_INCOMPLETE');
  const {sessions,activities}=await this.prepare(tx,c,draft.sessions,draft.activities,true);for(const s of sessions)for(const p of s.slots)if(draft.sessions.find(x=>x.id===s.id)?.slots.find(x=>x.id===p.id)?.versionId!==p.versionId)throw new ApiException(409,'PROGRAM_WORK_UNAVAILABLE');
  const publishedAt=new Date(),snapshot:ProgramSnapshot={sessions,activities:activities.filter(a=>sessions.some(s=>s.activityId===a.id)),timezone:event.timezone,revision,publishedAt:publishedAt.toISOString()};await tx.insert(publications).values({organizationId:c.organizationId,eventId:c.eventId!,snapshot,revision,publishedAt}).onConflictDoUpdate({target:[publications.organizationId,publications.eventId],set:{snapshot,revision,publishedAt}});await this.audit.record(tx,c,'program.published',c.eventId!);return this.draft(tx,c);
 });}
 withdraw(c:RequestContext,revision:number){return this.auth.run(c,'submissions-manage',async tx=>{await this.event(tx,c);await tx.select({id:events.id}).from(events).where(and(eq(events.organizationId,c.organizationId),eq(events.id,c.eventId!))).for('update');const draft=await this.draft(tx,c);if(draft.publishedRevision===null||draft.publishedRevision!==revision)throw new ApiException(409,'REVISION_CONFLICT');await this.audit.record(tx,c,'program.withdrawn',c.eventId!);await tx.delete(publications).where(this.scope(c,publications));return this.draft(tx,c);});}
 private async published(tx:DbTransaction,c:RequestContext){const {event,config}=await this.event(tx,c);if(event.status!=='published'||config?.lifecycle==='cancelled')return null;const [row]=await tx.select().from(publications).where(this.scope(c,publications));return row?.snapshot??null;}
 public(c:RequestContext):Promise<PublicProgram>{return this.db.scoped(c,async tx=>{const value=await this.published(tx,c);if(!value)throw new ApiException(404,'NOT_FOUND');return {timezone:value.timezone,revision:value.revision,publishedAt:value.publishedAt,activities:(value.activities??[]).map(a=>({id:a.id,type:a.type,titleEs:a.titleEs,titleEn:a.titleEn,descriptionEs:a.descriptionEs,descriptionEn:a.descriptionEn,coordinators:a.coordinators.map(p=>p.name)})),sessions:value.sessions.map(s=>({id:s.id,type:s.type??'oral',activityId:s.activityId??null,descriptionEs:s.descriptionEs??'',descriptionEn:s.descriptionEn??'',titleEs:s.titleEs,titleEn:s.titleEn,topicEs:s.topicEs,topicEn:s.topicEn,date:s.date,startsAt:s.startsAt,endsAt:s.endsAt,room:s.room,virtualRoom:s.virtualRoom??null,roomLocation:s.roomLocation??'',modality:s.modality,moderators:s.moderators.map(m=>m.name),participants:(s.participants??[]).map(p=>({name:p.name,role:p.role})),slots:s.slots.map(p=>({id:p.id,workId:p.workId,presenterAuthorId:p.presenterAuthorId,startsAt:p.startsAt,endsAt:p.endsAt,format:p.format??'oral',modality:p.modality??(s.modality==='virtual'?'virtual':'in_person'),displayCode:p.displayCode??'',title:p.title,authors:p.authors,presenterName:p.presenterName,versionId:p.versionId,versionNumber:p.versionNumber}))}))};});}
 mine(c:RequestContext):Promise<MyParticipation>{return this.db.scoped({...c,organizationAdmin:false},async tx=>{
  if(!c.personId)throw new ApiException(401,'UNAUTHORIZED');const [person]=await tx.select().from(people).where(and(eq(people.id,c.personId),eq(people.active,true)));if(!person)throw new ApiException(401,'UNAUTHORIZED');const value=await this.published(tx,c),items:MyParticipation['items']=[];
  for(const s of value?.sessions??[]){const a=value?.activities?.find(a=>a.id===s.activityId),base={sessionId:s.id,sessionTitleEs:s.titleEs,sessionTitleEn:s.titleEn,date:s.date,room:s.room+(s.modality==='hybrid'&&s.virtualRoom?' · '+s.virtualRoom:''),modality:s.modality,sessionType:s.type??'oral' as const,activityTitleEs:a?.titleEs,activityTitleEn:a?.titleEn};
   if(s.moderatorIds.includes(c.personId))items.push({...base,slotId:null,title:'',startsAt:s.startsAt,endsAt:s.endsAt,role:'moderator'});
   for(const p of s.participants??[])if(p.personId===c.personId)items.push({...base,slotId:null,title:'',startsAt:s.startsAt,endsAt:s.endsAt,role:p.role});
   for(const p of s.slots)if(p.presenterPersonId===c.personId)items.push({...base,slotId:p.id,title:p.title,startsAt:p.startsAt,endsAt:p.endsAt,role:'presenter',format:p.format??'oral',modality:p.modality??(s.modality==='virtual'?'virtual':'in_person')});
  }
  return {timezone:value?.timezone??null,publishedAt:value?.publishedAt??null,activities:(value?.activities??[]).filter(a=>a.coordinatorIds.includes(c.personId!)).map(a=>({id:a.id,titleEs:a.titleEs,titleEn:a.titleEn,type:a.type})),items:items.sort((a,b)=>a.date.localeCompare(b.date)||a.startsAt.localeCompare(b.startsAt))};
 });}
}
