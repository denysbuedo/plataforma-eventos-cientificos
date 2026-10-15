import { sql, type SQL } from 'drizzle-orm';
import { boolean, check, foreignKey, index, integer, jsonb, pgPolicy, pgRole, pgTable, primaryKey, text, timestamp, unique, uniqueIndex, uuid } from 'drizzle-orm/pg-core';
import type { PublishedSite, SiteContent } from '@sep/contracts';

const runtime = pgRole('sep_runtime').existing();
const organizationScope = (column: SQL) => sql`${column} = nullif(current_setting('sep.organization_id', true), '')::uuid`;
const actorScope = (column: SQL) => sql`${column} = nullif(current_setting('sep.person_id', true), '')::uuid`;
const eventScope = (organization: SQL, event: SQL) => sql`${organizationScope(organization)} AND
  (${event} = nullif(current_setting('sep.event_id', true), '')::uuid OR current_setting('sep.organization_admin', true) = 'true')`;
const policy = (scope: SQL) => pgPolicy('context_scope', { for: 'all', to: runtime, using: scope, withCheck: scope });

// Control-plane registry: no direct runtime grants; access only through the narrow domain resolver.
export const organizations = pgTable('organizations', {
  id: uuid('id').primaryKey(), name: text('name').notNull(), active: boolean('active').notNull().default(true),
});
export const series = pgTable('event_series', {
  id: uuid('id').primaryKey(), organizationId: uuid('organization_id').notNull().references(() => organizations.id), name: text('name').notNull(),
}, (t) => [unique().on(t.organizationId, t.id), policy(organizationScope(sql`${t.organizationId}`))]);
export const editions = pgTable('event_editions', {
  id: uuid('id').primaryKey(), organizationId: uuid('organization_id').notNull().references(() => organizations.id),
  seriesId: uuid('series_id').notNull(), label: text('label').notNull(),
}, (t) => [
  unique().on(t.organizationId, t.id), unique().on(t.seriesId, t.label),
  foreignKey({ columns: [t.organizationId, t.seriesId], foreignColumns: [series.organizationId, series.id] }),
  policy(organizationScope(sql`${t.organizationId}`)),
]);
export const events = pgTable('events', {
  id: uuid('id').primaryKey(), organizationId: uuid('organization_id').notNull().references(() => organizations.id),
  editionId: uuid('edition_id'), nameEs: text('name_es').notNull(), nameEn: text('name_en').notNull(),
  timezone: text('timezone').notNull(), status: text('status').$type<'draft' | 'published' | 'archived'>().notNull().default('draft'),
}, (t) => [
  unique().on(t.organizationId, t.id), index('events_organization_idx').on(t.organizationId),
  foreignKey({ columns: [t.organizationId, t.editionId], foreignColumns: [editions.organizationId, editions.id] }),
  check('events_status_check', sql`${t.status} IN ('draft', 'published', 'archived')`),
  policy(eventScope(sql`${t.organizationId}`, sql`${t.id}`)),
]);
export const domains = pgTable('domains', {
  id: uuid('id').primaryKey(), organizationId: uuid('organization_id').notNull().references(() => organizations.id),
  eventId: uuid('event_id'), hostname: text('hostname').notNull().unique(),
  active: boolean('active').notNull().default(false), verified: boolean('verified').notNull().default(false),
}, (t) => [foreignKey({ columns: [t.organizationId, t.eventId], foreignColumns: [events.organizationId, events.id] })]);
export const people = pgTable('people', {
  id: uuid('id').primaryKey(), name: text('name').notNull(), active: boolean('active').notNull().default(true),
}, (t) => [policy(sql`${actorScope(sql`${t.id}`)} OR (current_setting('sep.organization_admin', true) = 'true' AND EXISTS
  (SELECT 1 FROM memberships m WHERE m.person_id = ${t.id} AND m.organization_id = nullif(current_setting('sep.organization_id', true), '')::uuid AND m.active))`)]);
export const identities = pgTable('identities', {
  id: uuid('id').primaryKey(), personId: uuid('person_id').notNull().references(() => people.id),
  issuer: text('issuer').notNull(), subject: text('subject').notNull(), active: boolean('active').notNull().default(true),
}, (t) => [unique().on(t.issuer, t.subject), policy(actorScope(sql`${t.personId}`))]);
export const affiliations = pgTable('affiliations', {
  id: uuid('id').primaryKey(), personId: uuid('person_id').notNull().references(() => people.id), institution: text('institution').notNull(),
}, (t) => [policy(actorScope(sql`${t.personId}`))]);
export const memberships = pgTable('memberships', {
  id: uuid('id').primaryKey(), personId: uuid('person_id').notNull().references(() => people.id),
  organizationId: uuid('organization_id').notNull().references(() => organizations.id),
  eventId: uuid('event_id'), active: boolean('active').notNull().default(true),
}, (t) => [
  uniqueIndex('membership_organization_unique').on(t.personId, t.organizationId).where(sql`${t.eventId} IS NULL`),
  uniqueIndex('membership_event_unique').on(t.personId, t.organizationId, t.eventId).where(sql`${t.eventId} IS NOT NULL`),
  foreignKey({ columns: [t.organizationId, t.eventId], foreignColumns: [events.organizationId, events.id] }),
  index('membership_person_organization_idx').on(t.personId, t.organizationId),
  policy(sql`${organizationScope(sql`${t.organizationId}`)} AND (${actorScope(sql`${t.personId}`)} OR current_setting('sep.organization_admin', true) = 'true')`),
]);
export const roleAssignments = pgTable('role_assignments', {
  id: uuid('id').primaryKey(), membershipId: uuid('membership_id').notNull().references(() => memberships.id),
  role: text('role').$type<'organization_admin' | 'organizer' | 'participant'>().notNull(),
  active: boolean('active').notNull().default(true),
  validFrom: timestamp('valid_from', { withTimezone: true }).notNull().defaultNow(),
  validUntil: timestamp('valid_until', { withTimezone: true }),
}, (t) => [
  unique().on(t.membershipId, t.role),
  check('role_code_check', sql`${t.role} IN ('organization_admin', 'organizer', 'participant')`),
  check('role_period_check', sql`${t.validUntil} IS NULL OR ${t.validUntil} > ${t.validFrom}`),
  policy(sql`EXISTS (SELECT 1 FROM memberships m WHERE m.id = ${t.membershipId})`),
]);
export const auditEntries = pgTable('audit_entries', {
  id: uuid('id').primaryKey(), organizationId: uuid('organization_id').notNull().references(() => organizations.id),
  eventId: uuid('event_id'), personId: uuid('person_id').notNull().references(() => people.id),
  action: text('action').notNull(), resourceId: uuid('resource_id').notNull(),
  requestId: uuid('request_id').notNull(), occurredAt: timestamp('occurred_at', { withTimezone: true }).notNull().defaultNow(),
}, (t) => [
  foreignKey({ columns: [t.organizationId, t.eventId], foreignColumns: [events.organizationId, events.id] }),
  policy(sql`${organizationScope(sql`${t.organizationId}`)} AND ${actorScope(sql`${t.personId}`)} AND
    ((${eventScope(sql`${t.organizationId}`, sql`${t.eventId}`)}) OR (${t.eventId} IS NULL AND ${t.action} = 'invitation.accepted' AND EXISTS
      (SELECT 1 FROM organization_invitations i WHERE i.id = ${t.resourceId} AND i.organization_id = ${t.organizationId}
        AND i.status = 'accepted' AND i.accepted_by = ${t.personId} AND i.token_hash = current_setting('sep.invitation_hash', true))))`),
]);

export const siteDrafts = pgTable('site_drafts', {
  organizationId: uuid('organization_id').notNull(), eventId: uuid('event_id').notNull(),
  content: jsonb('content').$type<SiteContent>().notNull(), revision: integer('revision').notNull().default(1),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
}, (t) => [
  primaryKey({ columns: [t.organizationId, t.eventId] }),
  foreignKey({ columns: [t.organizationId, t.eventId], foreignColumns: [events.organizationId, events.id] }),
  check('site_draft_revision_positive', sql`${t.revision} > 0`),
  policy(eventScope(sql`${t.organizationId}`, sql`${t.eventId}`)),
]);
export const sitePublications = pgTable('site_publications', {
  organizationId: uuid('organization_id').notNull(), eventId: uuid('event_id').notNull(),
  snapshot: jsonb('snapshot').$type<PublishedSite>().notNull(), revision: integer('revision').notNull(),
  publishedAt: timestamp('published_at', { withTimezone: true }).notNull().defaultNow(),
}, (t) => [
  primaryKey({ columns: [t.organizationId, t.eventId] }),
  foreignKey({ columns: [t.organizationId, t.eventId], foreignColumns: [events.organizationId, events.id] }),
  check('site_publication_revision_positive', sql`${t.revision} > 0`),
  policy(eventScope(sql`${t.organizationId}`, sql`${t.eventId}`)),
]);

export const organizationInvitations = pgTable('organization_invitations', {
  id: uuid('id').primaryKey(), organizationId: uuid('organization_id').notNull().references(() => organizations.id),
  name: text('name').notNull(), email: text('email').notNull(), tokenHash: text('token_hash').notNull().unique(),
  status: text('status').$type<'pending' | 'accepted' | 'revoked'>().notNull().default('pending'),
  createdBy: uuid('created_by').notNull().references(() => people.id), createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  expiresAt: timestamp('expires_at', { withTimezone: true }).notNull(),
  acceptedBy: uuid('accepted_by').references(() => people.id), acceptedAt: timestamp('accepted_at', { withTimezone: true }),
}, (t) => [
  uniqueIndex('invitation_pending_email_unique').on(t.organizationId, t.email).where(sql`${t.status} = 'pending'`),
  check('invitation_status_check', sql`${t.status} IN ('pending','accepted','revoked')`),
  check('invitation_dates_check', sql`${t.expiresAt} > ${t.createdAt}`),
  check('invitation_acceptance_check', sql`(${t.status} = 'accepted') = (${t.acceptedBy} IS NOT NULL AND ${t.acceptedAt} IS NOT NULL)`),
  pgPolicy('invitation_read', { for: 'select', to: runtime, using: sql`${organizationScope(sql`${t.organizationId}`)} AND
    (current_setting('sep.organization_admin', true) = 'true' OR ${t.tokenHash} = current_setting('sep.invitation_hash', true))` }),
  pgPolicy('invitation_create', { for: 'insert', to: runtime, withCheck: sql`${organizationScope(sql`${t.organizationId}`)} AND current_setting('sep.organization_admin', true) = 'true' AND ${actorScope(sql`${t.createdBy}`)}` }),
  pgPolicy('invitation_update', { for: 'update', to: runtime,
    using: sql`${organizationScope(sql`${t.organizationId}`)} AND (current_setting('sep.organization_admin', true) = 'true' OR ${t.tokenHash} = current_setting('sep.invitation_hash', true))`,
    withCheck: sql`${organizationScope(sql`${t.organizationId}`)} AND (current_setting('sep.organization_admin', true) = 'true' OR (${t.tokenHash} = current_setting('sep.invitation_hash', true) AND ${actorScope(sql`${t.acceptedBy}`)}))` }),
]);
