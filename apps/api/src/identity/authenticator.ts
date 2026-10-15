import { createHash, timingSafeEqual } from 'node:crypto';
import { Inject, Injectable } from '@nestjs/common';
import { APP_CONFIG, type AppConfig } from '../config.js';
import { ApiException } from '../common/http.js';

export const AUTHENTICATOR = Symbol('AUTHENTICATOR');
export interface Authenticator { authenticate(authorization: string | undefined): string }
@Injectable()
export class DevelopmentTokenAuthenticator implements Authenticator {
  constructor(@Inject(APP_CONFIG) private readonly config: AppConfig) {}
  authenticate(authorization: string | undefined): string {
    const match = /^Bearer ([A-Za-z0-9_-]{32,256})$/.exec(authorization ?? '');
    if (!match) throw new ApiException(401, 'UNAUTHORIZED');
    const incoming = createHash('sha256').update(match[1]).digest();
    for (const [token, person] of this.config.tokens) {
      if (timingSafeEqual(incoming, createHash('sha256').update(token).digest())) return person;
    }
    throw new ApiException(401, 'UNAUTHORIZED');
  }
}
