import {reportsSchema} from '../common/operations.openapi.js';
import {Controller,Get,Inject,Injectable,Module,Query,Req} from '@nestjs/common';
import {ApiBearerAuth,ApiOkResponse,ApiProperty,ApiTags} from '@nestjs/swagger';
import {IsIn} from 'class-validator';
import {sql} from 'drizzle-orm';
import type {EventReports,EventReportExport} from '@sep/contracts';
import {APP_CONFIG,type AppConfig} from '../config.js';
import {IdentityModule} from '../identity/identity.module.js';
import {AuthorizationService} from '../identity/authorization.service.js';
import {AuditService} from '../common/audit.service.js';
import {ApiException,type RequestContext,type SepRequest} from '../common/http.js';
import {Access} from '../platform/context.guard.js';
import {ApiErrors} from '../common/openapi.js';
const datasets={works:{table:'author_works',label:'title',state:'status',extra:"''"},registrations:{table:'registration_entries',label:'name',state:'status',extra:'modality'},bookings:{table:'session_bookings',label:'name',state:'state',extra:'modality'},certificates:{table:'certificates',label:"summary->>'name'",state:'status',extra:"summary->>'kind'"}} as const;
const csvCell=(v:unknown)=>{let s=String(v??'').replace(/\u0000/g,'');if(/^[\s\uFEFF]*[=+@-]/u.test(s))s="'"+s;return '"'+s.replace(/"/g,'""')+'"';};
@Injectable()
export class ReportsService{
 constructor(private readonly auth:AuthorizationService,private readonly audit:AuditService,@Inject(APP_CONFIG)private readonly config:AppConfig){}
 get(c:RequestContext):Promise<EventReports>{return this.auth.run(c,'reports-read',async tx=>{
  const scope=sql`organization_id=${c.organizationId}::uuid AND event_id=${c.eventId}::uuid`,event=await tx.execute(sql`SELECT timezone FROM events WHERE organization_id=${c.organizationId}::uuid AND id=${c.eventId}::uuid`);if(!event.rows.length)throw new ApiException(404,'NOT_FOUND');
  const specs=[['works','author_works','status'],['reviews','review_assignments','status'],['registrations','registration_entries','status'],['attendance','attendance_records','state'],['certificates','certificates','status'],['bookings','session_bookings','state'],['posters','gallery_releases',"CASE WHEN active THEN 'published' ELSE 'withdrawn' END"],['publications','publication_releases','status'],['deliveries','mail_deliveries','status'],['payments','payment_charges','state']] as const,groups:EventReports['groups']=[];
  for(const [id,table,state]of specs){const r=await tx.execute(sql`SELECT ${sql.raw(state)} AS state,count(*)::integer AS total FROM ${sql.raw(table)} WHERE ${scope} GROUP BY 1 ORDER BY 1`);groups.push({id,rows:r.rows as {state:string;total:number}[]});}
  const readiness:EventReports['readiness']=[];
  for(const [id,table]of [['portal','site_publications'],['call','scientific_call_publications'],['registration','registration_publications'],['program','program_publications'],['certificates','certificate_templates'],['sponsors','sponsorship_releases'],['logistics','logistics_drafts']]as const){const r=await tx.execute(sql`SELECT count(*)::integer AS total FROM ${sql.raw(table)} WHERE ${scope}`),ready=Number(r.rows[0]?.total)>0;readiness.push({module:id,state:ready?'configured':'pending',detail:ready?'Configuration or publication exists; review its contents.':'No configuration or publication exists.'});}
  const money=await tx.execute(sql`SELECT content->>'currency' AS currency,coalesce(sum((content->>'amount')::numeric)FILTER(WHERE content->>'status'='confirmed'),0)::text AS confirmed,coalesce(sum((content->>'amount')::numeric)FILTER(WHERE content->>'status'='fulfilled'),0)::text AS fulfilled FROM sponsor_commitments WHERE ${scope} AND content->>'kind'='monetary' AND content->>'amount' ~ '^[0-9]+([.][0-9]{1,2})?$' GROUP BY 1 ORDER BY 1`);
  const [paymentConfig]=(await tx.execute(sql`SELECT content FROM payment_settings WHERE ${scope}`)).rows;
  return {generatedAt:new Date().toISOString(),timezone:String(event.rows[0].timezone),groups,readiness,integrations:{reduniv:!!this.config.oidc,google:!!this.config.google,orcid:this.config.orcid?.environment??'disabled',email:!!this.config.mail,payments:!!(paymentConfig?.content as {enabled?:boolean}|undefined)?.enabled},currencies:money.rows as EventReports['currencies']};
 });}
 export(c:RequestContext,dataset:keyof typeof datasets):Promise<EventReportExport>{return this.auth.run(c,'reports-read',async tx=>{const d=datasets[dataset],result=await tx.execute(sql`SELECT id,${sql.raw(d.label)} AS label,${sql.raw(d.state)} AS state,${sql.raw(d.extra)} AS modality FROM ${sql.raw(d.table)} WHERE organization_id=${c.organizationId}::uuid AND event_id=${c.eventId}::uuid ORDER BY id LIMIT 5001`);if(result.rows.length>5000)throw new ApiException(413,'VALIDATION_FAILED');const generatedAt=new Date().toISOString(),rows=[['id','label','state','modality'],...result.rows.map(r=>[r.id,r.label,r.state,r.modality])];await this.audit.record(tx,c,'reports.exported',c.eventId!);return {filename:`sep-${dataset}-${c.eventId}.csv`,count:result.rows.length,generatedAt,csv:'\uFEFF'+rows.map(r=>r.map(csvCell).join(',')).join('\r\n')+'\r\n'};});}
}
class ReportQuery{@ApiProperty({enum:Object.keys(datasets)}) @IsIn(Object.keys(datasets)) dataset!:keyof typeof datasets;}
@ApiTags('reports') @ApiBearerAuth() @ApiErrors() @Controller('events/:eventId/reports')
class ReportsController{
 constructor(private readonly service:ReportsService){}
 @Get() @Access('reports-read') @ApiOkResponse({schema:reportsSchema}) get(@Req()r:SepRequest){return this.service.get(r.security);}
 @Get('export') @Access('reports-read') @ApiOkResponse({schema:{type:'object',properties:{filename:{type:'string'},csv:{type:'string'},count:{type:'integer'},generatedAt:{type:'string',format:'date-time'}},required:['filename','csv','count','generatedAt']}}) export(@Req()r:SepRequest,@Query()q:ReportQuery){return this.service.export(r.security,q.dataset);}
}
@Module({imports:[IdentityModule],providers:[ReportsService,AuditService],controllers:[ReportsController]})
export class ReportsModule{}
