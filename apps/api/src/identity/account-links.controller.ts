import {Body,Controller,Get,Inject,Injectable,Post,Req} from '@nestjs/common';
import {ApiBearerAuth,ApiCreatedResponse,ApiOkResponse,ApiProperty,ApiTags} from '@nestjs/swagger';
import {IsString,Matches,MaxLength,MinLength} from 'class-validator';
import {createHash,randomBytes} from 'node:crypto';
import {sql} from 'drizzle-orm';
import {DatabaseService} from '../database/database.service.js';
import {ApiException,type RequestContext,type SepRequest} from '../common/http.js';
import {Access} from '../platform/context.guard.js';
import {AUTHENTICATOR,type Authenticator} from './authenticator.js';
const digest=(value:string)=>createHash('sha256').update(value).digest('hex');
class PrepareLinkDto{@ApiProperty({writeOnly:true}) @IsString() @MinLength(32) @MaxLength(17000) credential!:string;}
class ConfirmLinkDto{@ApiProperty({writeOnly:true}) @IsString() @Matches(/^[A-Za-z0-9_-]{43}$/) ticket!:string;}
@Injectable()
export class AccountLinksService{
 private attempts=new Map<string,{at:number;count:number}>();
 constructor(private readonly db:DatabaseService,@Inject(AUTHENTICATOR)private readonly authenticator:Authenticator){}
 private rpc(c:RequestContext,command:string,data:unknown){return this.db.scoped(c,async tx=>{const result=await tx.execute(sql`SELECT sep_account_links(${command},${JSON.stringify(data)}::jsonb) AS value`);return result.rows[0].value as Record<string,unknown>;});}
 async list(c:RequestContext){return {...await this.rpc(c,'list',{}),currentProvider:c.authMode};}
 async prepare(c:RequestContext,d:PrepareLinkDto){
  if(c.authMode==='development-token')throw new ApiException(403,'FORBIDDEN');
  const key=c.personId!,old=this.attempts.get(key),now=Date.now();
  if(this.attempts.size>4096)this.attempts.clear();
  const attempt=old&&now-old.at<600000?old:{at:now,count:0};if(++attempt.count>20)throw new ApiException(429,'LOCAL_AUTH_RATE_LIMITED');this.attempts.set(key,attempt);
  const other=await this.authenticator.authenticate('Bearer '+d.credential);
  if(other.authMode==='development-token')throw new ApiException(403,'FORBIDDEN');
  const ticket=randomBytes(32).toString('base64url');
  const result=await this.rpc(c,'prepare',{otherId:other.personId,provider:other.authMode,tokenHash:digest(ticket)});
  return {...result,provider:other.authMode,...(result.ready?{ticket}:{} )};
 }
 async confirm(c:RequestContext,d:ConfirmLinkDto){
  const result=await this.rpc(c,'confirm',{tokenHash:digest(d.ticket),requestId:c.requestId,provider:c.authMode});
  if(result.blocked)throw new ApiException(409,result.blocked==='expired'?'ACCOUNT_LINK_EXPIRED':result.blocked==='two_local_accounts'?'ACCOUNT_LINK_LOCAL_CONFLICT':'ACCOUNT_LINK_ACTIVITY');
  return result;
 }
}
@ApiTags('account-links') @ApiBearerAuth() @Controller('me/sign-in-methods')
export class AccountLinksController{
 constructor(private readonly service:AccountLinksService){}
 @Get() @Access('identity-read') @ApiOkResponse({schema:{type:'object'}}) list(@Req()r:SepRequest){return this.service.list(r.security);}
 @Post('prepare') @Access('identity-read') @ApiCreatedResponse({schema:{type:'object'}}) prepare(@Req()r:SepRequest,@Body()d:PrepareLinkDto){return this.service.prepare(r.security,d);}
 @Post('confirm') @Access('identity-read') @ApiCreatedResponse({schema:{type:'object'}}) confirm(@Req()r:SepRequest,@Body()d:ConfirmLinkDto){return this.service.confirm(r.security,d);}
}
