import { randomUUID } from 'node:crypto';
import { Injectable } from '@nestjs/common';
import type { DbTransaction } from '../database/database.service.js';
import { auditEntries } from '../database/schema.js';
import type { RequestContext } from './http.js';
@Injectable()
export class AuditService {
  async organization(tx: DbTransaction, context: RequestContext, action: 'identity.orcid.connected' | 'invitation.created' | 'invitation.revoked' | 'invitation.accepted' | 'organization.updated' | 'domain.registered' | 'domain.verified' | 'domain.activated' | 'domain.deactivated' | 'domain.deleted', resourceId: string): Promise<void> {
    if (!context.personId) throw new Error('Audit actor missing');
    await tx.insert(auditEntries).values({ id: randomUUID(), organizationId: context.organizationId, eventId: null,
      personId: context.personId, action, resourceId, requestId: context.requestId });
  }
  async record(tx: DbTransaction, context: RequestContext, action: 'event.created' | 'event.updated' | 'event.configuration.saved' | 'event.lifecycle.changed' | 'work.draft.deleted' | 'work.submitted' | 'work.withdrawn' | 'work.decision' | 'work.call.updated' | 'work.manuscript.updated' | 'work.created' | 'work.draft.saved' | 'call.draft.saved' | 'call.published' | 'call.withdrawn' | 'site.draft.saved' | 'site.published' | 'organizer.assigned' | 'organizer.revoked', resourceId: string, subjectId?: string): Promise<void> {
    if (!context.personId) throw new Error('Audit actor missing');
    await tx.insert(auditEntries).values({
      id: randomUUID(), organizationId: context.organizationId, eventId: resourceId, personId: context.personId,
      action, resourceId: subjectId ?? resourceId, requestId: context.requestId,
    });
  }
}
