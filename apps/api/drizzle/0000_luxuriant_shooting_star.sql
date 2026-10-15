CREATE TABLE "affiliations" (
	"id" uuid PRIMARY KEY NOT NULL,
	"person_id" uuid NOT NULL,
	"institution" text NOT NULL
);
--> statement-breakpoint
ALTER TABLE "affiliations" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "audit_entries" (
	"id" uuid PRIMARY KEY NOT NULL,
	"organization_id" uuid NOT NULL,
	"event_id" uuid,
	"person_id" uuid NOT NULL,
	"action" text NOT NULL,
	"resource_id" uuid NOT NULL,
	"request_id" uuid NOT NULL,
	"occurred_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "audit_entries" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "domains" (
	"id" uuid PRIMARY KEY NOT NULL,
	"organization_id" uuid NOT NULL,
	"event_id" uuid,
	"hostname" text NOT NULL,
	"active" boolean DEFAULT false NOT NULL,
	"verified" boolean DEFAULT false NOT NULL,
	CONSTRAINT "domains_hostname_unique" UNIQUE("hostname")
);
--> statement-breakpoint
CREATE TABLE "event_editions" (
	"id" uuid PRIMARY KEY NOT NULL,
	"organization_id" uuid NOT NULL,
	"series_id" uuid NOT NULL,
	"label" text NOT NULL,
	CONSTRAINT "event_editions_organization_id_id_unique" UNIQUE("organization_id","id"),
	CONSTRAINT "event_editions_series_id_label_unique" UNIQUE("series_id","label")
);
--> statement-breakpoint
ALTER TABLE "event_editions" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "events" (
	"id" uuid PRIMARY KEY NOT NULL,
	"organization_id" uuid NOT NULL,
	"edition_id" uuid,
	"name_es" text NOT NULL,
	"name_en" text NOT NULL,
	"timezone" text NOT NULL,
	"status" text DEFAULT 'draft' NOT NULL,
	CONSTRAINT "events_organization_id_id_unique" UNIQUE("organization_id","id"),
	CONSTRAINT "events_status_check" CHECK ("events"."status" IN ('draft', 'published', 'archived'))
);
--> statement-breakpoint
ALTER TABLE "events" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "identities" (
	"id" uuid PRIMARY KEY NOT NULL,
	"person_id" uuid NOT NULL,
	"issuer" text NOT NULL,
	"subject" text NOT NULL,
	"active" boolean DEFAULT true NOT NULL,
	CONSTRAINT "identities_issuer_subject_unique" UNIQUE("issuer","subject")
);
--> statement-breakpoint
ALTER TABLE "identities" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "memberships" (
	"id" uuid PRIMARY KEY NOT NULL,
	"person_id" uuid NOT NULL,
	"organization_id" uuid NOT NULL,
	"event_id" uuid,
	"active" boolean DEFAULT true NOT NULL
);
--> statement-breakpoint
ALTER TABLE "memberships" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "organizations" (
	"id" uuid PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"active" boolean DEFAULT true NOT NULL
);
--> statement-breakpoint
CREATE TABLE "people" (
	"id" uuid PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"active" boolean DEFAULT true NOT NULL
);
--> statement-breakpoint
ALTER TABLE "people" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "role_assignments" (
	"id" uuid PRIMARY KEY NOT NULL,
	"membership_id" uuid NOT NULL,
	"role" text NOT NULL,
	"active" boolean DEFAULT true NOT NULL,
	"valid_from" timestamp with time zone DEFAULT now() NOT NULL,
	"valid_until" timestamp with time zone,
	CONSTRAINT "role_assignments_membership_id_role_unique" UNIQUE("membership_id","role"),
	CONSTRAINT "role_code_check" CHECK ("role_assignments"."role" IN ('organization_admin', 'organizer', 'participant')),
	CONSTRAINT "role_period_check" CHECK ("role_assignments"."valid_until" IS NULL OR "role_assignments"."valid_until" > "role_assignments"."valid_from")
);
--> statement-breakpoint
ALTER TABLE "role_assignments" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "event_series" (
	"id" uuid PRIMARY KEY NOT NULL,
	"organization_id" uuid NOT NULL,
	"name" text NOT NULL,
	CONSTRAINT "event_series_organization_id_id_unique" UNIQUE("organization_id","id")
);
--> statement-breakpoint
ALTER TABLE "event_series" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "affiliations" ADD CONSTRAINT "affiliations_person_id_people_id_fk" FOREIGN KEY ("person_id") REFERENCES "public"."people"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "audit_entries" ADD CONSTRAINT "audit_entries_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "audit_entries" ADD CONSTRAINT "audit_entries_person_id_people_id_fk" FOREIGN KEY ("person_id") REFERENCES "public"."people"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "audit_entries" ADD CONSTRAINT "audit_entries_organization_id_event_id_events_organization_id_id_fk" FOREIGN KEY ("organization_id","event_id") REFERENCES "public"."events"("organization_id","id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "domains" ADD CONSTRAINT "domains_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "domains" ADD CONSTRAINT "domains_organization_id_event_id_events_organization_id_id_fk" FOREIGN KEY ("organization_id","event_id") REFERENCES "public"."events"("organization_id","id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "event_editions" ADD CONSTRAINT "event_editions_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "event_editions" ADD CONSTRAINT "event_editions_organization_id_series_id_event_series_organization_id_id_fk" FOREIGN KEY ("organization_id","series_id") REFERENCES "public"."event_series"("organization_id","id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "events" ADD CONSTRAINT "events_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "events" ADD CONSTRAINT "events_organization_id_edition_id_event_editions_organization_id_id_fk" FOREIGN KEY ("organization_id","edition_id") REFERENCES "public"."event_editions"("organization_id","id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "identities" ADD CONSTRAINT "identities_person_id_people_id_fk" FOREIGN KEY ("person_id") REFERENCES "public"."people"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "memberships" ADD CONSTRAINT "memberships_person_id_people_id_fk" FOREIGN KEY ("person_id") REFERENCES "public"."people"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "memberships" ADD CONSTRAINT "memberships_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "memberships" ADD CONSTRAINT "memberships_organization_id_event_id_events_organization_id_id_fk" FOREIGN KEY ("organization_id","event_id") REFERENCES "public"."events"("organization_id","id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "role_assignments" ADD CONSTRAINT "role_assignments_membership_id_memberships_id_fk" FOREIGN KEY ("membership_id") REFERENCES "public"."memberships"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "event_series" ADD CONSTRAINT "event_series_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "events_organization_idx" ON "events" USING btree ("organization_id");--> statement-breakpoint
CREATE UNIQUE INDEX "membership_organization_unique" ON "memberships" USING btree ("person_id","organization_id") WHERE "memberships"."event_id" IS NULL;--> statement-breakpoint
CREATE UNIQUE INDEX "membership_event_unique" ON "memberships" USING btree ("person_id","organization_id","event_id") WHERE "memberships"."event_id" IS NOT NULL;--> statement-breakpoint
CREATE INDEX "membership_person_organization_idx" ON "memberships" USING btree ("person_id","organization_id");--> statement-breakpoint
CREATE POLICY "context_scope" ON "affiliations" AS PERMISSIVE FOR ALL TO "sep_runtime" USING ("affiliations"."person_id" = nullif(current_setting('sep.person_id', true), '')::uuid) WITH CHECK ("affiliations"."person_id" = nullif(current_setting('sep.person_id', true), '')::uuid);--> statement-breakpoint
CREATE POLICY "context_scope" ON "audit_entries" AS PERMISSIVE FOR ALL TO "sep_runtime" USING ("audit_entries"."organization_id" = nullif(current_setting('sep.organization_id', true), '')::uuid AND
  ("audit_entries"."event_id" = nullif(current_setting('sep.event_id', true), '')::uuid OR current_setting('sep.organization_admin', true) = 'true') AND "audit_entries"."person_id" = nullif(current_setting('sep.person_id', true), '')::uuid) WITH CHECK ("audit_entries"."organization_id" = nullif(current_setting('sep.organization_id', true), '')::uuid AND
  ("audit_entries"."event_id" = nullif(current_setting('sep.event_id', true), '')::uuid OR current_setting('sep.organization_admin', true) = 'true') AND "audit_entries"."person_id" = nullif(current_setting('sep.person_id', true), '')::uuid);--> statement-breakpoint
CREATE POLICY "context_scope" ON "event_editions" AS PERMISSIVE FOR ALL TO "sep_runtime" USING ("event_editions"."organization_id" = nullif(current_setting('sep.organization_id', true), '')::uuid) WITH CHECK ("event_editions"."organization_id" = nullif(current_setting('sep.organization_id', true), '')::uuid);--> statement-breakpoint
CREATE POLICY "context_scope" ON "events" AS PERMISSIVE FOR ALL TO "sep_runtime" USING ("events"."organization_id" = nullif(current_setting('sep.organization_id', true), '')::uuid AND
  ("events"."id" = nullif(current_setting('sep.event_id', true), '')::uuid OR current_setting('sep.organization_admin', true) = 'true')) WITH CHECK ("events"."organization_id" = nullif(current_setting('sep.organization_id', true), '')::uuid AND
  ("events"."id" = nullif(current_setting('sep.event_id', true), '')::uuid OR current_setting('sep.organization_admin', true) = 'true'));--> statement-breakpoint
CREATE POLICY "context_scope" ON "identities" AS PERMISSIVE FOR ALL TO "sep_runtime" USING ("identities"."person_id" = nullif(current_setting('sep.person_id', true), '')::uuid) WITH CHECK ("identities"."person_id" = nullif(current_setting('sep.person_id', true), '')::uuid);--> statement-breakpoint
CREATE POLICY "context_scope" ON "memberships" AS PERMISSIVE FOR ALL TO "sep_runtime" USING ("memberships"."organization_id" = nullif(current_setting('sep.organization_id', true), '')::uuid AND "memberships"."person_id" = nullif(current_setting('sep.person_id', true), '')::uuid) WITH CHECK ("memberships"."organization_id" = nullif(current_setting('sep.organization_id', true), '')::uuid AND "memberships"."person_id" = nullif(current_setting('sep.person_id', true), '')::uuid);--> statement-breakpoint
CREATE POLICY "context_scope" ON "people" AS PERMISSIVE FOR ALL TO "sep_runtime" USING ("people"."id" = nullif(current_setting('sep.person_id', true), '')::uuid) WITH CHECK ("people"."id" = nullif(current_setting('sep.person_id', true), '')::uuid);--> statement-breakpoint
CREATE POLICY "context_scope" ON "role_assignments" AS PERMISSIVE FOR ALL TO "sep_runtime" USING (EXISTS (SELECT 1 FROM memberships m WHERE m.id = "role_assignments"."membership_id")) WITH CHECK (EXISTS (SELECT 1 FROM memberships m WHERE m.id = "role_assignments"."membership_id"));--> statement-breakpoint
CREATE POLICY "context_scope" ON "event_series" AS PERMISSIVE FOR ALL TO "sep_runtime" USING ("event_series"."organization_id" = nullif(current_setting('sep.organization_id', true), '')::uuid) WITH CHECK ("event_series"."organization_id" = nullif(current_setting('sep.organization_id', true), '')::uuid);