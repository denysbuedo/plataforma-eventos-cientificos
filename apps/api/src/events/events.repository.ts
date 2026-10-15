import { Injectable } from '@nestjs/common';
import { and, eq } from 'drizzle-orm';
import type { EventView, PublicEventView } from '@sep/contracts';
import type { DataScope, DbTransaction } from '../database/database.service.js';
import { events } from '../database/schema.js';
import type { CreateEventDto, ListEventsQuery, UpdateEventDto } from './event.dto.js';

const fields = { id: events.id, organizationId: events.organizationId, nameEs: events.nameEs, nameEn: events.nameEn, timezone: events.timezone, status: events.status };
@Injectable()
export class EventsRepository {
  list(tx: DbTransaction, scope: DataScope, query: ListEventsQuery): Promise<EventView[]> {
    return tx.select(fields).from(events).where(and(eq(events.organizationId, scope.organizationId),
      scope.eventId ? eq(events.id, scope.eventId) : undefined)).orderBy(events.id).limit(query.limit).offset(query.offset);
  }
  async get(tx: DbTransaction, scope: DataScope, id: string): Promise<EventView | undefined> {
    return (await tx.select(fields).from(events).where(and(eq(events.organizationId, scope.organizationId), eq(events.id, id))))[0];
  }
  async create(tx: DbTransaction, scope: DataScope, id: string, dto: CreateEventDto): Promise<EventView> {
    return (await tx.insert(events).values({ id, organizationId: scope.organizationId, ...dto }).returning(fields))[0];
  }
  async update(tx: DbTransaction, scope: DataScope, id: string, dto: UpdateEventDto): Promise<EventView | undefined> {
    return (await tx.update(events).set(dto).where(and(eq(events.organizationId, scope.organizationId), eq(events.id, id))).returning(fields))[0];
  }
  async publicEvent(tx: DbTransaction, scope: DataScope): Promise<PublicEventView | undefined> {
    if (!scope.eventId) return undefined;
    return (await tx.select({ id: events.id, nameEs: events.nameEs, nameEn: events.nameEn, timezone: events.timezone })
      .from(events).where(and(eq(events.organizationId, scope.organizationId), eq(events.id, scope.eventId), eq(events.status, 'published'))))[0];
  }
}
