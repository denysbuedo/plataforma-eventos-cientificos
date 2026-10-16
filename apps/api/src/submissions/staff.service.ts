import { Injectable } from '@nestjs/common';
import { and, eq, isNotNull, desc, sql } from 'drizzle-orm';
import type { SubmissionPage, StaffWork } from '@sep/contracts';
import { authorWorks as works, workVersions } from '../database/schema.js';
import { AuthorizationService } from '../identity/authorization.service.js';
import { AuditService } from '../common/audit.service.js';
import { ApiException, type RequestContext } from '../common/http.js';
import { AuthorWorksService } from './works.service.js';
import type { WorkDecisionDto, SubmissionQuery } from './workflow.dto.js';
@Injectable()
export class SubmissionsStaffService {
  constructor(private readonly authorization:AuthorizationService,private readonly authors:AuthorWorksService,private readonly audit:AuditService) {}
  private scope(c:RequestContext) {return and(eq(works.organizationId,c.organizationId),eq(works.eventId,c.eventId!),isNotNull(works.submittedAt));}
  list(context:RequestContext,query:SubmissionQuery):Promise<SubmissionPage> {
    return this.authorization.run(context,'submissions-manage',async tx=>{
      const rows=await tx.select({id:works.id,title:sql<string>`submitted_content->>'title'`,language:sql<'es'|'en'>`submitted_content->>'language'`,trackId:sql<string>`submitted_content->>'trackId'`,contributionTypeId:sql<string>`submitted_content->>'contributionTypeId'`,status:works.status,revision:works.revision,submittedAt:works.submittedAt,responseDeadline:works.responseDeadline,createdAt:works.createdAt,updatedAt:works.updatedAt})
        .from(works).where(and(this.scope(context),query.status?eq(works.status,query.status):undefined,query.q?sql`strpos(lower(submitted_content->>'title'),lower(${query.q})) > 0`:undefined)).orderBy(desc(works.submittedAt),works.id).limit(query.limit).offset(query.offset);
      return {data:rows.map(row=>({...row,canManage:false,editable:false,submittedAt:row.submittedAt!.toISOString(),createdAt:row.createdAt.toISOString(),updatedAt:row.updatedAt.toISOString()})),...query};
    });
  }
  read(context:RequestContext,id:string):Promise<StaffWork> {
    return this.authorization.run(context,'submissions-manage',async tx=>{
      const state=await this.authors.state(tx,context);const [row]=await tx.select().from(works).where(and(this.scope(context),eq(works.id,id)));
      if(!row?.submittedContent)throw new ApiException(404,'NOT_FOUND');
      return {...await this.authors.detail(tx,row,state,true),canDecide:row.ownerId!==context.personId && !row.authors.some(a=>a.personId===context.personId) && !row.submittedContent?.authors.some(a=>a.personId===context.personId) && state.active};
    });
  }
  decide(context:RequestContext,id:string,dto:WorkDecisionDto):Promise<StaffWork> {
    return this.authorization.run(context,'submissions-manage',async tx=>{
      const state=await this.authors.state(tx,context,true);const [row]=await tx.select().from(works).where(and(this.scope(context),eq(works.id,id))).for('update');
      if(!row?.submittedContent)throw new ApiException(404,'NOT_FOUND');
      if(row.ownerId===context.personId||row.authors.some(a=>a.personId===context.personId)||row.submittedContent?.authors.some(a=>a.personId===context.personId))throw new ApiException(403,'SELF_DECISION');
      if(!state.active)throw new ApiException(409,'CONFLICT');
      if(row.revision!==dto.revision)throw new ApiException(409,'REVISION_CONFLICT');
      const allowed=dto.decision==='final_requested'?row.status==='accepted':['submitted','in_review','final_submitted'].includes(row.status)&&!(dto.decision==='in_review'&&row.status==='in_review');
      if(!allowed)throw new ApiException(409,'CONFLICT');
      const requested=['changes_requested','final_requested'].includes(dto.decision);
      if(requested && (!dto.responseDeadline || dto.responseDeadline<this.authors.today(row.call.timezone)) || !requested && dto.responseDeadline!==null)throw new ApiException(400,'RESPONSE_DEADLINE');
      const [next]=await tx.update(works).set({status:dto.decision,responseDeadline:dto.responseDeadline,revision:row.revision+1,updatedAt:new Date()}).where(and(this.scope(context),eq(works.id,id))).returning();
      await this.authors.record(tx,context,id,dto.decision,dto.message,'staff');await this.audit.record(tx,context,'work.decision',context.eventId!,id);
      return {...await this.authors.detail(tx,next,state,true),canDecide:true};
    });
  }
  version(context:RequestContext,id:string,versionId:string) {
    return this.authorization.run(context,'submissions-manage',async tx=>{
      const [row]=await tx.select().from(workVersions).where(and(eq(workVersions.workId,id),eq(workVersions.id,versionId)));
      if(!row)throw new ApiException(404,'NOT_FOUND');return {id:row.id,number:row.number,kind:row.kind,content:row.content,createdAt:row.createdAt.toISOString()};
    });
  }
  file(context:RequestContext,id:string,fileId:string) {return this.authorization.run(context,'submissions-manage',tx=>this.authors.file(tx,id,fileId));}
}
