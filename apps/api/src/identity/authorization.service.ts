import { Injectable } from '@nestjs/common';
import { and, eq, isNull, lte, or, sql } from 'drizzle-orm';
import { DatabaseService, type DbTransaction } from '../database/database.service.js';
import { memberships, people, roleAssignments } from '../database/schema.js';
import { ApiException, type RequestContext } from '../common/http.js';

export type Capability = 'event-read' | 'event-update' | 'event-create' | 'session-read' | 'site-read' | 'site-update' | 'site-publish' | 'organizers-manage' | 'people-manage' | 'organization-manage' | 'invitation-accept' | 'identity-read' | 'submissions-manage' | 'registrations-manage' | 'attendance-manage' | 'certificates-manage' | 'communications-manage' | 'publications-manage';
export interface ContextPermissions {
  organizer: boolean; organizationAdmin: boolean; personName: string; roles: string[];
}
@Injectable()
export class AuthorizationService {
  constructor(private readonly database: DatabaseService) {}
  run<T>(context: RequestContext, capability: Capability, action: (tx: DbTransaction, permissions: ContextPermissions) => Promise<T>): Promise<T> {
    return this.database.scoped(context, async (tx) => {
      if (!context.personId) throw new ApiException(401, 'UNAUTHORIZED');
      const principal = await tx.select({ id: people.id, name: people.name }).from(people)
        .where(and(eq(people.id, context.personId), eq(people.active, true)));
      if (!principal.length) throw new ApiException(401, 'UNAUTHORIZED');
      const grants = await tx.select({ eventId: memberships.eventId, role: roleAssignments.role }).from(memberships)
        .innerJoin(roleAssignments, eq(roleAssignments.membershipId, memberships.id))
        .where(and(eq(memberships.personId, context.personId), eq(memberships.organizationId, context.organizationId),
          eq(memberships.active, true), eq(roleAssignments.active, true),
          lte(roleAssignments.validFrom, sql`now()`), or(isNull(roleAssignments.validUntil), sql`${roleAssignments.validUntil} > now()`),
          context.eventId ? or(isNull(memberships.eventId), eq(memberships.eventId, context.eventId)) : isNull(memberships.eventId)));
      const organizationAdmin = grants.some((grant) => grant.eventId === null && grant.role === 'organization_admin');
      const organizer = grants.some((grant) => grant.eventId === context.eventId && grant.eventId !== null && grant.role === 'organizer');
      if (!grants.length) {
        const [membership] = await tx.select({ id: memberships.id }).from(memberships).where(and(eq(memberships.personId, context.personId),
          eq(memberships.organizationId, context.organizationId), eq(memberships.active, true),
          context.eventId ? or(isNull(memberships.eventId), eq(memberships.eventId, context.eventId)) : isNull(memberships.eventId))).limit(1);
        if (capability !== 'session-read' || !membership) throw new ApiException(404, 'NOT_FOUND');
      }
      const permitted = ['people-manage', 'organization-manage'].includes(capability) ? organizationAdmin && context.hostEventId === null && context.eventId === null
        : capability === 'organizers-manage' ? organizationAdmin
        : capability === 'event-create' ? organizationAdmin && context.hostEventId === null && context.eventId === null
        : ['event-update', 'site-update', 'site-publish', 'submissions-manage', 'registrations-manage', 'attendance-manage', 'certificates-manage', 'communications-manage', 'publications-manage'].includes(capability) ? organizer
        : capability === 'session-read' ? true : organizationAdmin || organizer;
      if (!permitted) throw new ApiException(403, 'FORBIDDEN');
      await tx.execute(sql`SELECT set_config('sep.editorial_staff',${capability==='publications-manage'?'true':'false'},true),set_config('sep.communication_staff',${capability==='communications-manage'?'true':'false'},true),set_config('sep.certificate_staff',${capability==='certificates-manage'?'true':'false'},true),set_config('sep.attendance_staff',${capability==='attendance-manage'?'true':'false'},true),set_config('sep.registration_staff',${capability==='registrations-manage'?'true':'false'},true),set_config('sep.submissions_staff', ${capability === 'submissions-manage' ? 'true' : 'false'}, true), set_config('sep.organization_admin', ${organizationAdmin ? 'true' : 'false'}, true)`);
      return action(tx, { organizer, organizationAdmin, personName: principal[0].name, roles: grants.map((grant) => grant.role) });
    });
  }
}
