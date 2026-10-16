import { Injectable } from '@nestjs/common';
import { and, eq } from 'drizzle-orm';
import type { EventView, PublishedSite, SiteContent, SiteDraft } from '@sep/contracts';
import { DatabaseService, type DbTransaction } from '../database/database.service.js';
import { events, siteDrafts, sitePublications } from '../database/schema.js';
import { AuthorizationService } from '../identity/authorization.service.js';
import { ApiException, type RequestContext } from '../common/http.js';
import { AuditService } from '../common/audit.service.js';
import { EventsRepository } from './events.repository.js';
import type { PublishSiteDto, SaveSiteDto } from './site.dto.js';
import { readEventConfiguration } from './configuration.controller.js';

function initialContent(event: EventView): SiteContent {
  const date = new Date().toISOString().slice(0, 10);
  return { acronym: 'EVENTO', theme: 'forest', kickerEs: 'Encuentro científico', kickerEn: 'Scientific meeting',
    heroTitleEs: event.nameEs, heroTitleEn: event.nameEn, summaryEs: 'Presentación del encuentro por completar.', summaryEn: 'Event introduction to be completed.',
    aboutEs: 'Información del encuentro por completar.', aboutEn: 'Event information to be completed.',
    callEs: 'Convocatoria por completar antes de publicar.', callEn: 'Complete the call before publishing.',
    venueEs: 'Sede por confirmar', venueEn: 'Venue to be confirmed', startDate: date, endDate: date,
    contactEmail: 'organizacion@example.invalid', topicsEs: ['Investigación'], topicsEn: ['Research'] };
}
@Injectable()
export class SiteService {
  constructor(private readonly database: DatabaseService, private readonly authorization: AuthorizationService,
    private readonly eventRepository: EventsRepository, private readonly audit: AuditService) {}
  private scope(context: RequestContext, eventId: string) {
    return and(eq(siteDrafts.organizationId, context.organizationId), eq(siteDrafts.eventId, eventId));
  }
  private async draft(tx: DbTransaction, context: RequestContext, eventId: string): Promise<SiteDraft> {
    const event = await this.eventRepository.get(tx, context, eventId);
    if (!event) throw new ApiException(404, 'NOT_FOUND');
    const [draft] = await tx.select().from(siteDrafts).where(this.scope(context, eventId));
    const [publication] = await tx.select().from(sitePublications).where(and(eq(sitePublications.organizationId, context.organizationId), eq(sitePublications.eventId, eventId)));
    const configuration = await readEventConfiguration(tx, context.organizationId, eventId, event.timezone);
    const content = draft?.content ?? initialContent(event);
    return { event, content: configuration.startDate && configuration.endDate ? { ...content, startDate: configuration.startDate, endDate: configuration.endDate } : content, revision: draft?.revision ?? 0,
      publishedRevision: publication?.revision ?? null, publishedAt: publication?.publishedAt.toISOString() ?? null };
  }
  get(context: RequestContext, eventId: string): Promise<SiteDraft> {
    return this.authorization.run(context, 'site-read', (tx) => this.draft(tx, context, eventId));
  }
  save(context: RequestContext, eventId: string, dto: SaveSiteDto): Promise<SiteDraft> {
    if (!dto.content || dto.content.endDate < dto.content.startDate) throw new ApiException(400, 'VALIDATION_FAILED');
    return this.authorization.run(context, 'site-update', async (tx) => {
      const [event] = await tx.select().from(events).where(and(eq(events.organizationId, context.organizationId), eq(events.id, eventId))).for('update');
      if (!event) throw new ApiException(404, 'NOT_FOUND');
      if (event.status === 'archived') throw new ApiException(409, 'CONFLICT');
      const [before] = await tx.select().from(siteDrafts).where(this.scope(context, eventId));
      if ((before?.revision ?? 0) !== dto.revision) throw new ApiException(409, 'CONFLICT');
      const configuration = await readEventConfiguration(tx, context.organizationId, eventId, event.timezone);
      const content = configuration.startDate && configuration.endDate ? { ...dto.content, startDate: configuration.startDate, endDate: configuration.endDate } : dto.content;
      await tx.insert(siteDrafts).values({ organizationId: context.organizationId, eventId, content, revision: dto.revision + 1 })
        .onConflictDoUpdate({ target: [siteDrafts.organizationId, siteDrafts.eventId], set: { content, revision: dto.revision + 1, updatedAt: new Date() } });
      await this.audit.record(tx, context, 'site.draft.saved', eventId);
      return this.draft(tx, context, eventId);
    });
  }
  publish(context: RequestContext, eventId: string, dto: PublishSiteDto): Promise<PublishedSite> {
    return this.authorization.run(context, 'site-publish', async (tx) => {
      const [event] = await tx.select().from(events).where(and(eq(events.organizationId, context.organizationId), eq(events.id, eventId))).for('update');
      if (!event) throw new ApiException(404, 'NOT_FOUND');
      if (event.status === 'archived') throw new ApiException(409, 'CONFLICT');
      const [draft] = await tx.select().from(siteDrafts).where(this.scope(context, eventId));
      if (!draft || draft.revision !== dto.revision) throw new ApiException(409, 'CONFLICT');
      const publishedAt = new Date();
      const configuration = await readEventConfiguration(tx, context.organizationId, eventId, event.timezone);
      const content = configuration.startDate && configuration.endDate ? { ...draft.content, startDate: configuration.startDate, endDate: configuration.endDate } : draft.content;
      const snapshot: PublishedSite = { event: { id: event.id, nameEs: event.nameEs, nameEn: event.nameEn, timezone: event.timezone },
        content, revision: draft.revision, publishedAt: publishedAt.toISOString() };
      await tx.insert(sitePublications).values({ organizationId: context.organizationId, eventId, snapshot, revision: draft.revision, publishedAt })
        .onConflictDoUpdate({ target: [sitePublications.organizationId, sitePublications.eventId], set: { snapshot, revision: draft.revision, publishedAt } });
      await tx.update(events).set({ status: 'published' }).where(and(eq(events.organizationId, context.organizationId), eq(events.id, eventId)));
      await this.audit.record(tx, context, 'site.published', eventId);
      return snapshot;
    });
  }
  publicSite(context: RequestContext): Promise<PublishedSite> {
    return this.database.scoped(context, async (tx) => {
      if (!context.eventId || !await this.eventRepository.publicEvent(tx, context)) throw new ApiException(404, 'NOT_FOUND');
      const [publication] = await tx.select().from(sitePublications).where(and(eq(sitePublications.organizationId, context.organizationId), eq(sitePublications.eventId, context.eventId)));
      if (!publication) throw new ApiException(404, 'NOT_FOUND');
      return publication.snapshot;
    });
  }
}
