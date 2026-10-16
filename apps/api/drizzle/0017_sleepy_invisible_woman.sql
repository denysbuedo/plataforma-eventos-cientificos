CREATE TABLE "scientific_call_drafts" (
	"organization_id" uuid NOT NULL,
	"event_id" uuid NOT NULL,
	"content" jsonb NOT NULL,
	"revision" integer NOT NULL,
	CONSTRAINT "scientific_call_drafts_organization_id_event_id_pk" PRIMARY KEY("organization_id","event_id"),
	CONSTRAINT "scientific_call_draft_revision" CHECK ("scientific_call_drafts"."revision" > 0)
);
--> statement-breakpoint
ALTER TABLE "scientific_call_drafts" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "scientific_call_publications" (
	"organization_id" uuid NOT NULL,
	"event_id" uuid NOT NULL,
	"snapshot" jsonb NOT NULL,
	"revision" integer NOT NULL,
	"published_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "scientific_call_publications_organization_id_event_id_pk" PRIMARY KEY("organization_id","event_id"),
	CONSTRAINT "scientific_call_publication_revision" CHECK ("scientific_call_publications"."revision" > 0)
);
--> statement-breakpoint
ALTER TABLE "scientific_call_publications" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "scientific_call_drafts" ADD CONSTRAINT "scientific_call_drafts_organization_id_event_id_events_organization_id_id_fk" FOREIGN KEY ("organization_id","event_id") REFERENCES "public"."events"("organization_id","id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "scientific_call_publications" ADD CONSTRAINT "scientific_call_publications_organization_id_event_id_events_organization_id_id_fk" FOREIGN KEY ("organization_id","event_id") REFERENCES "public"."events"("organization_id","id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE POLICY "context_scope" ON "scientific_call_drafts" AS PERMISSIVE FOR ALL TO "sep_runtime" USING ("scientific_call_drafts"."organization_id" = nullif(current_setting('sep.organization_id', true), '')::uuid AND
  ("scientific_call_drafts"."event_id" = nullif(current_setting('sep.event_id', true), '')::uuid OR current_setting('sep.organization_admin', true) = 'true')) WITH CHECK ("scientific_call_drafts"."organization_id" = nullif(current_setting('sep.organization_id', true), '')::uuid AND
  ("scientific_call_drafts"."event_id" = nullif(current_setting('sep.event_id', true), '')::uuid OR current_setting('sep.organization_admin', true) = 'true'));--> statement-breakpoint
CREATE POLICY "context_scope" ON "scientific_call_publications" AS PERMISSIVE FOR ALL TO "sep_runtime" USING ("scientific_call_publications"."organization_id" = nullif(current_setting('sep.organization_id', true), '')::uuid AND
  ("scientific_call_publications"."event_id" = nullif(current_setting('sep.event_id', true), '')::uuid OR current_setting('sep.organization_admin', true) = 'true')) WITH CHECK ("scientific_call_publications"."organization_id" = nullif(current_setting('sep.organization_id', true), '')::uuid AND
  ("scientific_call_publications"."event_id" = nullif(current_setting('sep.event_id', true), '')::uuid OR current_setting('sep.organization_admin', true) = 'true'));