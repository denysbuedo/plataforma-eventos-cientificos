import {Body,Controller,Get,HttpCode,Module,Param,ParseUUIDPipe,Post,Put,Query,Req,Res} from '@nestjs/common';
import {ApiBearerAuth,ApiOkResponse,ApiQuery,ApiTags,ApiProduces} from '@nestjs/swagger';
import type {Response} from 'express';
import type {PublicationKind} from '@sep/contracts';
import {isUUID} from 'class-validator';
import {IdentityModule} from '../identity/identity.module.js';
import {ManuscriptsService} from '../submissions/manuscripts.service.js';
import {Access} from '../platform/context.guard.js';
import {ApiException,type SepRequest} from '../common/http.js';
import {ApiErrors} from '../common/openapi.js';
import {EditorialService} from './editorial.service.js';
import {AuthorPublicationPermissionDto,EditorialCandidatesQuery,EditorialProofQuery,PublishEditorialDto,SaveEditorialDto,SelectEditorialDto,WithdrawPublicationDto} from './editorial.dto.js';
import {editorialSchemas as schemas} from './editorial.openapi.js';
import {exportPublication} from './editorial-export.js';
const kind=(v:string):PublicationKind=>{if(v!=='abstracts'&&v!=='proceedings')throw new ApiException(400,'VALIDATION_FAILED');return v;};
const pdf=(res:Response,data:Buffer,id:string)=>{res.set({'content-type':'application/pdf','content-disposition':`attachment; filename="publication-${id}.pdf"`,'cache-control':'no-store','x-content-type-options':'nosniff'});res.send(data);};
@ApiTags('editorial') @ApiBearerAuth() @ApiErrors() @Controller('events/:eventId/editorial')
class EditorialController {
 constructor(private readonly service:EditorialService){}
 @Get('mine') @Access('author-work') @ApiOkResponse({schema:schemas.mine}) mine(@Req()r:SepRequest){return this.service.mine(r.security);}
 @Put('permissions/:workId') @Access('author-work') @ApiOkResponse({schema:schemas.updated}) permission(@Req()r:SepRequest,@Param('workId',ParseUUIDPipe)id:string,@Body()d:AuthorPublicationPermissionDto){return this.service.authorize(r.security,id,d);}
 @Get('history') @Access('publications-manage') @ApiOkResponse({schema:schemas.history}) history(@Req()r:SepRequest){return this.service.history(r.security);}
 @Get('releases/:id/pdf') @Access('publications-manage') @ApiProduces('application/pdf') @ApiOkResponse({schema:schemas.pdf}) async pdf(@Req()r:SepRequest,@Param('id',ParseUUIDPipe)id:string,@Res()res:Response){pdf(res,await this.service.staffPdf(r.security,id),id);}
 @Post('releases/:id/withdraw') @HttpCode(200) @Access('publications-manage') @ApiOkResponse({schema:schemas.withdrawn}) withdraw(@Req()r:SepRequest,@Param('id',ParseUUIDPipe)id:string,@Body()d:WithdrawPublicationDto){return this.service.withdraw(r.security,id,d);}
 @Get(':kind/candidates') @Access('publications-manage') @ApiOkResponse({schema:schemas.candidates}) candidates(@Req()r:SepRequest,@Param('kind')k:string,@Query()q:EditorialCandidatesQuery){return this.service.candidates(r.security,kind(k),q);}
 @Get(':kind/preview') @Access('publications-manage') @ApiProduces('application/pdf') @ApiOkResponse({schema:schemas.pdf}) async preview(@Req()r:SepRequest,@Param('kind')k:string,@Query()q:EditorialProofQuery,@Res()res:Response){pdf(res,await this.service.preview(r.security,kind(k),q.proof),'proof');}
 @Post(':kind/publish') @HttpCode(200) @Access('publications-manage') @ApiOkResponse({schema:schemas.summary}) publish(@Req()r:SepRequest,@Param('kind')k:string,@Body()d:PublishEditorialDto){return this.service.publish(r.security,kind(k),d);}
 @Put(':kind/items/:workId') @Access('publications-manage') @ApiOkResponse({schema:schemas.workspace}) select(@Req()r:SepRequest,@Param('kind')k:string,@Param('workId',ParseUUIDPipe)id:string,@Body()d:SelectEditorialDto){return this.service.select(r.security,kind(k),id,d);}
 @Get(':kind') @Access('publications-manage') @ApiOkResponse({schema:schemas.workspace}) get(@Req()r:SepRequest,@Param('kind')k:string){return this.service.get(r.security,kind(k));}
 @Put(':kind') @Access('publications-manage') @ApiOkResponse({schema:schemas.workspace}) save(@Req()r:SepRequest,@Param('kind')k:string,@Body()d:SaveEditorialDto){return this.service.save(r.security,kind(k),d);}
}
@ApiTags('publications') @ApiErrors() @Controller('public')
class PublicEditorialController {
 constructor(private readonly service:EditorialService){}
 @Get('events/:eventId/publications') @Access('public-site') @ApiOkResponse({schema:schemas.list}) list(@Req()r:SepRequest){return this.service.publicList(r.security);}
 @Get('publications/:id/pdf') @Access('public-site') @ApiProduces('application/pdf') @ApiOkResponse({schema:schemas.pdf}) async pdf(@Req()r:SepRequest,@Param('id',ParseUUIDPipe)id:string,@Res()res:Response){pdf(res,await this.service.publicFile(r.security,id),id);}
 @Get('publications/:id/papers/:workId/pdf') @Access('public-site') @ApiProduces('application/pdf') @ApiOkResponse({schema:schemas.pdf}) async paper(@Req()r:SepRequest,@Param('id',ParseUUIDPipe)id:string,@Param('workId',ParseUUIDPipe)work:string,@Res()res:Response){pdf(res,await this.service.publicFile(r.security,id,work),work);}
 @Get('publications/:id/export/:format') @Access('public-site') @ApiQuery({name:'paper',required:false,type:String}) @ApiOkResponse({schema:{type:'string'},description:'SEP JSON, CSL-JSON, BibTeX or RIS. Names retain their full literal form.'}) async export(@Req()r:SepRequest,@Param('id',ParseUUIDPipe)id:string,@Param('format')format:string,@Query('paper')paper:string|undefined,@Res()res:Response){
  if(!['json','csl','bib','ris'].includes(format)||paper&&!isUUID(paper))throw new ApiException(400,'VALIDATION_FAILED');const release=await this.service.publicDetail(r.security,id);if(!release.snapshot)throw new ApiException(410,'PUBLICATION_WITHDRAWN');if(paper&&!release.snapshot.papers.some(p=>p.id===paper))throw new ApiException(404,'NOT_FOUND');
  res.set({'content-type':format==='json'||format==='csl'?'application/json; charset=utf-8':'text/plain; charset=utf-8','content-disposition':`attachment; filename="publication-${id}.${format==='csl'?'csl.json':format}"`,'cache-control':'no-store','x-content-type-options':'nosniff'});res.send(exportPublication(release.snapshot,format as 'json'|'csl'|'bib'|'ris',paper));
 }
 @Get('publications/:id') @Access('public-site') @ApiOkResponse({schema:schemas.detail}) detail(@Req()r:SepRequest,@Param('id',ParseUUIDPipe)id:string){return this.service.publicDetail(r.security,id);}
}
@Module({imports:[IdentityModule],providers:[EditorialService,ManuscriptsService],controllers:[EditorialController,PublicEditorialController]})
export class EditorialModule{}
