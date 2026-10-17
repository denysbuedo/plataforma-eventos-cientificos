import { authorshipRpc } from './authorship.js';
import { Injectable } from '@nestjs/common';
import { and, desc, eq, inArray, sql } from 'drizzle-orm';
import { randomUUID } from 'node:crypto';
import type { AuthorWork, AuthorWorkspace, PublishedScientificCall, WorkContent, WorkStatus, WorkAuthor, AuthorFeedbackBody, WorkNoticeBoard, WorkReviewResponseDraft, WorkReviewResponse, WorkResponseTarget } from '@sep/contracts';
import { DatabaseService, type DbTransaction } from '../database/database.service.js';
import { authorWorks as works, eventConfigurations, events, people, orcidConnections, scientificCallPublications, workFiles, workVersions, workHistory, workCollaborations, workNoticeReads } from '../database/schema.js';
import { ApiException, type RequestContext } from '../common/http.js';
import { AuditService } from '../common/audit.service.js';
import { ManuscriptsService } from './manuscripts.service.js';
import { lookupResearcher } from '../identity/researchers.controller.js';
import type { CreateWorkDto, SaveWorkDto } from './works.dto.js';
const view = (row: typeof works.$inferSelect): AuthorWork => ({ ...(row.submittedContent?.reviewResponse?{reviewResponse:row.submittedContent.reviewResponse}:{}),id: row.id, title: row.title, abstract: row.abstract, keywords: row.keywords,
  authors: row.authors, manuscript: row.manuscript, status: row.status, submittedAt: row.submittedAt?.toISOString() ?? null, responseDeadline: row.responseDeadline, editable: false, versions: [], history: [],
  language: row.language, trackId: row.trackId, contributionTypeId: row.contributionTypeId, call: row.call, revision: row.revision,
  createdAt: row.createdAt.toISOString(), updatedAt: row.updatedAt.toISOString() });
const summaryFields = { ownerId:works.ownerId, status: works.status, submittedAt: works.submittedAt, responseDeadline: works.responseDeadline, callTimezone: sql<string>`call_snapshot->>'timezone'`, id: works.id, title: works.title, language: works.language, trackId: works.trackId,
  contributionTypeId: works.contributionTypeId, revision: works.revision, createdAt: works.createdAt, updatedAt: works.updatedAt };
const authorshipKey=(authors:WorkAuthor[])=>JSON.stringify(authors.map(author=>[author.id,author.fullName,author.email,author.corresponding,author.personId??'',author.orcid??'',author.orcidVerified??false,author.authorshipConfirmed??null,author.affiliations.map(affiliation=>[affiliation.institution,affiliation.countryCode])]));
@Injectable()
export class AuthorWorksService {
  today(timezone: string) {
    const parts=new Intl.DateTimeFormat('en-US',{timeZone:timezone,year:'numeric',month:'2-digit',day:'2-digit'}).formatToParts(new Date());
    const part=(type:string)=>parts.find(p=>p.type===type)?.value; return `${part('year')}-${part('month')}-${part('day')}`;
  }
  editable(row: {status:WorkStatus;responseDeadline:string|null},state:{active:boolean;editable:boolean},timezone:string) {
    if (!state.active) return false;
    if (['draft','withdrawn'].includes(row.status)) return state.editable;
    return ['changes_requested','final_requested'].includes(row.status) && !!row.responseDeadline && this.today(timezone)<=row.responseDeadline;
  }
  content(row: typeof works.$inferSelect): WorkContent {
    return {title:row.title,abstract:row.abstract,keywords:row.keywords,language:row.language,trackId:row.trackId,contributionTypeId:row.contributionTypeId,call:row.call,authors:row.authors,manuscript:row.manuscript};
  }
  private async authors(tx:DbTransaction,context:RequestContext,authors:WorkAuthor[], previous:WorkAuthor[] = []) {
    const [connection]=await tx.select().from(orcidConnections).where(eq(orcidConnections.personId,context.personId!));
    const personIds=authors.flatMap(author=>author.personId?[author.personId]:[]);
    if(new Set(personIds).size!==personIds.length)throw new ApiException(400,'VALIDATION_FAILED');
    return Promise.all(authors.map(async author=>{
      if(author.personId&&author.personId!==context.personId) {
        const existing=previous.find(item=>item.id===author.id&&item.personId===author.personId);
        if(existing){
          if(existing.orcid!==author.orcid)throw new ApiException(400,'VALIDATION_FAILED');
          return {...author,orcid:existing.orcid,orcidVerified:existing.orcidVerified??false,authorshipConfirmed:existing.authorshipConfirmed??true};
        }
        const candidate=await lookupResearcher(tx,author.personId);
        if(!candidate)throw new ApiException(400,'RESEARCHER_UNAVAILABLE');
        return {...author,orcid:candidate.orcid??'',orcidVerified:!!candidate.orcid,authorshipConfirmed:false};
      }
      const verified=!!author.personId&&!!connection?.orcid&&!!connection.connectedAt&&connection.environment==='production';
      return {...author,orcid:author.personId?connection?.orcid??'':author.orcid??'',orcidVerified:verified,authorshipConfirmed:author.personId===context.personId};
    }));
  }
  async finalRound(tx:DbTransaction,row:typeof works.$inferSelect) {
    if(row.status==='final_requested')return true;
    if(row.status!=='changes_requested')return false;
    const [last]=await tx.select({kind:workVersions.kind}).from(workVersions).where(eq(workVersions.workId,row.id)).orderBy(desc(workVersions.number)).limit(1);
    return last?.kind==='final';
  }
  private async noticeRows(tx:DbTransaction,personId:string,workId?:string){
    const rows=await tx.select({id:workHistory.id,workId:works.id,title:works.title,status:works.status,action:workHistory.action,createdAt:workHistory.createdAt,seen:sql<boolean>`coalesce(${workHistory.id}=ANY(${workNoticeReads.seenIds}),false)`}).from(workHistory).innerJoin(works,eq(works.id,workHistory.workId)).leftJoin(workNoticeReads,and(eq(workNoticeReads.workId,works.id),eq(workNoticeReads.personId,personId))).where(and(eq(works.hidden,false),eq(workHistory.actor,'staff'),inArray(workHistory.action,['changes_requested','final_requested','accepted','rejected','peer_reviews_released']),workId?eq(works.id,workId):undefined)).orderBy(desc(workHistory.createdAt),desc(workHistory.id));
    const selected=new Map<string,typeof rows[number]>();for(const row of rows){const key=row.workId+':'+(row.action==='peer_reviews_released'?'reviews':'decision');if(!selected.has(key))selected.set(key,row);}return [...selected.values()];
  }
  private async noticeBoard(tx:DbTransaction,personId:string):Promise<WorkNoticeBoard>{
    const rows=await this.noticeRows(tx,personId),items=new Map<string,WorkNoticeBoard['items'][number]>();for(const row of rows){if(row.seen)continue;const item=items.get(row.workId);if(item)item.unreadNotices++;else items.set(row.workId,{workId:row.workId,title:row.title,status:row.status,unreadNotices:1,latestAt:row.createdAt.toISOString()});}return {count:items.size,items:[...items.values()]};
  }
  notices(context:RequestContext):Promise<WorkNoticeBoard>{return this.database.scoped({...context,organizationAdmin:false},async tx=>{await this.state(tx,context);return this.noticeBoard(tx,context.personId!);});}
  readNotices(context:RequestContext,id:string,noticeIds:string[]):Promise<WorkNoticeBoard>{return this.database.scoped({...context,organizationAdmin:false},async tx=>{
    await this.state(tx,context);const [work]=await tx.select({id:works.id}).from(works).where(and(this.scope(context),eq(works.id,id)));if(!work)throw new ApiException(404,'NOT_FOUND');
    const valid=await tx.select({id:workHistory.id}).from(workHistory).where(and(eq(workHistory.workId,id),eq(workHistory.actor,'staff'),inArray(workHistory.action,['changes_requested','final_requested','accepted','rejected','peer_reviews_released']),inArray(workHistory.id,noticeIds)));
    if(valid.length)await tx.insert(workNoticeReads).values({organizationId:context.organizationId,eventId:context.eventId!,workId:id,personId:context.personId!,seenIds:valid.map(item=>item.id)}).onConflictDoUpdate({target:[workNoticeReads.organizationId,workNoticeReads.eventId,workNoticeReads.workId,workNoticeReads.personId],set:{seenIds:sql`ARRAY(SELECT DISTINCT notice_id FROM unnest(${workNoticeReads.seenIds} || excluded.seen_ids) notice_id ORDER BY notice_id)`}});
    return this.noticeBoard(tx,context.personId!);
  });}
  private async responseTarget(tx:DbTransaction,row:typeof works.$inferSelect):Promise<WorkResponseTarget|undefined>{
    if(row.status!=='changes_requested')return undefined;
    const [decision]=await tx.select().from(workHistory).where(and(eq(workHistory.workId,row.id),eq(workHistory.actor,'staff'),eq(workHistory.action,'changes_requested'))).orderBy(desc(workHistory.createdAt),desc(workHistory.id)).limit(1);
    const [version]=await tx.select({id:workVersions.id,number:workVersions.number}).from(workVersions).where(eq(workVersions.workId,row.id)).orderBy(desc(workVersions.number)).limit(1);
    if(!decision||!version)return undefined;
    const [feedback]=await tx.select().from(workHistory).where(and(eq(workHistory.workId,row.id),eq(workHistory.actor,'staff'),eq(workHistory.action,'peer_reviews_released'),sql`${workHistory.createdAt}<=(SELECT created_at FROM work_history WHERE id=${decision.id}::uuid) AND ${workHistory.createdAt}>=(SELECT created_at FROM work_versions WHERE id=${version.id}::uuid)`)).orderBy(desc(workHistory.createdAt),desc(workHistory.id)).limit(1);
    return {decisionId:decision.id,message:decision.message,versionNumber:version.number,...(feedback?{feedback:{id:feedback.id,publishedAt:feedback.createdAt.toISOString(),message:feedback.message,...(feedback.authorFeedback??{})}}:{})};
  }
  private responseValid(draft:WorkReviewResponseDraft|null|undefined,target:WorkResponseTarget|undefined){
    if(!draft||!target||draft.decisionId!==target.decisionId||draft.summary.trim().length<20)return false;
    const numbers=(target.feedback?.comments??[]).map(item=>item.number);
    return draft.replies.length===numbers.length&&numbers.every(number=>draft.replies.some(reply=>reply.number===number&&reply.text.trim().length>=10));
  }
  private responseSnapshot(draft:WorkReviewResponseDraft,target:WorkResponseTarget):WorkReviewResponse{return {...draft,summary:draft.summary.trim(),replies:draft.replies.map(item=>({...item,text:item.text.trim()})),versionNumber:target.versionNumber,decisionMessage:target.message,feedbackMessage:target.feedback?.message??'',...(target.feedback?.roundNumber?{roundNumber:target.feedback.roundNumber}:{}),...(target.feedback?.comments?{comments:target.feedback.comments}:{} )};}
  async detail(tx:DbTransaction,row:typeof works.$inferSelect,state:{active:boolean;editable:boolean;personId?:string},staff=false):Promise<AuthorWork> {
    const versions=await tx.select({id:workVersions.id,number:workVersions.number,kind:workVersions.kind,createdAt:workVersions.createdAt}).from(workVersions).where(eq(workVersions.workId,row.id)).orderBy(desc(workVersions.number));
    const history=await tx.select({id:workHistory.id,action:workHistory.action,message:workHistory.message,actor:workHistory.actor,actorId:workHistory.actorId,actorName:workHistory.actorName,createdAt:workHistory.createdAt}).from(workHistory).where(and(eq(workHistory.workId,row.id),staff ? sql`(${workHistory.actor}='staff' OR ${workHistory.action} IN ('submitted','final_submitted','withdrawn'))` : undefined)).orderBy(desc(workHistory.createdAt),desc(workHistory.id)).limit(200);
    const feedback=await tx.select({id:workHistory.id,publishedAt:workHistory.createdAt,message:workHistory.message,body:workHistory.authorFeedback}).from(workHistory).where(and(eq(workHistory.workId,row.id),eq(workHistory.action,'peer_reviews_released'),eq(workHistory.actor,'staff'))).orderBy(desc(workHistory.createdAt),desc(workHistory.id));
    const target=await this.responseTarget(tx,row);
    const notices=!staff&&state.personId?await this.noticeRows(tx,state.personId,row.id):[];
    return {...view(row),...(!staff?{reviewResponseDraft:row.reviewResponseDraft,...(target?{responseTarget:target}:{})}:{}),submissionReady:row.status!=='changes_requested'||this.responseValid(row.reviewResponseDraft,target),authorFeedback:feedback.map(item=>({id:item.id,publishedAt:item.publishedAt.toISOString(),message:item.message,...(item.body??{})})),noticeIds:notices.map(item=>item.id),unreadNotices:notices.filter(item=>!item.seen).length,canManage:!staff && row.ownerId===state.personId,...(staff && row.submittedContent ? row.submittedContent : {}),editable:!staff && this.editable(row,state,row.call.timezone),
      versions:versions.map(v=>({...v,createdAt:v.createdAt.toISOString()})),history:history.map(h=>({...h,createdAt:h.createdAt.toISOString()}))};
  }
  async record(tx:DbTransaction,context:RequestContext,id:string,action:string,message='',actor:'author'|'staff'='author',authorFeedback?:AuthorFeedbackBody) {
    const [actorProfile]=await tx.select({name:people.name}).from(people).where(eq(people.id,context.personId!));
    await tx.insert(workHistory).values({authorFeedback,actorName:actorProfile?.name??'',id:randomUUID(),organizationId:context.organizationId,eventId:context.eventId!,workId:id,actorId:context.personId!,actor,action,message});
  }
  private async locked(tx:DbTransaction,context:RequestContext,id:string,revision:number,edit=false) {
    const state=await this.state(tx,context,true);
    const [row]=await tx.select().from(works).where(and(this.scope(context),eq(works.id,id))).for('update');
    if(!row)throw new ApiException(404,'NOT_FOUND');
    if(row.revision!==revision)throw new ApiException(409,'REVISION_CONFLICT');
    if(edit && !this.editable(row,state,row.call.timezone))throw new ApiException(409,'WORKS_UNAVAILABLE');
    return {row,state};
  }
  synchronize(context:RequestContext,id:string,revision:number) {
    return this.database.scoped({...context,organizationAdmin:false},async tx=>{
      const {row,state}=await this.locked(tx,context,id,revision,true);
      if(!['draft','withdrawn'].includes(row.status)||!state.call)throw new ApiException(409,'CONFLICT');
      const [next]=await tx.update(works).set({call:state.call,revision:revision+1,updatedAt:new Date()}).where(and(this.scope(context),eq(works.id,id))).returning();
      await this.record(tx,context,id,'call_updated');await this.audit.record(tx,context,'work.call.updated',context.eventId!,id);return this.detail(tx,next,state);
    });
  }
  submit(context:RequestContext,id:string,revision:number) {
    return this.database.scoped({...context,organizationAdmin:false},async tx=>{
      const {row,state}=await this.locked(tx,context,id,revision,true);
      const target=await this.responseTarget(tx,row);
      if(row.status==='changes_requested'&&!this.responseValid(row.reviewResponseDraft,target))throw new ApiException(409,'REVIEW_RESPONSE_REQUIRED');
      const response=row.status==='changes_requested'?this.responseSnapshot(row.reviewResponseDraft!,target!):undefined;
      const initial=['draft','withdrawn'].includes(row.status);
      if(initial) {
        if(!state.call || !state.call.content.opensOn || this.today(state.call.timezone)<state.call.content.opensOn)throw new ApiException(409,'SUBMISSION_NOT_OPEN');
        if(row.call.revision!==state.call.revision||row.call.publishedAt!==state.call.publishedAt)throw new ApiException(409,'CALL_CHANGED');
        if(state.requireSubmittingAuthorOrcid) {
          const authors=await this.authors(tx,context,row.authors,row.authors);
          if(!authors.some(author=>author.personId===context.personId&&author.orcidVerified))throw new ApiException(409,'ORCID_REQUIRED');
        }
      }
      const finalRound=await this.finalRound(tx,row);
      if(!finalRound&&!state.languages.includes(row.language))throw new ApiException(400,'VALIDATION_FAILED');
      const {type}=this.validateSelection(row.call,row);
      const words=row.abstract.trim()?row.abstract.trim().split(/\s+/u).length:0;
      if(words<type.abstractMinWords||words>type.abstractMaxWords||row.keywords.length<type.keywordsMin||row.keywords.length>type.keywordsMax)throw new ApiException(400,'WORK_REQUIREMENTS');
      const corresponding=row.authors.filter(a=>a.corresponding);
      if(!row.authors.length||corresponding.length!==1||!corresponding[0].email)throw new ApiException(400,'AUTHOR_CORRESPONDENCE');
      if(type.manuscriptRequired&&!row.manuscript)throw new ApiException(400,'MANUSCRIPT_REQUIRED');
      if(row.manuscript) {
        if(!this.manuscripts.usable(row.manuscript))throw new ApiException(503,'FILE_SCAN_REQUIRED');
        if(type.maxPages && row.manuscript.pages>type.maxPages)throw new ApiException(400,'PDF_PAGES');
        const [asset]=await tx.select({id:workFiles.id}).from(workFiles).where(and(eq(workFiles.workId,id),eq(workFiles.id,row.manuscript.id)));
        if(!asset)throw new ApiException(409,'MANUSCRIPT_REQUIRED');
      }
      const [{count}]=await tx.select({count:sql<number>`count(*)::int`}).from(workVersions).where(eq(workVersions.workId,id));
      if(count>=10)throw new ApiException(409,'VERSION_LIMIT');
      const content={...this.content(row),...(response?{reviewResponse:response}:{}),authors:await this.authors(tx,context,row.authors,row.authors)},kind=finalRound?'final' as const:'submission' as const;
      await tx.insert(workVersions).values({id:randomUUID(),organizationId:context.organizationId,eventId:context.eventId!,workId:id,ownerId:context.personId!,number:count+1,kind,content,fileId:row.manuscript?.id??null});
      const [next]=await tx.update(works).set({reviewResponseDraft:null,authors:content.authors,status:kind==='final'?'final_submitted':'submitted',submittedAt:row.submittedAt??new Date(),submittedContent:content,responseDeadline:null,revision:revision+1,updatedAt:new Date()}).where(and(this.scope(context),eq(works.id,id))).returning();
      if(response)await this.record(tx,context,id,'review_response_submitted');
      await this.record(tx,context,id,kind==='final'?'final_submitted':'submitted');await this.audit.record(tx,context,'work.submitted',context.eventId!,id);return this.detail(tx,next,state);
    });
  }
  withdraw(context:RequestContext,id:string,revision:number,message:string) {
    return this.database.scoped({...context,organizationAdmin:false},async tx=>{
      const {row,state}=await this.locked(tx,context,id,revision);
      if(row.ownerId!==context.personId)throw new ApiException(403,'FORBIDDEN');
      if(!['submitted','in_review','changes_requested','accepted','final_requested','final_submitted'].includes(row.status))throw new ApiException(409,'CONFLICT');
      const [next]=await tx.update(works).set({status:'withdrawn',responseDeadline:null,revision:revision+1,updatedAt:new Date()}).where(and(this.scope(context),eq(works.id,id))).returning();
      await this.record(tx,context,id,'withdrawn',message);await this.audit.record(tx,context,'work.withdrawn',context.eventId!,id);return this.detail(tx,next,state);
    });
  }
  version(context:RequestContext,id:string,versionId:string) {
    return this.database.scoped({...context,organizationAdmin:false},async tx=>{
      await this.state(tx,context);const [work]=await tx.select({id:works.id}).from(works).where(and(this.scope(context),eq(works.id,id)));if(!work)throw new ApiException(404,'NOT_FOUND');
      const [row]=await tx.select().from(workVersions).where(and(eq(workVersions.workId,id),eq(workVersions.id,versionId)));
      if(!row)throw new ApiException(404,'NOT_FOUND');return {id:row.id,number:row.number,kind:row.kind,content:row.content,createdAt:row.createdAt.toISOString()};
    });
  }
  async upload(context:RequestContext,id:string,revision:number,bytes:Buffer,name:string) {
    const before=await this.read(context,id);if(!before.editable)throw new ApiException(409,'WORKS_UNAVAILABLE');
    const metadata=await this.manuscripts.validate(bytes,name);
    return this.database.scoped({...context,organizationAdmin:false},async tx=>{
      const {row,state}=await this.locked(tx,context,id,revision,true);const {type}=this.validateSelection(row.call,row);
      if(type.maxPages&&metadata.pages>type.maxPages)throw new ApiException(400,'PDF_PAGES');
      await tx.delete(workFiles).where(and(eq(workFiles.workId,id),sql`NOT EXISTS (SELECT 1 FROM work_versions v WHERE v.file_id=${workFiles.id})`));
      const [{total}]=await tx.select({total:sql<number>`coalesce(sum(octet_length(data)),0)::int`}).from(workFiles);
      if(total+bytes.length>50*1024*1024)throw new ApiException(409,'FILE_QUOTA');
      await tx.insert(workFiles).values({id:metadata.id,organizationId:context.organizationId,eventId:context.eventId!,workId:id,ownerId:context.personId!,metadata,data:bytes});
      const [next]=await tx.update(works).set({manuscript:metadata,revision:revision+1,updatedAt:new Date()}).where(and(this.scope(context),eq(works.id,id))).returning();
      await this.record(tx,context,id,'manuscript_updated');await this.audit.record(tx,context,'work.manuscript.updated',context.eventId!,id);return this.detail(tx,next,state);
    });
  }
  removeFile(context:RequestContext,id:string,revision:number) {
    return this.database.scoped({...context,organizationAdmin:false},async tx=>{
      const {state}=await this.locked(tx,context,id,revision,true);
      const [next]=await tx.update(works).set({manuscript:null,revision:revision+1,updatedAt:new Date()}).where(and(this.scope(context),eq(works.id,id))).returning();
      await tx.delete(workFiles).where(and(eq(workFiles.workId,id),sql`NOT EXISTS (SELECT 1 FROM work_versions v WHERE v.file_id=${workFiles.id})`));
      await this.record(tx,context,id,'manuscript_removed');await this.audit.record(tx,context,'work.manuscript.updated',context.eventId!,id);return this.detail(tx,next,state);
    });
  }
  async file(tx:DbTransaction,id:string,fileId:string) {
    const [asset]=await tx.select().from(workFiles).where(and(eq(workFiles.workId,id),eq(workFiles.id,fileId)));
    if(!asset)throw new ApiException(404,'NOT_FOUND');if(!this.manuscripts.usable(asset.metadata))throw new ApiException(503,'FILE_SCAN_REQUIRED');return asset;
  }
  download(context:RequestContext,id:string,fileId:string) {return this.database.scoped({...context,organizationAdmin:false},async tx=>{await this.state(tx,context);const [work]=await tx.select({id:works.id}).from(works).where(and(this.scope(context),eq(works.id,id)));if(!work)throw new ApiException(404,'NOT_FOUND');return this.file(tx,id,fileId);});}
  removeDraft(context:RequestContext,id:string,revision:number) {
    return this.database.scoped({...context,organizationAdmin:false},async tx=>{
      const {row}=await this.locked(tx,context,id,revision);
      if(row.ownerId!==context.personId)throw new ApiException(403,'FORBIDDEN');
      if(row.status!=='draft'||row.submittedAt)throw new ApiException(409,'CONFLICT');
      await tx.delete(workFiles).where(and(eq(workFiles.workId,id),sql`NOT EXISTS (SELECT 1 FROM work_versions v WHERE v.file_id=${workFiles.id})`));
      await tx.update(workCollaborations).set({status:'revoked'}).where(and(eq(workCollaborations.workId,id),sql`${workCollaborations.status} IN ('pending','accepted')`));
      await tx.update(works).set({hidden:true,manuscript:null,revision:revision+1,updatedAt:new Date()}).where(and(this.scope(context),eq(works.id,id)));
      await this.record(tx,context,id,'draft_deleted');await this.audit.record(tx,context,'work.draft.deleted',context.eventId!,id);return {deleted:true};
    });
  }
  constructor(private readonly database: DatabaseService, private readonly audit: AuditService, private readonly manuscripts: ManuscriptsService) {}
  scope(context: RequestContext) { return and(eq(works.hidden,false),eq(works.organizationId, context.organizationId), eq(works.eventId, context.eventId!), sql`(${works.ownerId}=${context.personId}::uuid OR EXISTS (SELECT 1 FROM work_collaborations c WHERE c.work_id=${works.id} AND c.organization_id=${works.organizationId} AND c.event_id=${works.eventId} AND c.person_id=${context.personId}::uuid AND c.status='accepted'))`); }
  async state(tx: DbTransaction, context: RequestContext, lock = false) {
    if (!context.personId) throw new ApiException(401, 'UNAUTHORIZED');
    if (!context.eventId) throw new ApiException(404, 'NOT_FOUND');
    const [person] = await tx.select({ id: people.id }).from(people).where(and(eq(people.id, context.personId), eq(people.active, true)));
    if (!person) throw new ApiException(401, 'UNAUTHORIZED');
    const query = tx.select().from(events).where(and(eq(events.organizationId, context.organizationId), eq(events.id, context.eventId)));
    const [event] = await (lock ? query.for('update') : query);
    if (!event) throw new ApiException(404, 'NOT_FOUND');
    const [config] = await tx.select().from(eventConfigurations).where(and(eq(eventConfigurations.organizationId, context.organizationId), eq(eventConfigurations.eventId, event.id)));
    const [pub] = await tx.select().from(scientificCallPublications).where(and(eq(scientificCallPublications.organizationId, context.organizationId), eq(scientificCallPublications.eventId, event.id)));
    const call = pub?.snapshot ?? null;
    const inactive = event.status !== 'published' || !!config && ['completed','cancelled'].includes(config.lifecycle);
    let reason: AuthorWorkspace['reason'] = inactive ? 'inactive' : call ? 'available' : 'no_call';
    if (reason === 'available' && call) {
      const parts = new Intl.DateTimeFormat('en-US', { timeZone: call.timezone, year: 'numeric', month: '2-digit', day: '2-digit' }).formatToParts(new Date());
      const part = (type: string) => parts.find((p) => p.type === type)?.value;
      if (!call.content.closesOn || `${part('year')}-${part('month')}-${part('day')}` > call.content.closesOn) reason = 'closed';
    }
    return { event, personId:context.personId!, call: inactive ? null : call, reason, active: !inactive, editable: reason === 'available', languages: config?.languages ?? ['es','en'] as ('es' | 'en')[],requireSubmittingAuthorOrcid:config?.requireSubmittingAuthorOrcid??false };
  }
  private validateSelection(call: PublishedScientificCall, dto: CreateWorkDto) {
    const track = call.content.tracks.find((t) => t.id.toLowerCase() === dto.trackId.toLowerCase());
    const type = call.content.contributionTypes.find((t) => t.id.toLowerCase() === dto.contributionTypeId.toLowerCase());
    if (!track || !type) throw new ApiException(400, 'VALIDATION_FAILED');
    return { track, type };
  }
  get(context: RequestContext): Promise<AuthorWorkspace> {
    return this.database.scoped({ ...context, organizationAdmin: false }, async (tx) => {
      const state = await this.state(tx, context);
      const rows = await tx.select(summaryFields).from(works).where(this.scope(context)).orderBy(desc(works.updatedAt), works.id).limit(50);
      if (state.event.status !== 'published' && !rows.length) throw new ApiException(404, 'NOT_FOUND');
      const notices=await this.noticeBoard(tx,context.personId!);
      return { event: { id: state.event.id, nameEs: state.event.nameEs, nameEn: state.event.nameEn, timezone: state.event.timezone },
        works: rows.map(({callTimezone,ownerId,...row}) => ({ ...row, unreadNotices:notices.items.find(item=>item.workId===row.id)?.unreadNotices??0, canManage:ownerId===context.personId, editable: this.editable(row,state,callTimezone), submittedAt: row.submittedAt?.toISOString() ?? null, createdAt: row.createdAt.toISOString(), updatedAt: row.updatedAt.toISOString() })), call: state.call, editable: state.editable, reason: state.reason, languages: state.languages,requireSubmittingAuthorOrcid:state.requireSubmittingAuthorOrcid };
    });
  }
  read(context: RequestContext, id: string): Promise<AuthorWork> {
    return this.database.scoped({ ...context, organizationAdmin: false }, async (tx) => {
      const state = await this.state(tx, context);
      const [row] = await tx.select().from(works).where(and(this.scope(context), eq(works.id, id)));
      if (!row) throw new ApiException(404, 'NOT_FOUND'); return this.detail(tx,row,state);
    });
  }
  create(context: RequestContext, dto: CreateWorkDto): Promise<AuthorWork> {
    return this.database.scoped({ ...context, organizationAdmin: false }, async (tx) => {
      const state = await this.state(tx, context, true);
      if (!state.editable || !state.call) throw new ApiException(409, 'WORKS_UNAVAILABLE');
      if (!state.languages.includes(dto.language)) throw new ApiException(400, 'VALIDATION_FAILED');
      const selection = this.validateSelection(state.call, dto);
      const [{ count }] = await tx.select({ count: sql<number>`count(*)::int` }).from(works).where(and(this.scope(context),eq(works.ownerId,context.personId!)));
      if (count >= 50) throw new ApiException(409, 'WORK_LIMIT');
      const [row] = await tx.insert(works).values({ id: randomUUID(), organizationId: context.organizationId, eventId: state.event.id,
        ownerId: context.personId!, ...dto, trackId: selection.track.id, contributionTypeId: selection.type.id, call: state.call }).returning();
      await this.audit.record(tx, context, 'work.created', state.event.id, row.id); return this.detail(tx,row,state);
    });
  }
  save(context: RequestContext, id: string, dto: SaveWorkDto): Promise<AuthorWork> {
    if (dto.authors?.length) {
      const corresponding = dto.authors.filter((author) => author.corresponding);
      if (corresponding.length !== 1 || !corresponding[0].email) throw new ApiException(400, 'AUTHOR_CORRESPONDENCE');
      if (dto.authors.some((author) => {
        const keys = author.affiliations.map((affiliation) => `${affiliation.countryCode}:${affiliation.institution.trim().normalize('NFC').toLowerCase()}`);
        return new Set(keys).size !== keys.length;
      })) throw new ApiException(400, 'AUTHOR_AFFILIATION_DUPLICATE');
    }
    return this.database.scoped({ ...context, organizationAdmin: false }, async (tx) => {
      const state = await this.state(tx, context, true);
      const [before] = await tx.select().from(works).where(and(this.scope(context), eq(works.id, id))).for('update');
      if (!before) throw new ApiException(404, 'NOT_FOUND');
      if (!this.editable(before,state,before.call.timezone)) throw new ApiException(409, 'WORKS_UNAVAILABLE');
      if(dto.reviewResponseDraft!==undefined&&dto.reviewResponseDraft!==null){
        const target=await this.responseTarget(tx,before);
        if(!target||dto.reviewResponseDraft.decisionId!==target.decisionId)throw new ApiException(409,'REVIEW_RESPONSE_STALE');
        const numbers=(target.feedback?.comments??[]).map(item=>item.number);
        if(dto.reviewResponseDraft.replies.some(reply=>!numbers.includes(reply.number)))throw new ApiException(400,'VALIDATION_FAILED');
      }
      const finalRound=await this.finalRound(tx,before);
      if (!finalRound&&!state.languages.includes(dto.language)) throw new ApiException(400, 'VALIDATION_FAILED');
      if (finalRound && (dto.trackId !== before.trackId || dto.contributionTypeId !== before.contributionTypeId || dto.language !== before.language)) throw new ApiException(409,'FINAL_CLASSIFICATION');
      if (before.revision !== dto.revision) throw new ApiException(409, 'REVISION_CONFLICT');
      if(before.ownerId!==context.personId && dto.authors!==undefined && authorshipKey(dto.authors)!==authorshipKey(before.authors))throw new ApiException(403,'WORK_AUTHOR_MANAGEMENT');
      const selection = this.validateSelection(before.call, dto);
      const words = dto.abstract.trim() ? dto.abstract.trim().split(/\s+/u).length : 0;
      if (words > selection.type.abstractMaxWords || dto.keywords.length > selection.type.keywordsMax) throw new ApiException(400, 'WORK_REQUIREMENTS');
      const [row] = await tx.update(works).set({ ...dto, authors: await this.authors(tx,context,dto.authors ?? before.authors,before.authors), trackId: selection.track.id, contributionTypeId: selection.type.id, revision: dto.revision + 1, updatedAt: new Date() })
        .where(and(this.scope(context), eq(works.id, id))).returning();
      if(before.ownerId===context.personId) {
        for(const grant of await tx.select().from(workCollaborations).where(and(eq(workCollaborations.workId,id),sql`${workCollaborations.status} IN ('pending','accepted')`))) {
          if(!row.authors.some(author=>author.id===grant.authorId&&author.corresponding&&author.email===grant.email&&(grant.status!=='accepted'||author.personId===grant.personId))) {
            await tx.update(workCollaborations).set({status:'revoked'}).where(eq(workCollaborations.id,grant.id));
            await this.record(tx,context,id,'collaboration_revoked','Correspondence or author details changed.');
          }
        }
      }
      if(before.ownerId===context.personId)await authorshipRpc(tx,context,'synchronize',id);
      await this.audit.record(tx, context, 'work.draft.saved', state.event.id, id); return this.detail(tx,row,state);
    });
  }
}
