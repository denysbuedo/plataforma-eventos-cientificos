import {AccountLinksController,AccountLinksService} from './account-links.controller.js';
import {AccessController,AccessService} from './access.controller.js';
import {LocalAuthController,LocalAuthService} from './local-auth.controller.js';
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
@Module({ controllers: [AccountLinksController,LocalAuthController,AccessController,SessionController, InvitationsController, OrcidController, ResearchersController], providers: [AccountLinksService,LocalAuthService,AccessService,AuthorizationService, InvitationsService, OrcidService, ResearchersService, AuditService,
  { provide: AUTHENTICATOR, inject: [APP_CONFIG, DatabaseService,LocalAuthService], useFactory: (config: AppConfig, database: DatabaseService,local:LocalAuthService) =>
    config.authMode === 'oidc' ? new OidcAuthenticator(config, database,local) : new DevelopmentTokenAuthenticator(config) }], exports: [AuthorizationService, AUTHENTICATOR] })
export class IdentityModule {}
