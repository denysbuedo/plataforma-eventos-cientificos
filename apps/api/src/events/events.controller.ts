import { Body, Controller, Get, HttpCode, Param, Patch, Post, Query, Req } from '@nestjs/common';
import { ApiBearerAuth, ApiCreatedResponse, ApiOkResponse, ApiOperation, ApiParam, ApiTags } from '@nestjs/swagger';
import {IsString,MaxLength,MinLength} from 'class-validator';
import {ApiProperty} from '@nestjs/swagger';
import { Access } from '../platform/context.guard.js';
import type { SepRequest } from '../common/http.js';
import { ApiErrors } from '../common/openapi.js';
import { CreateEventDto, EventDto, EventPageDto, ListEventsQuery, PublicEventDto, UpdateEventDto } from './event.dto.js';
import { EventsService } from './events.service.js';

class RemoveEventDto{@ApiProperty() @IsString() @MinLength(2) @MaxLength(200) confirmationName!:string;@ApiProperty() @IsString() @MinLength(10) @MaxLength(1000) reason!:string;}
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
  @Post(':eventId/remove') @HttpCode(200) @Access('event-delete') @ApiOkResponse({schema:{type:'object'}})
  remove(@Req()r:SepRequest,@Param('eventId')id:string,@Body()d:RemoveEventDto){return this.service.remove(r.security,id,d);}
  @Patch(':eventId') @Access('event-update') @ApiOkResponse({ type: EventDto })
  @ApiParam({ name: 'eventId', schema: { type: 'string', format: 'uuid' } })
  @ApiOperation({ summary: 'Edita nombres; requiere administrador de organización u organizador del evento.' })
  update(@Req() request: SepRequest, @Param('eventId') id: string, @Body() dto: UpdateEventDto) { return this.service.update(request.security, id, dto); }
}
@ApiTags('public') @ApiErrors() @Controller('public')
export class PublicEventsController {
  constructor(private readonly service: EventsService) {}
  @Get('event') @Access('public-event') @ApiOkResponse({ type: PublicEventDto })
  @ApiOperation({ summary: 'Proyección pública del evento publicado vinculado al dominio; sin autenticación.' })
  get(@Req() request: SepRequest) { return this.service.publicEvent(request.security); }
}
