import {Body,Controller,Get,HttpCode,Module,Param,ParseUUIDPipe,Post,Put,Query,Req} from '@nestjs/common';
import {ApiBearerAuth,ApiOkResponse,ApiTags} from '@nestjs/swagger';
import {IdentityModule} from '../identity/identity.module.js';
import {Access} from '../platform/context.guard.js';
import {ApiErrors} from '../common/openapi.js';
import type {SepRequest} from '../common/http.js';
import {CommunicationsService} from './communications.service.js';
import {MailWorker} from './mail.worker.js';
import {AnnouncementDto,MailQuery,MarkNotificationDto,NotificationQuery,SaveNotificationPreferencesDto} from './communications.dto.js';
import {communicationSchemas as schemas} from './communications.openapi.js';
@ApiTags('communications') @ApiBearerAuth() @ApiErrors() @Controller('events/:eventId')
class CommunicationsController {
 constructor(private readonly service:CommunicationsService){}
 @Get('notifications') @Access('author-work') @ApiOkResponse({schema:schemas.inbox}) list(@Req()r:SepRequest,@Query()q:NotificationQuery){return this.service.list(r.security,q,r.locale);}
 @Get('notifications/preferences') @Access('author-work') @ApiOkResponse({schema:schemas.preferences}) preferences(@Req()r:SepRequest){return this.service.getPreferences(r.security);}
 @Put('notifications/preferences') @Access('author-work') @ApiOkResponse({schema:schemas.preferences}) savePreferences(@Req()r:SepRequest,@Body()d:SaveNotificationPreferencesDto){return this.service.savePreferences(r.security,d);}
 @Post('notifications/:id/read') @HttpCode(200) @Access('author-work') @ApiOkResponse({schema:schemas.updated}) mark(@Req()r:SepRequest,@Param('id',ParseUUIDPipe)id:string,@Body()d:MarkNotificationDto){return this.service.mark(r.security,id,d.read);}
 @Get('communications/deliveries') @Access('communications-manage') @ApiOkResponse({schema:schemas.deliveries}) mail(@Req()r:SepRequest,@Query()q:MailQuery){return this.service.mail(r.security,q,r.locale);}
 @Get('communications/deliveries/:id/attempts') @Access('communications-manage') @ApiOkResponse({schema:schemas.attempts}) attempts(@Req()r:SepRequest,@Param('id',ParseUUIDPipe)id:string){return this.service.attempts(r.security,id);}
 @Post('communications/deliveries/:id/retry') @HttpCode(200) @Access('communications-manage') @ApiOkResponse({schema:schemas.queued}) retry(@Req()r:SepRequest,@Param('id',ParseUUIDPipe)id:string){return this.service.retry(r.security,id);}
 @Get('communications/templates') @Access('communications-manage') @ApiOkResponse({schema:schemas.templates}) templates(@Req()r:SepRequest){return this.service.templates(r.security);}
 @Get('communications/announcements') @Access('communications-manage') @ApiOkResponse({schema:schemas.announcements}) announcements(@Req()r:SepRequest){return this.service.announcementList(r.security);}
 @Post('communications/announcements') @HttpCode(200) @Access('communications-manage') @ApiOkResponse({schema:schemas.created}) announce(@Req()r:SepRequest,@Body()d:AnnouncementDto){return this.service.announce(r.security,d);}
}
@Module({imports:[IdentityModule],providers:[CommunicationsService,MailWorker],controllers:[CommunicationsController]})
export class CommunicationsModule{}
