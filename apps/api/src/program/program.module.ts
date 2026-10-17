import {Module,Controller,Get,Put,Post,Body,Query,Req,HttpCode} from '@nestjs/common';
import {ApiTags,ApiBearerAuth,ApiOkResponse} from '@nestjs/swagger';
import {IdentityModule} from '../identity/identity.module.js';
import {AuditService} from '../common/audit.service.js';
import {ApiErrors} from '../common/openapi.js';
import type {SepRequest} from '../common/http.js';
import {Access} from '../platform/context.guard.js';
import {ProgramService} from './program.service.js';
import {SaveProgramDto,ProgramRevisionDto,ProgramCandidatesQuery,ProgramDraftDto,PublicProgramDto,ProgramCandidatesDto,MyParticipationDto} from './program.dto.js';
@ApiTags('scientific-program') @ApiBearerAuth() @ApiErrors() @Controller('events/:eventId/program')
class ProgramController {
 constructor(private readonly service:ProgramService){}
 @Get('mine') @Access('author-work') @ApiOkResponse({type:MyParticipationDto}) mine(@Req()req:SepRequest){return this.service.mine(req.security);}
 @Get('candidates') @Access('submissions-manage') @ApiOkResponse({type:ProgramCandidatesDto}) candidates(@Req()req:SepRequest,@Query()q:ProgramCandidatesQuery){return this.service.candidates(req.security,q);}
 @Get() @Access('submissions-manage') @ApiOkResponse({type:ProgramDraftDto}) get(@Req()req:SepRequest){return this.service.get(req.security);}
 @Put() @Access('submissions-manage') @ApiOkResponse({type:ProgramDraftDto}) save(@Req()req:SepRequest,@Body()dto:SaveProgramDto){return this.service.save(req.security,dto);}
 @Post('publish') @HttpCode(200) @Access('submissions-manage') @ApiOkResponse({type:ProgramDraftDto}) publish(@Req()req:SepRequest,@Body()dto:ProgramRevisionDto){return this.service.publish(req.security,dto.revision);}
 @Post('withdraw') @HttpCode(200) @Access('submissions-manage') @ApiOkResponse({type:ProgramDraftDto}) withdraw(@Req()req:SepRequest,@Body()dto:ProgramRevisionDto){return this.service.withdraw(req.security,dto.revision);}
}
@ApiTags('public') @ApiErrors() @Controller('public/program')
class PublicProgramController {constructor(private readonly service:ProgramService){} @Get() @Access('public-site') @ApiOkResponse({type:PublicProgramDto}) get(@Req()req:SepRequest){return this.service.public(req.security);}}
@Module({imports:[IdentityModule],providers:[ProgramService,AuditService],controllers:[ProgramController,PublicProgramController]})
export class ProgramModule{}
