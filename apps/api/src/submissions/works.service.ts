import { Injectable } from '@nestjs/common';
import { and, desc, eq, sql } from 'drizzle-orm';
import { randomUUID } from 'node:crypto';
import type { AuthorWork, AuthorWorkspace, PublishedScientificCall, WorkContent, WorkStatus, WorkAuthor } from '@sep/contracts';
import { DatabaseService, type DbTransaction } from '../database/database.service.js';
import { authorWorks as works, eventConfigurations, events, people, orcidConnections, scientificCallPublications, workFiles, workVersions, workHistory, workCollaborations } from '../database/schema.js';
import { ApiException, type RequestContext } from '../common/http.js';
import { AuditService } from '../common/audit.service.js';
import { ManuscriptsService } from './manuscripts.service.js';
import { lookupResearcher } from '../identity/researchers.controller.js';
import type { CreateWorkDto, SaveWorkDto } from './works.dto.js';
const view = (row: typeof works.$inferSelect): AuthorWork => ({ id: row.id, title: row.title, abstract: row.abstract, keywords: row.keywords,
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
  async detail(tx:DbTransaction,row:typeof works.$inferSelect,state:{active:boolean;editable:boolean;personId?:string},staff=false):Promise<AuthorWork> {
    const versions=await tx.select({id:workVersions.id,number:workVersions.number,kind:workVersions.kind,createdAt:workVersions.createdAt}).from(workVersions).where(eq(workVersions.workId,row.id)).orderBy(desc(workVersions.number));
    const history=await tx.select({id:workHistory.id,action:workHistory.action,message:workHistory.message,actor:workHistory.actor,actorId:workHistory.actorId,actorName:workHistory.actorName,createdAt:workHistory.createdAt}).from(workHistory).where(and(eq(workHistory.workId,row.id),staff ? sql`(${workHistory.actor}='staff' OR ${workHistory.action} IN ('submitted','final_submitted','withdrawn'))` : undefined)).orderBy(desc(workHistory.createdAt),desc(workHistory.id)).limit(200);
    return {...view(row),canManage:!staff && row.ownerId===state.personId,...(staff && row.submittedContent ? row.submittedContent : {}),editable:!staff && this.editable(row,state,row.call.timezone),
      versions:versions.map(v=>({...v,createdAt:v.createdAt.toISOString()})),history:history.map(h=>({...h,createdAt:h.createdAt.toISOString()}))};
  }
  async record(tx:DbTransaction,context:RequestContext,id:string,action:string,message='',actor:'author'|'staff'='author') {
    const [actorProfile]=await tx.select({name:people.name}).from(people).where(eq(people.id,context.personId!));
    await tx.insert(workHistory).values({actorName:actorProfile?.name??'',id:randomUUID(),organizationId:context.organizationId,eventId:context.eventId!,workId:id,actorId:context.personId!,actor,action,message});
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
      const content={...this.content(row),authors:await this.authors(tx,context,row.authors,row.authors)},kind=finalRound?'final' as const:'submission' as const;
      await tx.insert(workVersions).values({id:randomUUID(),organizationId:context.organizationId,eventId:context.eventId!,workId:id,ownerId:context.personId!,number:count+1,kind,content,fileId:row.manuscript?.id??null});
      const [next]=await tx.update(works).set({authors:content.authors,status:kind==='final'?'final_submitted':'submitted',submittedAt:row.submittedAt??new Date(),submittedContent:content,responseDeadline:null,revision:revision+1,updatedAt:new Date()}).where(and(this.scope(context),eq(works.id,id))).returning();
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
      return { event: { id: state.event.id, nameEs: state.event.nameEs, nameEn: state.event.nameEn, timezone: state.event.timezone },
        works: rows.map(({callTimezone,ownerId,...row}) => ({ ...row, canManage:ownerId===context.personId, editable: this.editable(row,state,callTimezone), submittedAt: row.submittedAt?.toISOString() ?? null, createdAt: row.createdAt.toISOString(), updatedAt: row.updatedAt.toISOString() })), call: state.call, editable: state.editable, reason: state.reason, languages: state.languages,requireSubmittingAuthorOrcid:state.requireSubmittingAuthorOrcid };
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
      await this.audit.record(tx, context, 'work.draft.saved', state.event.id, id); return this.detail(tx,row,state);
    });
  }
}
