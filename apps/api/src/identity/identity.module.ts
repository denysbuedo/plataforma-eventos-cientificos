import { Module } from '@nestjs/common';
import { AUTHENTICATOR, DevelopmentTokenAuthenticator } from './authenticator.js';
import { AuthorizationService } from './authorization.service.js';
import { SessionController } from './session.controller.js';
@Module({ controllers: [SessionController], providers: [AuthorizationService, { provide: AUTHENTICATOR, useClass: DevelopmentTokenAuthenticator }], exports: [AuthorizationService, AUTHENTICATOR] })
export class IdentityModule {}
