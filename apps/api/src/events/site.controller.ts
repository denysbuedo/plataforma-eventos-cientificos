import { Body, Controller, Get, Param, Post, Put, Req } from '@nestjs/common';
import { ApiBearerAuth, ApiCreatedResponse, ApiOkResponse, ApiParam, ApiTags } from '@nestjs/swagger';
import { Access } from '../platform/context.guard.js';
import type { SepRequest } from '../common/http.js';
import { ApiErrors } from '../common/openapi.js';
import { PublishSiteDto, PublishedSiteDto, SaveSiteDto, SiteDraftDto } from './site.dto.js';
import { SiteService } from './site.service.js';

@ApiTags('sites') @ApiBearerAuth() @ApiErrors() @ApiParam({ name: 'eventId', schema: { type: 'string', format: 'uuid' } })
@Controller('events/:eventId/site')
export class SiteController {
  constructor(private readonly service: SiteService) {}
  @Get() @Access('site-read') @ApiOkResponse({ type: SiteDraftDto })
  get(@Req() request: SepRequest, @Param('eventId') id: string) { return this.service.get(request.security, id); }
  @Put() @Access('site-update') @ApiOkResponse({ type: SiteDraftDto })
  save(@Req() request: SepRequest, @Param('eventId') id: string, @Body() dto: SaveSiteDto) { return this.service.save(request.security, id, dto); }
  @Post('publish') @Access('site-publish') @ApiCreatedResponse({ type: PublishedSiteDto })
  publish(@Req() request: SepRequest, @Param('eventId') id: string, @Body() dto: PublishSiteDto) { return this.service.publish(request.security, id, dto); }
}
@ApiTags('public') @ApiErrors() @Controller('public')
export class PublicSiteController {
  constructor(private readonly service: SiteService) {}
  @Get('site') @Access('public-site') @ApiOkResponse({ type: PublishedSiteDto })
  get(@Req() request: SepRequest) { return this.service.publicSite(request.security); }
}
