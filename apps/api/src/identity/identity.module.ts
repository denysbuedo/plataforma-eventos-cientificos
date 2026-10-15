import { Module } from '@nestjs/common';
import { AUTHENTICATOR, DevelopmentTokenAuthenticator } from './authenticator.js';
import { AuthorizationService } from './authorization.service.js';
@Module({ providers: [AuthorizationService, { provide: AUTHENTICATOR, useClass: DevelopmentTokenAuthenticator }], exports: [AuthorizationService, AUTHENTICATOR] })
export class IdentityModule {}
