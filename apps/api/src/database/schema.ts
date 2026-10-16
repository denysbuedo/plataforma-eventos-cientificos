import { sql, type SQL } from 'drizzle-orm';
import { boolean, check, customType, date, foreignKey, index, integer, jsonb, pgPolicy, pgRole, pgTable, primaryKey, text, timestamp, unique, uniqueIndex, uuid } from 'drizzle-orm/pg-core';
import type { EventConfiguration, PublishedScientificCall, PublishedSite, ScientificCallContent, SiteContent, WorkAuthor, WorkStatus, WorkContent, Manuscript, WorkAffiliation, ResearcherBackground } from '@sep/contracts';

const binary = customType<{ data: Buffer; driverData: Buffer }>({ dataType: () => 'bytea' });
const runtime = pgRole('sep_runtime').existing();
const registryOwner = pgRole('sep_migrator').existing();
const organizationScope = (column: SQL) => sql`${column} = nullif(current_setting('sep.organization_id', true), '')::uuid`;
const actorScope = (column: SQL) => sql`${column} = nullif(current_setting('sep.person_id', true), '')::uuid`;
const eventScope = (organization: SQL, event: SQL) => sql`${organizationScope(organization)} AND
  (${event} = nullif(current_setting('sep.event_id', true), '')::uuid OR current_setting('sep.organization_admin', true) = 'true')`;
const policy = (scope: SQL) => pgPolicy('context_scope', { for: 'all', to: runtime, using: scope, withCheck: scope });
const registryRead = (scope: SQL) => pgPolicy('registry_authorization_read', { for: 'select', to: registryOwner,
  using: sql`current_setting('sep.organization_admin', true) = 'true' AND ${scope}` });
// Only the narrowly scoped SECURITY DEFINER authorship function uses these policies.
const authorshipScope = (org:SQL,event:SQL) => sql`current_setting('sep.authorship_rpc',true)='true' AND ${organizationScope(org)} AND ${event}=nullif(current_setting('sep.event_id',true),'')::uuid`;
const authorshipPolicy = (org:SQL,event:SQL) => pgPolicy('authorship_rpc',{for:'all',to:registryOwner,using:authorshipScope(org,event),withCheck:authorshipScope(org,event)});
const authorshipActorRead = (actor:SQL) => pgPolicy('authorship_actor',{for:'select',to:registryOwner,using:sql`current_setting('sep.authorship_rpc',true)='true' AND ${actorScope(actor)}`});

export const authorshipClaims = pgTable('authorship_claims',{
  id:uuid('id').primaryKey(),organizationId:uuid('organization_id').notNull(),eventId:uuid('event_id').notNull(),workId:uuid('work_id').notNull(),
  authorId:uuid('author_id').notNull(),claimantId:uuid('claimant_id').notNull().references(()=>people.id),claimantName:text('claimant_name').notNull(),
  declaration:jsonb('declaration').$type<WorkAuthor>().notNull(),basis:text('basis').$type<'account'|'email'|'orcid'>().notNull(),
  verifiedOrcid:text('verified_orcid'),
  status:text('status').$type<'pending'|'approved'|'rejected'|'revoked'>().notNull().default('pending'),revision:integer('revision').notNull().default(1),
  claimantSeenRevision:integer('claimant_seen_revision').notNull().default(1),
  message:text('message').notNull().default(''),decidedBy:uuid('decided_by').references(()=>people.id),
  createdAt:timestamp('created_at',{withTimezone:true}).notNull().defaultNow(),decidedAt:timestamp('decided_at',{withTimezone:true}),
},t=>[foreignKey({columns:[t.organizationId,t.eventId,t.workId],foreignColumns:[authorWorks.organizationId,authorWorks.eventId,authorWorks.id]}),
  uniqueIndex('authorship_open_claim_unique').on(t.workId,t.authorId,t.claimantId).where(sql`${t.status} IN ('pending','approved')`),
  index('authorship_claim_event_idx').on(t.organizationId,t.eventId,t.createdAt),
  check('authorship_claim_status',sql`${t.status} IN ('pending','approved','rejected','revoked')`),
  check('authorship_claim_basis',sql`${t.basis} IN ('account','email','orcid')`),check('authorship_claim_revision',sql`${t.revision}>0`),
  authorshipPolicy(sql`${t.organizationId}`,sql`${t.eventId}`),
]);

// Control-plane registry: no direct runtime grants; access only through the narrow domain resolver.
export const organizations = pgTable('organizations', {
  id: uuid('id').primaryKey(), name: text('name').notNull(), active: boolean('active').notNull().default(true),
  contactEmail: text('contact_email').notNull().default(''), website: text('website').notNull().default(''),
  description: text('description').notNull().default(''), revision: integer('revision').notNull().default(1),
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
  registryRead(organizationScope(sql`${t.organizationId}`)),
  pgPolicy('authorship_rpc',{for:'select',to:registryOwner,using:authorshipScope(sql`${t.organizationId}`,sql`${t.id}`)}),
  // SELECT FOR UPDATE in the registry function needs an UPDATE USING policy;
  // WITH CHECK false still prevents the function owner from changing event rows.
  pgPolicy('registry_event_lock', { for: 'update', to: registryOwner,
    using: sql`current_setting('sep.organization_admin', true) = 'true' AND ${organizationScope(sql`${t.organizationId}`)}`, withCheck: sql`false` }),
]);
export const domains = pgTable('domains', {
  id: uuid('id').primaryKey(), organizationId: uuid('organization_id').notNull().references(() => organizations.id),
  eventId: uuid('event_id'), hostname: text('hostname').notNull().unique(),
  active: boolean('active').notNull().default(false), verified: boolean('verified').notNull().default(false),
  verificationToken: text('verification_token'), tlsReady: boolean('tls_ready').notNull().default(false),
}, (t) => [foreignKey({ columns: [t.organizationId, t.eventId], foreignColumns: [events.organizationId, events.id] })]);
export const eventConfigurations = pgTable('event_configurations', {
  organizationId: uuid('organization_id').notNull(), eventId: uuid('event_id').notNull(),
  startDate: date('start_date'), endDate: date('end_date'),
  modality: text('modality').$type<EventConfiguration['modality']>().notNull().default('in_person'),
  languages: text('languages').array().$type<EventConfiguration['languages']>().notNull().default(sql`ARRAY['es','en']::text[]`),
  defaultLanguage: text('default_language').$type<'es' | 'en'>().notNull().default('es'),
  requireSubmittingAuthorOrcid: boolean('require_submitting_author_orcid').notNull().default(false),
  lifecycle: text('lifecycle').$type<EventConfiguration['lifecycle']>().notNull().default('planning'),
  revision: integer('revision').notNull().default(1),
}, (t) => [
  primaryKey({ columns: [t.organizationId, t.eventId] }),
  foreignKey({ columns: [t.organizationId, t.eventId], foreignColumns: [events.organizationId, events.id] }),
  check('event_configuration_dates', sql`(${t.startDate} IS NULL AND ${t.endDate} IS NULL) OR (${t.startDate} IS NOT NULL AND ${t.endDate} IS NOT NULL AND ${t.endDate} >= ${t.startDate})`),
  check('event_configuration_modality', sql`${t.modality} IN ('in_person','virtual','hybrid')`),
  check('event_configuration_languages', sql`cardinality(${t.languages}) BETWEEN 1 AND 2 AND ${t.languages} <@ ARRAY['es','en']::text[] AND ${t.defaultLanguage} = ANY(${t.languages})`),
  check('event_configuration_lifecycle', sql`${t.lifecycle} IN ('planning','scheduled','ongoing','completed','cancelled')`),
  check('event_configuration_revision', sql`${t.revision} > 0`),
  check('event_configuration_scheduled_dates', sql`${t.lifecycle} NOT IN ('scheduled','ongoing','completed') OR ${t.startDate} IS NOT NULL`),
  policy(eventScope(sql`${t.organizationId}`, sql`${t.eventId}`)),
  pgPolicy('authorship_rpc',{for:'select',to:registryOwner,using:authorshipScope(sql`${t.organizationId}`,sql`${t.eventId}`)}),
]);
export const people = pgTable('people', {
  id: uuid('id').primaryKey(), name: text('name').notNull(), active: boolean('active').notNull().default(true),
}, (t) => [
  pgPolicy('authorship_people',{for:'select',to:registryOwner,using:sql`current_setting('sep.authorship_rpc',true)='true'`}),
  pgPolicy('profile_owner_update',{as:'restrictive',for:'update',to:runtime,using:actorScope(sql`${t.id}`),withCheck:actorScope(sql`${t.id}`)}),
  pgPolicy('directory_actor',{for:'select',to:registryOwner,using:actorScope(sql`${t.id}`)}),
  pgPolicy('directory_lookup',{for:'select',to:registryOwner,using:sql`current_setting('sep.directory_read',true)='true' AND EXISTS(SELECT 1 FROM researcher_profiles p WHERE p.person_id=${t.id} AND p.discoverable)`}),
  registryRead(actorScope(sql`${t.id}`)), policy(sql`${actorScope(sql`${t.id}`)} OR (current_setting('sep.organization_admin', true) = 'true' AND EXISTS
  (SELECT 1 FROM memberships m WHERE m.person_id = ${t.id} AND m.organization_id = nullif(current_setting('sep.organization_id', true), '')::uuid AND m.active))`)]);
export const identities = pgTable('identities', {
  id: uuid('id').primaryKey(), personId: uuid('person_id').notNull().references(() => people.id),
  issuer: text('issuer').notNull(), subject: text('subject').notNull(), active: boolean('active').notNull().default(true),
}, (t) => [unique().on(t.issuer, t.subject), policy(actorScope(sql`${t.personId}`)),
  pgPolicy('oidc_identity_lookup', { for: 'select', to: runtime, using: sql`current_setting('sep.auth_provision', true) = 'true'
    AND ${t.issuer} = current_setting('sep.auth_issuer', true) AND ${t.subject} = current_setting('sep.auth_subject', true)` }),
]);
export const affiliations = pgTable('affiliations', {
  id: uuid('id').primaryKey(), personId: uuid('person_id').notNull().references(() => people.id), institution: text('institution').notNull(),
}, (t) => [policy(actorScope(sql`${t.personId}`))]);
export const orcidConnections = pgTable('orcid_connections', {
  personId: uuid('person_id').primaryKey().references(()=>people.id),
  orcid: text('orcid'), environment: text('environment').notNull().default('production'), connectedAt: timestamp('connected_at',{withTimezone:true}),
  stateHash: text('state_hash'), expiresAt: timestamp('expires_at',{withTimezone:true}), returnTo: text('return_to'),
}, t=>[unique().on(t.environment,t.orcid), check('orcid_environment',sql`${t.environment} IN ('production','sandbox')`),policy(actorScope(sql`${t.personId}`)),
  authorshipActorRead(sql`${t.personId}`),
  pgPolicy('directory_lookup',{for:'select',to:registryOwner,using:sql`current_setting('sep.directory_read',true)='true' AND EXISTS(SELECT 1 FROM researcher_profiles p WHERE p.person_id=${t.personId} AND p.discoverable)`}),
]);
export const researcherProfiles = pgTable('researcher_profiles',{
  background:jsonb('background').$type<ResearcherBackground>().notNull().default({educationLevel:'',degreeTitle:'',position:'',researchInterests:[],biography:'',website:''}),
  personId:uuid('person_id').primaryKey().references(()=>people.id),affiliations:jsonb('affiliations').$type<WorkAffiliation[]>().notNull().default([]),
  discoverable:boolean('discoverable').notNull().default(false),revision:integer('revision').notNull().default(1),
},t=>[policy(actorScope(sql`${t.personId}`)),check('researcher_profile_revision',sql`${t.revision}>0`),
  pgPolicy('directory_projection',{for:'select',to:registryOwner,using:sql`${t.discoverable}`}),
]);
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
  registryRead(sql`${organizationScope(sql`${t.organizationId}`)} AND ${actorScope(sql`${t.personId}`)}`),
  authorshipActorRead(sql`${t.personId}`),
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
  registryRead(sql`EXISTS (SELECT 1 FROM memberships m WHERE m.id = ${t.membershipId})`),
  pgPolicy('authorship_actor',{for:'select',to:registryOwner,using:sql`current_setting('sep.authorship_rpc',true)='true' AND EXISTS(SELECT 1 FROM memberships m WHERE m.id=${t.membershipId} AND m.person_id=nullif(current_setting('sep.person_id',true),'')::uuid)`}),
]);
export const auditEntries = pgTable('audit_entries', {
  id: uuid('id').primaryKey(), organizationId: uuid('organization_id').notNull().references(() => organizations.id),
  eventId: uuid('event_id'), personId: uuid('person_id').notNull().references(() => people.id),
  action: text('action').notNull(), resourceId: uuid('resource_id').notNull(),
  requestId: uuid('request_id').notNull(), occurredAt: timestamp('occurred_at', { withTimezone: true }).notNull().defaultNow(),
}, (t) => [
  pgPolicy('authorship_rpc',{for:'insert',to:registryOwner,withCheck:sql`${authorshipScope(sql`${t.organizationId}`,sql`${t.eventId}`)} AND ${actorScope(sql`${t.personId}`)}`}),
  foreignKey({ columns: [t.organizationId, t.eventId], foreignColumns: [events.organizationId, events.id] }),
  policy(sql`${organizationScope(sql`${t.organizationId}`)} AND ${actorScope(sql`${t.personId}`)} AND
    ((${eventScope(sql`${t.organizationId}`, sql`${t.eventId}`)}) OR (${t.eventId} IS NULL AND ${t.action} = 'invitation.accepted' AND EXISTS
      (SELECT 1 FROM organization_invitations i WHERE i.id = ${t.resourceId} AND i.organization_id = ${t.organizationId}
        AND i.status = 'accepted' AND i.accepted_by = ${t.personId} AND i.token_hash = current_setting('sep.invitation_hash', true)))
      OR (${t.eventId} IS NULL AND ${t.action} = 'identity.orcid.connected' AND ${t.resourceId} = ${t.personId}
        AND EXISTS (SELECT 1 FROM orcid_connections o WHERE o.person_id=${t.personId} AND o.orcid IS NOT NULL AND o.connected_at IS NOT NULL))
      OR (${t.eventId} IS NULL AND ${t.action} = 'identity.profile.updated' AND ${t.resourceId} = ${t.personId}
        AND EXISTS (SELECT 1 FROM researcher_profiles p WHERE p.person_id=${t.personId})))`),
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

export const authorWorks = pgTable('author_works', {
  id: uuid('id').primaryKey(), organizationId: uuid('organization_id').notNull(), eventId: uuid('event_id').notNull(),
  ownerId: uuid('owner_id').notNull().references(() => people.id), title: text('title').notNull(), abstract: text('abstract').notNull().default(''),
  keywords: text('keywords').array().notNull().default(sql`ARRAY[]::text[]`), language: text('language').$type<'es' | 'en'>().notNull(),
  trackId: uuid('track_id').notNull(), contributionTypeId: uuid('contribution_type_id').notNull(),
  call: jsonb('call_snapshot').$type<PublishedScientificCall>().notNull(), revision: integer('revision').notNull().default(1),
  authors: jsonb('authors').$type<WorkAuthor[]>().notNull().default(sql`'[]'::jsonb`),
  status: text('status').$type<WorkStatus>().notNull().default('draft'), submittedAt: timestamp('submitted_at', { withTimezone: true }),
  responseDeadline: date('response_deadline'), manuscript: jsonb('manuscript').$type<Manuscript>(),
  submittedContent: jsonb('submitted_content').$type<WorkContent>(), hidden: boolean('hidden').notNull().default(false),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(), updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
}, (t) => [unique().on(t.organizationId,t.eventId,t.id), foreignKey({ columns: [t.organizationId, t.eventId], foreignColumns: [events.organizationId, events.id] }),
  authorshipPolicy(sql`${t.organizationId}`,sql`${t.eventId}`),
  check('work_status_values',sql`${t.status} IN ('draft','submitted','in_review','changes_requested','accepted','rejected','withdrawn','final_requested','final_submitted')`),
  index('author_works_owner_event_idx').on(t.organizationId, t.eventId, t.ownerId),
  unique('author_works_owner_scope_unique').on(t.organizationId,t.eventId,t.id,t.ownerId),
  check('author_work_revision', sql`${t.revision} > 0`), check('author_work_language', sql`${t.language} IN ('es','en')`),
  check('author_work_authors_array', sql`jsonb_typeof(${t.authors}) = 'array' AND jsonb_array_length(${t.authors}) <= 20`),
  policy(sql`${organizationScope(sql`${t.organizationId}`)} AND ${t.eventId} = nullif(current_setting('sep.event_id', true), '')::uuid AND ${actorScope(sql`${t.ownerId}`)}`),
  pgPolicy('collaborator_read',{for:'select',to:runtime,using:sql`${organizationScope(sql`${t.organizationId}`)} AND ${t.eventId}=nullif(current_setting('sep.event_id',true),'')::uuid AND EXISTS(SELECT 1 FROM work_collaborations c WHERE c.work_id=${t.id} AND c.organization_id=${t.organizationId} AND c.event_id=${t.eventId} AND c.person_id=nullif(current_setting('sep.person_id',true),'')::uuid AND c.status='accepted')`}),
  pgPolicy('collaborator_update',{for:'update',to:runtime,using:sql`${organizationScope(sql`${t.organizationId}`)} AND ${t.eventId}=nullif(current_setting('sep.event_id',true),'')::uuid AND EXISTS(SELECT 1 FROM work_collaborations c WHERE c.work_id=${t.id} AND c.organization_id=${t.organizationId} AND c.event_id=${t.eventId} AND c.person_id=nullif(current_setting('sep.person_id',true),'')::uuid AND c.status='accepted')`,withCheck:sql`${organizationScope(sql`${t.organizationId}`)} AND ${t.eventId}=nullif(current_setting('sep.event_id',true),'')::uuid AND EXISTS(SELECT 1 FROM work_collaborations c WHERE c.work_id=${t.id} AND c.organization_id=${t.organizationId} AND c.event_id=${t.eventId} AND c.person_id=nullif(current_setting('sep.person_id',true),'')::uuid AND c.status='accepted')`}),
  pgPolicy('submitted_staff_read', { for: 'select', to: runtime, using: sql`${organizationScope(sql`${t.organizationId}`)} AND ${t.eventId} = nullif(current_setting('sep.event_id', true), '')::uuid AND current_setting('sep.submissions_staff',true) = 'true' AND ${t.submittedAt} IS NOT NULL` }),
  pgPolicy('submitted_staff_update', { for: 'update', to: runtime, using: sql`${organizationScope(sql`${t.organizationId}`)} AND ${t.eventId} = nullif(current_setting('sep.event_id', true), '')::uuid AND current_setting('sep.submissions_staff',true) = 'true' AND ${t.submittedAt} IS NOT NULL`, withCheck: sql`${organizationScope(sql`${t.organizationId}`)} AND ${t.eventId} = nullif(current_setting('sep.event_id', true), '')::uuid AND ${t.submittedAt} IS NOT NULL` }),
]);

const workVisible = (org: SQL, event: SQL, work: SQL) => sql`${organizationScope(org)} AND ${event} = nullif(current_setting('sep.event_id',true),'')::uuid AND EXISTS (SELECT 1 FROM author_works w WHERE w.id=${work} AND w.organization_id=${org} AND w.event_id=${event})`;
const authorWorkVisible = (org:SQL,event:SQL,work:SQL)=>sql`current_setting('sep.submissions_staff',true) IS DISTINCT FROM 'true' AND ${workVisible(org,event,work)}`;
export const workCollaborations = pgTable('work_collaborations',{
  responsibilityAcceptedAt:timestamp('responsibility_accepted_at',{withTimezone:true}),
  id:uuid('id').primaryKey(),organizationId:uuid('organization_id').notNull(),eventId:uuid('event_id').notNull(),workId:uuid('work_id').notNull(),ownerId:uuid('owner_id').notNull(),
  authorId:uuid('author_id').notNull(),email:text('email').notNull(),personId:uuid('person_id').references(()=>people.id),tokenHash:text('token_hash').notNull().unique(),
  status:text('status').$type<'pending'|'accepted'|'revoked'>().notNull().default('pending'),createdAt:timestamp('created_at',{withTimezone:true}).notNull().defaultNow(),expiresAt:timestamp('expires_at',{withTimezone:true}).notNull(),acceptedAt:timestamp('accepted_at',{withTimezone:true}),
},t=>[
  authorshipPolicy(sql`${t.organizationId}`,sql`${t.eventId}`),
  foreignKey({columns:[t.organizationId,t.eventId,t.workId,t.ownerId],foreignColumns:[authorWorks.organizationId,authorWorks.eventId,authorWorks.id,authorWorks.ownerId]}),
  uniqueIndex('work_corresponding_collaboration_unique').on(t.workId,t.authorId).where(sql`${t.status} IN ('pending','accepted')`),
  check('work_collaboration_status',sql`${t.status} IN ('pending','accepted','revoked')`),check('work_collaboration_dates',sql`${t.expiresAt}>${t.createdAt}`),
  check('work_collaboration_acceptance',sql`${t.status}<>'accepted' OR (${t.personId} IS NOT NULL AND ${t.acceptedAt} IS NOT NULL)`),
  pgPolicy('collaboration_read',{for:'select',to:runtime,using:sql`${organizationScope(sql`${t.organizationId}`)} AND ${t.eventId}=nullif(current_setting('sep.event_id',true),'')::uuid AND (${actorScope(sql`${t.ownerId}`)} OR ${actorScope(sql`${t.personId}`)} OR ${t.tokenHash}=current_setting('sep.work_invitation_hash',true))`}),
  pgPolicy('collaboration_insert',{for:'insert',to:runtime,withCheck:sql`${organizationScope(sql`${t.organizationId}`)} AND ${t.eventId}=nullif(current_setting('sep.event_id',true),'')::uuid AND ${actorScope(sql`${t.ownerId}`)}`}),
  pgPolicy('collaboration_update',{for:'update',to:runtime,using:sql`${organizationScope(sql`${t.organizationId}`)} AND ${t.eventId}=nullif(current_setting('sep.event_id',true),'')::uuid AND (${actorScope(sql`${t.ownerId}`)} OR ${t.tokenHash}=current_setting('sep.work_invitation_hash',true))`,withCheck:sql`${organizationScope(sql`${t.organizationId}`)} AND ${t.eventId}=nullif(current_setting('sep.event_id',true),'')::uuid AND (${actorScope(sql`${t.ownerId}`)} OR (${t.tokenHash}=current_setting('sep.work_invitation_hash',true) AND ${actorScope(sql`${t.personId}`)}))`}),
]);
export const workFiles = pgTable('work_files', {
  id: uuid('id').primaryKey(), organizationId: uuid('organization_id').notNull(), eventId: uuid('event_id').notNull(), workId: uuid('work_id').notNull(),
  ownerId: uuid('owner_id').notNull().references(() => people.id), metadata: jsonb('metadata').$type<Manuscript>().notNull(), data: binary('data').notNull(),
}, (t) => [unique().on(t.organizationId,t.eventId,t.workId,t.id), foreignKey({ columns: [t.organizationId,t.eventId,t.workId], foreignColumns: [authorWorks.organizationId,authorWorks.eventId,authorWorks.id] }),
  pgPolicy('file_read', { for: 'select', to: runtime, using: sql`${workVisible(sql`${t.organizationId}`,sql`${t.eventId}`,sql`${t.workId}`)} AND (current_setting('sep.submissions_staff',true) IS DISTINCT FROM 'true' OR EXISTS (SELECT 1 FROM work_versions v WHERE v.file_id=${t.id} AND v.work_id=${t.workId}))` }),
  pgPolicy('file_insert', { for: 'insert', to: runtime, withCheck: sql`${workVisible(sql`${t.organizationId}`,sql`${t.eventId}`,sql`${t.workId}`)} AND ${actorScope(sql`${t.ownerId}`)}` }),
  pgPolicy('file_delete', { for: 'delete', to: runtime, using: sql`${authorWorkVisible(sql`${t.organizationId}`,sql`${t.eventId}`,sql`${t.workId}`)} AND NOT EXISTS (SELECT 1 FROM work_versions v WHERE v.file_id=${t.id})` }),
]);
export const workVersions = pgTable('work_versions', {
  id: uuid('id').primaryKey(), organizationId: uuid('organization_id').notNull(), eventId: uuid('event_id').notNull(), workId: uuid('work_id').notNull(),
  ownerId: uuid('owner_id').notNull().references(() => people.id), number: integer('number').notNull(), kind: text('kind').$type<'submission'|'final'>().notNull(),
  content: jsonb('content').$type<WorkContent>().notNull(), fileId: uuid('file_id'), createdAt: timestamp('created_at',{withTimezone:true}).notNull().defaultNow(),
}, (t) => [foreignKey({columns:[t.organizationId,t.eventId,t.workId,t.fileId],foreignColumns:[workFiles.organizationId,workFiles.eventId,workFiles.workId,workFiles.id]}), unique().on(t.workId,t.number), foreignKey({ columns: [t.organizationId,t.eventId,t.workId],foreignColumns:[authorWorks.organizationId,authorWorks.eventId,authorWorks.id] }),
  check('version_number_positive',sql`${t.number} > 0 AND ${t.number} <= 10`), check('version_kind_values',sql`${t.kind} IN ('submission','final')`),
  pgPolicy('version_read',{for:'select',to:runtime,using:workVisible(sql`${t.organizationId}`,sql`${t.eventId}`,sql`${t.workId}`)}),
  pgPolicy('version_insert',{for:'insert',to:runtime,withCheck:sql`${workVisible(sql`${t.organizationId}`,sql`${t.eventId}`,sql`${t.workId}`)} AND ${actorScope(sql`${t.ownerId}`)}`}),
]);
export const workHistory = pgTable('work_history', {
  actorName:text('actor_name').notNull().default(''),
  id: uuid('id').primaryKey(), organizationId: uuid('organization_id').notNull(), eventId: uuid('event_id').notNull(),workId:uuid('work_id').notNull(),
  actorId:uuid('actor_id').notNull().references(()=>people.id), actor:text('actor').$type<'author'|'staff'>().notNull(),action:text('action').notNull(),message:text('message').notNull().default(''),
  createdAt:timestamp('created_at',{withTimezone:true}).notNull().defaultNow(),
},(t)=>[foreignKey({columns:[t.organizationId,t.eventId,t.workId],foreignColumns:[authorWorks.organizationId,authorWorks.eventId,authorWorks.id]}),
  pgPolicy('authorship_rpc',{for:'insert',to:registryOwner,withCheck:sql`${authorshipScope(sql`${t.organizationId}`,sql`${t.eventId}`)} AND ${actorScope(sql`${t.actorId}`)}`}),
  pgPolicy('history_read',{for:'select',to:runtime,using:sql`${workVisible(sql`${t.organizationId}`,sql`${t.eventId}`,sql`${t.workId}`)} AND (current_setting('sep.submissions_staff',true) IS DISTINCT FROM 'true' OR ${t.actor}='staff' OR ${t.action} IN ('submitted','final_submitted','withdrawn'))`}),
  pgPolicy('history_insert',{for:'insert',to:runtime,withCheck:sql`${workVisible(sql`${t.organizationId}`,sql`${t.eventId}`,sql`${t.workId}`)} AND ${actorScope(sql`${t.actorId}`)}`}),
]);

export const scientificCallDrafts = pgTable('scientific_call_drafts', {
  organizationId: uuid('organization_id').notNull(), eventId: uuid('event_id').notNull(),
  content: jsonb('content').$type<ScientificCallContent>().notNull(), revision: integer('revision').notNull(),
}, (t) => [primaryKey({ columns: [t.organizationId, t.eventId] }),
  foreignKey({ columns: [t.organizationId, t.eventId], foreignColumns: [events.organizationId, events.id] }),
  check('scientific_call_draft_revision', sql`${t.revision} > 0`), policy(eventScope(sql`${t.organizationId}`, sql`${t.eventId}`))]);
export const scientificCallPublications = pgTable('scientific_call_publications', {
  organizationId: uuid('organization_id').notNull(), eventId: uuid('event_id').notNull(),
  snapshot: jsonb('snapshot').$type<PublishedScientificCall>().notNull(), revision: integer('revision').notNull(),
  publishedAt: timestamp('published_at', { withTimezone: true }).notNull().defaultNow(),
}, (t) => [primaryKey({ columns: [t.organizationId, t.eventId] }),
  foreignKey({ columns: [t.organizationId, t.eventId], foreignColumns: [events.organizationId, events.id] }),
  check('scientific_call_publication_revision', sql`${t.revision} > 0`), policy(eventScope(sql`${t.organizationId}`, sql`${t.eventId}`))]);

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
