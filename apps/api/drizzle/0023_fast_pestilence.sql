ALTER TABLE "author_works" ADD CONSTRAINT "author_works_organization_id_event_id_id_unique" UNIQUE("organization_id","event_id","id");
--> statement-breakpoint
CREATE TABLE "work_files" (
	"id" uuid PRIMARY KEY NOT NULL,
	"organization_id" uuid NOT NULL,
	"event_id" uuid NOT NULL,
	"work_id" uuid NOT NULL,
	"owner_id" uuid NOT NULL,
	"metadata" jsonb NOT NULL,
	"data" "bytea" NOT NULL
);
--> statement-breakpoint
ALTER TABLE "work_files" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "work_history" (
	"id" uuid PRIMARY KEY NOT NULL,
	"organization_id" uuid NOT NULL,
	"event_id" uuid NOT NULL,
	"work_id" uuid NOT NULL,
	"actor_id" uuid NOT NULL,
	"actor" text NOT NULL,
	"action" text NOT NULL,
	"message" text DEFAULT '' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "work_history" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "work_versions" (
	"id" uuid PRIMARY KEY NOT NULL,
	"organization_id" uuid NOT NULL,
	"event_id" uuid NOT NULL,
	"work_id" uuid NOT NULL,
	"owner_id" uuid NOT NULL,
	"number" integer NOT NULL,
	"kind" text NOT NULL,
	"content" jsonb NOT NULL,
	"file_id" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "work_versions_work_id_number_unique" UNIQUE("work_id","number"),
	CONSTRAINT "version_number_positive" CHECK ("work_versions"."number" > 0 AND "work_versions"."number" <= 10),
	CONSTRAINT "version_kind_values" CHECK ("work_versions"."kind" IN ('submission','final'))
);
--> statement-breakpoint
ALTER TABLE "work_versions" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "author_works" ADD COLUMN "status" text DEFAULT 'draft' NOT NULL;--> statement-breakpoint
ALTER TABLE "author_works" ADD COLUMN "submitted_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "author_works" ADD COLUMN "response_deadline" date;--> statement-breakpoint
ALTER TABLE "author_works" ADD COLUMN "manuscript" jsonb;--> statement-breakpoint
ALTER TABLE "author_works" ADD COLUMN "submitted_content" jsonb;--> statement-breakpoint
ALTER TABLE "work_files" ADD CONSTRAINT "work_files_owner_id_people_id_fk" FOREIGN KEY ("owner_id") REFERENCES "public"."people"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "work_files" ADD CONSTRAINT "work_files_organization_id_event_id_work_id_author_works_organization_id_event_id_id_fk" FOREIGN KEY ("organization_id","event_id","work_id") REFERENCES "public"."author_works"("organization_id","event_id","id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "work_history" ADD CONSTRAINT "work_history_actor_id_people_id_fk" FOREIGN KEY ("actor_id") REFERENCES "public"."people"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "work_history" ADD CONSTRAINT "work_history_organization_id_event_id_work_id_author_works_organization_id_event_id_id_fk" FOREIGN KEY ("organization_id","event_id","work_id") REFERENCES "public"."author_works"("organization_id","event_id","id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "work_versions" ADD CONSTRAINT "work_versions_owner_id_people_id_fk" FOREIGN KEY ("owner_id") REFERENCES "public"."people"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "work_versions" ADD CONSTRAINT "work_versions_file_id_work_files_id_fk" FOREIGN KEY ("file_id") REFERENCES "public"."work_files"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "work_versions" ADD CONSTRAINT "work_versions_organization_id_event_id_work_id_author_works_organization_id_event_id_id_fk" FOREIGN KEY ("organization_id","event_id","work_id") REFERENCES "public"."author_works"("organization_id","event_id","id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE POLICY "submitted_staff_read" ON "author_works" AS PERMISSIVE FOR SELECT TO "sep_runtime" USING ("author_works"."organization_id" = nullif(current_setting('sep.organization_id', true), '')::uuid AND "author_works"."event_id" = nullif(current_setting('sep.event_id', true), '')::uuid AND current_setting('sep.submissions_staff',true) = 'true' AND "author_works"."submitted_at" IS NOT NULL);--> statement-breakpoint
CREATE POLICY "submitted_staff_update" ON "author_works" AS PERMISSIVE FOR UPDATE TO "sep_runtime" USING ("author_works"."organization_id" = nullif(current_setting('sep.organization_id', true), '')::uuid AND "author_works"."event_id" = nullif(current_setting('sep.event_id', true), '')::uuid AND current_setting('sep.submissions_staff',true) = 'true' AND "author_works"."submitted_at" IS NOT NULL) WITH CHECK ("author_works"."organization_id" = nullif(current_setting('sep.organization_id', true), '')::uuid AND "author_works"."event_id" = nullif(current_setting('sep.event_id', true), '')::uuid AND "author_works"."submitted_at" IS NOT NULL);--> statement-breakpoint
CREATE POLICY "file_read" ON "work_files" AS PERMISSIVE FOR SELECT TO "sep_runtime" USING ("work_files"."organization_id" = nullif(current_setting('sep.organization_id', true), '')::uuid AND "work_files"."event_id" = nullif(current_setting('sep.event_id',true),'')::uuid AND EXISTS (SELECT 1 FROM author_works w WHERE w.id="work_files"."work_id" AND w.organization_id="work_files"."organization_id" AND w.event_id="work_files"."event_id") AND ("work_files"."owner_id" = nullif(current_setting('sep.person_id', true), '')::uuid OR (current_setting('sep.submissions_staff',true)='true' AND EXISTS (SELECT 1 FROM work_versions v WHERE v.file_id="work_files"."id" AND v.work_id="work_files"."work_id"))));--> statement-breakpoint
CREATE POLICY "file_insert" ON "work_files" AS PERMISSIVE FOR INSERT TO "sep_runtime" WITH CHECK ("work_files"."organization_id" = nullif(current_setting('sep.organization_id', true), '')::uuid AND "work_files"."event_id" = nullif(current_setting('sep.event_id',true),'')::uuid AND EXISTS (SELECT 1 FROM author_works w WHERE w.id="work_files"."work_id" AND w.organization_id="work_files"."organization_id" AND w.event_id="work_files"."event_id") AND "work_files"."owner_id" = nullif(current_setting('sep.person_id', true), '')::uuid);--> statement-breakpoint
CREATE POLICY "file_delete" ON "work_files" AS PERMISSIVE FOR DELETE TO "sep_runtime" USING ("work_files"."organization_id" = nullif(current_setting('sep.organization_id', true), '')::uuid AND "work_files"."event_id" = nullif(current_setting('sep.event_id',true),'')::uuid AND EXISTS (SELECT 1 FROM author_works w WHERE w.id="work_files"."work_id" AND w.organization_id="work_files"."organization_id" AND w.event_id="work_files"."event_id") AND "work_files"."owner_id" = nullif(current_setting('sep.person_id', true), '')::uuid AND NOT EXISTS (SELECT 1 FROM work_versions v WHERE v.file_id="work_files"."id"));--> statement-breakpoint
CREATE POLICY "history_read" ON "work_history" AS PERMISSIVE FOR SELECT TO "sep_runtime" USING ("work_history"."organization_id" = nullif(current_setting('sep.organization_id', true), '')::uuid AND "work_history"."event_id" = nullif(current_setting('sep.event_id',true),'')::uuid AND EXISTS (SELECT 1 FROM author_works w WHERE w.id="work_history"."work_id" AND w.organization_id="work_history"."organization_id" AND w.event_id="work_history"."event_id"));--> statement-breakpoint
CREATE POLICY "history_insert" ON "work_history" AS PERMISSIVE FOR INSERT TO "sep_runtime" WITH CHECK ("work_history"."organization_id" = nullif(current_setting('sep.organization_id', true), '')::uuid AND "work_history"."event_id" = nullif(current_setting('sep.event_id',true),'')::uuid AND EXISTS (SELECT 1 FROM author_works w WHERE w.id="work_history"."work_id" AND w.organization_id="work_history"."organization_id" AND w.event_id="work_history"."event_id") AND "work_history"."actor_id" = nullif(current_setting('sep.person_id', true), '')::uuid);--> statement-breakpoint
CREATE POLICY "version_read" ON "work_versions" AS PERMISSIVE FOR SELECT TO "sep_runtime" USING ("work_versions"."organization_id" = nullif(current_setting('sep.organization_id', true), '')::uuid AND "work_versions"."event_id" = nullif(current_setting('sep.event_id',true),'')::uuid AND EXISTS (SELECT 1 FROM author_works w WHERE w.id="work_versions"."work_id" AND w.organization_id="work_versions"."organization_id" AND w.event_id="work_versions"."event_id"));--> statement-breakpoint
CREATE POLICY "version_insert" ON "work_versions" AS PERMISSIVE FOR INSERT TO "sep_runtime" WITH CHECK ("work_versions"."organization_id" = nullif(current_setting('sep.organization_id', true), '')::uuid AND "work_versions"."event_id" = nullif(current_setting('sep.event_id',true),'')::uuid AND EXISTS (SELECT 1 FROM author_works w WHERE w.id="work_versions"."work_id" AND w.organization_id="work_versions"."organization_id" AND w.event_id="work_versions"."event_id") AND "work_versions"."owner_id" = nullif(current_setting('sep.person_id', true), '')::uuid);
--> statement-breakpoint
ALTER TABLE "author_works" ADD CONSTRAINT "work_status_values" CHECK ("author_works"."status" IN ('draft','submitted','in_review','changes_requested','accepted','rejected','withdrawn','final_requested','final_submitted'));
