import { Module } from '@nestjs/common';
import { Body, Controller, Get, Param, Post, Put, Req } from '@nestjs/common';
import { ApiBearerAuth, ApiOkResponse, ApiTags } from '@nestjs/swagger';
import { IdentityModule } from '../identity/identity.module.js';
import { AuditService } from '../common/audit.service.js';
import type { SepRequest } from '../common/http.js';
import { ApiErrors } from '../common/openapi.js';
import { Access } from '../platform/context.guard.js';
import { CallDraftDto, CallRevisionDto, PublishedCallDto, SaveCallDto } from './call.dto.js';
import { ScientificCallService } from './call.service.js';

@ApiTags('scientific-call') @ApiBearerAuth() @ApiErrors() @Controller('events/:eventId/call')
class CallController {
  constructor(private readonly service: ScientificCallService) {}
  @Get() @Access('site-read') @ApiOkResponse({ type: CallDraftDto })
  get(@Req() req: SepRequest, @Param('eventId') id: string) { return this.service.get(req.security, id); }
  @Put() @Access('site-update') @ApiOkResponse({ type: CallDraftDto })
  save(@Req() req: SepRequest, @Param('eventId') id: string, @Body() dto: SaveCallDto) { return this.service.save(req.security, id, dto); }
  @Post('publish') @Access('site-publish') @ApiOkResponse({ type: CallDraftDto })
  publish(@Req() req: SepRequest, @Param('eventId') id: string, @Body() dto: CallRevisionDto) { return this.service.publish(req.security, id, dto.revision); }
  @Post('withdraw') @Access('site-publish') @ApiOkResponse({ type: CallDraftDto })
  withdraw(@Req() req: SepRequest, @Param('eventId') id: string, @Body() dto: CallRevisionDto) { return this.service.withdraw(req.security, id, dto.revision); }
}
@ApiTags('public') @ApiErrors() @Controller('public/call')
class PublicCallController {
  constructor(private readonly service: ScientificCallService) {}
  @Get() @Access('public-site') @ApiOkResponse({ type: PublishedCallDto })
  get(@Req() req: SepRequest) { return this.service.publicCall(req.security); }
}
@Module({ imports: [IdentityModule], controllers: [CallController, PublicCallController], providers: [ScientificCallService, AuditService] })
export class ScienceModule {}
