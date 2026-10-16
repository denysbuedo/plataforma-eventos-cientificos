import { Module } from '@nestjs/common';
import { AUTHENTICATOR, DevelopmentTokenAuthenticator, OidcAuthenticator } from './authenticator.js';
import { APP_CONFIG, type AppConfig } from '../config.js';
import { DatabaseService } from '../database/database.service.js';
import { AuthorizationService } from './authorization.service.js';
import { SessionController } from './session.controller.js';
import { InvitationsController, InvitationsService } from './invitations.controller.js';
import { AuditService } from '../common/audit.service.js';
import { OrcidController, OrcidService } from './orcid.controller.js';
import { ResearchersController,ResearchersService } from './researchers.controller.js';
@Module({ controllers: [SessionController, InvitationsController, OrcidController, ResearchersController], providers: [AuthorizationService, InvitationsService, OrcidService, ResearchersService, AuditService,
  { provide: AUTHENTICATOR, inject: [APP_CONFIG, DatabaseService], useFactory: (config: AppConfig, database: DatabaseService) =>
    config.authMode === 'oidc' ? new OidcAuthenticator(config, database) : new DevelopmentTokenAuthenticator(config) }], exports: [AuthorizationService, AUTHENTICATOR] })
export class IdentityModule {}
