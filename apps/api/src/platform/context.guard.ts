import { Inject, Injectable, SetMetadata, type CanActivate, type ExecutionContext } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { DatabaseService } from '../database/database.service.js';
import { ApiException, type SepRequest } from '../common/http.js';
import { AUTHENTICATOR, type Authenticator } from '../identity/authenticator.js';
import type { Capability } from '../identity/authorization.service.js';

const ACCESS = 'sep:access';
export const Access = (access: Capability | 'health' | 'public-event' | 'public-site') => SetMetadata(ACCESS, access);
const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
export function normalizeHost(raw: string | undefined): string {
  if (!raw || !/^(?:[a-z0-9](?:[a-z0-9-]*[a-z0-9])?\.)*[a-z0-9](?:[a-z0-9-]*[a-z0-9])?\.?(:[0-9]{1,5})?$/i.test(raw)) throw new ApiException(400, 'INVALID_HOST');
  const [hostname, port] = raw.toLowerCase().split(':');
  if (port && (Number(port) < 1 || Number(port) > 65535)) throw new ApiException(400, 'INVALID_HOST');
  return hostname.replace(/\.$/, '');
}
@Injectable()
export class ContextGuard implements CanActivate {
  constructor(private readonly reflector: Reflector, private readonly database: DatabaseService,
    @Inject(AUTHENTICATOR) private readonly authenticator: Authenticator) {}
  async canActivate(execution: ExecutionContext): Promise<boolean> {
    const access = this.reflector.getAllAndOverride<string>(ACCESS, [execution.getHandler(), execution.getClass()]);
    if (!access) throw new ApiException(403, 'FORBIDDEN');
    if (access === 'health') return true;
    const request = execution.switchToHttp().getRequest<SepRequest>();
    if (['x-tenant-id', 'x-organization-id', 'x-event-id', 'x-role', 'x-person-id'].some((header) => request.headers[header] !== undefined)) {
      throw new ApiException(400, 'UNTRUSTED_CONTEXT');
    }
    const hostCount = request.rawHeaders.filter((_, index) => index % 2 === 0 && request.rawHeaders[index].toLowerCase() === 'host').length;
    if (hostCount !== 1) throw new ApiException(400, 'INVALID_HOST');
    const hostname = normalizeHost(request.headers.host);
    const domain = await this.database.resolveDomain(hostname);
    if (!domain) throw new ApiException(400, 'INVALID_HOST');
    const pathEventId = request.params.eventId;
    if (pathEventId && (typeof pathEventId !== 'string' || !uuidPattern.test(pathEventId))) throw new ApiException(400, 'VALIDATION_FAILED');
    if (domain.eventId && pathEventId && domain.eventId !== pathEventId) throw new ApiException(404, 'NOT_FOUND');
    request.security = {
      ...domain, hostEventId: domain.eventId, eventId: domain.eventId ?? (typeof pathEventId === 'string' ? pathEventId : null),
      personId: ['public-event', 'public-site'].includes(access) ? null : this.authenticator.authenticate(request.headers.authorization), requestId: request.requestId,
    };
    return true;
  }
}
