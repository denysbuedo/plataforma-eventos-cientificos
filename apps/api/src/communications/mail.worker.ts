import {Inject,Injectable,type OnModuleInit,type OnModuleDestroy} from '@nestjs/common';
import {sql} from 'drizzle-orm';
import nodemailer from 'nodemailer';
import {APP_CONFIG,type AppConfig} from '../config.js';
import {DatabaseService} from '../database/database.service.js';
import {renderNotificationMail} from './templates.js';
interface ClaimedMail {id:string;lease:string;email:string;kind:string;locale:'es'|'en';eventId:string;eventEs:string;eventEn:string;target:string;resourceId:string|null;messageEs:string;messageEn:string;skipped?:boolean}
@Injectable()
export class MailWorker implements OnModuleInit,OnModuleDestroy {
 private timer?:ReturnType<typeof setInterval>;private running:Promise<void>|null=null;private stopping=false;
 private readonly transport;
 constructor(private readonly db:DatabaseService,@Inject(APP_CONFIG)private readonly config:AppConfig){
  const m=config.mail;this.transport=m?nodemailer.createTransport({host:m.host,port:m.port,secure:m.secure,requireTLS:!m.localPlaintext,ignoreTLS:m.localPlaintext,auth:m.user?{user:m.user,pass:m.password}:undefined,connectionTimeout:10000,greetingTimeout:10000,socketTimeout:20000,disableFileAccess:true,disableUrlAccess:true,logger:false,debug:false}):null;
 }
 onModuleInit(){if(this.transport){this.timer=setInterval(()=>{void this.tick();},10000);this.timer.unref();}}
 async onModuleDestroy(){this.stopping=true;if(this.timer)clearInterval(this.timer);await this.running;this.transport?.close();}
 async tick(){if(!this.transport||this.running||this.stopping)return;this.running=this.drain().catch(()=>{/* A database interruption leaves the durable queue recoverable; never log payloads or credentials. */});try{await this.running;}finally{this.running=null;}}
 private async drain(){for(let i=0;i<25&&!this.stopping;i++){
  const claimed=await this.db.scoped({organizationId:'00000000-0000-4000-8000-000000000000',eventId:null,personId:null},async tx=>{const r=await tx.execute<{value:ClaimedMail|null}&Record<string,unknown>>(sql`SELECT sep_mail_claim() AS value`);return r.rows[0]?.value;});
  if(!claimed)break;if(claimed.skipped)continue;
  const m=this.config.mail!,url=new URL('/'+claimed.locale,m.adminOrigin);url.searchParams.set('event',claimed.eventId);url.searchParams.set('tab',claimed.target);
  if(claimed.resourceId&&['works','submissions'].includes(claimed.target))url.searchParams.set('work',claimed.resourceId);
  const mail=renderNotificationMail({kind:claimed.kind,locale:claimed.locale,eventName:claimed.locale==='es'?claimed.eventEs:claimed.eventEn,message:claimed.locale==='es'?claimed.messageEs:claimed.messageEn,url:url.href});
  let outcome='sent',code:string|null=null;
  try{const result=await this.transport!.sendMail({...mail,from:{name:'SEP',address:m.from},to:claimed.email,messageId:`<${claimed.id}@${m.messageDomain}>`});if(!result.accepted?.length){outcome='failed';code='smtp_permanent';}}
  catch(error){const e=error as {responseCode?:number;code?:string};const permanent=!!e.responseCode&&e.responseCode>=500;outcome=permanent?'failed':'retry';code=permanent?'smtp_permanent':e.responseCode?'smtp_temporary':e.code==='EAUTH'?'smtp_configuration':'smtp_connection';}
  await this.db.scoped({organizationId:'00000000-0000-4000-8000-000000000000',eventId:null,personId:null},tx=>tx.execute(sql`SELECT sep_mail_finish(${claimed.id}::uuid,${claimed.lease}::uuid,${outcome},${code})`));
 }}
}
