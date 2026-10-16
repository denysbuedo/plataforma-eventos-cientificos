import { Body, Controller, Delete, Get, Injectable, Param, Patch, Post, Req } from '@nestjs/common';
import { ApiBearerAuth, ApiCreatedResponse, ApiOkResponse, ApiOperation, ApiProperty, ApiTags } from '@nestjs/swagger';
import { IsInt, IsString, IsUUID, Matches, Max, MaxLength, Min, MinLength, ValidateBy, isEmail, isUUID } from 'class-validator';
import { Resolver } from 'node:dns/promises';
import { Transform } from 'class-transformer';
import { randomBytes, randomUUID } from 'node:crypto';
import { sql } from 'drizzle-orm';
import type { ManagedDomain, OrganizationProfile, OrganizationSettings } from '@sep/contracts';
import type { DbTransaction } from '../database/database.service.js';
import { AuthorizationService } from '../identity/authorization.service.js';
import { ApiException, type RequestContext, type SepRequest } from '../common/http.js';
import { AuditService } from '../common/audit.service.js';
import { ApiErrors } from '../common/openapi.js';
import { Access } from './context.guard.js';

class UpdateOrganizationDto {
  @ApiProperty({ minLength: 3, maxLength: 200 }) @Transform(({ value }) => typeof value === 'string' ? value.trim() : value) @IsString() @MinLength(3) @MaxLength(200) @Matches(/\S/u) name!: string;
  @ApiProperty({ maxLength: 254 }) @IsString() @MaxLength(254)
  @ValidateBy({ name: 'contactEmail', validator: { validate: (value: unknown) => value === '' || typeof value === 'string' && isEmail(value) } }) contactEmail!: string;
  @ApiProperty({ maxLength: 500 }) @IsString() @MaxLength(500)
  @ValidateBy({ name: 'website', validator: { validate: (value: unknown) => {
    if (value === '') return true; if (typeof value !== 'string') return false;
    try { const url = new URL(value); return url.protocol === 'https:' && !!url.hostname && !url.username && !url.password; } catch { return false; }
  } } }) website!: string;
  @ApiProperty({ maxLength: 2000 }) @IsString() @MaxLength(2000) description!: string;
  @ApiProperty({ minimum: 1 }) @IsInt() @Min(1) @Max(2147483646) revision!: number;
}
class RegisterDomainDto {
  @ApiProperty({ format: 'uuid' }) @IsUUID() eventId!: string;
  @ApiProperty({ example: 'congreso.example.org', maxLength: 235 }) @IsString() @MaxLength(235)
  @Matches(/^(?=.{4,235}$)(?:[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\.)+[a-z]{2,63}$/i) hostname!: string;
}
class OrganizationProfileDto implements OrganizationProfile {
  @ApiProperty({ format: 'uuid' }) id!: string;
  @ApiProperty() name!: string;
  @ApiProperty() contactEmail!: string;
  @ApiProperty() website!: string;
  @ApiProperty() description!: string;
  @ApiProperty() revision!: number;
}
class ManagedDomainDto implements ManagedDomain {
  @ApiProperty({ format: 'uuid' }) id!: string;
  @ApiProperty({ type: String, nullable: true, format: 'uuid' }) eventId!: string | null;
  @ApiProperty() hostname!: string;
  @ApiProperty() active!: boolean;
  @ApiProperty() verified!: boolean;
  @ApiProperty() tlsReady!: boolean;
  @ApiProperty({ type: String, nullable: true }) verificationToken!: string | null;
}
class OrganizationSettingsDto implements OrganizationSettings {
  @ApiProperty({ type: OrganizationProfileDto }) organization!: OrganizationProfile;
  @ApiProperty({ type: [ManagedDomainDto] }) domains!: ManagedDomain[];
}

@Injectable()
export class OrganizationService {
  constructor(private readonly authorization: AuthorizationService, private readonly audit: AuditService) {}
  private async settings(tx: DbTransaction): Promise<OrganizationSettings> {
    const result = await tx.execute<{ settings: OrganizationSettings }>(sql`SELECT sep_organization_settings() AS settings`);
    return result.rows[0].settings;
  }
  get(context: RequestContext) { return this.authorization.run(context, 'organization-manage', (tx) => this.settings(tx)); }
  update(context: RequestContext, dto: UpdateOrganizationDto) {
    return this.authorization.run(context, 'organization-manage', async (tx) => {
      const result = await tx.execute<{ updated: boolean }>(sql`SELECT sep_update_organization(${dto.name.trim()},
        ${dto.contactEmail.trim().toLowerCase()}, ${dto.website.trim()}, ${dto.description.trim()}, ${dto.revision}) AS updated`);
      if (!result.rows[0].updated) throw new ApiException(409, 'REVISION_CONFLICT');
      await this.audit.organization(tx, context, 'organization.updated', context.organizationId);
      return this.settings(tx);
    });
  }
  register(context: RequestContext, dto: RegisterDomainDto) {
    return this.authorization.run(context, 'organization-manage', async (tx) => {
      const hostname = dto.hostname.toLowerCase();
      if (['localhost', 'local', 'test', 'invalid', 'example', 'internal', 'lan', 'onion'].some((suffix) => hostname.endsWith(`.${suffix}`))) throw new ApiException(400, 'VALIDATION_FAILED');
      const id = randomUUID(); const token = randomBytes(32).toString('base64url');
      const result = await tx.execute<{ created: boolean }>(sql`SELECT sep_register_domain(${id}::uuid, ${dto.eventId}::uuid, ${hostname}, ${token}) AS created`);
      if (!result.rows[0].created) throw new ApiException(409, 'DOMAIN_UNAVAILABLE');
      await this.audit.organization(tx, context, 'domain.registered', id);
      return this.settings(tx);
    });
  }
  private async dns(domain: ManagedDomain) {
    if (!domain.verificationToken) throw new ApiException(409, 'DOMAIN_DNS_PENDING');
    const resolver = new Resolver({ timeout: 2000, tries: 2 });
    try {
      const records = await resolver.resolveTxt(`_sep-verification.${domain.hostname}`);
      if (!records.some((record) => record.join('') === `sep-domain-verification=${domain.verificationToken}`)) throw new Error('Missing record');
    } catch { throw new ApiException(409, 'DOMAIN_DNS_PENDING'); }
    finally { resolver.cancel(); }
  }
  async transition(context: RequestContext, id: string, action: 'verify' | 'activate' | 'deactivate' | 'delete') {
    if (!isUUID(id)) throw new ApiException(400, 'VALIDATION_FAILED');
    // DNS I/O takes place outside the database transaction. Reauthorize and
    // compare the token before writing, including after concurrent removal.
    let checked: ManagedDomain | undefined;
    if (action === 'verify' || action === 'activate') {
      const settings = await this.get(context);
      checked = settings.domains.find((domain) => domain.id === id);
      if (!checked) throw new ApiException(404, 'NOT_FOUND');
      if (!checked.eventId) throw new ApiException(403, 'FORBIDDEN');
      if (action === 'activate' && (!checked.verified || !checked.tlsReady)) throw new ApiException(409, 'DOMAIN_TLS_PENDING');
      await this.dns(checked);
    }
    return this.authorization.run(context, 'organization-manage', async (tx) => {
      const current = (await this.settings(tx)).domains.find((domain) => domain.id === id);
      if (!current) throw new ApiException(404, 'NOT_FOUND');
      if (!current.eventId) throw new ApiException(403, 'FORBIDDEN');
      const result = await tx.execute<{ updated: boolean }>(sql`SELECT sep_transition_domain(${id}::uuid, ${action}, ${checked?.verificationToken ?? null}) AS updated`);
      if (!result.rows[0].updated) throw new ApiException(409, 'CONFLICT');
      const auditAction = { verify: 'domain.verified', activate: 'domain.activated', deactivate: 'domain.deactivated', delete: 'domain.deleted' } as const;
      await this.audit.organization(tx, context, auditAction[action], id);
      return this.settings(tx);
    });
  }
}

@ApiTags('organization') @ApiBearerAuth() @ApiErrors() @Controller('organization')
export class OrganizationController {
  constructor(private readonly service: OrganizationService) {}
  @Get() @Access('organization-manage') @ApiOkResponse({ type: OrganizationSettingsDto })
  @ApiOperation({ summary: 'Datos y dominios de la organización; solo su administrador desde el dominio institucional.' })
  get(@Req() request: SepRequest) { return this.service.get(request.security); }
  @Patch() @Access('organization-manage') @ApiOkResponse({ type: OrganizationSettingsDto })
  update(@Req() request: SepRequest, @Body() dto: UpdateOrganizationDto) { return this.service.update(request.security, dto); }
  @Post('domains') @Access('organization-manage') @ApiCreatedResponse({ type: OrganizationSettingsDto })
  @ApiOperation({ summary: 'Registra un dominio de evento pendiente; no modifica DNS ni TLS.' })
  register(@Req() request: SepRequest, @Body() dto: RegisterDomainDto) { return this.service.register(request.security, dto); }
  @Post('domains/:domainId/verify') @Access('organization-manage') @ApiOkResponse({ type: OrganizationSettingsDto })
  verify(@Req() request: SepRequest, @Param('domainId') id: string) { return this.service.transition(request.security, id, 'verify'); }
  @Post('domains/:domainId/activate') @Access('organization-manage') @ApiOkResponse({ type: OrganizationSettingsDto })
  @ApiOperation({ summary: 'Activa tras comprobar DNS nuevamente y preparación TLS registrada por operaciones.' })
  activate(@Req() request: SepRequest, @Param('domainId') id: string) { return this.service.transition(request.security, id, 'activate'); }
  @Post('domains/:domainId/deactivate') @Access('organization-manage') @ApiOkResponse({ type: OrganizationSettingsDto })
  deactivate(@Req() request: SepRequest, @Param('domainId') id: string) { return this.service.transition(request.security, id, 'deactivate'); }
  @Delete('domains/:domainId') @Access('organization-manage') @ApiOkResponse({ type: OrganizationSettingsDto })
  remove(@Req() request: SepRequest, @Param('domainId') id: string) { return this.service.transition(request.security, id, 'delete'); }
}
