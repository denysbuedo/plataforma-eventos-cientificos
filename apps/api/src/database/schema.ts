import { sql, type SQL } from 'drizzle-orm';
import { boolean, check, foreignKey, index, pgPolicy, pgRole, pgTable, text, timestamp, unique, uniqueIndex, uuid } from 'drizzle-orm/pg-core';

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
}, (t) => [policy(actorScope(sql`${t.id}`))]);
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
  policy(sql`${organizationScope(sql`${t.organizationId}`)} AND ${actorScope(sql`${t.personId}`)}`),
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
  policy(sql`${eventScope(sql`${t.organizationId}`, sql`${t.eventId}`)} AND ${actorScope(sql`${t.personId}`)}`),
]);
