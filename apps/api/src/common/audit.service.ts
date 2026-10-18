import { randomUUID } from 'node:crypto';
import { Injectable } from '@nestjs/common';
import type { DbTransaction } from '../database/database.service.js';
import { auditEntries } from '../database/schema.js';
import type { RequestContext } from './http.js';
@Injectable()
export class AuditService {
  async organization(tx: DbTransaction, context: RequestContext, action: 'identity.profile.updated' | 'identity.orcid.connected' | 'invitation.created' | 'invitation.revoked' | 'invitation.accepted' | 'organization.updated' | 'domain.registered' | 'domain.verified' | 'domain.activated' | 'domain.deactivated' | 'domain.deleted', resourceId: string): Promise<void> {
    if (!context.personId) throw new Error('Audit actor missing');
    await tx.insert(auditEntries).values({ id: randomUUID(), organizationId: context.organizationId, eventId: null,
      personId: context.personId, action, resourceId, requestId: context.requestId });
  }
  async record(tx: DbTransaction, context: RequestContext, action: 'attendance.operator.changed'|'attendance.exported'|'certificate.template.saved'|'certificate.issued'|'certificate.revoked'|'attendance.credential.issued'|'attendance.credential.revoked'|'attendance.recorded'|'attendance.corrected'|'registration.settings.saved'|'registration.settings.published'|'registration.settings.withdrawn'|'registration.requested'|'registration.cancelled'|'registration.decided'|'program.space.created'|'program.space.updated'|'program.saved'|'program.published'|'program.withdrawn'|'review.member.invited'|'review.member.responded'|'review.member.revoked'|'review.round.created'|'review.deadline.extended'|'review.round.closed'|'review.assigned'|'review.assignment.revoked'|'review.responded'|'review.response.assessed' | 'review.saved'|'review.submitted'|'review.decision.override'|'review.released' | 'work.collaboration.invited' | 'work.collaboration.accepted' | 'work.collaboration.revoked' | 'event.created' | 'event.updated' | 'event.configuration.saved' | 'event.lifecycle.changed' | 'work.draft.deleted' | 'work.submitted' | 'work.withdrawn' | 'work.decision' | 'work.call.updated' | 'work.manuscript.updated' | 'work.created' | 'work.draft.saved' | 'call.draft.saved' | 'call.published' | 'call.withdrawn' | 'site.draft.saved' | 'site.published' | 'organizer.assigned' | 'organizer.revoked', resourceId: string, subjectId?: string): Promise<void> {
    if (!context.personId) throw new Error('Audit actor missing');
    await tx.insert(auditEntries).values({
      id: randomUUID(), organizationId: context.organizationId, eventId: resourceId, personId: context.personId,
      action, resourceId: subjectId ?? resourceId, requestId: context.requestId,
    });
  }
}
