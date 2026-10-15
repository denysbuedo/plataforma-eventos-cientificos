import { Body, Controller, Delete, Get, Injectable, Param, Post, Req } from '@nestjs/common';
import { ApiBearerAuth, ApiCreatedResponse, ApiOkResponse, ApiProperty, ApiTags } from '@nestjs/swagger';
import { IsUUID, isUUID } from 'class-validator';
import { and, eq, isNull, lte, or, sql } from 'drizzle-orm';
import { randomUUID } from 'node:crypto';
import type { EventTeam } from '@sep/contracts';
import { AuthorizationService } from '../identity/authorization.service.js';
import { events, memberships, people, roleAssignments } from '../database/schema.js';
import type { DbTransaction } from '../database/database.service.js';
import { ApiException, type RequestContext, type SepRequest } from '../common/http.js';
import { AuditService } from '../common/audit.service.js';
import { Access } from '../platform/context.guard.js';
import { ApiErrors } from '../common/openapi.js';

class AssignOrganizerDto { @ApiProperty({ format: 'uuid' }) @IsUUID() personId!: string }
class TeamPersonDto { @ApiProperty({ format: 'uuid' }) personId!: string; @ApiProperty() name!: string }
class EventTeamDto {
  @ApiProperty({ type: [TeamPersonDto] }) organizers!: TeamPersonDto[];
  @ApiProperty({ type: [TeamPersonDto] }) candidates!: TeamPersonDto[];
}

@Injectable()
export class OrganizersService {
  constructor(private readonly authorization: AuthorizationService, private readonly audit: AuditService) {}
  private async team(tx: DbTransaction, context: RequestContext, eventId: string): Promise<EventTeam> {
    const candidates = await tx.selectDistinct({ personId: people.id, name: people.name }).from(people)
      .innerJoin(memberships, eq(memberships.personId, people.id))
      .where(and(eq(memberships.organizationId, context.organizationId), eq(memberships.active, true), eq(people.active, true))).orderBy(people.name);
    const organizers = await tx.select({ personId: people.id, name: people.name }).from(people)
      .innerJoin(memberships, eq(memberships.personId, people.id)).innerJoin(roleAssignments, eq(roleAssignments.membershipId, memberships.id))
      .where(and(eq(memberships.organizationId, context.organizationId), eq(memberships.eventId, eventId), eq(memberships.active, true),
        eq(people.active, true), eq(roleAssignments.role, 'organizer'), eq(roleAssignments.active, true),
        lte(roleAssignments.validFrom, sql`now()`), or(isNull(roleAssignments.validUntil), sql`${roleAssignments.validUntil} > now()`))).orderBy(people.name);
    return { candidates, organizers };
  }
  private async event(tx: DbTransaction, context: RequestContext, eventId: string) {
    const [event] = await tx.select().from(events).where(and(eq(events.organizationId, context.organizationId), eq(events.id, eventId))).for('update');
    if (!event) throw new ApiException(404, 'NOT_FOUND');
    if (event.status === 'archived') throw new ApiException(409, 'CONFLICT');
  }
  get(context: RequestContext, eventId: string) {
    return this.authorization.run(context, 'organizers-manage', async (tx) => {
      await this.event(tx, context, eventId); return this.team(tx, context, eventId);
    });
  }
  assign(context: RequestContext, eventId: string, personId: string) {
    return this.authorization.run(context, 'organizers-manage', async (tx) => {
      await this.event(tx, context, eventId);
      const before = await this.team(tx, context, eventId);
      if (!before.candidates.some((person) => person.personId === personId)) throw new ApiException(404, 'NOT_FOUND');
      if (before.organizers.some((person) => person.personId === personId)) return before;
      const [existing] = await tx.select().from(memberships).where(and(eq(memberships.organizationId, context.organizationId), eq(memberships.eventId, eventId), eq(memberships.personId, personId)));
      const membershipId = existing?.id ?? randomUUID();
      if (existing) await tx.update(memberships).set({ active: true }).where(eq(memberships.id, membershipId));
      else await tx.insert(memberships).values({ id: membershipId, personId, organizationId: context.organizationId, eventId });
      await tx.insert(roleAssignments).values({ id: randomUUID(), membershipId, role: 'organizer' })
        .onConflictDoUpdate({ target: [roleAssignments.membershipId, roleAssignments.role], set: { active: true, validFrom: new Date(), validUntil: null } });
      await this.audit.record(tx, context, 'organizer.assigned', eventId, personId);
      return this.team(tx, context, eventId);
    });
  }
  revoke(context: RequestContext, eventId: string, personId: string) {
    return this.authorization.run(context, 'organizers-manage', async (tx) => {
      await this.event(tx, context, eventId);
      const before = await this.team(tx, context, eventId);
      if (!before.organizers.some((person) => person.personId === personId)) throw new ApiException(404, 'NOT_FOUND');
      if (personId === context.personId || before.organizers.length <= 1) throw new ApiException(409, 'CONFLICT');
      const [membership] = await tx.select().from(memberships).where(and(eq(memberships.organizationId, context.organizationId), eq(memberships.eventId, eventId), eq(memberships.personId, personId)));
      await tx.update(roleAssignments).set({ active: false }).where(and(eq(roleAssignments.membershipId, membership.id), eq(roleAssignments.role, 'organizer')));
      await this.audit.record(tx, context, 'organizer.revoked', eventId, personId);
      return this.team(tx, context, eventId);
    });
  }
}

@ApiTags('organizers') @ApiBearerAuth() @ApiErrors() @Controller('events/:eventId/organizers')
export class OrganizersController {
  constructor(private readonly service: OrganizersService) {}
  @Get() @Access('organizers-manage') @ApiOkResponse({ type: EventTeamDto })
  get(@Req() request: SepRequest, @Param('eventId') eventId: string) { return this.service.get(request.security, eventId); }
  @Post() @Access('organizers-manage') @ApiCreatedResponse({ type: EventTeamDto })
  assign(@Req() request: SepRequest, @Param('eventId') eventId: string, @Body() dto: AssignOrganizerDto) { return this.service.assign(request.security, eventId, dto.personId); }
  @Delete(':personId') @Access('organizers-manage') @ApiOkResponse({ type: EventTeamDto })
  revoke(@Req() request: SepRequest, @Param('eventId') eventId: string, @Param('personId') personId: string) {
    if (!isUUID(personId)) throw new ApiException(400, 'VALIDATION_FAILED');
    return this.service.revoke(request.security, eventId, personId);
  }
}
