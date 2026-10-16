import { Body, Controller, Get, Injectable, Param, Post, Put, Req } from '@nestjs/common';
import { ApiBearerAuth, ApiOkResponse, ApiProperty, ApiPropertyOptional, ApiTags } from '@nestjs/swagger';
import { ArrayMaxSize, ArrayMinSize, ArrayUnique, IsArray, IsBoolean, IsIn, IsInt, IsString, Matches, Max, MaxLength, Min, ValidateBy, ValidateIf } from 'class-validator';
import { and, eq } from 'drizzle-orm';
import type { EventConfiguration, EventLifecycle } from '@sep/contracts';
import { eventConfigurations, events } from '../database/schema.js';
import type { DbTransaction } from '../database/database.service.js';
import { AuthorizationService } from '../identity/authorization.service.js';
import { ApiException, type RequestContext, type SepRequest } from '../common/http.js';
import { AuditService } from '../common/audit.service.js';
import { Access } from '../platform/context.guard.js';
import { ApiErrors } from '../common/openapi.js';

export const lifecycleTransitions: Record<EventLifecycle, EventLifecycle[]> = {
  planning: ['scheduled', 'cancelled'], scheduled: ['planning', 'ongoing', 'cancelled'],
  ongoing: ['completed', 'cancelled'], completed: [], cancelled: ['planning'],
};
const validDate = (value: unknown) => value === null || typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value)
  && value >= '1900-01-01' && value <= '9999-12-31' && Number.isFinite(Date.parse(value)) && new Date(value).toISOString().slice(0, 10) === value;
class SaveConfigurationDto {
  @ApiPropertyOptional() @ValidateIf((_,value)=>value!==undefined) @IsBoolean() requireSubmittingAuthorOrcid?:boolean;
  @ApiProperty() @IsString() @MaxLength(100)
  @ValidateBy({ name: 'timezone', validator: { validate: (value: unknown) => {
    if (typeof value !== 'string') return false; try { new Intl.DateTimeFormat('en', { timeZone: value }); return true; } catch { return false; }
  } } }) timezone!: string;
  @ApiProperty({ type: String, nullable: true, format: 'date' })
  @ValidateBy({ name: 'dateOnly', validator: { validate: validDate } }) startDate!: string | null;
  @ApiProperty({ type: String, nullable: true, format: 'date' })
  @ValidateBy({ name: 'dateOnly', validator: { validate: validDate } }) endDate!: string | null;
  @ApiProperty({ enum: ['in_person', 'virtual', 'hybrid'] }) @IsIn(['in_person', 'virtual', 'hybrid']) modality!: EventConfiguration['modality'];
  @ApiProperty({ type: [String], enum: ['es', 'en'], minItems: 1, maxItems: 2, uniqueItems: true })
  @IsArray() @ArrayMinSize(1) @ArrayMaxSize(2) @ArrayUnique() @IsIn(['es', 'en'], { each: true }) languages!: ('es' | 'en')[];
  @ApiProperty({ enum: ['es', 'en'] }) @IsIn(['es', 'en']) defaultLanguage!: 'es' | 'en';
  @ApiProperty({ minimum: 0 }) @IsInt() @Min(0) @Max(2147483646) revision!: number;
}
class LifecycleDto {
  @ApiProperty({ enum: ['planning', 'scheduled', 'ongoing', 'completed', 'cancelled'] })
  @IsString() @Matches(/^(planning|scheduled|ongoing|completed|cancelled)$/) lifecycle!: EventLifecycle;
  @ApiProperty({ minimum: 0 }) @IsInt() @Min(0) @Max(2147483646) revision!: number;
}
class ConfigurationDto extends SaveConfigurationDto implements EventConfiguration {
  @ApiProperty({ enum: ['planning', 'scheduled', 'ongoing', 'completed', 'cancelled'] }) lifecycle!: EventLifecycle;
}

export async function readEventConfiguration(tx: DbTransaction, organizationId: string, eventId: string, timezone: string): Promise<EventConfiguration> {
  const [row] = await tx.select().from(eventConfigurations).where(and(eq(eventConfigurations.organizationId, organizationId), eq(eventConfigurations.eventId, eventId)));
  return row ? { timezone, startDate: row.startDate, endDate: row.endDate, modality: row.modality, languages: row.languages,
    defaultLanguage: row.defaultLanguage, lifecycle: row.lifecycle, revision: row.revision,requireSubmittingAuthorOrcid:row.requireSubmittingAuthorOrcid }
    : { timezone, startDate: null, endDate: null, modality: 'in_person', languages: ['es', 'en'], defaultLanguage: 'es', lifecycle: 'planning', revision: 0,requireSubmittingAuthorOrcid:false };
}
@Injectable()
export class EventConfigurationService {
  constructor(private readonly authorization: AuthorizationService, private readonly audit: AuditService) {}
  private async event(tx: DbTransaction, context: RequestContext, id: string, lock = false) {
    const query = tx.select().from(events).where(and(eq(events.organizationId, context.organizationId), eq(events.id, id)));
    const [event] = await (lock ? query.for('update') : query);
    if (!event) throw new ApiException(404, 'NOT_FOUND');
    return event;
  }
  get(context: RequestContext, id: string) {
    return this.authorization.run(context, 'event-read', async (tx) => {
      const event = await this.event(tx, context, id);
      return readEventConfiguration(tx, context.organizationId, id, event.timezone);
    });
  }
  save(context: RequestContext, id: string, dto: SaveConfigurationDto) {
    if ((dto.startDate === null) !== (dto.endDate === null) || dto.startDate && dto.endDate! < dto.startDate || !dto.languages.includes(dto.defaultLanguage)) throw new ApiException(400, 'VALIDATION_FAILED');
    return this.authorization.run(context, 'event-update', async (tx) => {
      const event = await this.event(tx, context, id, true);
      const before = await readEventConfiguration(tx, context.organizationId, id, event.timezone);
      if (event.status === 'archived' || before.lifecycle === 'completed') throw new ApiException(409, 'CONFLICT');
      if (before.revision !== dto.revision) throw new ApiException(409, 'REVISION_CONFLICT');
      if (['scheduled', 'ongoing'].includes(before.lifecycle) && !dto.startDate) throw new ApiException(409, 'EVENT_DATES_REQUIRED');
      const { timezone, ...configuration } = dto;
      const values = { ...configuration, revision: dto.revision + 1, lifecycle: before.lifecycle,requireSubmittingAuthorOrcid:dto.requireSubmittingAuthorOrcid??before.requireSubmittingAuthorOrcid??false };
      await tx.insert(eventConfigurations).values({ organizationId: context.organizationId, eventId: id, ...values })
        .onConflictDoUpdate({ target: [eventConfigurations.organizationId, eventConfigurations.eventId], set: values });
      await tx.update(events).set({ timezone }).where(and(eq(events.organizationId, context.organizationId), eq(events.id, id)));
      await this.audit.record(tx, context, 'event.configuration.saved', id);
      return readEventConfiguration(tx, context.organizationId, id, timezone);
    });
  }
  transition(context: RequestContext, id: string, dto: LifecycleDto) {
    return this.authorization.run(context, 'event-update', async (tx) => {
      const event = await this.event(tx, context, id, true);
      const before = await readEventConfiguration(tx, context.organizationId, id, event.timezone);
      if (event.status === 'archived' || !lifecycleTransitions[before.lifecycle].includes(dto.lifecycle)) throw new ApiException(409, 'CONFLICT');
      if (before.revision !== dto.revision) throw new ApiException(409, 'REVISION_CONFLICT');
      if (['scheduled', 'ongoing', 'completed'].includes(dto.lifecycle) && !before.startDate) throw new ApiException(409, 'EVENT_DATES_REQUIRED');
      const values = { startDate: before.startDate, endDate: before.endDate, modality: before.modality,
        languages: before.languages, defaultLanguage: before.defaultLanguage, lifecycle: dto.lifecycle, revision: before.revision + 1,requireSubmittingAuthorOrcid:before.requireSubmittingAuthorOrcid??false };
      await tx.insert(eventConfigurations).values({ organizationId: context.organizationId, eventId: id, ...values })
        .onConflictDoUpdate({ target: [eventConfigurations.organizationId, eventConfigurations.eventId], set: values });
      await this.audit.record(tx, context, 'event.lifecycle.changed', id);
      return readEventConfiguration(tx, context.organizationId, id, event.timezone);
    });
  }
}
@ApiTags('event-configuration') @ApiBearerAuth() @ApiErrors() @Controller('events/:eventId')
export class EventConfigurationController {
  constructor(private readonly service: EventConfigurationService) {}
  @Get('configuration') @Access('event-read') @ApiOkResponse({ type: ConfigurationDto })
  get(@Req() request: SepRequest, @Param('eventId') id: string) { return this.service.get(request.security, id); }
  @Put('configuration') @Access('event-update') @ApiOkResponse({ type: ConfigurationDto })
  save(@Req() request: SepRequest, @Param('eventId') id: string, @Body() dto: SaveConfigurationDto) { return this.service.save(request.security, id, dto); }
  @Post('lifecycle') @Access('event-update') @ApiOkResponse({ type: ConfigurationDto })
  transition(@Req() request: SepRequest, @Param('eventId') id: string, @Body() dto: LifecycleDto) { return this.service.transition(request.security, id, dto); }
}
