import {Body,Controller,Get,Inject,Injectable,OnModuleDestroy,Param,Post,Req} from '@nestjs/common';
import {ApiProperty,ApiTags} from '@nestjs/swagger';
import {IsEmail,IsIn,IsString,Matches,MaxLength,MinLength} from 'class-validator';
import {createHash,randomBytes} from 'node:crypto';
import {mkdir,readFile,writeFile} from 'node:fs/promises';
import {join} from 'node:path';
import {Pool} from 'pg';
import nodemailer from 'nodemailer';
import {Access} from '../platform/context.guard.js';
import {APP_CONFIG,type AppConfig} from '../config.js';
import {ApiException,type SepRequest} from '../common/http.js';
import {hashLocalPassword,validLocalPassword,verifyLocalPassword} from './local-password.js';
const digest=(value:string)=>createHash('sha256').update(value).digest('hex');
class EmailDto{@ApiProperty() @IsEmail() @MaxLength(254) email!:string;}
class LoginDto extends EmailDto{@ApiProperty({writeOnly:true}) @IsString() @MaxLength(512) password!:string;}
class RegisterDto extends LoginDto{@ApiProperty() @IsString() @MinLength(2) @MaxLength(120) name!:string;}
class TicketDto{@ApiProperty({writeOnly:true}) @IsString() @Matches(/^[A-Za-z0-9_-]{43}$/) token!:string;}
class ResetDto extends TicketDto{@ApiProperty({writeOnly:true}) @IsString() @MaxLength(512) password!:string;}
class MailRequestDto extends EmailDto{@ApiProperty() @IsIn(['reset']) purpose!:'reset';}
interface Account{personId:string;email:string;name:string;passwordHash:string;version:number;verified:boolean}
export interface LocalPrincipal{personId:string;email:string}
@Injectable()
export class LocalAuthService implements OnModuleDestroy{
 private readonly pool:Pool;
 constructor(@Inject(APP_CONFIG)private readonly config:AppConfig){this.pool=new Pool({connectionString:config.databaseUrl,max:3,connectionTimeoutMillis:5000,statement_timeout:10000});this.pool.on('error',()=>{});}
 async onModuleDestroy(){await this.pool.end();}
 private enabled(){if(!this.config.localAuth)throw new ApiException(404,'NOT_FOUND');return this.config.localAuth;}
 private async rpc<T>(action:string,data:unknown):Promise<T>{const result=await this.pool.query('SELECT sep_local_identity($1,$2::jsonb) AS value',[action,JSON.stringify(data)]);return result.rows[0].value as T;}
 private async rate(scope:string,key:string){if(!await this.rpc<boolean>('rate',{bucket:digest(scope+':'+key),global:scope==='network'}))throw new ApiException(429,'LOCAL_AUTH_RATE_LIMITED');}
 private async password(password:string){if(!validLocalPassword(password))throw new ApiException(400,'LOCAL_PASSWORD_WEAK');try{return await hashLocalPassword(password);}catch{throw new ApiException(429,'LOCAL_AUTH_RATE_LIMITED');}}
 async register(data:RegisterDto,network:string){
  this.enabled();await this.rate('network',network);const email=data.email.trim().toLowerCase();await this.rate('register',email);
  const name=data.name.trim();if(name.length<2)throw new ApiException(400,'VALIDATION_FAILED');
  const passwordHash=await this.password(data.password),token=randomBytes(32).toString('base64url');
  const created=await this.rpc<{send:boolean}>('register',{email,name,passwordHash,tokenHash:digest(token)});
  return {ok:true,...(created.send?await this.deliver(email,'verify',token):{})};
 }
 async login(data:LoginDto,network:string){
  this.enabled();await this.rate('network',network);const email=data.email.trim().toLowerCase();await this.rate('login',email);
  const account=await this.rpc<Account|null>('credentials',{email});let matches=false;
  try{matches=await verifyLocalPassword(data.password,account?.passwordHash);}catch{throw new ApiException(429,'LOCAL_AUTH_RATE_LIMITED');}
  if(!account||!matches)throw new ApiException(401,'LOCAL_INVALID_CREDENTIALS');
  if(!account.verified)throw new ApiException(403,'LOCAL_EMAIL_UNVERIFIED');
  const raw=randomBytes(32).toString('base64url'),ok=await this.rpc<boolean>('session-create',{personId:account.personId,version:account.version,tokenHash:digest(raw)});
  if(!ok)throw new ApiException(401,'LOCAL_INVALID_CREDENTIALS');return {accessToken:'sep_local.'+raw,maxAge:28800};
 }
 async authenticate(authorization:string|undefined):Promise<LocalPrincipal>{
  this.enabled();const raw=/^Bearer sep_local\.([A-Za-z0-9_-]{43})$/.exec(authorization??'')?.[1];
  if(!raw)throw new ApiException(401,'UNAUTHORIZED');const account=await this.rpc<LocalPrincipal|null>('session-read',{tokenHash:digest(raw)});
  if(!account)throw new ApiException(401,'UNAUTHORIZED');return account;
 }
 async logout(authorization:string|undefined){this.enabled();const raw=/^Bearer sep_local\.([A-Za-z0-9_-]{43})$/.exec(authorization??'')?.[1];if(raw)await this.rpc('logout',{tokenHash:digest(raw)});return {ok:true};}
 async requestMail(data:MailRequestDto,network:string){
  this.enabled();await this.rate('network',network);const email=data.email.trim().toLowerCase();await this.rate(data.purpose,email);
  const token=randomBytes(32).toString('base64url'),issued=await this.rpc<boolean>('challenge-issue',{email,purpose:data.purpose,tokenHash:digest(token)});
  return {ok:true,...(issued?await this.deliver(email,data.purpose,token):{})};
 }
 async consume(data:TicketDto|ResetDto,purpose:'verify'|'reset',network:string){
  this.enabled();await this.rate('network',network);await this.rate('consume',digest(data.token));
  const passwordHash=purpose==='reset'?await this.password((data as ResetDto).password):undefined;
  if(!await this.rpc<boolean>('challenge-consume',{tokenHash:digest(data.token),purpose,passwordHash}))throw new ApiException(400,'LOCAL_LINK_INVALID');return {ok:true};
 }
 private async deliver(email:string,purpose:'verify'|'reset',token:string){
  const options=this.enabled(),url=new URL('/es',options.origin);url.searchParams.set('mode',purpose);url.hash=new URLSearchParams({token}).toString();
  const subject=purpose==='verify'?'SEP · Confirma tu correo':'SEP · Restablece tu contraseña';
  const text=(purpose==='verify'?'Confirma tu correo para activar tu cuenta en la Plataforma de Eventos Científicos.':'Elige una nueva contraseña para tu cuenta de SEP.')+'\n\n'+url.href+'\n\nEl enlace caduca en '+(purpose==='verify'?'24 horas.':'30 minutos.')+' Solo puede utilizarse una vez. Si no solicitaste este mensaje, puedes ignorarlo.';
  if(options.previewDirectory){const id=randomBytes(32).toString('base64url');await mkdir(options.previewDirectory,{recursive:true,mode:0o700});await writeFile(join(options.previewDirectory,id+'.json'),JSON.stringify({subject,text,url:url.href,expires:Date.now()+ (purpose==='verify'?86400000:1800000)}),{mode:0o600,flag:'wx'});return {previewId:id};}
  const mail=this.config.mail!;
  const transport=nodemailer.createTransport({host:mail.host,port:mail.port,secure:mail.secure,requireTLS:!mail.localPlaintext,ignoreTLS:mail.localPlaintext,auth:mail.user?{user:mail.user,pass:mail.password}:undefined,connectionTimeout:10000,socketTimeout:15000,disableFileAccess:true,disableUrlAccess:true,logger:false,debug:false});
  try{const sent=await transport.sendMail({from:{name:'SEP',address:mail.from},to:email,subject,text});if(!sent.accepted?.length)throw new Error('Delivery failed');}catch{throw new ApiException(503,'LOCAL_MAIL_UNAVAILABLE');}finally{transport.close();}return {};
 }
 async preview(id:string){const options=this.enabled();if(!options.previewDirectory||!/^[A-Za-z0-9_-]{43}$/.test(id))throw new ApiException(404,'NOT_FOUND');try{const mail=JSON.parse(await readFile(join(options.previewDirectory,id+'.json'),'utf8'));if(mail.expires<=Date.now())throw new Error('Expired');return {subject:mail.subject,text:mail.text,url:mail.url};}catch{throw new ApiException(404,'NOT_FOUND');}}
}
@ApiTags('local-identity') @Controller('auth/local')
export class LocalAuthController{
 constructor(private readonly auth:LocalAuthService){}
 @Post('register') @Access('public-identity') register(@Body()d:RegisterDto,@Req()r:SepRequest){return this.auth.register(d,r.ip??'unknown');}
 @Post('login') @Access('public-identity') login(@Body()d:LoginDto,@Req()r:SepRequest){return this.auth.login(d,r.ip??'unknown');}
 @Post('request-mail') @Access('public-identity') mail(@Body()d:MailRequestDto,@Req()r:SepRequest){return this.auth.requestMail(d,r.ip??'unknown');}
 @Post('verify') @Access('public-identity') verify(@Body()d:TicketDto,@Req()r:SepRequest){return this.auth.consume(d,'verify',r.ip??'unknown');}
 @Post('reset') @Access('public-identity') reset(@Body()d:ResetDto,@Req()r:SepRequest){return this.auth.consume(d,'reset',r.ip??'unknown');}
 @Post('logout') @Access('public-identity') logout(@Req()r:SepRequest){return this.auth.logout(r.headers.authorization);}
 @Get('mail/:id') @Access('public-identity') preview(@Param('id')id:string){return this.auth.preview(id);}
}
