import {attendanceSchemas} from './attendance.openapi.js';
import {Module,Controller,Get,Post,Body,Query,Req,HttpCode,Param,ParseUUIDPipe} from '@nestjs/common';
import {ApiTags,ApiBearerAuth,ApiOkResponse} from '@nestjs/swagger';
import {IdentityModule} from '../identity/identity.module.js';
import {AuditService} from '../common/audit.service.js';
import {ApiErrors} from '../common/openapi.js';
import type {SepRequest} from '../common/http.js';
import {Access} from '../platform/context.guard.js';
import {AttendanceService} from './attendance.service.js';
import {AttendanceQuery,CredentialRevisionDto,CredentialLookupDto,CheckInDto,CorrectAttendanceDto} from './attendance.dto.js';
@ApiTags('attendance') @ApiBearerAuth() @ApiErrors() @Controller('events/:eventId/attendance')
class AttendanceController {
 constructor(private readonly service:AttendanceService){}
 @Get() @Access('attendance-manage') @ApiOkResponse({schema:attendanceSchemas.workspace}) list(@Req()r:SepRequest,@Query()q:AttendanceQuery){return this.service.workspace(r.security,q);}
 @Get('mine') @Access('author-work') @ApiOkResponse({schema:attendanceSchemas.detail}) mine(@Req()r:SepRequest){return this.service.mine(r.security);}
 @Post('credential') @HttpCode(200) @Access('author-work') @ApiOkResponse({schema:attendanceSchemas.credential}) credential(@Req()r:SepRequest,@Body()d:CredentialRevisionDto){return this.service.credential(r.security,d.revision);}
 @Post('credential/revoke') @HttpCode(200) @Access('author-work') @ApiOkResponse({schema:attendanceSchemas.credential}) revoke(@Req()r:SepRequest,@Body()d:CredentialRevisionDto){return this.service.credential(r.security,d.revision,true);}
 @Post('lookup') @HttpCode(200) @Access('attendance-manage') @ApiOkResponse({schema:attendanceSchemas.detail}) lookup(@Req()r:SepRequest,@Body()d:CredentialLookupDto){return this.service.lookup(r.security,d.code);}
 @Get('registrations/:id') @Access('attendance-manage') @ApiOkResponse({schema:attendanceSchemas.detail}) detail(@Req()r:SepRequest,@Param('id',ParseUUIDPipe)id:string){return this.service.get(r.security,id);}
 @Post('registrations/:id/check-in') @HttpCode(200) @Access('attendance-manage') @ApiOkResponse({schema:attendanceSchemas.detail}) checkIn(@Req()r:SepRequest,@Param('id',ParseUUIDPipe)id:string,@Body()d:CheckInDto){return this.service.checkIn(r.security,id,d);}
 @Post('records/:id/correction') @HttpCode(200) @Access('attendance-manage') @ApiOkResponse({schema:attendanceSchemas.detail}) correction(@Req()r:SepRequest,@Param('id',ParseUUIDPipe)id:string,@Body()d:CorrectAttendanceDto){return this.service.correct(r.security,id,d);}
}
@Module({imports:[IdentityModule],providers:[AttendanceService,AuditService],controllers:[AttendanceController]})
export class AttendanceModule{}
