import { Module } from '@nestjs/common';
import { IdentityModule } from '../identity/identity.module.js';
import { AuditService } from '../common/audit.service.js';
import { OrganizationController, OrganizationService } from './organization.controller.js';

@Module({ imports: [IdentityModule], controllers: [OrganizationController], providers: [OrganizationService, AuditService] })
export class PlatformModule {}
