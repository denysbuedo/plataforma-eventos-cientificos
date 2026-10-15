import { sql } from 'drizzle-orm';
import { foreignKey, index, pgPolicy, pgRole, pgTable, primaryKey, text, uuid } from 'drizzle-orm/pg-core';

const runtime = pgRole('sep_spike_runtime').existing();

export const organizations = pgTable('organizations', { id: uuid('id').primaryKey() });

export const events = pgTable('events', {
  organizationId: uuid('organization_id').notNull().references(() => organizations.id),
  id: uuid('id').notNull(),
}, (table) => [primaryKey({ columns: [table.organizationId, table.id] })]);

export const privateRecords = pgTable('private_records', {
  id: uuid('id').primaryKey(),
  organizationId: uuid('organization_id').notNull(),
  eventId: uuid('event_id').notNull(),
  title: text('title').notNull(),
  description: text('description'),
}, (table) => {
  const scope = sql`${table.organizationId} = nullif(current_setting('sep.organization_id', true), '')::uuid
    AND ${table.eventId} = nullif(current_setting('sep.event_id', true), '')::uuid`;
  return [
    foreignKey({ columns: [table.organizationId, table.eventId], foreignColumns: [events.organizationId, events.id] }),
    index('private_records_organization_id_event_id_idx').on(table.organizationId, table.eventId),
    pgPolicy('event_scope', { for: 'all', to: runtime, using: scope, withCheck: scope }),
  ];
});
