import { randomUUID } from 'node:crypto';
import { Injectable } from '@nestjs/common';
import type { EventPage, EventView, PublicEventView } from '@sep/contracts';
import { DatabaseService } from '../database/database.service.js';
import { AuthorizationService } from '../identity/authorization.service.js';
import { ApiException, type RequestContext } from '../common/http.js';
import { AuditService } from '../common/audit.service.js';
import { EventsRepository } from './events.repository.js';
import type { CreateEventDto, ListEventsQuery, UpdateEventDto } from './event.dto.js';

@Injectable()
export class EventsService {
  constructor(private readonly database: DatabaseService, private readonly authorization: AuthorizationService,
    private readonly repository: EventsRepository, private readonly audit: AuditService) {}
  list(context: RequestContext, query: ListEventsQuery): Promise<EventPage> {
    return this.authorization.run(context, 'event-read', async (tx) => ({ data: await this.repository.list(tx, context, query), ...query }));
  }
  get(context: RequestContext, id: string): Promise<EventView> {
    return this.authorization.run(context, 'event-read', async (tx) => {
      const event = await this.repository.get(tx, context, id);
      if (!event) throw new ApiException(404, 'NOT_FOUND');
      return event;
    });
  }
  create(context: RequestContext, dto: CreateEventDto): Promise<EventView> {
    return this.authorization.run(context, 'event-create', async (tx) => {
      const event = await this.repository.create(tx, context, randomUUID(), dto);
      await this.audit.record(tx, context, 'event.created', event.id);
      return event;
    });
  }
  update(context: RequestContext, id: string, dto: UpdateEventDto): Promise<EventView> {
    if (!Object.values(dto).some((value) => value !== undefined)) throw new ApiException(400, 'VALIDATION_FAILED');
    return this.authorization.run(context, 'event-update', async (tx) => {
      const before = await this.repository.get(tx, context, id);
      if (!before) throw new ApiException(404, 'NOT_FOUND');
      if (before.status === 'archived') throw new ApiException(409, 'CONFLICT');
      const event = await this.repository.update(tx, context, id, dto);
      if (!event) throw new ApiException(404, 'NOT_FOUND');
      await this.audit.record(tx, context, 'event.updated', event.id);
      return event;
    });
  }
  publicEvent(context: RequestContext): Promise<PublicEventView> {
    return this.database.scoped(context, async (tx) => {
      const event = await this.repository.publicEvent(tx, context);
      if (!event) throw new ApiException(404, 'NOT_FOUND');
      return event;
    });
  }
}
