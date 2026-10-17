import {registrationSchemas} from './registration.openapi.js';
import {Module,Controller,Get,Put,Post,Body,Query,Req,HttpCode,Param,ParseUUIDPipe} from '@nestjs/common';
import {ApiTags,ApiBearerAuth,ApiOkResponse} from '@nestjs/swagger';
import {IdentityModule} from '../identity/identity.module.js';
import {AuditService} from '../common/audit.service.js';
import {ApiErrors} from '../common/openapi.js';
import type {SepRequest} from '../common/http.js';
import {Access} from '../platform/context.guard.js';
import {RegistrationService} from './registration.service.js';
import {SaveRegistrationDto,RevisionDto,ApplyRegistrationDto,RegistrationDecisionDto,RegistrationQuery} from './registration.dto.js';
@ApiTags('registrations') @ApiBearerAuth() @ApiErrors() @Controller('events/:eventId/registration')
class RegistrationController {
 constructor(private readonly service:RegistrationService){}
 @Get('settings') @Access('registrations-manage') @ApiOkResponse({schema:registrationSchemas.settings}) settings(@Req()r:SepRequest){return this.service.get(r.security);}
 @Put('settings') @Access('registrations-manage') @ApiOkResponse({schema:registrationSchemas.settings}) save(@Req()r:SepRequest,@Body()d:SaveRegistrationDto){return this.service.save(r.security,d);}
 @Post('settings/publish') @HttpCode(200) @Access('registrations-manage') @ApiOkResponse({schema:registrationSchemas.settings}) publish(@Req()r:SepRequest,@Body()d:RevisionDto){return this.service.publish(r.security,d.revision);}
 @Post('settings/withdraw') @HttpCode(200) @Access('registrations-manage') @ApiOkResponse({schema:registrationSchemas.settings}) withdraw(@Req()r:SepRequest,@Body()d:RevisionDto){return this.service.publish(r.security,d.revision,true);}
 @Get('mine') @Access('author-work') @ApiOkResponse({schema:registrationSchemas.mine}) mine(@Req()r:SepRequest){return this.service.mine(r.security);}
 @Post('mine') @HttpCode(200) @Access('author-work') @ApiOkResponse({schema:registrationSchemas.detail}) apply(@Req()r:SepRequest,@Body()d:ApplyRegistrationDto){return this.service.apply(r.security,d);}
 @Post('mine/cancel') @HttpCode(200) @Access('author-work') @ApiOkResponse({schema:registrationSchemas.detail}) cancel(@Req()r:SepRequest,@Body()d:RevisionDto){return this.service.cancel(r.security,d.revision);}
 @Get('entries') @Access('registrations-manage') @ApiOkResponse({schema:registrationSchemas.page}) list(@Req()r:SepRequest,@Query()q:RegistrationQuery){return this.service.list(r.security,q);}
 @Get('entries/:id') @Access('registrations-manage') @ApiOkResponse({schema:registrationSchemas.detail}) detail(@Req()r:SepRequest,@Param('id',ParseUUIDPipe)id:string){return this.service.getEntry(r.security,id);}
 @Post('entries/:id/decision') @HttpCode(200) @Access('registrations-manage') @ApiOkResponse({schema:registrationSchemas.detail}) decide(@Req()r:SepRequest,@Param('id',ParseUUIDPipe)id:string,@Body()d:RegistrationDecisionDto){return this.service.decide(r.security,id,d);}
}
@ApiTags('public') @ApiErrors() @Controller('public/registration')
class PublicRegistrationController {constructor(private readonly service:RegistrationService){} @Get() @Access('public-site') @ApiOkResponse({schema:registrationSchemas.reception}) get(@Req()r:SepRequest){return this.service.public(r.security);}}
@Module({imports:[IdentityModule],providers:[RegistrationService,AuditService],controllers:[RegistrationController,PublicRegistrationController]})
export class RegistrationModule{}
