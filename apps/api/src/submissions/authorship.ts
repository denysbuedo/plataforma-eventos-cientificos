import { Body, Controller, Get, Injectable, Param, Post, Req } from '@nestjs/common';
import { ApiBearerAuth, ApiOkResponse, ApiProperty, ApiTags } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import { IsIn, IsInt, IsString, IsUUID, Max, MaxLength, Min, isUUID } from 'class-validator';
import { sql } from 'drizzle-orm';
import type { AuthorshipWorkspace } from '@sep/contracts';
import type { ErrorCode } from '@sep/i18n';
import { DatabaseService, type DbTransaction } from '../database/database.service.js';
import { ApiException, type RequestContext, type SepRequest } from '../common/http.js';
import { ApiErrors } from '../common/openapi.js';
import { Access } from '../platform/context.guard.js';

class CandidateDto {
  @ApiProperty({format:'uuid'}) @IsUUID() workId!:string;
  @ApiProperty({format:'uuid'}) @IsUUID() authorId!:string;
  @ApiProperty({enum:['request','decline','disown']}) @IsIn(['request','decline','disown']) action!:'request'|'decline'|'disown';
  @ApiProperty({maxLength:2000,default:''}) @Transform(({value})=>typeof value==='string'?value.trim():value) @IsString() @MaxLength(2000) message='';
}
class DecisionDto {
  @ApiProperty({enum:['approve','reject','cancel','revoke']}) @IsIn(['approve','reject','cancel','revoke']) action!:'approve'|'reject'|'cancel'|'revoke';
  @ApiProperty() @IsInt() @Min(1) @Max(2147483646) revision!:number;
  @ApiProperty({maxLength:2000}) @Transform(({value})=>typeof value==='string'?value.trim():value) @IsString() @MaxLength(2000) message!:string;
}
class ResponsibilityDto {
  @ApiProperty({enum:['accept_responsibility','release_responsibility']}) @IsIn(['accept_responsibility','release_responsibility']) action!:'accept_responsibility'|'release_responsibility';
  @ApiProperty() @IsInt() @Min(1) @Max(2147483646) revision!:number;
}
class CandidateViewDto {
  @ApiProperty({format:'uuid'}) workId!:string; @ApiProperty({format:'uuid'}) authorId!:string;
  @ApiProperty() fullName!:string; @ApiProperty({enum:['account','email','orcid']}) basis!:string;
}
class ContributionViewDto { @ApiProperty({format:'uuid'}) workId!:string; @ApiProperty({format:'uuid'}) authorId!:string; @ApiProperty() fullName!:string; @ApiProperty() title!:string; @ApiProperty() status!:string; }
class ClaimViewDto extends CandidateViewDto {
  @ApiProperty({format:'uuid'}) id!:string; @ApiProperty() claimantName!:string;
  @ApiProperty({enum:['pending','approved','rejected','revoked']}) status!:string; @ApiProperty() revision!:number;
  @ApiProperty({format:'date-time'}) createdAt!:string; @ApiProperty({type:String,nullable:true,format:'date-time'}) decidedAt!:string|null;
  @ApiProperty() message!:string; @ApiProperty({type:String,nullable:true}) title!:string|null; @ApiProperty() stale!:boolean;
  @ApiProperty({enum:['submitter','corresponding']}) responsibility!:string;
  @ApiProperty() needsIndependentReview!:boolean; @ApiProperty() canDecide!:boolean; @ApiProperty() canCancel!:boolean; @ApiProperty() canRevoke!:boolean;
  @ApiProperty() unread!:boolean;
}
class ResponsibilityViewDto {
  @ApiProperty({format:'uuid'}) workId!:string; @ApiProperty() title!:string; @ApiProperty() revision!:number;
  @ApiProperty({enum:['submitter','corresponding']}) responsibility!:string; @ApiProperty() canAccept!:boolean; @ApiProperty() canRelease!:boolean;
}
class WorkspaceDto {
  @ApiProperty({type:[CandidateViewDto]}) candidates!:AuthorshipWorkspace['candidates'];
  @ApiProperty({type:[ContributionViewDto]}) contributions!:AuthorshipWorkspace['contributions'];
  @ApiProperty({type:[ClaimViewDto]}) claims!:AuthorshipWorkspace['claims'];
  @ApiProperty({type:[ResponsibilityViewDto]}) responsibilities!:AuthorshipWorkspace['responsibilities'];
}
export async function authorshipRpc(tx:DbTransaction,context:RequestContext,operation:string,workId:string|null=null,authorId:string|null=null,claimId:string|null=null,revision:number|null=null,message='') {
  const response=await tx.execute<{result:AuthorshipWorkspace|{error:ErrorCode}|{ok:true}}>(sql`SELECT public.sep_authorship(${operation},${workId}::uuid,${authorId}::uuid,${claimId}::uuid,${revision}::integer,${message},${context.requestId}::uuid) AS result`);
  const result=response.rows[0].result;
  if('error' in result){const code=result.error;throw new ApiException(code==='UNAUTHORIZED'?401:code==='NOT_FOUND'?404:['FORBIDDEN','AUTHORSHIP_SELF_APPROVAL'].includes(code)?403:code==='VALIDATION_FAILED'?400:409,code);}
  return result;
}
@Injectable()
export class AuthorshipService {
  constructor(private readonly database:DatabaseService){}
  run(context:RequestContext,operation='list',workId:string|null=null,authorId:string|null=null,claimId:string|null=null,revision:number|null=null,message=''):Promise<AuthorshipWorkspace>{
    return this.database.scoped({...context,organizationAdmin:false},async tx=>{
      // Email comes only from the authenticated principal. Demo tokens have no email proof.
      await tx.execute(sql`SELECT set_config('sep.authorship_email',${context.authMode==='development-token'?'':context.verifiedEmail?.toLowerCase()??''},true)`);
      const result=await authorshipRpc(tx,context,operation,workId,authorId,claimId,revision,message);
      if(operation==='list'||operation==='staff_list')return result as AuthorshipWorkspace;
      return await authorshipRpc(tx,context,operation.startsWith('staff_')?'staff_list':'list') as AuthorshipWorkspace;
    });
  }
}
@ApiTags('authorship') @ApiBearerAuth() @ApiErrors() @Controller('events/:eventId')
export class AuthorshipController {
  constructor(private readonly service:AuthorshipService){}
  @Get('authorship') @Access('author-work') @ApiOkResponse({type:WorkspaceDto}) list(@Req()req:SepRequest){return this.service.run(req.security);}
  @Post('authorship') @Access('author-work') @ApiOkResponse({type:WorkspaceDto}) candidate(@Req()req:SepRequest,@Body()dto:CandidateDto){return this.service.run(req.security,dto.action,dto.workId,dto.authorId,null,null,dto.message);}
  @Post('authorship/read') @Access('author-work') @ApiOkResponse({type:WorkspaceDto}) acknowledge(@Req()req:SepRequest){return this.service.run(req.security,'acknowledge');}
  @Post('authorship/claims/:claimId') @Access('author-work') @ApiOkResponse({type:WorkspaceDto}) decision(@Req()req:SepRequest,@Param('claimId')id:string,@Body()dto:DecisionDto){uuid(id);return this.service.run(req.security,dto.action,null,null,id,dto.revision,dto.message);}
  @Post('authorship/works/:workId/responsibility') @Access('author-work') @ApiOkResponse({type:WorkspaceDto}) responsibility(@Req()req:SepRequest,@Param('workId')id:string,@Body()dto:ResponsibilityDto){uuid(id);return this.service.run(req.security,dto.action,id,null,null,dto.revision);}
  @Get('authorship-review') @Access('submissions-manage') @ApiOkResponse({type:WorkspaceDto}) review(@Req()req:SepRequest){return this.service.run(req.security,'staff_list');}
  @Post('authorship-review/claims/:claimId') @Access('submissions-manage') @ApiOkResponse({type:WorkspaceDto}) resolve(@Req()req:SepRequest,@Param('claimId')id:string,@Body()dto:DecisionDto){uuid(id);if(dto.action==='cancel')throw new ApiException(400,'VALIDATION_FAILED');return this.service.run(req.security,`staff_${dto.action}`,null,null,id,dto.revision,dto.message);}
}
function uuid(id:string){if(!isUUID(id))throw new ApiException(400,'VALIDATION_FAILED');}
