import { Injectable } from '@nestjs/common';
import { and, desc, eq, sql } from 'drizzle-orm';
import { randomUUID } from 'node:crypto';
import type { AuthorWork, AuthorWorkspace, PublishedScientificCall } from '@sep/contracts';
import { DatabaseService, type DbTransaction } from '../database/database.service.js';
import { authorWorks as works, eventConfigurations, events, people, scientificCallPublications } from '../database/schema.js';
import { ApiException, type RequestContext } from '../common/http.js';
import { AuditService } from '../common/audit.service.js';
import type { CreateWorkDto, SaveWorkDto } from './works.dto.js';
const view = (row: typeof works.$inferSelect): AuthorWork => ({ id: row.id, title: row.title, abstract: row.abstract, keywords: row.keywords,
  language: row.language, trackId: row.trackId, contributionTypeId: row.contributionTypeId, call: row.call, revision: row.revision,
  createdAt: row.createdAt.toISOString(), updatedAt: row.updatedAt.toISOString() });
const summaryFields = { id: works.id, title: works.title, language: works.language, trackId: works.trackId,
  contributionTypeId: works.contributionTypeId, revision: works.revision, createdAt: works.createdAt, updatedAt: works.updatedAt };
@Injectable()
export class AuthorWorksService {
  constructor(private readonly database: DatabaseService, private readonly audit: AuditService) {}
  private scope(context: RequestContext) { return and(eq(works.organizationId, context.organizationId), eq(works.eventId, context.eventId!), eq(works.ownerId, context.personId!)); }
  private async state(tx: DbTransaction, context: RequestContext, lock = false) {
    if (!context.personId) throw new ApiException(401, 'UNAUTHORIZED');
    if (!context.eventId) throw new ApiException(404, 'NOT_FOUND');
    const [person] = await tx.select({ id: people.id }).from(people).where(and(eq(people.id, context.personId), eq(people.active, true)));
    if (!person) throw new ApiException(401, 'UNAUTHORIZED');
    const query = tx.select().from(events).where(and(eq(events.organizationId, context.organizationId), eq(events.id, context.eventId)));
    const [event] = await (lock ? query.for('update') : query);
    if (!event) throw new ApiException(404, 'NOT_FOUND');
    const [config] = await tx.select().from(eventConfigurations).where(and(eq(eventConfigurations.organizationId, context.organizationId), eq(eventConfigurations.eventId, event.id)));
    const [pub] = await tx.select().from(scientificCallPublications).where(and(eq(scientificCallPublications.organizationId, context.organizationId), eq(scientificCallPublications.eventId, event.id)));
    const call = pub?.snapshot ?? null;
    const inactive = event.status !== 'published' || !!config && ['completed','cancelled'].includes(config.lifecycle);
    let reason: AuthorWorkspace['reason'] = inactive ? 'inactive' : call ? 'available' : 'no_call';
    if (reason === 'available' && call) {
      const parts = new Intl.DateTimeFormat('en-US', { timeZone: call.timezone, year: 'numeric', month: '2-digit', day: '2-digit' }).formatToParts(new Date());
      const part = (type: string) => parts.find((p) => p.type === type)?.value;
      if (!call.content.closesOn || `${part('year')}-${part('month')}-${part('day')}` > call.content.closesOn) reason = 'closed';
    }
    return { event, call: inactive ? null : call, reason, editable: reason === 'available', languages: config?.languages ?? ['es','en'] as ('es' | 'en')[] };
  }
  private validateSelection(call: PublishedScientificCall, dto: CreateWorkDto) {
    const track = call.content.tracks.find((t) => t.id.toLowerCase() === dto.trackId.toLowerCase());
    const type = call.content.contributionTypes.find((t) => t.id.toLowerCase() === dto.contributionTypeId.toLowerCase());
    if (!track || !type) throw new ApiException(400, 'VALIDATION_FAILED');
    return { track, type };
  }
  get(context: RequestContext): Promise<AuthorWorkspace> {
    return this.database.scoped({ ...context, organizationAdmin: false }, async (tx) => {
      const state = await this.state(tx, context);
      const rows = await tx.select(summaryFields).from(works).where(this.scope(context)).orderBy(desc(works.updatedAt), works.id).limit(50);
      if (state.event.status !== 'published' && !rows.length) throw new ApiException(404, 'NOT_FOUND');
      return { event: { id: state.event.id, nameEs: state.event.nameEs, nameEn: state.event.nameEn, timezone: state.event.timezone },
        works: rows.map((row) => ({ ...row, createdAt: row.createdAt.toISOString(), updatedAt: row.updatedAt.toISOString() })), call: state.call, editable: state.editable, reason: state.reason, languages: state.languages };
    });
  }
  read(context: RequestContext, id: string): Promise<AuthorWork> {
    return this.database.scoped({ ...context, organizationAdmin: false }, async (tx) => {
      await this.state(tx, context);
      const [row] = await tx.select().from(works).where(and(this.scope(context), eq(works.id, id)));
      if (!row) throw new ApiException(404, 'NOT_FOUND'); return view(row);
    });
  }
  create(context: RequestContext, dto: CreateWorkDto): Promise<AuthorWork> {
    return this.database.scoped({ ...context, organizationAdmin: false }, async (tx) => {
      const state = await this.state(tx, context, true);
      if (!state.editable || !state.call) throw new ApiException(409, 'WORKS_UNAVAILABLE');
      if (!state.languages.includes(dto.language)) throw new ApiException(400, 'VALIDATION_FAILED');
      const selection = this.validateSelection(state.call, dto);
      const [{ count }] = await tx.select({ count: sql<number>`count(*)::int` }).from(works).where(this.scope(context));
      if (count >= 50) throw new ApiException(409, 'WORK_LIMIT');
      const [row] = await tx.insert(works).values({ id: randomUUID(), organizationId: context.organizationId, eventId: state.event.id,
        ownerId: context.personId!, ...dto, trackId: selection.track.id, contributionTypeId: selection.type.id, call: state.call }).returning();
      await this.audit.record(tx, context, 'work.created', state.event.id, row.id); return view(row);
    });
  }
  save(context: RequestContext, id: string, dto: SaveWorkDto): Promise<AuthorWork> {
    return this.database.scoped({ ...context, organizationAdmin: false }, async (tx) => {
      const state = await this.state(tx, context, true);
      const [before] = await tx.select().from(works).where(and(this.scope(context), eq(works.id, id))).for('update');
      if (!before) throw new ApiException(404, 'NOT_FOUND');
      if (!state.editable) throw new ApiException(409, 'WORKS_UNAVAILABLE');
      if (!state.languages.includes(dto.language)) throw new ApiException(400, 'VALIDATION_FAILED');
      if (before.revision !== dto.revision) throw new ApiException(409, 'REVISION_CONFLICT');
      const selection = this.validateSelection(before.call, dto);
      const words = dto.abstract.trim() ? dto.abstract.trim().split(/\s+/u).length : 0;
      if (words > selection.type.abstractMaxWords || dto.keywords.length > selection.type.keywordsMax) throw new ApiException(400, 'WORK_REQUIREMENTS');
      const [row] = await tx.update(works).set({ ...dto, trackId: selection.track.id, contributionTypeId: selection.type.id, revision: dto.revision + 1, updatedAt: new Date() })
        .where(and(this.scope(context), eq(works.id, id))).returning();
      await this.audit.record(tx, context, 'work.draft.saved', state.event.id, id); return view(row);
    });
  }
}
