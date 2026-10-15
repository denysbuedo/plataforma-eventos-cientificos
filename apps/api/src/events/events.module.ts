import { Module } from '@nestjs/common';
import { IdentityModule } from '../identity/identity.module.js';
import { AuditService } from '../common/audit.service.js';
import { EventsController, PublicEventsController } from './events.controller.js';
import { EventsRepository } from './events.repository.js';
import { EventsService } from './events.service.js';
@Module({ imports: [IdentityModule], controllers: [EventsController, PublicEventsController], providers: [EventsService, EventsRepository, AuditService] })
export class EventsModule {}
