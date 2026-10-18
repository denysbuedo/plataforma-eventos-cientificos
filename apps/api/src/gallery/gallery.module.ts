import {Body,Controller,Get,HttpCode,Module,Param,ParseUUIDPipe,Post,Put,Req,Res} from '@nestjs/common';
import {ApiBearerAuth,ApiOkResponse,ApiProduces,ApiTags} from '@nestjs/swagger';
import type {Response} from 'express';
import {IdentityModule} from '../identity/identity.module.js';
import {AuditService} from '../common/audit.service.js';
import {ManuscriptsService} from '../submissions/manuscripts.service.js';
import {Access} from '../platform/context.guard.js';
import type {SepRequest} from '../common/http.js';
import {ApiErrors} from '../common/openapi.js';
import {GalleryService} from './gallery.service.js';
import {PosterRevisionDto,PosterPermissionDto,PosterApprovalDto,PosterPublishDto} from './gallery.dto.js';
import {gallerySchemas as schemas} from '../common/operations.openapi.js';
@ApiTags('gallery') @ApiBearerAuth() @ApiErrors() @Controller('events/:eventId/gallery')
class GalleryController{
 constructor(private readonly service:GalleryService){}
 @Get() @Access('gallery-manage') @ApiOkResponse({schema:schemas.workspace}) workspace(@Req()r:SepRequest){return this.service.workspace(r.security);}
 @Get('mine') @Access('author-work') @ApiOkResponse({schema:schemas.workspace}) mine(@Req()r:SepRequest){return this.service.mine(r.security);}
 @Put('mine/:id') @Access('author-work') @ApiOkResponse({schema:schemas.workspace}) authorize(@Req()r:SepRequest,@Param('id',ParseUUIDPipe)id:string,@Body()d:PosterPermissionDto){return this.service.authorize(r.security,id,d);}
 @Put(':id/approval') @Access('gallery-manage') @ApiOkResponse({schema:schemas.updated}) approve(@Req()r:SepRequest,@Param('id',ParseUUIDPipe)id:string,@Body()d:PosterApprovalDto){return this.service.approve(r.security,id,d);}
 @Post(':id/publish') @HttpCode(200) @Access('gallery-manage') @ApiOkResponse({schema:schemas.identified}) publish(@Req()r:SepRequest,@Param('id',ParseUUIDPipe)id:string,@Body()d:PosterPublishDto){return this.service.publish(r.security,id,d);}
 @Post('releases/:id/withdraw') @HttpCode(200) @Access('gallery-manage') @ApiOkResponse({schema:schemas.identified}) withdraw(@Req()r:SepRequest,@Param('id',ParseUUIDPipe)id:string,@Body()d:PosterRevisionDto){return this.service.withdraw(r.security,id,d.reason);}
}
@ApiTags('gallery') @ApiErrors() @Controller('public/events/:eventId/gallery')
class PublicGalleryController{
 constructor(private readonly service:GalleryService){}
 @Get() @Access('public-site') @ApiOkResponse({schema:schemas.list}) list(@Req()r:SepRequest){return this.service.publicList(r.security);}
 @Get(':id') @Access('public-site') @ApiOkResponse({schema:schemas.detail}) detail(@Req()r:SepRequest,@Param('id',ParseUUIDPipe)id:string){return this.service.publicDetail(r.security,id);}
 private async send(r:SepRequest,id:string,res:Response,download:boolean){const data=await this.service.file(r.security,id,download);res.set({'content-type':'application/pdf','content-disposition':`${download?'attachment':'inline'}; filename="poster-${id}.pdf"`,'cache-control':'no-store','x-content-type-options':'nosniff'});res.send(data);}
 @Get(':id/view') @Access('public-site') @ApiProduces('application/pdf') @ApiOkResponse({schema:{type:'string',format:'binary'}}) view(@Req()r:SepRequest,@Param('id',ParseUUIDPipe)id:string,@Res()res:Response){return this.send(r,id,res,false);}
 @Get(':id/pdf') @Access('public-site') @ApiProduces('application/pdf') @ApiOkResponse({schema:{type:'string',format:'binary'}}) pdf(@Req()r:SepRequest,@Param('id',ParseUUIDPipe)id:string,@Res()res:Response){return this.send(r,id,res,true);}
}
@Module({imports:[IdentityModule],providers:[GalleryService,AuditService,ManuscriptsService],controllers:[GalleryController,PublicGalleryController]})
export class GalleryModule{}
