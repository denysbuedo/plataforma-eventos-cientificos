CREATE TABLE "site_drafts" (
	"organization_id" uuid NOT NULL,
	"event_id" uuid NOT NULL,
	"content" jsonb NOT NULL,
	"revision" integer DEFAULT 1 NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "site_drafts_organization_id_event_id_pk" PRIMARY KEY("organization_id","event_id"),
	CONSTRAINT "site_draft_revision_positive" CHECK ("site_drafts"."revision" > 0)
);
--> statement-breakpoint
ALTER TABLE "site_drafts" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "site_publications" (
	"organization_id" uuid NOT NULL,
	"event_id" uuid NOT NULL,
	"snapshot" jsonb NOT NULL,
	"revision" integer NOT NULL,
	"published_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "site_publications_organization_id_event_id_pk" PRIMARY KEY("organization_id","event_id"),
	CONSTRAINT "site_publication_revision_positive" CHECK ("site_publications"."revision" > 0)
);
--> statement-breakpoint
ALTER TABLE "site_publications" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "site_drafts" ADD CONSTRAINT "site_drafts_organization_id_event_id_events_organization_id_id_fk" FOREIGN KEY ("organization_id","event_id") REFERENCES "public"."events"("organization_id","id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "site_publications" ADD CONSTRAINT "site_publications_organization_id_event_id_events_organization_id_id_fk" FOREIGN KEY ("organization_id","event_id") REFERENCES "public"."events"("organization_id","id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE POLICY "context_scope" ON "site_drafts" AS PERMISSIVE FOR ALL TO "sep_runtime" USING ("site_drafts"."organization_id" = nullif(current_setting('sep.organization_id', true), '')::uuid AND
  ("site_drafts"."event_id" = nullif(current_setting('sep.event_id', true), '')::uuid OR current_setting('sep.organization_admin', true) = 'true')) WITH CHECK ("site_drafts"."organization_id" = nullif(current_setting('sep.organization_id', true), '')::uuid AND
  ("site_drafts"."event_id" = nullif(current_setting('sep.event_id', true), '')::uuid OR current_setting('sep.organization_admin', true) = 'true'));--> statement-breakpoint
CREATE POLICY "context_scope" ON "site_publications" AS PERMISSIVE FOR ALL TO "sep_runtime" USING ("site_publications"."organization_id" = nullif(current_setting('sep.organization_id', true), '')::uuid AND
  ("site_publications"."event_id" = nullif(current_setting('sep.event_id', true), '')::uuid OR current_setting('sep.organization_admin', true) = 'true')) WITH CHECK ("site_publications"."organization_id" = nullif(current_setting('sep.organization_id', true), '')::uuid AND
  ("site_publications"."event_id" = nullif(current_setting('sep.event_id', true), '')::uuid OR current_setting('sep.organization_admin', true) = 'true'));