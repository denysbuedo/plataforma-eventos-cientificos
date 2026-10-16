CREATE TABLE "author_works" (
	"id" uuid PRIMARY KEY NOT NULL,
	"organization_id" uuid NOT NULL,
	"event_id" uuid NOT NULL,
	"owner_id" uuid NOT NULL,
	"title" text NOT NULL,
	"abstract" text DEFAULT '' NOT NULL,
	"keywords" text[] DEFAULT ARRAY[]::text[] NOT NULL,
	"language" text NOT NULL,
	"track_id" uuid NOT NULL,
	"contribution_type_id" uuid NOT NULL,
	"call_snapshot" jsonb NOT NULL,
	"revision" integer DEFAULT 1 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "author_work_revision" CHECK ("author_works"."revision" > 0),
	CONSTRAINT "author_work_language" CHECK ("author_works"."language" IN ('es','en'))
);
--> statement-breakpoint
ALTER TABLE "author_works" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "author_works" ADD CONSTRAINT "author_works_owner_id_people_id_fk" FOREIGN KEY ("owner_id") REFERENCES "public"."people"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "author_works" ADD CONSTRAINT "author_works_organization_id_event_id_events_organization_id_id_fk" FOREIGN KEY ("organization_id","event_id") REFERENCES "public"."events"("organization_id","id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "author_works_owner_event_idx" ON "author_works" USING btree ("organization_id","event_id","owner_id");--> statement-breakpoint
CREATE POLICY "context_scope" ON "author_works" AS PERMISSIVE FOR ALL TO "sep_runtime" USING ("author_works"."organization_id" = nullif(current_setting('sep.organization_id', true), '')::uuid AND "author_works"."event_id" = nullif(current_setting('sep.event_id', true), '')::uuid AND "author_works"."owner_id" = nullif(current_setting('sep.person_id', true), '')::uuid) WITH CHECK ("author_works"."organization_id" = nullif(current_setting('sep.organization_id', true), '')::uuid AND "author_works"."event_id" = nullif(current_setting('sep.event_id', true), '')::uuid AND "author_works"."owner_id" = nullif(current_setting('sep.person_id', true), '')::uuid);