import {Body,Controller,Get,HttpCode,Module,Param,ParseUUIDPipe,Post,Put,Req} from '@nestjs/common';
import {ApiBearerAuth,ApiOkResponse,ApiTags} from '@nestjs/swagger';
import {IdentityModule} from '../identity/identity.module.js';
import {AuditService} from '../common/audit.service.js';
import {Access} from '../platform/context.guard.js';
import type {SepRequest} from '../common/http.js';
import {ApiErrors} from '../common/openapi.js';
import {OperationsService} from './operations.service.js';
import {BookSessionDto,SaveResourceDto,SaveAssignmentDto,SaveSessionPolicyDto,SaveSessionChannelDto} from './operations.dto.js';
import {operationsSchemas as schemas} from '../common/operations.openapi.js';
@ApiTags('operations') @ApiBearerAuth() @ApiErrors() @Controller('events/:eventId/operations')
class OperationsController{
 constructor(private readonly service:OperationsService){}
 @Get() @Access('operations-manage') @ApiOkResponse({schema:schemas.workspace}) workspace(@Req()r:SepRequest){return this.service.workspace(r.security);}
 @Put('resources') @Access('operations-manage') @ApiOkResponse({schema:schemas.updated}) resource(@Req()r:SepRequest,@Body()d:SaveResourceDto){return this.service.saveResource(r.security,d);}
 @Put('assignments') @Access('operations-manage') @ApiOkResponse({schema:schemas.updated}) assignment(@Req()r:SepRequest,@Body()d:SaveAssignmentDto){return this.service.saveAssignment(r.security,d);}
 @Put('policies/:id') @Access('operations-manage') @ApiOkResponse({schema:schemas.policy}) policy(@Req()r:SepRequest,@Param('id',ParseUUIDPipe)id:string,@Body()d:SaveSessionPolicyDto){return this.service.savePolicy(r.security,id,d);}
 @Put('channels/:id') @Access('operations-manage') @ApiOkResponse({schema:schemas.channel}) channel(@Req()r:SepRequest,@Param('id',ParseUUIDPipe)id:string,@Body()d:SaveSessionChannelDto){return this.service.saveChannel(r.security,id,d);}
 @Get('mine') @Access('author-work') @ApiOkResponse({schema:schemas.mine}) mine(@Req()r:SepRequest){return this.service.mine(r.security);}
 @Post('mine/:id/book') @HttpCode(200) @Access('author-work') @ApiOkResponse({schema:schemas.mine}) book(@Req()r:SepRequest,@Param('id',ParseUUIDPipe)id:string,@Body()d:BookSessionDto){return this.service.book(r.security,id,d.revision);}
 @Post('mine/:id/cancel') @HttpCode(200) @Access('author-work') @ApiOkResponse({schema:schemas.mine}) cancel(@Req()r:SepRequest,@Param('id',ParseUUIDPipe)id:string,@Body()d:BookSessionDto){return this.service.book(r.security,id,d.revision,true);}
 @Post('mine/:id/join') @HttpCode(200) @Access('author-work') @ApiOkResponse({schema:schemas.access}) join(@Req()r:SepRequest,@Param('id',ParseUUIDPipe)id:string){return this.service.access(r.security,id);}
 @Post('mine/:id/recording') @HttpCode(200) @Access('author-work') @ApiOkResponse({schema:schemas.access}) recording(@Req()r:SepRequest,@Param('id',ParseUUIDPipe)id:string){return this.service.access(r.security,id,true);}
}
@Module({imports:[IdentityModule],providers:[OperationsService,AuditService],controllers:[OperationsController]})
export class OperationsModule{}
