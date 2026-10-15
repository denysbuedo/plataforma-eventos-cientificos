import { Body, Controller, Get, Injectable, Param, Post, Req } from '@nestjs/common';
import { ApiBearerAuth, ApiCreatedResponse, ApiOkResponse, ApiProperty, ApiTags } from '@nestjs/swagger';
import { IsEmail, IsString, Matches, MaxLength, MinLength, isUUID } from 'class-validator';
import { Transform } from 'class-transformer';
import { createHash, randomBytes, randomUUID } from 'node:crypto';
import { and, desc, eq, sql } from 'drizzle-orm';
import type { CreatedInvitation, OrganizationInvitation, PeopleDirectory } from '@sep/contracts';
import { DatabaseService } from '../database/database.service.js';
import { memberships, organizationInvitations, people } from '../database/schema.js';
import { AuthorizationService } from './authorization.service.js';
import { ApiException, type RequestContext, type SepRequest } from '../common/http.js';
import { AuditService } from '../common/audit.service.js';
import { ApiErrors } from '../common/openapi.js';
import { Access } from '../platform/context.guard.js';

class InvitePersonDto {
  @ApiProperty() @Transform(({ value }) => typeof value === 'string' ? value.trim() : value) @IsString() @MinLength(2) @MaxLength(120) name!: string;
  @ApiProperty({ format: 'email' }) @Transform(({ value }) => typeof value === 'string' ? value.trim().toLowerCase() : value) @IsEmail() @MaxLength(254) email!: string;
}
class AcceptInvitationDto { @ApiProperty() @IsString() @Matches(/^[A-Za-z0-9_-]{43}$/) token!: string }
class InvitationDto implements OrganizationInvitation {
  @ApiProperty({ format: 'uuid' }) id!: string;
  @ApiProperty() name!: string; @ApiProperty({ format: 'email' }) email!: string;
  @ApiProperty({ enum: ['pending', 'accepted', 'revoked', 'expired'] }) status!: OrganizationInvitation['status'];
  @ApiProperty({ format: 'date-time' }) createdAt!: string; @ApiProperty({ format: 'date-time' }) expiresAt!: string;
  @ApiProperty({ nullable: true, format: 'date-time' }) acceptedAt!: string | null;
}
class OrganizationPersonDto {
  @ApiProperty({ format: 'uuid' }) personId!: string; @ApiProperty() name!: string; @ApiProperty() eventCount!: number;
}
class PeopleDirectoryDto {
  @ApiProperty({ type: [OrganizationPersonDto] }) people!: OrganizationPersonDto[];
  @ApiProperty({ type: [InvitationDto] }) invitations!: InvitationDto[];
}
class CreatedInvitationDto {
  @ApiProperty({ type: InvitationDto }) invitation!: InvitationDto; @ApiProperty() token!: string;
}
class AcceptedInvitationDto { @ApiProperty() accepted!: boolean }
function view(invitation: typeof organizationInvitations.$inferSelect): OrganizationInvitation {
  return { id: invitation.id, name: invitation.name, email: invitation.email,
    status: invitation.status === 'pending' && invitation.expiresAt.getTime() <= Date.now() ? 'expired' : invitation.status,
    createdAt: invitation.createdAt.toISOString(), expiresAt: invitation.expiresAt.toISOString(), acceptedAt: invitation.acceptedAt?.toISOString() ?? null };
}

@Injectable()
export class InvitationsService {
  constructor(private readonly database: DatabaseService, private readonly authorization: AuthorizationService, private readonly audit: AuditService) {}
  list(context: RequestContext): Promise<PeopleDirectory> {
    return this.authorization.run(context, 'people-manage', async (tx) => {
      const directory = await tx.select({ personId: people.id, name: people.name,
        eventCount: sql<number>`count(distinct ${memberships.eventId})::int` }).from(people)
        .innerJoin(memberships, eq(memberships.personId, people.id))
        .where(and(eq(memberships.organizationId, context.organizationId), eq(memberships.active, true), eq(people.active, true)))
        .groupBy(people.id, people.name).orderBy(people.name).limit(200);
      const invitations = await tx.select().from(organizationInvitations).where(eq(organizationInvitations.organizationId, context.organizationId))
        .orderBy(desc(organizationInvitations.createdAt)).limit(200);
      return { people: directory, invitations: invitations.map(view) };
    });
  }
  create(context: RequestContext, dto: InvitePersonDto): Promise<CreatedInvitation> {
    return this.authorization.run(context, 'people-manage', async (tx) => {
      await tx.execute(sql`SELECT pg_advisory_xact_lock(hashtextextended(${context.organizationId + ':' + dto.email}, 0))`);
      await tx.update(organizationInvitations).set({ status: 'revoked' }).where(and(eq(organizationInvitations.organizationId, context.organizationId),
        eq(organizationInvitations.email, dto.email), eq(organizationInvitations.status, 'pending'), sql`${organizationInvitations.expiresAt} <= now()`));
      const [pending] = await tx.select({ id: organizationInvitations.id }).from(organizationInvitations).where(and(
        eq(organizationInvitations.organizationId, context.organizationId), eq(organizationInvitations.email, dto.email), eq(organizationInvitations.status, 'pending')));
      if (pending) throw new ApiException(409, 'CONFLICT');
      const token = randomBytes(32).toString('base64url');
      const [invitation] = await tx.insert(organizationInvitations).values({ id: randomUUID(), organizationId: context.organizationId,
        name: dto.name, email: dto.email, tokenHash: createHash('sha256').update(token).digest('hex'), createdBy: context.personId!,
        expiresAt: new Date(Date.now() + 7 * 86400000) }).returning();
      await this.audit.organization(tx, context, 'invitation.created', invitation.id);
      return { invitation: view(invitation), token };
    });
  }
  revoke(context: RequestContext, id: string) {
    return this.authorization.run(context, 'people-manage', async (tx) => {
      const [before] = await tx.select().from(organizationInvitations).where(and(eq(organizationInvitations.id, id), eq(organizationInvitations.organizationId, context.organizationId))).for('update');
      if (!before) throw new ApiException(404, 'NOT_FOUND');
      if (before.status !== 'pending') throw new ApiException(409, 'CONFLICT');
      const [invitation] = await tx.update(organizationInvitations).set({ status: 'revoked' }).where(eq(organizationInvitations.id, id)).returning();
      await this.audit.organization(tx, context, 'invitation.revoked', id);
      return view(invitation);
    });
  }
  accept(context: RequestContext, dto: AcceptInvitationDto) {
    if (context.hostEventId || context.eventId || !context.personId) throw new ApiException(403, 'FORBIDDEN');
    return this.database.scoped(context, async (tx) => {
      const [principal] = await tx.select({ id: people.id }).from(people).where(and(eq(people.id, context.personId!), eq(people.active, true)));
      if (!principal) throw new ApiException(401, 'UNAUTHORIZED');
      const tokenHash = createHash('sha256').update(dto.token).digest('hex');
      await tx.execute(sql`SELECT set_config('sep.invitation_hash', ${tokenHash}, true)`);
      const [invitation] = await tx.select().from(organizationInvitations).where(and(eq(organizationInvitations.organizationId, context.organizationId), eq(organizationInvitations.tokenHash, tokenHash))).for('update');
      if (!invitation) throw new ApiException(404, 'NOT_FOUND');
      if (context.authMode === 'oidc' && (!context.verifiedEmail || context.verifiedEmail !== invitation.email)) throw new ApiException(403, 'FORBIDDEN');
      if (invitation.status === 'accepted' && invitation.acceptedBy === context.personId) return { accepted: true };
      if (invitation.status !== 'pending' || invitation.expiresAt.getTime() <= Date.now()) throw new ApiException(409, 'CONFLICT');
      await tx.execute(sql`SELECT pg_advisory_xact_lock(hashtextextended(${'membership:' + context.organizationId + ':' + context.personId}, 0))`);
      const [existing] = await tx.select().from(memberships).where(and(eq(memberships.personId, context.personId!), eq(memberships.organizationId, context.organizationId), sql`${memberships.eventId} IS NULL`));
      if (!existing) await tx.insert(memberships).values({ id: randomUUID(), personId: context.personId!, organizationId: context.organizationId });
      else if (!existing.active) await tx.update(memberships).set({ active: true }).where(eq(memberships.id, existing.id));
      await tx.update(organizationInvitations).set({ status: 'accepted', acceptedBy: context.personId, acceptedAt: new Date() }).where(eq(organizationInvitations.id, invitation.id));
      await this.audit.organization(tx, context, 'invitation.accepted', invitation.id);
      return { accepted: true };
    });
  }
}

@ApiTags('people') @ApiBearerAuth() @ApiErrors() @Controller()
export class InvitationsController {
  constructor(private readonly service: InvitationsService) {}
  @Get('people') @Access('people-manage') @ApiOkResponse({ type: PeopleDirectoryDto })
  list(@Req() request: SepRequest) { return this.service.list(request.security); }
  @Post('invitations') @Access('people-manage') @ApiCreatedResponse({ type: CreatedInvitationDto })
  create(@Req() request: SepRequest, @Body() dto: InvitePersonDto) { return this.service.create(request.security, dto); }
  @Post('invitations/:invitationId/revoke') @Access('people-manage') @ApiCreatedResponse({ type: InvitationDto })
  revoke(@Req() request: SepRequest, @Param('invitationId') id: string) {
    if (!isUUID(id)) throw new ApiException(400, 'VALIDATION_FAILED'); return this.service.revoke(request.security, id);
  }
  @Post('invitations/accept') @Access('invitation-accept') @ApiCreatedResponse({ type: AcceptedInvitationDto })
  accept(@Req() request: SepRequest, @Body() dto: AcceptInvitationDto) { return this.service.accept(request.security, dto); }
}
