import { Injectable } from '@nestjs/common';
import { and, eq } from 'drizzle-orm';
import type { PublishedScientificCall, ScientificCallDraft } from '@sep/contracts';
import { DatabaseService, type DbTransaction } from '../database/database.service.js';
import { eventConfigurations, events, scientificCallDrafts as drafts, scientificCallPublications as publications, sitePublications } from '../database/schema.js';
import { AuthorizationService } from '../identity/authorization.service.js';
import { AuditService } from '../common/audit.service.js';
import { ApiException, type RequestContext } from '../common/http.js';
import type { SaveCallDto } from './call.dto.js';

@Injectable()
export class ScientificCallService {
  constructor(private readonly authorization: AuthorizationService, private readonly database: DatabaseService, private readonly audit: AuditService) {}
  private scope(context: RequestContext, id: string, table: typeof drafts | typeof publications) { return and(eq(table.organizationId, context.organizationId), eq(table.eventId, id)); }
  private async event(tx: DbTransaction, context: RequestContext, id: string, edit = false) {
    const query = tx.select().from(events).where(and(eq(events.organizationId, context.organizationId), eq(events.id, id)));
    const [event] = await (edit ? query.for('update') : query);
    if (!event) throw new ApiException(404, 'NOT_FOUND');
    if (edit) {
      const [config] = await tx.select().from(eventConfigurations).where(and(eq(eventConfigurations.organizationId, context.organizationId), eq(eventConfigurations.eventId, id)));
      if (event.status === 'archived' || config && ['completed', 'cancelled'].includes(config.lifecycle)) throw new ApiException(409, 'CONFLICT');
    }
    return event;
  }
  private async draft(tx: DbTransaction, context: RequestContext, id: string): Promise<ScientificCallDraft> {
    const event = await this.event(tx, context, id);
    const [draft] = await tx.select().from(drafts).where(this.scope(context, id, drafts));
    const [publication] = await tx.select().from(publications).where(this.scope(context, id, publications));
    return { content: draft?.content ?? { titleEs: '', titleEn: '', instructionsEs: '', instructionsEn: '', opensOn: null, closesOn: null, tracks: [], contributionTypes: [] },
      revision: draft?.revision ?? 0, timezone: event.timezone, publishedRevision: publication?.revision ?? null,
      publishedAt: publication?.publishedAt.toISOString() ?? null, publication: publication?.snapshot ?? null };
  }
  get(context: RequestContext, id: string) { return this.authorization.run(context, 'event-read', (tx) => this.draft(tx, context, id)); }
  save(context: RequestContext, id: string, dto: SaveCallDto) {
    const c = dto.content;
    if (!c || (c.opensOn === null) !== (c.closesOn === null) || c.opensOn && c.closesOn! < c.opensOn || c.contributionTypes.some((t) => t.abstractMaxWords < t.abstractMinWords || t.keywordsMax < t.keywordsMin || t.manuscriptRequired && t.maxPages === null || !t.manuscriptRequired && t.maxPages !== null)) throw new ApiException(400, 'VALIDATION_FAILED');
    return this.authorization.run(context, 'site-update', async (tx) => {
      await this.event(tx, context, id, true);
      const before = await this.draft(tx, context, id);
      if (before.revision !== dto.revision) throw new ApiException(409, 'REVISION_CONFLICT');
      await tx.insert(drafts).values({ organizationId: context.organizationId, eventId: id, content: c, revision: dto.revision + 1 })
        .onConflictDoUpdate({ target: [drafts.organizationId, drafts.eventId], set: { content: c, revision: dto.revision + 1 } });
      await this.audit.record(tx, context, 'call.draft.saved', id);
      return this.draft(tx, context, id);
    });
  }
  publish(context: RequestContext, id: string, revision: number) {
    return this.authorization.run(context, 'site-publish', async (tx) => {
      const event = await this.event(tx, context, id, true);
      const draft = await this.draft(tx, context, id); const c = draft.content;
      if (!draft.revision || draft.revision !== revision) throw new ApiException(409, 'REVISION_CONFLICT');
      const [site] = await tx.select({ revision: sitePublications.revision }).from(sitePublications).where(and(eq(sitePublications.organizationId, context.organizationId), eq(sitePublications.eventId, id)));
      if (event.status !== 'published' || !site) throw new ApiException(409, 'CALL_SITE_REQUIRED');
      if (!c.opensOn || !c.closesOn || !c.tracks.length || !c.contributionTypes.length || c.titleEs.trim().length < 3 || c.titleEn.trim().length < 3 || c.instructionsEs.trim().length < 10 || c.instructionsEn.trim().length < 10) throw new ApiException(409, 'CALL_INCOMPLETE');
      const publishedAt = new Date(); const snapshot: PublishedScientificCall = { content: c, timezone: event.timezone, revision, publishedAt: publishedAt.toISOString() };
      await tx.insert(publications).values({ organizationId: context.organizationId, eventId: id, snapshot, revision, publishedAt })
        .onConflictDoUpdate({ target: [publications.organizationId, publications.eventId], set: { snapshot, revision, publishedAt } });
      await this.audit.record(tx, context, 'call.published', id);
      return this.draft(tx, context, id);
    });
  }
  withdraw(context: RequestContext, id: string, revision: number) {
    return this.authorization.run(context, 'site-publish', async (tx) => {
      // Withdrawal remains possible after cancellation/completion.
      await this.event(tx, context, id, false);
      await tx.select({ id: events.id }).from(events).where(and(eq(events.organizationId, context.organizationId), eq(events.id, id))).for('update');
      const before = await this.draft(tx, context, id);
      if (before.publishedRevision !== revision) throw new ApiException(409, 'REVISION_CONFLICT');
      await tx.delete(publications).where(this.scope(context, id, publications));
      await this.audit.record(tx, context, 'call.withdrawn', id);
      return this.draft(tx, context, id);
    });
  }
  publicCall(context: RequestContext): Promise<PublishedScientificCall> {
    return this.database.scoped(context, async (tx) => {
      if (!context.eventId) throw new ApiException(404, 'NOT_FOUND');
      const event = await this.event(tx, context, context.eventId);
      const [config] = await tx.select().from(eventConfigurations).where(and(eq(eventConfigurations.organizationId, context.organizationId), eq(eventConfigurations.eventId, event.id)));
      if (event.status !== 'published' || config && ['cancelled', 'completed'].includes(config.lifecycle)) throw new ApiException(404, 'NOT_FOUND');
      const [publication] = await tx.select().from(publications).where(this.scope(context, event.id, publications));
      if (!publication) throw new ApiException(404, 'NOT_FOUND'); return publication.snapshot;
    });
  }
}
