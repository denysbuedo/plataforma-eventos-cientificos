import {certificateSchemas} from './certificates.openapi.js';
import {Module,Controller,Get,Put,Post,Body,Query,Req,Res,HttpCode,Param,ParseUUIDPipe} from '@nestjs/common';
import {ApiTags,ApiBearerAuth,ApiOkResponse} from '@nestjs/swagger';
import type {Response} from 'express';
import {IdentityModule} from '../identity/identity.module.js';
import {AuditService} from '../common/audit.service.js';
import {ApiErrors} from '../common/openapi.js';
import type {SepRequest} from '../common/http.js';
import {Access} from '../platform/context.guard.js';
import {CertificatesService} from './certificates.service.js';
import {SaveCertificateTemplateDto,CertificatePageQuery,CertificateCandidatesDto,IssueCertificatesDto,RevokeCertificateDto} from './certificates.dto.js';
const send=(res:Response,pdf:Buffer,id:string)=>{res.set({'content-type':'application/pdf','content-disposition':`attachment; filename="certificate-${id}.pdf"`,'cache-control':'no-store','x-content-type-options':'nosniff'});res.send(pdf);};
@ApiTags('certificates') @ApiBearerAuth() @ApiErrors() @Controller('events/:eventId/certificates')
class CertificatesController {
 constructor(private readonly service:CertificatesService){}
 @Get('templates') @Access('certificates-manage') @ApiOkResponse({schema:certificateSchemas.templates}) templates(@Req()r:SepRequest){return this.service.listTemplates(r.security);}
 @Get('templates/:id') @Access('certificates-manage') @ApiOkResponse({schema:certificateSchemas.template}) template(@Req()r:SepRequest,@Param('id',ParseUUIDPipe)id:string){return this.service.getTemplate(r.security,id);}
 @Put('templates/:id') @Access('certificates-manage') @ApiOkResponse({schema:certificateSchemas.template}) save(@Req()r:SepRequest,@Param('id',ParseUUIDPipe)id:string,@Body()d:SaveCertificateTemplateDto){return this.service.saveTemplate(r.security,id,d);}
 @Get('templates/:id/preview') @Access('certificates-manage') @ApiOkResponse({schema:{type:'string',format:'binary'}}) async preview(@Req()r:SepRequest,@Param('id',ParseUUIDPipe)id:string,@Res()res:Response){send(res,await this.service.preview(r.security,id,r.locale),id);}
 @Post('candidates') @HttpCode(200) @Access('certificates-manage') @ApiOkResponse({schema:certificateSchemas.candidates}) candidates(@Req()r:SepRequest,@Body()d:CertificateCandidatesDto){return this.service.candidates(r.security,d);}
 @Post('issue') @HttpCode(200) @Access('certificates-manage') @ApiOkResponse({schema:certificateSchemas.issued}) issue(@Req()r:SepRequest,@Body()d:IssueCertificatesDto){return this.service.issue(r.security,d);}
 @Get('mine') @Access('author-work') @ApiOkResponse({schema:certificateSchemas.page}) mine(@Req()r:SepRequest,@Query()q:CertificatePageQuery){return this.service.mine(r.security,q);}
 @Get('mine/:id') @Access('author-work') @ApiOkResponse({schema:certificateSchemas.detail}) mineDetail(@Req()r:SepRequest,@Param('id',ParseUUIDPipe)id:string){return this.service.detail(r.security,id,true);}
 @Get('mine/:id/pdf') @Access('author-work') @ApiOkResponse({schema:{type:'string',format:'binary'}}) async minePdf(@Req()r:SepRequest,@Param('id',ParseUUIDPipe)id:string,@Res()res:Response){send(res,await this.service.pdf(r.security,id),id);}
 @Get() @Access('certificates-manage') @ApiOkResponse({schema:certificateSchemas.page}) list(@Req()r:SepRequest,@Query()q:CertificatePageQuery){return this.service.list(r.security,q);}
 @Get(':id/pdf') @Access('certificates-manage') @ApiOkResponse({schema:{type:'string',format:'binary'}}) async pdf(@Req()r:SepRequest,@Param('id',ParseUUIDPipe)id:string,@Res()res:Response){send(res,await this.service.pdf(r.security,id,true),id);}
 @Get(':id') @Access('certificates-manage') @ApiOkResponse({schema:certificateSchemas.detail}) detail(@Req()r:SepRequest,@Param('id',ParseUUIDPipe)id:string){return this.service.detail(r.security,id);}
 @Post(':id/revoke') @HttpCode(200) @Access('certificates-manage') @ApiOkResponse({schema:certificateSchemas.revoked}) revoke(@Req()r:SepRequest,@Param('id',ParseUUIDPipe)id:string,@Body()d:RevokeCertificateDto){return this.service.revoke(r.security,id,d);}
}
@ApiTags('public') @ApiErrors() @Controller('public/certificates')
class PublicCertificatesController {constructor(private readonly service:CertificatesService){} @Get(':code') @Access('public-site') @ApiOkResponse({schema:certificateSchemas.public}) get(@Req()r:SepRequest,@Param('code')code:string){return this.service.public(r.security,code);}}
@Module({imports:[IdentityModule],providers:[CertificatesService,AuditService],controllers:[CertificatesController,PublicCertificatesController]})
export class CertificatesModule{}
