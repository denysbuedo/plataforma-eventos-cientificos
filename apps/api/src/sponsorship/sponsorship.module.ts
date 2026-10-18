import {Body,Controller,Get,HttpCode,Module,Param,ParseUUIDPipe,Post,Put,Query,Req} from '@nestjs/common';
import {ApiBearerAuth,ApiOkResponse,ApiTags} from '@nestjs/swagger';
import {IdentityModule} from '../identity/identity.module.js';
import {Access} from '../platform/context.guard.js';
import {AuditService} from '../common/audit.service.js';
import type {SepRequest} from '../common/http.js';
import {ApiErrors} from '../common/openapi.js';
import {SponsorshipService} from './sponsorship.service.js';
import {SaveSponsorshipSettingsDto,SaveSponsorDto,SaveSponsorCommitmentDto,PublishSponsorshipDto,SponsorshipReasonDto,SponsorshipHistoryQuery} from './sponsorship.dto.js';
import {sponsorshipSchemas as s} from './sponsorship.openapi.js';
@ApiTags('sponsorship') @ApiBearerAuth() @ApiErrors() @Controller('events/:eventId/sponsorship')
class SponsorshipController {
 constructor(private readonly service:SponsorshipService){}
 @Get() @Access('sponsorship-manage') @ApiOkResponse({schema:s.workspace}) workspace(@Req()r:SepRequest){return this.service.workspace(r.security);}
 @Put('settings') @Access('sponsorship-manage') @ApiOkResponse({schema:s.settings}) settings(@Req()r:SepRequest,@Body()d:SaveSponsorshipSettingsDto){return this.service.saveSettings(r.security,d);}
 @Get('institutions/:id') @Access('sponsorship-manage') @ApiOkResponse({schema:s.partner}) partner(@Req()r:SepRequest,@Param('id',ParseUUIDPipe)id:string){return this.service.getSponsor(r.security,id);}
 @Put('institutions/:id') @Access('sponsorship-manage') @ApiOkResponse({schema:s.updated}) savePartner(@Req()r:SepRequest,@Param('id',ParseUUIDPipe)id:string,@Body()d:SaveSponsorDto){return this.service.saveSponsor(r.security,id,d);}
 @Put('commitments/:id') @Access('sponsorship-manage') @ApiOkResponse({schema:s.updated}) commitment(@Req()r:SepRequest,@Param('id',ParseUUIDPipe)id:string,@Body()d:SaveSponsorCommitmentDto){return this.service.saveCommitment(r.security,id,d);}
 @Get('preview') @Access('sponsorship-manage') @ApiOkResponse({schema:s.preview}) preview(@Req()r:SepRequest){return this.service.preview(r.security);}
 @Post('publish') @HttpCode(200) @Access('sponsorship-manage') @ApiOkResponse({schema:s.release}) publish(@Req()r:SepRequest,@Body()d:PublishSponsorshipDto){return this.service.publish(r.security,d);}
 @Get('history') @Access('sponsorship-manage') @ApiOkResponse({schema:s.history}) history(@Req()r:SepRequest,@Query()q:SponsorshipHistoryQuery){return this.service.getHistory(r.security,q);}
 @Get('releases/:id') @Access('sponsorship-manage') @ApiOkResponse({schema:s.releaseDetail}) release(@Req()r:SepRequest,@Param('id',ParseUUIDPipe)id:string){return this.service.staffRelease(r.security,id);}
 @Post('releases/:id/withdraw') @HttpCode(200) @Access('sponsorship-manage') @ApiOkResponse({schema:s.release}) withdraw(@Req()r:SepRequest,@Param('id',ParseUUIDPipe)id:string,@Body()d:SponsorshipReasonDto){return this.service.withdraw(r.security,id,d.reason);}
}
@ApiTags('public') @ApiErrors() @Controller('public/events/:eventId/sponsorship')
class PublicSponsorshipController {constructor(private readonly service:SponsorshipService){} @Get() @Access('public-site') @ApiOkResponse({schema:s.public}) public(@Req()r:SepRequest){return this.service.public(r.security);}}
@Module({imports:[IdentityModule],providers:[SponsorshipService,AuditService],controllers:[SponsorshipController,PublicSponsorshipController]})
export class SponsorshipModule{}
