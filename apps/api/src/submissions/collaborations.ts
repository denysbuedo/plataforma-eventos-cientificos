import { Body, Controller, Get, Injectable, Param, Post, Req } from '@nestjs/common';
import { ApiBearerAuth, ApiCreatedResponse, ApiOkResponse, ApiProperty, ApiTags } from '@nestjs/swagger';
import { IsInt, IsString, IsUUID, Matches, Max, Min, isUUID } from 'class-validator';
import { and, eq, sql } from 'drizzle-orm';
import { createHash, randomBytes, randomUUID } from 'node:crypto';
import type { CreatedWorkCollaboration, WorkCollaboration } from '@sep/contracts';
import { DatabaseService } from '../database/database.service.js';
import { authorWorks, orcidConnections, workCollaborations } from '../database/schema.js';
import { ApiException, type RequestContext, type SepRequest } from '../common/http.js';
import { AuditService } from '../common/audit.service.js';
import { Access } from '../platform/context.guard.js';
import { ApiErrors } from '../common/openapi.js';
import { AuthorWorksService } from './works.service.js';
import { WorkDto } from './works.dto.js';
class WorkRevisionDto { @ApiProperty() @IsInt() @Min(1) @Max(2147483646) revision!:number; }
class CreateCollaborationDto extends WorkRevisionDto { @ApiProperty({format:'uuid'}) @IsUUID() authorId!:string; }
class AcceptCollaborationDto { @ApiProperty() @IsString() @Matches(/^[A-Za-z0-9_-]{43}$/) token!:string; }
class CollaborationDto implements WorkCollaboration {
  @ApiProperty({format:'uuid'}) id!:string; @ApiProperty({format:'uuid'}) authorId!:string; @ApiProperty() email!:string;
  @ApiProperty({enum:['pending','accepted','revoked','expired']}) status!:WorkCollaboration['status'];
  @ApiProperty({format:'date-time'}) createdAt!:string; @ApiProperty({format:'date-time'}) expiresAt!:string;
  @ApiProperty({type:String,nullable:true,format:'date-time'}) acceptedAt!:string|null;
}
class CreatedCollaborationDto { @ApiProperty({type:CollaborationDto}) invitation!:WorkCollaboration; @ApiProperty() token!:string; @ApiProperty({type:WorkDto}) work!:CreatedWorkCollaboration['work']; }
const hash=(token:string)=>createHash('sha256').update(token).digest('hex');
function view(row:typeof workCollaborations.$inferSelect):WorkCollaboration {
  return {id:row.id,authorId:row.authorId,email:row.email,status:row.status==='pending'&&row.expiresAt<=new Date()?'expired':row.status,createdAt:row.createdAt.toISOString(),expiresAt:row.expiresAt.toISOString(),acceptedAt:row.acceptedAt?.toISOString()??null};
}
@Injectable()
export class WorkCollaborationsService {
  constructor(private readonly database:DatabaseService,private readonly works:AuthorWorksService,private readonly audit:AuditService){}
  list(context:RequestContext,id:string){return this.database.scoped({...context,organizationAdmin:false},async tx=>{
    await this.works.state(tx,context);const [work]=await tx.select().from(authorWorks).where(and(this.works.scope(context),eq(authorWorks.id,id)));
    if(!work)throw new ApiException(404,'NOT_FOUND');if(work.ownerId!==context.personId)throw new ApiException(403,'FORBIDDEN');
    const rows=await tx.select().from(workCollaborations).where(eq(workCollaborations.workId,id)).orderBy(workCollaborations.createdAt).limit(100);return rows.map(view);
  });}
  create(context:RequestContext,id:string,dto:CreateCollaborationDto):Promise<CreatedWorkCollaboration>{return this.database.scoped({...context,organizationAdmin:false},async tx=>{
    const state=await this.works.state(tx,context,true);const [work]=await tx.select().from(authorWorks).where(and(this.works.scope(context),eq(authorWorks.id,id))).for('update');
    if(!work)throw new ApiException(404,'NOT_FOUND');if(work.ownerId!==context.personId)throw new ApiException(403,'FORBIDDEN');
    if(!state.active)throw new ApiException(409,'WORKS_UNAVAILABLE');if(work.revision!==dto.revision)throw new ApiException(409,'REVISION_CONFLICT');
    const author=work.authors.find(author=>author.id===dto.authorId&&author.corresponding);
    if(!author?.email||author.personId===context.personId)throw new ApiException(400,'WORK_COLLABORATION_TARGET');
    const [{count}]=await tx.select({count:sql<number>`count(*)::int`}).from(workCollaborations).where(eq(workCollaborations.workId,id));if(count>=100)throw new ApiException(409,'WORK_COLLABORATION_LIMIT');
    await tx.update(workCollaborations).set({status:'revoked'}).where(and(eq(workCollaborations.workId,id),eq(workCollaborations.status,'pending'),sql`${workCollaborations.expiresAt}<=now()`));
    const [existing]=await tx.select().from(workCollaborations).where(and(eq(workCollaborations.workId,id),eq(workCollaborations.authorId,author.id),sql`${workCollaborations.status} IN ('pending','accepted')`));if(existing)throw new ApiException(409,'CONFLICT');
    const token=randomBytes(32).toString('base64url');const [row]=await tx.insert(workCollaborations).values({id:randomUUID(),organizationId:context.organizationId,eventId:context.eventId!,workId:id,ownerId:context.personId!,authorId:author.id,email:author.email,tokenHash:hash(token),expiresAt:new Date(Date.now()+7*86400000)}).returning();
    const [next]=await tx.update(authorWorks).set({revision:work.revision+1,updatedAt:new Date()}).where(eq(authorWorks.id,id)).returning();
    await this.works.record(tx,context,id,'collaboration_invited');await this.audit.record(tx,context,'work.collaboration.invited',context.eventId!,row.id);
    return {invitation:view(row),token,work:await this.works.detail(tx,next,state)};
  });}
  revoke(context:RequestContext,id:string,invitationId:string,revision:number){return this.database.scoped({...context,organizationAdmin:false},async tx=>{
    const state=await this.works.state(tx,context,true);const [work]=await tx.select().from(authorWorks).where(and(this.works.scope(context),eq(authorWorks.id,id))).for('update');
    if(!work)throw new ApiException(404,'NOT_FOUND');if(work.ownerId!==context.personId)throw new ApiException(403,'FORBIDDEN');if(work.revision!==revision)throw new ApiException(409,'REVISION_CONFLICT');
    const [row]=await tx.update(workCollaborations).set({status:'revoked'}).where(and(eq(workCollaborations.id,invitationId),eq(workCollaborations.workId,id),sql`${workCollaborations.status} IN ('pending','accepted')`)).returning();if(!row)throw new ApiException(409,'CONFLICT');
    const [next]=await tx.update(authorWorks).set({revision:work.revision+1,updatedAt:new Date()}).where(eq(authorWorks.id,id)).returning();
    await this.works.record(tx,context,id,'collaboration_revoked');await this.audit.record(tx,context,'work.collaboration.revoked',context.eventId!,invitationId);return this.works.detail(tx,next,state);
  });}
  accept(context:RequestContext,token:string){return this.database.scoped({...context,organizationAdmin:false},async tx=>{
    const state=await this.works.state(tx,context,true);if(!state.active)throw new ApiException(409,'WORKS_UNAVAILABLE');
    await tx.execute(sql`SELECT set_config('sep.work_invitation_hash',${hash(token)},true)`);
    const [grant]=await tx.select().from(workCollaborations).where(eq(workCollaborations.tokenHash,hash(token))).for('update');if(!grant)throw new ApiException(404,'NOT_FOUND');
    if(grant.ownerId===context.personId)throw new ApiException(403,'WORK_COLLABORATION_TARGET');
    if(context.authMode!=='development-token'&&(!context.verifiedEmail||context.verifiedEmail!==grant.email))throw new ApiException(403,'WORK_COLLABORATION_EMAIL');
    if(grant.status==='accepted'&&grant.personId!==context.personId)throw new ApiException(409,'CONFLICT');
    if(grant.status==='revoked'||grant.status==='pending'&&grant.expiresAt<=new Date())throw new ApiException(409,'WORK_COLLABORATION_EXPIRED');
    await tx.update(workCollaborations).set({status:'accepted',personId:context.personId!,acceptedAt:grant.acceptedAt??new Date()}).where(eq(workCollaborations.id,grant.id));
    const [work]=await tx.select().from(authorWorks).where(and(this.works.scope(context),eq(authorWorks.id,grant.workId))).for('update');if(!work)throw new ApiException(404,'NOT_FOUND');
    const author=work.authors.find(author=>author.id===grant.authorId&&author.corresponding&&author.email===grant.email);
    if(!author||author.personId&&author.personId!==context.personId||work.authors.some(item=>item.id!==author.id&&item.personId===context.personId))throw new ApiException(409,'WORK_COLLABORATION_TARGET');
    if(grant.status==='accepted')return this.works.detail(tx,work,state);
    const [orcid]=await tx.select().from(orcidConnections).where(eq(orcidConnections.personId,context.personId!));
    const authors=work.authors.map(item=>item.id===author.id?{...item,personId:context.personId!,orcid:orcid?.orcid??'',orcidVerified:!!orcid?.connectedAt&&orcid.environment==='production'}:item);
    const [next]=await tx.update(authorWorks).set({authors,revision:work.revision+1,updatedAt:new Date()}).where(eq(authorWorks.id,work.id)).returning();
    await this.works.record(tx,context,work.id,'collaboration_accepted');await this.audit.record(tx,context,'work.collaboration.accepted',context.eventId!,grant.id);return this.works.detail(tx,next,state);
  });}
}
function uuids(...values:string[]){if(values.some(value=>!isUUID(value)))throw new ApiException(400,'VALIDATION_FAILED');}
@ApiTags('submissions') @ApiBearerAuth() @ApiErrors() @Controller('events/:eventId')
export class WorkCollaborationsController {
  constructor(private readonly service:WorkCollaborationsService){}
  @Get('my-works/:workId/collaborations') @Access('author-work') @ApiOkResponse({type:[CollaborationDto]}) list(@Req()req:SepRequest,@Param('workId')id:string){uuids(id);return this.service.list(req.security,id);}
  @Post('my-works/:workId/collaborations') @Access('author-work') @ApiCreatedResponse({type:CreatedCollaborationDto}) create(@Req()req:SepRequest,@Param('workId')id:string,@Body()dto:CreateCollaborationDto){uuids(id);return this.service.create(req.security,id,dto);}
  @Post('my-works/:workId/collaborations/:invitationId/revoke') @Access('author-work') @ApiOkResponse({type:WorkDto}) revoke(@Req()req:SepRequest,@Param('workId')id:string,@Param('invitationId')invitationId:string,@Body()dto:WorkRevisionDto){uuids(id,invitationId);return this.service.revoke(req.security,id,invitationId,dto.revision);}
  @Post('work-collaborations/accept') @Access('author-work') @ApiOkResponse({type:WorkDto}) accept(@Req()req:SepRequest,@Body()dto:AcceptCollaborationDto){return this.service.accept(req.security,dto.token);}
}
