import { Module } from '@nestjs/common';
import { IdentityModule } from '../identity/identity.module.js';
import { AuditService } from '../common/audit.service.js';
import { EventsController, PublicEventsController } from './events.controller.js';
import { EventsRepository } from './events.repository.js';
import { EventsService } from './events.service.js';
import { SiteController, PublicSiteController } from './site.controller.js';
import { SiteService } from './site.service.js';
import { OrganizersController, OrganizersService } from './organizers.controller.js';
import { EventConfigurationController, EventConfigurationService } from './configuration.controller.js';
@Module({ imports: [IdentityModule], controllers: [EventsController, PublicEventsController, SiteController, PublicSiteController, OrganizersController, EventConfigurationController], providers: [EventsService, EventsRepository, SiteService, AuditService, OrganizersService, EventConfigurationService] })
export class EventsModule {}
