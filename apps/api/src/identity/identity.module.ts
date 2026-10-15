import { Module } from '@nestjs/common';
import { AUTHENTICATOR, DevelopmentTokenAuthenticator } from './authenticator.js';
import { AuthorizationService } from './authorization.service.js';
import { SessionController } from './session.controller.js';
import { InvitationsController, InvitationsService } from './invitations.controller.js';
import { AuditService } from '../common/audit.service.js';
@Module({ controllers: [SessionController, InvitationsController], providers: [AuthorizationService, InvitationsService, AuditService, { provide: AUTHENTICATOR, useClass: DevelopmentTokenAuthenticator }], exports: [AuthorizationService, AUTHENTICATOR] })
export class IdentityModule {}
