import {Injectable} from '@nestjs/common';
import {and,desc,eq,sql} from 'drizzle-orm';
import type {AnyPgColumn} from 'drizzle-orm/pg-core';
import {randomUUID} from 'node:crypto';
import type {ReviewAssignment,ReviewRound,ReviewMember,ReviewWorkspace,WorkReviewFile} from '@sep/contracts';
import {DatabaseService,type DbTransaction} from '../database/database.service.js';
import {reviewMembers as members,reviewRounds as rounds,reviewAssignments as assignments,reviewConflicts as conflicts,authorWorks as works,workVersions,people} from '../database/schema.js';
import {AuthorizationService} from '../identity/authorization.service.js';
import {lookupResearcher} from '../identity/researchers.controller.js';
import {ApiException,type RequestContext} from '../common/http.js';
import {AuditService} from '../common/audit.service.js';
import {AuthorWorksService} from './works.service.js';
import type {InviteReviewerDto,MemberResponseDto,CreateReviewRoundDto,AssignReviewerDto,ReviewResponseDto,SaveReviewDto,WorkMessageDto} from './reviews.dto.js';
import type {WorkDecisionDto} from './workflow.dto.js';
type AssignmentRow=typeof assignments.$inferSelect;
type RoundRow=typeof rounds.$inferSelect;
const memberView=(row:typeof members.$inferSelect):ReviewMember=>({personId:row.personId,name:row.name,status:row.status,expertise:row.expertise,revision:row.revision,createdAt:row.createdAt.toISOString()});
const roundView=(row:RoundRow):ReviewRound=>({id:row.id,workId:row.workId,versionId:row.versionId,versionNumber:row.versionNumber,number:row.number,status:row.status,deadline:row.deadline,timezone:row.timezone,minimumReviews:row.minimumReviews,criteria:row.criteria,revision:row.revision,createdAt:row.createdAt.toISOString(),closedAt:row.closedAt?.toISOString()??null});
const scope=(table:{organizationId:AnyPgColumn;eventId:AnyPgColumn},c:RequestContext)=>and(eq(table.organizationId,c.organizationId),eq(table.eventId,c.eventId!));
@Injectable()
export class PeerReviewService {
 constructor(private readonly database:DatabaseService,private readonly authorization:AuthorizationService,private readonly authors:AuthorWorksService,private readonly audit:AuditService){}
 private async actor(tx:DbTransaction,c:RequestContext){if(!c.personId||!c.eventId)throw new ApiException(401,'UNAUTHORIZED');const [person]=await tx.select().from(people).where(and(eq(people.id,c.personId),eq(people.active,true)));if(!person)throw new ApiException(401,'UNAUTHORIZED');await tx.execute(sql`SELECT set_config('sep.review_email',${c.verifiedEmail??''},true)`);return person;}
 private own<T>(c:RequestContext,action:(tx:DbTransaction)=>Promise<T>){return this.database.scoped({...c,organizationAdmin:false},async tx=>{await this.actor(tx,c);return action(tx);});}
 private async conflict(tx:DbTransaction,c:RequestContext,workId:string,personId:string){const result=await tx.execute<{blocked:boolean}&Record<string,unknown>>(sql`SELECT sep_review_conflict(${c.organizationId}::uuid,${c.eventId}::uuid,${workId}::uuid,${personId}::uuid) AS blocked`);return result.rows[0].blocked;}
 private async available(tx:DbTransaction,c:RequestContext,row:AssignmentRow,round:RoundRow,lock=false){const result=await tx.execute<{available:boolean}&Record<string,unknown>>(sql`SELECT sep_review_available(${c.organizationId}::uuid,${c.eventId}::uuid,${row.workId}::uuid,${round.versionId}::uuid,${lock}) AS available`);return result.rows[0].available;}
 private projection(row:AssignmentRow,round:RoundRow,available:boolean,staff=false):ReviewAssignment {
  // Draft evaluations belong exclusively to their reviewer, including confidential draft notes.
  const evaluation=staff&&!row.submittedAt?null:row.evaluation;
  return {id:row.id,roundId:row.roundId,workId:row.workId,reviewerId:row.reviewerId,reviewerName:row.reviewerName,status:row.status,title:row.content.title,versionNumber:round.versionNumber,deadline:round.deadline,timezone:round.timezone,revision:row.revision,submittedAt:row.submittedAt?.toISOString()??null,message:row.message,evaluation,criteria:round.criteria,available,...(available||staff?{content:row.content}:{})};
 }
 async roster(c:RequestContext):Promise<ReviewWorkspace>{return this.authorization.run(c,'submissions-manage',async tx=>{const rows=await tx.select().from(members).where(scope(members,c)).orderBy(members.name).limit(200);const load=await tx.select({personId:assignments.reviewerId,count:sql<number>`count(*)::integer`}).from(assignments).innerJoin(rounds,eq(rounds.id,assignments.roundId)).innerJoin(works,eq(works.id,assignments.workId)).where(and(scope(assignments,c),eq(rounds.status,'open'),sql`${assignments.status} IN ('invited','accepted') AND ${works.status} IN ('submitted','in_review','final_submitted') AND ${rounds.deadline}>=(now() AT TIME ZONE ${rounds.timezone})::date AND NOT EXISTS(SELECT 1 FROM work_versions v WHERE v.work_id=${works.id} AND v.number>${rounds.versionNumber}) AND NOT sep_review_conflict(${c.organizationId}::uuid,${c.eventId}::uuid,${assignments.workId},${assignments.reviewerId})`)).groupBy(assignments.reviewerId);return {members:rows.map(row=>({...memberView(row),pendingReviews:load.find(item=>item.personId===row.personId)?.count??0})),assignments:[]};});}
 async nominate(c:RequestContext,dto:InviteReviewerDto){return this.authorization.run(c,'submissions-manage',async tx=>{
  if(!(await this.authors.state(tx,c,true)).active)throw new ApiException(409,'REVIEW_UNAVAILABLE');await tx.execute(sql`SELECT pg_advisory_xact_lock(hashtextextended(${'review-roster:'+c.eventId},0))`);
  const [old]=await tx.select().from(members).where(and(scope(members,c),eq(members.personId,dto.personId))).for('update');
  if(old&&['accepted','invited'].includes(old.status))throw new ApiException(409,'CONFLICT');
  const candidate=await lookupResearcher(tx,dto.personId);if(!candidate)throw new ApiException(400,'RESEARCHER_UNAVAILABLE');
  const count=await tx.select({count:sql<number>`count(*)::integer`}).from(members).where(scope(members,c));if(!old&&count[0].count>=200)throw new ApiException(409,'REVIEW_LIMIT');
  const values={name:candidate.name,status:'invited' as const,expertise:dto.expertise,revision:(old?.revision??0)+1};
  const [row]=await tx.insert(members).values({organizationId:c.organizationId,eventId:c.eventId!,personId:dto.personId,...values}).onConflictDoUpdate({target:[members.organizationId,members.eventId,members.personId],set:values}).returning();
  await this.audit.record(tx,c,'review.member.invited',c.eventId!,dto.personId);return memberView(row);
 });}
 async memberResponse(c:RequestContext,dto:MemberResponseDto){return this.own(c,async tx=>{
  const [row]=await tx.select().from(members).where(and(scope(members,c),eq(members.personId,c.personId!))).for('update');if(!row)throw new ApiException(404,'NOT_FOUND');if(row.revision!==dto.revision)throw new ApiException(409,'REVISION_CONFLICT');if(row.status!=='invited')throw new ApiException(409,'CONFLICT');
  const [next]=await tx.update(members).set({status:dto.action==='accept'?'accepted':'declined',revision:row.revision+1}).where(and(scope(members,c),eq(members.personId,c.personId!))).returning();await this.audit.record(tx,c,'review.member.responded',c.eventId!,c.personId!);return memberView(next);
 });}
 async revokeMember(c:RequestContext,personId:string,dto:WorkMessageDto){return this.authorization.run(c,'submissions-manage',async tx=>{
  const [row]=await tx.select().from(members).where(and(scope(members,c),eq(members.personId,personId))).for('update');if(!row)throw new ApiException(404,'NOT_FOUND');if(row.revision!==dto.revision)throw new ApiException(409,'REVISION_CONFLICT');if(row.status==='revoked')throw new ApiException(409,'CONFLICT');
  const [next]=await tx.update(members).set({status:'revoked',revision:row.revision+1}).where(and(scope(members,c),eq(members.personId,personId))).returning();
  await tx.update(assignments).set({status:'revoked',message:dto.message,revision:sql`${assignments.revision}+1`}).where(and(scope(assignments,c),eq(assignments.reviewerId,personId),sql`${assignments.status} IN ('invited','accepted')`));await this.audit.record(tx,c,'review.member.revoked',c.eventId!,personId);return memberView(next);
 });}
 private async staffWork(tx:DbTransaction,c:RequestContext,id:string,revision?:number){
  const state=await this.authors.state(tx,c,true);const [row]=await tx.select().from(works).where(and(scope(works,c),eq(works.id,id))).for('update');if(!row?.submittedContent)throw new ApiException(404,'NOT_FOUND');if(!state.active)throw new ApiException(409,'REVIEW_UNAVAILABLE');if(revision!==undefined&&row.revision!==revision)throw new ApiException(409,'REVISION_CONFLICT');return row;
 }
 async file(c:RequestContext,workId:string):Promise<WorkReviewFile>{return this.authorization.run(c,'submissions-manage',tx=>this.fileIn(tx,c,workId));}
 private async fileIn(tx:DbTransaction,c:RequestContext,workId:string):Promise<WorkReviewFile>{const [work]=await tx.select({id:works.id}).from(works).where(and(scope(works,c),eq(works.id,workId)));if(!work)throw new ApiException(404,'NOT_FOUND');if(await this.conflict(tx,c,workId,c.personId!))throw new ApiException(403,'REVIEW_CONFLICT');const rows=await tx.select().from(rounds).where(and(scope(rounds,c),eq(rounds.workId,workId))).orderBy(desc(rounds.number));const assigned=await tx.select().from(assignments).where(and(scope(assignments,c),eq(assignments.workId,workId))).orderBy(assignments.reviewerName);const projected:ReviewAssignment[]=[];const blocked=new Map<string,boolean>();for(const item of assigned){if(!blocked.has(item.reviewerId))blocked.set(item.reviewerId,await this.conflict(tx,c,workId,item.reviewerId));projected.push({...this.projection(item,rows.find(round=>round.id===item.roundId)!,true,true),eligible:!blocked.get(item.reviewerId)});}return {rounds:rows.map(roundView),assignments:projected};}
 async createRound(c:RequestContext,workId:string,dto:CreateReviewRoundDto){return this.authorization.run(c,'submissions-manage',async tx=>{
  const row=await this.staffWork(tx,c,workId,dto.revision);if(!['submitted','in_review','final_submitted'].includes(row.status))throw new ApiException(409,'REVIEW_UNAVAILABLE');
  if(await this.conflict(tx,c,workId,c.personId!))throw new ApiException(403,'REVIEW_CONFLICT');
  if(dto.deadline<this.authors.today(row.call.timezone))throw new ApiException(400,'RESPONSE_DEADLINE');
  const [version]=await tx.select().from(workVersions).where(and(eq(workVersions.workId,workId),scope(workVersions,c))).orderBy(desc(workVersions.number)).limit(1);if(!version)throw new ApiException(409,'CONFLICT');
  const previous=await tx.select().from(rounds).where(and(scope(rounds,c),eq(rounds.workId,workId))).orderBy(desc(rounds.number));
  if(previous.length>=20)throw new ApiException(409,'REVIEW_LIMIT');if(previous.some(item=>item.status==='open'))throw new ApiException(409,'CONFLICT');
  await tx.insert(rounds).values({id:randomUUID(),organizationId:c.organizationId,eventId:c.eventId!,workId,versionId:version.id,versionNumber:version.number,number:(previous[0]?.number??0)+1,deadline:dto.deadline,timezone:row.call.timezone,minimumReviews:dto.minimumReviews,criteria:dto.criteria});
  await this.authors.record(tx,c,workId,'review_round_opened',`Versión / Version ${version.number}`,'staff');await this.audit.record(tx,c,'review.round.created',c.eventId!,workId);return this.fileIn(tx,c,workId);
 });}
 async closeRound(c:RequestContext,workId:string,roundId:string,dto:WorkMessageDto){return this.authorization.run(c,'submissions-manage',async tx=>{
  await this.staffWork(tx,c,workId);if(await this.conflict(tx,c,workId,c.personId!))throw new ApiException(403,'REVIEW_CONFLICT');const [round]=await tx.select().from(rounds).where(and(scope(rounds,c),eq(rounds.workId,workId),eq(rounds.id,roundId))).for('update');if(!round)throw new ApiException(404,'NOT_FOUND');if(round.revision!==dto.revision)throw new ApiException(409,'REVISION_CONFLICT');if(round.status!=='open')throw new ApiException(409,'CONFLICT');
  await tx.update(rounds).set({status:'closed',closedAt:new Date(),revision:round.revision+1}).where(eq(rounds.id,roundId));await this.authors.record(tx,c,workId,'review_round_closed',dto.message,'staff');await this.audit.record(tx,c,'review.round.closed',c.eventId!,roundId);return this.fileIn(tx,c,workId);
 });}
 async assign(c:RequestContext,workId:string,roundId:string,dto:AssignReviewerDto){return this.authorization.run(c,'submissions-manage',async tx=>{
  const work=await this.staffWork(tx,c,workId);if(await this.conflict(tx,c,workId,c.personId!))throw new ApiException(403,'REVIEW_CONFLICT');
  const [round]=await tx.select().from(rounds).where(and(scope(rounds,c),eq(rounds.workId,workId),eq(rounds.id,roundId))).for('update');if(!round)throw new ApiException(404,'NOT_FOUND');if(round.revision!==dto.revision)throw new ApiException(409,'REVISION_CONFLICT');if(round.status!=='open'||!['submitted','in_review','final_submitted'].includes(work.status)||round.deadline<this.authors.today(round.timezone))throw new ApiException(409,'REVIEW_UNAVAILABLE');
  const [latest]=await tx.select().from(workVersions).where(eq(workVersions.workId,workId)).orderBy(desc(workVersions.number)).limit(1);if(latest?.id!==round.versionId)throw new ApiException(409,'REVIEW_UNAVAILABLE');
  const [member]=await tx.select().from(members).where(and(scope(members,c),eq(members.personId,dto.reviewerId))).for('update');if(member?.status!=='accepted')throw new ApiException(409,'REVIEW_UNAVAILABLE');
  if(await this.conflict(tx,c,workId,dto.reviewerId))throw new ApiException(409,'REVIEW_CONFLICT');
  const existing=await tx.select({reviewerId:assignments.reviewerId}).from(assignments).where(eq(assignments.roundId,roundId));if(existing.some(item=>item.reviewerId===dto.reviewerId))throw new ApiException(409,'CONFLICT');if(existing.length>=20)throw new ApiException(409,'REVIEW_LIMIT');
  const count=await tx.select({count:sql<number>`count(*)::integer`}).from(assignments).where(and(scope(assignments,c),eq(assignments.reviewerId,dto.reviewerId)));if(count[0].count>=1000)throw new ApiException(409,'REVIEW_LIMIT');
  const content=latest.content;await tx.insert(assignments).values({id:randomUUID(),organizationId:c.organizationId,eventId:c.eventId!,workId,roundId,reviewerId:dto.reviewerId,reviewerName:member.name,content:{title:content.title,abstract:content.abstract,keywords:content.keywords,language:content.language,authors:content.authors.map(author=>({fullName:author.fullName,affiliations:author.affiliations})),manuscript:content.manuscript}});
  await tx.update(rounds).set({revision:round.revision+1}).where(eq(rounds.id,roundId));await this.audit.record(tx,c,'review.assigned',c.eventId!,workId);return this.fileIn(tx,c,workId);
 });}
 async revokeAssignment(c:RequestContext,workId:string,id:string,dto:WorkMessageDto){return this.authorization.run(c,'submissions-manage',async tx=>{
  await this.staffWork(tx,c,workId);if(await this.conflict(tx,c,workId,c.personId!))throw new ApiException(403,'REVIEW_CONFLICT');const [row]=await tx.select().from(assignments).where(and(scope(assignments,c),eq(assignments.workId,workId),eq(assignments.id,id))).for('update');if(!row)throw new ApiException(404,'NOT_FOUND');if(row.revision!==dto.revision)throw new ApiException(409,'REVISION_CONFLICT');if(!['invited','accepted','submitted'].includes(row.status))throw new ApiException(409,'CONFLICT');await tx.update(assignments).set({status:'revoked',message:dto.message,revision:row.revision+1}).where(eq(assignments.id,id));await this.audit.record(tx,c,'review.assignment.revoked',c.eventId!,id);return this.fileIn(tx,c,workId);
 });}
 async mineStatus(c:RequestContext){return this.own(c,async tx=>{
  const [member]=await tx.select().from(members).where(and(scope(members,c),eq(members.personId,c.personId!)));if(member?.status==='invited')return {count:1};if(member?.status!=='accepted')return {count:0};
  const [result]=await tx.select({count:sql<number>`count(*)::integer`}).from(assignments).innerJoin(rounds,eq(rounds.id,assignments.roundId)).where(and(scope(assignments,c),eq(assignments.reviewerId,c.personId!),sql`${assignments.status} IN ('invited','accepted') AND sep_review_available(${c.organizationId}::uuid,${c.eventId}::uuid,${assignments.workId},${rounds.versionId},false)`));return {count:result.count};
 });}
 async mine(c:RequestContext):Promise<ReviewWorkspace>{return this.own(c,async tx=>{
  const ownMembers=await tx.select().from(members).where(and(scope(members,c),eq(members.personId,c.personId!)));const rows=await tx.select({assignment:assignments,round:rounds}).from(assignments).innerJoin(rounds,eq(rounds.id,assignments.roundId)).where(and(scope(assignments,c),eq(assignments.reviewerId,c.personId!))).orderBy(desc(rounds.createdAt),assignments.id).limit(1000);
  return {members:ownMembers.map(memberView),assignments:rows.map(({assignment,round})=>({...this.projection(assignment,round,false),evaluation:null}))};
 });}
 private async ownAssignment(tx:DbTransaction,c:RequestContext,id:string,lock=false){
  const [entry]=await tx.select({assignment:assignments,round:rounds}).from(assignments).innerJoin(rounds,eq(rounds.id,assignments.roundId)).where(and(scope(assignments,c),eq(assignments.id,id),eq(assignments.reviewerId,c.personId!)));if(!entry)throw new ApiException(404,'NOT_FOUND');
  const available=await this.available(tx,c,entry.assignment,entry.round,lock);
  if(lock){await tx.select().from(members).where(and(scope(members,c),eq(members.personId,c.personId!))).for('update');const [assignment]=await tx.select().from(assignments).where(eq(assignments.id,id)).for('update');if(!assignment)throw new ApiException(404,'NOT_FOUND');const [round]=await tx.select().from(rounds).where(eq(rounds.id,assignment.roundId));return {assignment,round,available};}return {...entry,available};
 }
 async read(c:RequestContext,id:string){return this.own(c,async tx=>{const {assignment,round,available}=await this.ownAssignment(tx,c,id);return this.projection(assignment,round,available);});}
 async respond(c:RequestContext,id:string,dto:ReviewResponseDto){return this.own(c,async tx=>{
  const {assignment:row,round,available}=await this.ownAssignment(tx,c,id,true);if(row.revision!==dto.revision)throw new ApiException(409,'REVISION_CONFLICT');
  if(dto.action==='accept'&&(!available||round.deadline<this.authors.today(round.timezone)||row.status!=='invited'))throw new ApiException(409,'REVIEW_UNAVAILABLE');
  if(dto.action==='decline'&&row.status!=='invited'||dto.action==='conflict'&&!['invited','accepted','submitted'].includes(row.status))throw new ApiException(409,'CONFLICT');if(dto.action!=='accept'&&dto.message.length<10)throw new ApiException(400,'VALIDATION_FAILED');
  if(dto.action==='conflict')await tx.insert(conflicts).values({organizationId:c.organizationId,eventId:c.eventId!,workId:row.workId,personId:c.personId!,reason:dto.message}).onConflictDoNothing();
  const [next]=await tx.update(assignments).set({status:dto.action==='accept'?'accepted':dto.action==='decline'?'declined':'conflict',message:dto.message,revision:row.revision+1}).where(eq(assignments.id,id)).returning();await this.audit.record(tx,c,'review.responded',c.eventId!,id);return this.projection(next,round,dto.action==='accept'&&available);
 });}
 async save(c:RequestContext,id:string,dto:SaveReviewDto,submit=false){return this.own(c,async tx=>{
  const {assignment:row,round,available}=await this.ownAssignment(tx,c,id,true);if(row.revision!==dto.revision)throw new ApiException(409,'REVISION_CONFLICT');if(!available||row.status!=='accepted'||round.deadline<this.authors.today(round.timezone))throw new ApiException(409,'REVIEW_UNAVAILABLE');
  const ids=dto.evaluation.scores.map(item=>item.criterionId);if(new Set(ids).size!==ids.length||ids.some(id=>!round.criteria.some(item=>item.id===id)))throw new ApiException(400,'VALIDATION_FAILED');
  if(submit&&(ids.length!==round.criteria.length||!dto.evaluation.recommendation||dto.evaluation.authorComments.length<10))throw new ApiException(400,'VALIDATION_FAILED');
  const [next]=await tx.update(assignments).set({evaluation:dto.evaluation,status:submit?'submitted':'accepted',submittedAt:submit?new Date():null,revision:row.revision+1}).where(eq(assignments.id,id)).returning();await this.audit.record(tx,c,submit?'review.submitted':'review.saved',c.eventId!,id);return this.projection(next,round,true);
 });}
 async pdf(c:RequestContext,id:string,fileId:string){return this.own(c,async tx=>{
  const {assignment,available}=await this.ownAssignment(tx,c,id);if(!available||!['accepted','submitted'].includes(assignment.status)||assignment.content.manuscript?.id!==fileId)throw new ApiException(404,'NOT_FOUND');return this.authors.file(tx,assignment.workId,fileId);
 });}
 async beforeDecision(tx:DbTransaction,c:RequestContext,work:typeof works.$inferSelect,dto:WorkDecisionDto){
  await tx.execute(sql`SELECT set_config('sep.review_email',${c.verifiedEmail??''},true)`);if(await this.conflict(tx,c,work.id,c.personId!))throw new ApiException(403,'REVIEW_CONFLICT');
  if(!['changes_requested','accepted','rejected'].includes(dto.decision))return;
  const rows=await tx.select().from(rounds).where(and(scope(rounds,c),eq(rounds.workId,work.id))).orderBy(desc(rounds.number));if(!rows.length)return;
  const latest=await tx.select({id:workVersions.id}).from(workVersions).where(eq(workVersions.workId,work.id)).orderBy(desc(workVersions.number)).limit(1);const round=rows[0];
  const sent=await tx.select().from(assignments).where(and(scope(assignments,c),eq(assignments.roundId,round.id),eq(assignments.status,'submitted'))).orderBy(assignments.id);
  const valid=[] as AssignmentRow[];for(const row of sent)if(!await this.conflict(tx,c,work.id,row.reviewerId))valid.push(row);
  const incomplete=round.status!=='open'||latest[0]?.id!==round.versionId||valid.length<round.minimumReviews;
  if(incomplete&&!dto.reviewOverrideReason)throw new ApiException(409,'REVIEW_INCOMPLETE');
  if(dto.reviewOverrideReason){await this.authors.record(tx,c,work.id,'review_decision_override',dto.reviewOverrideReason,'staff');await this.audit.record(tx,c,'review.decision.override',c.eventId!,work.id);}
  if(round.status==='open')await tx.update(rounds).set({status:'closed',closedAt:new Date(),revision:round.revision+1}).where(eq(rounds.id,round.id));
  // Only comments explicitly addressed to authors are released, never private notes, scores or reviewer identities.
  if(round.status==='open'&&latest[0]?.id===round.versionId&&valid.length){const message=valid.map((row,index)=>`Evaluación / Review ${index+1}\n${row.evaluation!.authorComments}`).join('\n\n');await this.authors.record(tx,c,work.id,'peer_reviews_released',message,'staff',{roundNumber:round.number,versionNumber:round.versionNumber,comments:valid.map((row,index)=>({number:index+1,text:row.evaluation!.authorComments}))});await this.audit.record(tx,c,'review.released',c.eventId!,work.id);}
 }
}
