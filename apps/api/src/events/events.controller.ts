import { Body, Controller, Get, Param, Patch, Post, Query, Req } from '@nestjs/common';
import { ApiBearerAuth, ApiCreatedResponse, ApiOkResponse, ApiOperation, ApiParam, ApiTags } from '@nestjs/swagger';
import { Access } from '../platform/context.guard.js';
import type { SepRequest } from '../common/http.js';
import { ApiErrors } from '../common/openapi.js';
import { CreateEventDto, EventDto, EventPageDto, ListEventsQuery, PublicEventDto, UpdateEventDto } from './event.dto.js';
import { EventsService } from './events.service.js';

@ApiTags('events') @ApiBearerAuth() @ApiErrors() @Controller('events')
export class EventsController {
  constructor(private readonly service: EventsService) {}
  @Get() @Access('event-read') @ApiOkResponse({ type: EventPageDto })
  @ApiOperation({ summary: 'Lista de metadatos administrativos; organizador del evento o administrador de organización.' })
  list(@Req() request: SepRequest, @Query() query: ListEventsQuery) { return this.service.list(request.security, query); }
  @Get(':eventId') @Access('event-read') @ApiOkResponse({ type: EventDto })
  @ApiParam({ name: 'eventId', schema: { type: 'string', format: 'uuid' } })
  @ApiOperation({ summary: 'Metadatos del evento dentro del contexto autorizado.' })
  get(@Req() request: SepRequest, @Param('eventId') id: string) { return this.service.get(request.security, id); }
  @Post() @Access('event-create') @ApiCreatedResponse({ type: EventDto })
  @ApiOperation({ summary: 'Crea borrador; requiere administrador y dominio de organización.' })
  create(@Req() request: SepRequest, @Body() dto: CreateEventDto) { return this.service.create(request.security, dto); }
  @Patch(':eventId') @Access('event-update') @ApiOkResponse({ type: EventDto })
  @ApiParam({ name: 'eventId', schema: { type: 'string', format: 'uuid' } })
  @ApiOperation({ summary: 'Edita nombres; requiere organizador explícito del evento.' })
  update(@Req() request: SepRequest, @Param('eventId') id: string, @Body() dto: UpdateEventDto) { return this.service.update(request.security, id, dto); }
}
@ApiTags('public') @ApiErrors() @Controller('public')
export class PublicEventsController {
  constructor(private readonly service: EventsService) {}
  @Get('event') @Access('public-event') @ApiOkResponse({ type: PublicEventDto })
  @ApiOperation({ summary: 'Proyección pública del evento publicado vinculado al dominio; sin autenticación.' })
  get(@Req() request: SepRequest) { return this.service.publicEvent(request.security); }
}
