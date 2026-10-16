import { Body, Controller, Get, Inject, Injectable, Post, Req } from '@nestjs/common';
import { ApiBearerAuth, ApiOkResponse, ApiProperty, ApiTags } from '@nestjs/swagger';
import { IsString, Matches, MaxLength } from 'class-validator';
import { and, eq, gte, isNull } from 'drizzle-orm';
import { createHash, randomBytes } from 'node:crypto';
import { validOrcid } from '@sep/contracts';
import { APP_CONFIG, type AppConfig } from '../config.js';
import { DatabaseService, type DbTransaction } from '../database/database.service.js';
import { orcidConnections, people } from '../database/schema.js';
import { ApiException, type RequestContext, type SepRequest } from '../common/http.js';
import { Access } from '../platform/context.guard.js';
import { ApiErrors } from '../common/openapi.js';
import { AuditService } from '../common/audit.service.js';

class BeginOrcidDto {
  @ApiProperty({example:'/es?event=a1&tab=profile'}) @IsString() @MaxLength(250) @Matches(/^\/(?:es|en)\?event=[a-zA-Z0-9-]+&tab=profile$/) returnTo!:string;
}
class FinishOrcidDto {
  @ApiProperty() @IsString() @Matches(/^[A-Za-z0-9_-]{43}$/) state!:string;
  @ApiProperty() @IsString() @MaxLength(1000) @Matches(/^[A-Za-z0-9._~-]+$/) code!:string;
}
class BeginResultDto { @ApiProperty() authorizationUrl!:string; }
class FinishResultDto { @ApiProperty() returnTo!:string; }
class OrcidStatusDto { @ApiProperty() available!:boolean; }
const hash=(value:string)=>createHash('sha256').update(value).digest('hex');
@Injectable()
export class OrcidService {
  constructor(private readonly database:DatabaseService,@Inject(APP_CONFIG)private readonly config:AppConfig,private readonly audit:AuditService){}
  available(){return !!this.config.orcid;}
  private settings(){if(!this.config.orcid)throw new ApiException(503,'ORCID_UNAVAILABLE');return this.config.orcid;}
  private async active(tx:DbTransaction,context:RequestContext){
    const [person]=await tx.select({id:people.id}).from(people).where(and(eq(people.id,context.personId!),eq(people.active,true)));
    if(!person)throw new ApiException(401,'UNAUTHORIZED');
  }
  async begin(context:RequestContext,returnTo:string){
    const config=this.settings();const state=randomBytes(32).toString('base64url');
    await this.database.scoped(context,async tx=>{
      await this.active(tx,context);
      const [current]=await tx.select().from(orcidConnections).where(eq(orcidConnections.personId,context.personId!)).for('update');
      if(current?.orcid)throw new ApiException(409,'ORCID_CONFLICT');
      const flow={stateHash:hash(state),expiresAt:new Date(Date.now()+600000),returnTo};
      await tx.insert(orcidConnections).values({personId:context.personId!,...flow}).onConflictDoUpdate({target:orcidConnections.personId,set:flow});
    });
    const url=new URL('/oauth/authorize',config.environment==='sandbox'?'https://sandbox.orcid.org':'https://orcid.org');
    url.search=new URLSearchParams({client_id:config.clientId,response_type:'code',scope:'/authenticate',redirect_uri:config.redirectUri,state}).toString();
    return {authorizationUrl:url.href};
  }
  async finish(context:RequestContext,state:string,code:string){
    const config=this.settings();const stateHash=hash(state);
    // Consume before contacting the provider. Failed and replayed callbacks cannot reuse the flow.
    const flow=await this.database.scoped(context,async tx=>{
      await this.active(tx,context);
      const [row]=await tx.update(orcidConnections).set({expiresAt:null}).where(and(eq(orcidConnections.personId,context.personId!),eq(orcidConnections.stateHash,stateHash),gte(orcidConnections.expiresAt,new Date()),isNull(orcidConnections.orcid))).returning();
      if(!row)throw new ApiException(400,'ORCID_INVALID');return row;
    });
    let identifier:string;
    try{
      const base=config.environment==='sandbox'?'https://sandbox.orcid.org':'https://orcid.org';
      const response=await fetch(`${base}/oauth/token`,{method:'POST',redirect:'error',signal:AbortSignal.timeout(10000),headers:{accept:'application/json','content-type':'application/x-www-form-urlencoded'},body:new URLSearchParams({client_id:config.clientId,client_secret:config.clientSecret,grant_type:'authorization_code',code,redirect_uri:config.redirectUri})});
      if(!response.ok)throw new Error('provider');
      const bytes=await response.text();if(bytes.length>65536)throw new Error('size');
      const data=JSON.parse(bytes) as {orcid?:unknown;scope?:unknown;access_token?:unknown;token_type?:unknown};
      if(!validOrcid(data.orcid)||typeof data.access_token!=='string'||!data.access_token||typeof data.scope!=='string'||!data.scope.split(/\s+/u).includes('/authenticate')||typeof data.token_type!=='string'||data.token_type.toLowerCase()!=='bearer')throw new Error('grant');
      identifier=data.orcid;
    }catch{throw new ApiException(400,'ORCID_INVALID');}
    try{return await this.database.scoped(context,async tx=>{
      await this.active(tx,context);
      const [row]=await tx.update(orcidConnections).set({orcid:identifier,environment:config.environment,connectedAt:new Date(),stateHash:null,expiresAt:null,returnTo:null}).where(and(eq(orcidConnections.personId,context.personId!),eq(orcidConnections.stateHash,stateHash),isNull(orcidConnections.expiresAt),isNull(orcidConnections.orcid))).returning();
      if(!row)throw new ApiException(400,'ORCID_INVALID');
      await this.audit.organization(tx,context,'identity.orcid.connected',context.personId!);
      return {returnTo:flow.returnTo!};
    });}catch(error){if((error as {cause?:{code?:string}}).cause?.code==='23505'||(error as {code?:string}).code==='23505')throw new ApiException(409,'ORCID_CONFLICT');throw error;}
  }
}
@ApiTags('identity') @ApiBearerAuth() @ApiErrors() @Controller('me/orcid')
export class OrcidController {
  constructor(private readonly service:OrcidService){}
  @Get() @Access('identity-read') @ApiOkResponse({type:OrcidStatusDto}) status(){return {available:this.service.available()};}
  @Post('start') @Access('identity-read') @ApiOkResponse({type:BeginResultDto}) begin(@Req()request:SepRequest,@Body()dto:BeginOrcidDto){return this.service.begin(request.security,dto.returnTo);}
  @Post('finish') @Access('identity-read') @ApiOkResponse({type:FinishResultDto}) finish(@Req()request:SepRequest,@Body()dto:FinishOrcidDto){return this.service.finish(request.security,dto.state,dto.code);}
}
