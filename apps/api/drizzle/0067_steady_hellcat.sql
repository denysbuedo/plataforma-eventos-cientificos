CREATE TABLE "editorial_drafts" (
	"organization_id" uuid NOT NULL,
	"event_id" uuid NOT NULL,
	"kind" text NOT NULL,
	"content" jsonb NOT NULL,
	"revision" integer NOT NULL,
	CONSTRAINT "editorial_drafts_organization_id_event_id_kind_pk" PRIMARY KEY("organization_id","event_id","kind"),
	CONSTRAINT "editorial_draft_values" CHECK ("editorial_drafts"."kind" IN ('abstracts','proceedings') AND "editorial_drafts"."revision">0)
);
--> statement-breakpoint
ALTER TABLE "editorial_drafts" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "editorial_history" (
	"id" uuid PRIMARY KEY NOT NULL,
	"organization_id" uuid NOT NULL,
	"event_id" uuid NOT NULL,
	"kind" text,
	"work_id" uuid,
	"release_id" uuid,
	"actor_id" uuid NOT NULL,
	"actor_name" text NOT NULL,
	"action" text NOT NULL,
	"reason" text NOT NULL,
	"evidence" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "editorial_history" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "editorial_selections" (
	"organization_id" uuid NOT NULL,
	"event_id" uuid NOT NULL,
	"kind" text NOT NULL,
	"work_id" uuid NOT NULL,
	"version_id" uuid NOT NULL,
	"included" boolean DEFAULT true NOT NULL,
	"ready" boolean DEFAULT false NOT NULL,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"note" text DEFAULT '' NOT NULL,
	"revision" integer DEFAULT 1 NOT NULL,
	CONSTRAINT "editorial_selections_organization_id_event_id_kind_work_id_pk" PRIMARY KEY("organization_id","event_id","kind","work_id"),
	CONSTRAINT "editorial_selection_values" CHECK ("editorial_selections"."kind" IN ('abstracts','proceedings') AND "editorial_selections"."revision">0 AND "editorial_selections"."sort_order">=0)
);
--> statement-breakpoint
ALTER TABLE "editorial_selections" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "publication_assets" (
	"organization_id" uuid NOT NULL,
	"event_id" uuid NOT NULL,
	"release_id" uuid NOT NULL,
	"work_id" uuid NOT NULL,
	"data" "bytea" NOT NULL,
	"sha256" text NOT NULL,
	CONSTRAINT "publication_assets_organization_id_event_id_release_id_work_id_pk" PRIMARY KEY("organization_id","event_id","release_id","work_id")
);
--> statement-breakpoint
ALTER TABLE "publication_assets" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "publication_permissions" (
	"organization_id" uuid NOT NULL,
	"event_id" uuid NOT NULL,
	"work_id" uuid NOT NULL,
	"version_id" uuid NOT NULL,
	"person_id" uuid NOT NULL,
	"abstract_allowed" boolean NOT NULL,
	"full_text_allowed" boolean NOT NULL,
	"license" text NOT NULL,
	"revision" integer DEFAULT 1 NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "publication_permission_pk" PRIMARY KEY("organization_id","event_id","work_id","version_id"),
	CONSTRAINT "publication_permission_values" CHECK ("publication_permissions"."revision">0 AND "publication_permissions"."license" IN ('CC-BY-4.0','CC-BY-SA-4.0','CC-BY-NC-4.0','all-rights-reserved'))
);
--> statement-breakpoint
ALTER TABLE "publication_permissions" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "publication_releases" (
	"id" uuid PRIMARY KEY NOT NULL,
	"organization_id" uuid NOT NULL,
	"event_id" uuid NOT NULL,
	"kind" text NOT NULL,
	"edition" integer NOT NULL,
	"draft_revision" integer NOT NULL,
	"snapshot" jsonb NOT NULL,
	"pdf" "bytea" NOT NULL,
	"sha256" text NOT NULL,
	"status" text DEFAULT 'published' NOT NULL,
	"revision" integer DEFAULT 1 NOT NULL,
	"published_at" timestamp with time zone DEFAULT now() NOT NULL,
	"withdrawn_at" timestamp with time zone,
	"withdraw_reason" text,
	CONSTRAINT "publication_releases_organization_id_event_id_id_unique" UNIQUE("organization_id","event_id","id"),
	CONSTRAINT "publication_releases_organization_id_event_id_kind_edition_unique" UNIQUE("organization_id","event_id","kind","edition"),
	CONSTRAINT "publication_release_values" CHECK ("publication_releases"."kind" IN ('abstracts','proceedings') AND "publication_releases"."status" IN ('published','withdrawn') AND ("publication_releases"."status"='withdrawn')=("publication_releases"."withdrawn_at" IS NOT NULL) AND "publication_releases"."edition">0 AND "publication_releases"."revision">0)
);
--> statement-breakpoint
ALTER TABLE "publication_releases" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "editorial_drafts" ADD CONSTRAINT "editorial_drafts_organization_id_event_id_events_organization_id_id_fk" FOREIGN KEY ("organization_id","event_id") REFERENCES "public"."events"("organization_id","id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "editorial_history" ADD CONSTRAINT "editorial_history_actor_id_people_id_fk" FOREIGN KEY ("actor_id") REFERENCES "public"."people"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "editorial_history" ADD CONSTRAINT "editorial_history_organization_id_event_id_events_organization_id_id_fk" FOREIGN KEY ("organization_id","event_id") REFERENCES "public"."events"("organization_id","id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "editorial_history" ADD CONSTRAINT "editorial_history_organization_id_event_id_work_id_author_works_organization_id_event_id_id_fk" FOREIGN KEY ("organization_id","event_id","work_id") REFERENCES "public"."author_works"("organization_id","event_id","id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "editorial_history" ADD CONSTRAINT "editorial_history_organization_id_event_id_release_id_publication_releases_organization_id_event_id_id_fk" FOREIGN KEY ("organization_id","event_id","release_id") REFERENCES "public"."publication_releases"("organization_id","event_id","id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "editorial_selections" ADD CONSTRAINT "editorial_selections_organization_id_event_id_work_id_version_id_work_versions_organization_id_event_id_work_id_id_fk" FOREIGN KEY ("organization_id","event_id","work_id","version_id") REFERENCES "public"."work_versions"("organization_id","event_id","work_id","id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "publication_assets" ADD CONSTRAINT "publication_assets_organization_id_event_id_release_id_publication_releases_organization_id_event_id_id_fk" FOREIGN KEY ("organization_id","event_id","release_id") REFERENCES "public"."publication_releases"("organization_id","event_id","id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "publication_assets" ADD CONSTRAINT "publication_assets_organization_id_event_id_work_id_author_works_organization_id_event_id_id_fk" FOREIGN KEY ("organization_id","event_id","work_id") REFERENCES "public"."author_works"("organization_id","event_id","id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "publication_permissions" ADD CONSTRAINT "publication_permissions_person_id_people_id_fk" FOREIGN KEY ("person_id") REFERENCES "public"."people"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "publication_permissions" ADD CONSTRAINT "publication_permission_version_fk" FOREIGN KEY ("organization_id","event_id","work_id","version_id") REFERENCES "public"."work_versions"("organization_id","event_id","work_id","id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "publication_releases" ADD CONSTRAINT "publication_releases_organization_id_event_id_events_organization_id_id_fk" FOREIGN KEY ("organization_id","event_id") REFERENCES "public"."events"("organization_id","id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE POLICY "editorial_source" ON "author_works" AS PERMISSIVE FOR SELECT TO "sep_runtime" USING ("author_works"."organization_id" = nullif(current_setting('sep.organization_id', true), '')::uuid AND "author_works"."event_id"=nullif(current_setting('sep.event_id',true),'')::uuid AND current_setting('sep.editorial_staff',true)='true');--> statement-breakpoint
CREATE POLICY "editorial_source" ON "program_publications" AS PERMISSIVE FOR SELECT TO "sep_runtime" USING ("program_publications"."organization_id" = nullif(current_setting('sep.organization_id', true), '')::uuid AND "program_publications"."event_id"=nullif(current_setting('sep.event_id',true),'')::uuid AND current_setting('sep.editorial_staff',true)='true');--> statement-breakpoint
CREATE POLICY "editorial_source" ON "work_files" AS PERMISSIVE FOR SELECT TO "sep_runtime" USING ("work_files"."organization_id" = nullif(current_setting('sep.organization_id', true), '')::uuid AND "work_files"."event_id"=nullif(current_setting('sep.event_id',true),'')::uuid AND current_setting('sep.editorial_staff',true)='true');--> statement-breakpoint
CREATE POLICY "editorial_source" ON "work_versions" AS PERMISSIVE FOR SELECT TO "sep_runtime" USING ("work_versions"."organization_id" = nullif(current_setting('sep.organization_id', true), '')::uuid AND "work_versions"."event_id"=nullif(current_setting('sep.event_id',true),'')::uuid AND current_setting('sep.editorial_staff',true)='true');--> statement-breakpoint
CREATE POLICY "context_scope" ON "editorial_drafts" AS PERMISSIVE FOR ALL TO "sep_runtime" USING ("editorial_drafts"."organization_id" = nullif(current_setting('sep.organization_id', true), '')::uuid AND "editorial_drafts"."event_id"=nullif(current_setting('sep.event_id',true),'')::uuid AND current_setting('sep.editorial_staff',true)='true') WITH CHECK ("editorial_drafts"."organization_id" = nullif(current_setting('sep.organization_id', true), '')::uuid AND "editorial_drafts"."event_id"=nullif(current_setting('sep.event_id',true),'')::uuid AND current_setting('sep.editorial_staff',true)='true');--> statement-breakpoint
CREATE POLICY "editorial_history_read" ON "editorial_history" AS PERMISSIVE FOR SELECT TO "sep_runtime" USING ("editorial_history"."organization_id" = nullif(current_setting('sep.organization_id', true), '')::uuid AND "editorial_history"."event_id"=nullif(current_setting('sep.event_id',true),'')::uuid AND current_setting('sep.editorial_staff',true)='true' OR "editorial_history"."organization_id" = nullif(current_setting('sep.organization_id', true), '')::uuid AND "editorial_history"."event_id"=nullif(current_setting('sep.event_id',true),'')::uuid AND EXISTS(SELECT 1 FROM author_works w WHERE w.organization_id="editorial_history"."organization_id" AND w.event_id="editorial_history"."event_id" AND w.id="editorial_history"."work_id" AND w.owner_id=nullif(current_setting('sep.person_id',true),'')::uuid));--> statement-breakpoint
CREATE POLICY "editorial_history_insert" ON "editorial_history" AS PERMISSIVE FOR INSERT TO "sep_runtime" WITH CHECK ("editorial_history"."organization_id" = nullif(current_setting('sep.organization_id', true), '')::uuid AND "editorial_history"."event_id"=nullif(current_setting('sep.event_id',true),'')::uuid AND "editorial_history"."actor_id" = nullif(current_setting('sep.person_id', true), '')::uuid AND (current_setting('sep.editorial_staff',true)='true' OR "editorial_history"."organization_id" = nullif(current_setting('sep.organization_id', true), '')::uuid AND "editorial_history"."event_id"=nullif(current_setting('sep.event_id',true),'')::uuid AND EXISTS(SELECT 1 FROM author_works w WHERE w.organization_id="editorial_history"."organization_id" AND w.event_id="editorial_history"."event_id" AND w.id="editorial_history"."work_id" AND w.owner_id=nullif(current_setting('sep.person_id',true),'')::uuid)));--> statement-breakpoint
CREATE POLICY "editorial_selection_read" ON "editorial_selections" AS PERMISSIVE FOR SELECT TO "sep_runtime" USING ("editorial_selections"."organization_id" = nullif(current_setting('sep.organization_id', true), '')::uuid AND "editorial_selections"."event_id"=nullif(current_setting('sep.event_id',true),'')::uuid AND current_setting('sep.editorial_staff',true)='true' OR "editorial_selections"."organization_id" = nullif(current_setting('sep.organization_id', true), '')::uuid AND "editorial_selections"."event_id"=nullif(current_setting('sep.event_id',true),'')::uuid AND EXISTS(SELECT 1 FROM author_works w WHERE w.organization_id="editorial_selections"."organization_id" AND w.event_id="editorial_selections"."event_id" AND w.id="editorial_selections"."work_id" AND w.owner_id=nullif(current_setting('sep.person_id',true),'')::uuid));--> statement-breakpoint
CREATE POLICY "editorial_selection_write" ON "editorial_selections" AS PERMISSIVE FOR ALL TO "sep_runtime" USING ("editorial_selections"."organization_id" = nullif(current_setting('sep.organization_id', true), '')::uuid AND "editorial_selections"."event_id"=nullif(current_setting('sep.event_id',true),'')::uuid AND current_setting('sep.editorial_staff',true)='true') WITH CHECK ("editorial_selections"."organization_id" = nullif(current_setting('sep.organization_id', true), '')::uuid AND "editorial_selections"."event_id"=nullif(current_setting('sep.event_id',true),'')::uuid AND current_setting('sep.editorial_staff',true)='true');--> statement-breakpoint
CREATE POLICY "publication_asset_read" ON "publication_assets" AS PERMISSIVE FOR SELECT TO "sep_runtime" USING ("publication_assets"."organization_id" = nullif(current_setting('sep.organization_id', true), '')::uuid AND (nullif(current_setting('sep.event_id',true),'') IS NULL OR "publication_assets"."event_id"=nullif(current_setting('sep.event_id',true),'')::uuid) AND (current_setting('sep.editorial_staff',true)='true' OR current_setting('sep.editorial_public',true)='true') AND EXISTS(SELECT 1 FROM publication_releases r WHERE r.organization_id="publication_assets"."organization_id" AND r.event_id="publication_assets"."event_id" AND r.id="publication_assets"."release_id" AND r.status='published'));--> statement-breakpoint
CREATE POLICY "publication_asset_insert" ON "publication_assets" AS PERMISSIVE FOR INSERT TO "sep_runtime" WITH CHECK ("publication_assets"."organization_id" = nullif(current_setting('sep.organization_id', true), '')::uuid AND "publication_assets"."event_id"=nullif(current_setting('sep.event_id',true),'')::uuid AND current_setting('sep.editorial_staff',true)='true');--> statement-breakpoint
CREATE POLICY "publication_permission_read" ON "publication_permissions" AS PERMISSIVE FOR SELECT TO "sep_runtime" USING ("publication_permissions"."organization_id" = nullif(current_setting('sep.organization_id', true), '')::uuid AND "publication_permissions"."event_id"=nullif(current_setting('sep.event_id',true),'')::uuid AND current_setting('sep.editorial_staff',true)='true' OR "publication_permissions"."organization_id" = nullif(current_setting('sep.organization_id', true), '')::uuid AND "publication_permissions"."event_id"=nullif(current_setting('sep.event_id',true),'')::uuid AND EXISTS(SELECT 1 FROM author_works w WHERE w.organization_id="publication_permissions"."organization_id" AND w.event_id="publication_permissions"."event_id" AND w.id="publication_permissions"."work_id" AND w.owner_id=nullif(current_setting('sep.person_id',true),'')::uuid));--> statement-breakpoint
CREATE POLICY "publication_permission_write" ON "publication_permissions" AS PERMISSIVE FOR ALL TO "sep_runtime" USING ("publication_permissions"."organization_id" = nullif(current_setting('sep.organization_id', true), '')::uuid AND "publication_permissions"."event_id"=nullif(current_setting('sep.event_id',true),'')::uuid AND EXISTS(SELECT 1 FROM author_works w WHERE w.organization_id="publication_permissions"."organization_id" AND w.event_id="publication_permissions"."event_id" AND w.id="publication_permissions"."work_id" AND w.owner_id=nullif(current_setting('sep.person_id',true),'')::uuid) AND "publication_permissions"."person_id" = nullif(current_setting('sep.person_id', true), '')::uuid) WITH CHECK ("publication_permissions"."organization_id" = nullif(current_setting('sep.organization_id', true), '')::uuid AND "publication_permissions"."event_id"=nullif(current_setting('sep.event_id',true),'')::uuid AND EXISTS(SELECT 1 FROM author_works w WHERE w.organization_id="publication_permissions"."organization_id" AND w.event_id="publication_permissions"."event_id" AND w.id="publication_permissions"."work_id" AND w.owner_id=nullif(current_setting('sep.person_id',true),'')::uuid) AND "publication_permissions"."person_id" = nullif(current_setting('sep.person_id', true), '')::uuid);--> statement-breakpoint
CREATE POLICY "publication_release_read" ON "publication_releases" AS PERMISSIVE FOR SELECT TO "sep_runtime" USING ("publication_releases"."organization_id" = nullif(current_setting('sep.organization_id', true), '')::uuid AND (nullif(current_setting('sep.event_id',true),'') IS NULL OR "publication_releases"."event_id"=nullif(current_setting('sep.event_id',true),'')::uuid) AND (current_setting('sep.editorial_staff',true)='true' OR current_setting('sep.editorial_public',true)='true'));--> statement-breakpoint
CREATE POLICY "publication_release_write" ON "publication_releases" AS PERMISSIVE FOR ALL TO "sep_runtime" USING ("publication_releases"."organization_id" = nullif(current_setting('sep.organization_id', true), '')::uuid AND "publication_releases"."event_id"=nullif(current_setting('sep.event_id',true),'')::uuid AND current_setting('sep.editorial_staff',true)='true') WITH CHECK ("publication_releases"."organization_id" = nullif(current_setting('sep.organization_id', true), '')::uuid AND "publication_releases"."event_id"=nullif(current_setting('sep.event_id',true),'')::uuid AND current_setting('sep.editorial_staff',true)='true');--> statement-breakpoint
CREATE POLICY "communication_source" ON "publication_releases" AS PERMISSIVE FOR SELECT TO "sep_migrator" USING (current_setting('sep.communication_rpc',true)='true' AND "publication_releases"."organization_id" = nullif(current_setting('sep.organization_id', true), '')::uuid AND "publication_releases"."event_id"=nullif(current_setting('sep.event_id',true),'')::uuid);