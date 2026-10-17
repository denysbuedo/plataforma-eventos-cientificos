import {PeerReviewService} from './reviews.service.js';
import {PeerReviewController} from './reviews.controller.js';
import { WorkCollaborationsController, WorkCollaborationsService } from './collaborations.js';
import { AuthorshipController, AuthorshipService } from './authorship.js';
import { Body, Controller, Delete, Get, HttpCode, Module, Param, Post, Put, Req, Res, Query, UploadedFile, UseInterceptors } from '@nestjs/common';
import { ApiBearerAuth, ApiCreatedResponse, ApiOkResponse, ApiTags, ApiConsumes, ApiBody } from '@nestjs/swagger';
import { FileInterceptor } from '@nestjs/platform-express';
import type { Response } from 'express';
import { MAX_MANUSCRIPT_BYTES } from '@sep/contracts';
import { IdentityModule } from '../identity/identity.module.js';
import { ManuscriptsService } from './manuscripts.service.js';
import { SubmissionsStaffService } from './staff.service.js';
import { WorkRevisionDto, SubmitWorkDto, WorkMessageDto, WorkDecisionDto, SubmissionQuery } from './workflow.dto.js';
import { isUUID } from 'class-validator';
import { AuditService } from '../common/audit.service.js';
import { ApiException, type SepRequest } from '../common/http.js';
import { ApiErrors } from '../common/openapi.js';
import { Access } from '../platform/context.guard.js';
import { WorkNoticeBoardDto, ReadWorkNoticesDto, AuthorWorkspaceDto, CreateWorkDto, SaveWorkDto, WorkDto, VersionDto, StaffWorkDto, SubmissionPageDto } from './works.dto.js';
import { AuthorWorksService } from './works.service.js';
@ApiTags('author-works') @ApiBearerAuth() @ApiErrors() @Controller('events/:eventId/my-works')
class AuthorWorksController {
  constructor(private readonly service: AuthorWorksService) {}
  @Get() @Access('author-work') @ApiOkResponse({ type: AuthorWorkspaceDto })
  get(@Req() req: SepRequest) { return this.service.get(req.security); }
  @Get('notices') @Access('author-work') @ApiOkResponse({type:WorkNoticeBoardDto}) notices(@Req()req:SepRequest){return this.service.notices(req.security);}
  @Post(':workId/notices/read') @HttpCode(200) @Access('author-work') @ApiOkResponse({type:WorkNoticeBoardDto}) readNotices(@Req()req:SepRequest,@Param('workId')id:string,@Body()dto:ReadWorkNoticesDto){uuid(id);return this.service.readNotices(req.security,id,dto.noticeIds);}
  @Get(':workId') @Access('author-work') @ApiOkResponse({ type: WorkDto })
  read(@Req() req: SepRequest, @Param('workId') id: string) {
    if (!isUUID(id)) throw new ApiException(400, 'VALIDATION_FAILED'); return this.service.read(req.security, id);
  }
  @Post(':workId/submit') @Access('author-work') @ApiOkResponse({type:WorkDto})
  submit(@Req() req:SepRequest,@Param('workId') id:string,@Body() dto:SubmitWorkDto){ uuid(id);return this.service.submit(req.security,id,dto.revision); }
  @Delete(':workId') @Access('author-work') @ApiOkResponse({schema:{type:'object',properties:{deleted:{type:'boolean'}}}})
  removeDraft(@Req() req:SepRequest,@Param('workId') id:string,@Body() dto:WorkRevisionDto){uuid(id);return this.service.removeDraft(req.security,id,dto.revision);}
  @Post(':workId/synchronize-call') @Access('author-work') @ApiOkResponse({type:WorkDto})
  sync(@Req() req:SepRequest,@Param('workId') id:string,@Body() dto:WorkRevisionDto){uuid(id);return this.service.synchronize(req.security,id,dto.revision);}
  @Post(':workId/withdraw') @Access('author-work') @ApiOkResponse({type:WorkDto})
  withdraw(@Req() req:SepRequest,@Param('workId') id:string,@Body() dto:WorkMessageDto){uuid(id);return this.service.withdraw(req.security,id,dto.revision,dto.message);}
  @Get(':workId/versions/:versionId') @Access('author-work') @ApiOkResponse({type:VersionDto})
  version(@Req() req:SepRequest,@Param('workId') id:string,@Param('versionId') versionId:string){uuid(id,versionId);return this.service.version(req.security,id,versionId);}
  @Post(':workId/manuscript') @Access('author-work') @ApiOkResponse({type:WorkDto}) @ApiConsumes('multipart/form-data')
  @ApiBody({schema:{type:'object',required:['file','revision'],properties:{file:{type:'string',format:'binary'},revision:{type:'integer'}}}})
  @UseInterceptors(FileInterceptor('file',{limits:{fileSize:MAX_MANUSCRIPT_BYTES,files:1,fields:1,parts:2}}))
  upload(@Req() req:SepRequest,@Param('workId') id:string,@Body() dto:WorkRevisionDto,@UploadedFile() file?:{buffer:Buffer;originalname:string;mimetype:string}){uuid(id);if(!file||file.mimetype!=='application/pdf')throw new ApiException(400,'PDF_INVALID');return this.service.upload(req.security,id,dto.revision,file.buffer,file.originalname);}
  @Delete(':workId/manuscript') @Access('author-work') @ApiOkResponse({type:WorkDto})
  remove(@Req() req:SepRequest,@Param('workId') id:string,@Body() dto:WorkRevisionDto){uuid(id);return this.service.removeFile(req.security,id,dto.revision);}
  @Get(':workId/files/:fileId') @Access('author-work') @ApiOkResponse({schema:{type:'string',format:'binary'},description:'PDF privado como descarga.'})
  async download(@Req() req:SepRequest,@Param('workId') id:string,@Param('fileId') fileId:string,@Res() res:Response){uuid(id,fileId);const asset=await this.service.download(req.security,id,fileId);sendPdf(res,asset);}
  @Post() @Access('author-work') @ApiCreatedResponse({ type: WorkDto })
  create(@Req() req: SepRequest, @Body() dto: CreateWorkDto) { return this.service.create(req.security, dto); }
  @Put(':workId') @Access('author-work') @ApiOkResponse({ type: WorkDto })
  save(@Req() req: SepRequest, @Param('workId') id: string, @Body() dto: SaveWorkDto) {
    if (!isUUID(id)) throw new ApiException(400, 'VALIDATION_FAILED'); return this.service.save(req.security, id, dto);
  }
}

function uuid(...ids:string[]){if(ids.some(id=>!isUUID(id)))throw new ApiException(400,'VALIDATION_FAILED');}
function sendPdf(res:Response,asset:{data:Buffer;metadata:{id:string}}){res.set({'content-type':'application/pdf','content-disposition':'attachment; filename="manuscript-'+asset.metadata.id+'.pdf"','cache-control':'no-store','x-content-type-options':'nosniff'});res.send(asset.data);}
@ApiTags('submissions') @ApiBearerAuth() @ApiErrors() @Controller('events/:eventId/submissions')
class SubmissionsStaffController {
  constructor(private readonly service:SubmissionsStaffService){}
  @Get() @Access('submissions-manage') @ApiOkResponse({type:SubmissionPageDto})
  list(@Req() req:SepRequest,@Query() query:SubmissionQuery){return this.service.list(req.security,query);}
  @Get(':workId') @Access('submissions-manage') @ApiOkResponse({type:StaffWorkDto})
  read(@Req() req:SepRequest,@Param('workId') id:string){uuid(id);return this.service.read(req.security,id);}
  @Post(':workId/decision') @Access('submissions-manage') @ApiOkResponse({type:StaffWorkDto})
  decide(@Req() req:SepRequest,@Param('workId') id:string,@Body() dto:WorkDecisionDto){uuid(id);return this.service.decide(req.security,id,dto);}
  @Get(':workId/versions/:versionId') @Access('submissions-manage') @ApiOkResponse({type:VersionDto})
  version(@Req() req:SepRequest,@Param('workId') id:string,@Param('versionId') versionId:string){uuid(id,versionId);return this.service.version(req.security,id,versionId);}
  @Get(':workId/files/:fileId') @Access('submissions-manage') @ApiOkResponse({schema:{type:'string',format:'binary'}})
  async file(@Req() req:SepRequest,@Param('workId') id:string,@Param('fileId') fileId:string,@Res() res:Response){uuid(id,fileId);sendPdf(res,await this.service.file(req.security,id,fileId));}
}

@Module({ imports:[IdentityModule], controllers: [AuthorWorksController, SubmissionsStaffController, WorkCollaborationsController, AuthorshipController, PeerReviewController], providers: [PeerReviewService, AuthorWorksService, AuditService, ManuscriptsService, SubmissionsStaffService, WorkCollaborationsService, AuthorshipService] })
export class SubmissionsModule {}
