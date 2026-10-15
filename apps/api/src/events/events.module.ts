import { Module } from '@nestjs/common';
import { IdentityModule } from '../identity/identity.module.js';
import { AuditService } from '../common/audit.service.js';
import { EventsController, PublicEventsController } from './events.controller.js';
import { EventsRepository } from './events.repository.js';
import { EventsService } from './events.service.js';
import { SiteController, PublicSiteController } from './site.controller.js';
import { SiteService } from './site.service.js';
@Module({ imports: [IdentityModule], controllers: [EventsController, PublicEventsController, SiteController, PublicSiteController], providers: [EventsService, EventsRepository, SiteService, AuditService] })
export class EventsModule {}
