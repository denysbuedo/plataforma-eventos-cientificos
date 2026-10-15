import { createHash, timingSafeEqual } from 'node:crypto';
import { Inject, Injectable } from '@nestjs/common';
import { APP_CONFIG, type AppConfig } from '../config.js';
import { ApiException } from '../common/http.js';
import { createRemoteJWKSet, jwtVerify } from 'jose';
import { DatabaseService } from '../database/database.service.js';

export const AUTHENTICATOR = Symbol('AUTHENTICATOR');
export interface AuthenticatedPerson { personId: string; authMode: 'development-token' | 'oidc'; verifiedEmail?: string }
export interface Authenticator { authenticate(authorization: string | undefined): AuthenticatedPerson | Promise<AuthenticatedPerson> }
@Injectable()
export class DevelopmentTokenAuthenticator implements Authenticator {
  constructor(@Inject(APP_CONFIG) private readonly config: AppConfig) {}
  authenticate(authorization: string | undefined): AuthenticatedPerson {
    const match = /^Bearer ([A-Za-z0-9_-]{32,256})$/.exec(authorization ?? '');
    if (!match) throw new ApiException(401, 'UNAUTHORIZED');
    const incoming = createHash('sha256').update(match[1]).digest();
    for (const [token, person] of this.config.tokens) {
      if (timingSafeEqual(incoming, createHash('sha256').update(token).digest())) return { personId: person, authMode: 'development-token' };
    }
    throw new ApiException(401, 'UNAUTHORIZED');
  }
}

@Injectable()
export class OidcAuthenticator implements Authenticator {
  private readonly keys;
  constructor(@Inject(APP_CONFIG) private readonly config: AppConfig, private readonly database: DatabaseService) {
    if (!config.oidc) throw new Error('Missing OIDC configuration');
    this.keys = createRemoteJWKSet(new URL(config.oidc.jwksUrl), { timeoutDuration: 5000, cooldownDuration: 30000 });
  }
  async authenticate(authorization: string | undefined): Promise<AuthenticatedPerson> {
    const match = /^Bearer ([A-Za-z0-9_.-]{32,16384})$/.exec(authorization ?? '');
    if (!match) throw new ApiException(401, 'UNAUTHORIZED');
    let claims;
    try {
      const { payload } = await jwtVerify(match[1], this.keys, { issuer: this.config.oidc!.issuer, audience: this.config.oidc!.audience,
        algorithms: ['RS256', 'ES256'], requiredClaims: ['exp', 'iat', 'sub'], clockTolerance: 5 });
      if (!payload.sub || payload.sub.length > 255 || (this.config.oidc!.authorizedParty && payload.azp !== this.config.oidc!.authorizedParty)) throw new Error('Invalid principal');
      claims = payload;
    } catch { throw new ApiException(401, 'UNAUTHORIZED'); }
    const name = typeof claims.name === 'string' && claims.name.trim() ? claims.name.trim().slice(0, 120)
      : typeof claims.preferred_username === 'string' ? claims.preferred_username.slice(0, 120) : 'Usuario';
    const personId = await this.database.oidcPerson(this.config.oidc!.issuer, claims.sub!, name);
    const verifiedEmail = claims.email_verified === true && typeof claims.email === 'string' ? claims.email.trim().toLowerCase() : undefined;
    return { personId, authMode: 'oidc', verifiedEmail };
  }
}
