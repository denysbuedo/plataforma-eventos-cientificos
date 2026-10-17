CREATE TABLE "program_drafts" (
	"organization_id" uuid NOT NULL,
	"event_id" uuid NOT NULL,
	"sessions" jsonb NOT NULL,
	"timezone" text NOT NULL,
	"revision" integer NOT NULL,
	CONSTRAINT "program_drafts_organization_id_event_id_pk" PRIMARY KEY("organization_id","event_id"),
	CONSTRAINT "program_draft_revision" CHECK ("program_drafts"."revision">0),
	CONSTRAINT "program_session_limit" CHECK (jsonb_typeof("program_drafts"."sessions")='array' AND jsonb_array_length("program_drafts"."sessions")<=100)
);
--> statement-breakpoint
ALTER TABLE "program_drafts" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "program_publications" (
	"organization_id" uuid NOT NULL,
	"event_id" uuid NOT NULL,
	"snapshot" jsonb NOT NULL,
	"revision" integer NOT NULL,
	"published_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "program_publications_organization_id_event_id_pk" PRIMARY KEY("organization_id","event_id"),
	CONSTRAINT "program_publication_revision" CHECK ("program_publications"."revision">0)
);
--> statement-breakpoint
ALTER TABLE "program_publications" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "program_drafts" ADD CONSTRAINT "program_drafts_organization_id_event_id_events_organization_id_id_fk" FOREIGN KEY ("organization_id","event_id") REFERENCES "public"."events"("organization_id","id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "program_publications" ADD CONSTRAINT "program_publications_organization_id_event_id_events_organization_id_id_fk" FOREIGN KEY ("organization_id","event_id") REFERENCES "public"."events"("organization_id","id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE POLICY "context_scope" ON "program_drafts" AS PERMISSIVE FOR ALL TO "sep_runtime" USING ("program_drafts"."organization_id" = nullif(current_setting('sep.organization_id', true), '')::uuid AND "program_drafts"."event_id"=nullif(current_setting('sep.event_id',true),'')::uuid AND current_setting('sep.submissions_staff',true)='true') WITH CHECK ("program_drafts"."organization_id" = nullif(current_setting('sep.organization_id', true), '')::uuid AND "program_drafts"."event_id"=nullif(current_setting('sep.event_id',true),'')::uuid AND current_setting('sep.submissions_staff',true)='true');--> statement-breakpoint
CREATE POLICY "program_read" ON "program_publications" AS PERMISSIVE FOR SELECT TO "sep_runtime" USING ("program_publications"."organization_id" = nullif(current_setting('sep.organization_id', true), '')::uuid AND "program_publications"."event_id"=nullif(current_setting('sep.event_id',true),'')::uuid);--> statement-breakpoint
CREATE POLICY "program_insert" ON "program_publications" AS PERMISSIVE FOR INSERT TO "sep_runtime" WITH CHECK ("program_publications"."organization_id" = nullif(current_setting('sep.organization_id', true), '')::uuid AND "program_publications"."event_id"=nullif(current_setting('sep.event_id',true),'')::uuid AND current_setting('sep.submissions_staff',true)='true');--> statement-breakpoint
CREATE POLICY "program_update" ON "program_publications" AS PERMISSIVE FOR UPDATE TO "sep_runtime" USING ("program_publications"."organization_id" = nullif(current_setting('sep.organization_id', true), '')::uuid AND "program_publications"."event_id"=nullif(current_setting('sep.event_id',true),'')::uuid AND current_setting('sep.submissions_staff',true)='true') WITH CHECK ("program_publications"."organization_id" = nullif(current_setting('sep.organization_id', true), '')::uuid AND "program_publications"."event_id"=nullif(current_setting('sep.event_id',true),'')::uuid AND current_setting('sep.submissions_staff',true)='true');--> statement-breakpoint
CREATE POLICY "program_delete" ON "program_publications" AS PERMISSIVE FOR DELETE TO "sep_runtime" USING ("program_publications"."organization_id" = nullif(current_setting('sep.organization_id', true), '')::uuid AND "program_publications"."event_id"=nullif(current_setting('sep.event_id',true),'')::uuid AND current_setting('sep.submissions_staff',true)='true');
--> statement-breakpoint
ALTER TABLE program_drafts FORCE ROW LEVEL SECURITY;
ALTER TABLE program_publications FORCE ROW LEVEL SECURITY;
GRANT SELECT,INSERT,UPDATE,DELETE ON program_drafts,program_publications TO sep_runtime;
