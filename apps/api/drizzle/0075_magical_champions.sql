CREATE TABLE "gallery_entries" (
	"organization_id" uuid NOT NULL,
	"event_id" uuid NOT NULL,
	"work_id" uuid NOT NULL,
	"owner_id" uuid NOT NULL,
	"version_id" uuid NOT NULL,
	"revision" integer NOT NULL,
	"permission" jsonb NOT NULL,
	"approved" boolean DEFAULT false NOT NULL,
	"note" text DEFAULT '' NOT NULL,
	CONSTRAINT "gallery_entries_organization_id_event_id_work_id_pk" PRIMARY KEY("organization_id","event_id","work_id")
);
--> statement-breakpoint
ALTER TABLE "gallery_entries" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "gallery_history" (
	"id" uuid PRIMARY KEY NOT NULL,
	"organization_id" uuid NOT NULL,
	"event_id" uuid NOT NULL,
	"work_id" uuid NOT NULL,
	"owner_id" uuid NOT NULL,
	"actor_id" uuid NOT NULL,
	"actor_name" text NOT NULL,
	"action" text NOT NULL,
	"reason" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "gallery_history" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "gallery_releases" (
	"id" uuid PRIMARY KEY NOT NULL,
	"organization_id" uuid NOT NULL,
	"event_id" uuid NOT NULL,
	"work_id" uuid NOT NULL,
	"owner_id" uuid NOT NULL,
	"content" jsonb NOT NULL,
	"pdf" "bytea" NOT NULL,
	"active" boolean DEFAULT true NOT NULL,
	"entry_revision" integer NOT NULL,
	"published_at" timestamp with time zone DEFAULT now() NOT NULL,
	"withdrawal_reason" text
);
--> statement-breakpoint
ALTER TABLE "gallery_releases" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "gallery_entries" ADD CONSTRAINT "gallery_entries_owner_id_people_id_fk" FOREIGN KEY ("owner_id") REFERENCES "public"."people"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "gallery_entries" ADD CONSTRAINT "gallery_entry_work_fk" FOREIGN KEY ("organization_id","event_id","work_id") REFERENCES "public"."author_works"("organization_id","event_id","id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "gallery_entries" ADD CONSTRAINT "gallery_entry_version_fk" FOREIGN KEY ("organization_id","event_id","work_id","version_id") REFERENCES "public"."work_versions"("organization_id","event_id","work_id","id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "gallery_history" ADD CONSTRAINT "gallery_history_owner_id_people_id_fk" FOREIGN KEY ("owner_id") REFERENCES "public"."people"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "gallery_history" ADD CONSTRAINT "gallery_history_actor_id_people_id_fk" FOREIGN KEY ("actor_id") REFERENCES "public"."people"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "gallery_history" ADD CONSTRAINT "gallery_history_work_fk" FOREIGN KEY ("organization_id","event_id","work_id") REFERENCES "public"."author_works"("organization_id","event_id","id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "gallery_releases" ADD CONSTRAINT "gallery_releases_owner_id_people_id_fk" FOREIGN KEY ("owner_id") REFERENCES "public"."people"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "gallery_releases" ADD CONSTRAINT "gallery_release_work_fk" FOREIGN KEY ("organization_id","event_id","work_id") REFERENCES "public"."author_works"("organization_id","event_id","id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "gallery_history_event_idx" ON "gallery_history" USING btree ("organization_id","event_id","created_at");--> statement-breakpoint
CREATE UNIQUE INDEX "gallery_one_active_work" ON "gallery_releases" USING btree ("organization_id","event_id","work_id") WHERE "gallery_releases"."active";--> statement-breakpoint
CREATE POLICY "gallery_source" ON "author_works" AS PERMISSIVE FOR SELECT TO "sep_runtime" USING ("author_works"."organization_id" = nullif(current_setting('sep.organization_id', true), '')::uuid AND "author_works"."event_id"=nullif(current_setting('sep.event_id',true),'')::uuid AND current_setting('sep.gallery_staff',true)='true');--> statement-breakpoint
CREATE POLICY "gallery_source" ON "work_files" AS PERMISSIVE FOR SELECT TO "sep_runtime" USING ("work_files"."organization_id" = nullif(current_setting('sep.organization_id', true), '')::uuid AND "work_files"."event_id"=nullif(current_setting('sep.event_id',true),'')::uuid AND current_setting('sep.gallery_staff',true)='true');--> statement-breakpoint
CREATE POLICY "gallery_source" ON "work_versions" AS PERMISSIVE FOR SELECT TO "sep_runtime" USING ("work_versions"."organization_id" = nullif(current_setting('sep.organization_id', true), '')::uuid AND "work_versions"."event_id"=nullif(current_setting('sep.event_id',true),'')::uuid AND current_setting('sep.gallery_staff',true)='true');--> statement-breakpoint
CREATE POLICY "context_scope" ON "gallery_entries" AS PERMISSIVE FOR ALL TO "sep_runtime" USING ("gallery_entries"."organization_id" = nullif(current_setting('sep.organization_id', true), '')::uuid AND "gallery_entries"."event_id"=nullif(current_setting('sep.event_id',true),'')::uuid AND (current_setting('sep.gallery_staff',true)='true' OR "gallery_entries"."owner_id" = nullif(current_setting('sep.person_id', true), '')::uuid)) WITH CHECK ("gallery_entries"."organization_id" = nullif(current_setting('sep.organization_id', true), '')::uuid AND "gallery_entries"."event_id"=nullif(current_setting('sep.event_id',true),'')::uuid AND (current_setting('sep.gallery_staff',true)='true' OR "gallery_entries"."owner_id" = nullif(current_setting('sep.person_id', true), '')::uuid));--> statement-breakpoint
CREATE POLICY "gallery_history_read" ON "gallery_history" AS PERMISSIVE FOR SELECT TO "sep_runtime" USING ("gallery_history"."organization_id" = nullif(current_setting('sep.organization_id', true), '')::uuid AND "gallery_history"."event_id"=nullif(current_setting('sep.event_id',true),'')::uuid AND (current_setting('sep.gallery_staff',true)='true' OR "gallery_history"."owner_id" = nullif(current_setting('sep.person_id', true), '')::uuid));--> statement-breakpoint
CREATE POLICY "gallery_history_insert" ON "gallery_history" AS PERMISSIVE FOR INSERT TO "sep_runtime" WITH CHECK ("gallery_history"."organization_id" = nullif(current_setting('sep.organization_id', true), '')::uuid AND "gallery_history"."event_id"=nullif(current_setting('sep.event_id',true),'')::uuid AND (current_setting('sep.gallery_staff',true)='true' OR "gallery_history"."owner_id" = nullif(current_setting('sep.person_id', true), '')::uuid) AND "gallery_history"."actor_id" = nullif(current_setting('sep.person_id', true), '')::uuid);--> statement-breakpoint
CREATE POLICY "gallery_release_staff" ON "gallery_releases" AS PERMISSIVE FOR ALL TO "sep_runtime" USING ("gallery_releases"."organization_id" = nullif(current_setting('sep.organization_id', true), '')::uuid AND "gallery_releases"."event_id"=nullif(current_setting('sep.event_id',true),'')::uuid AND current_setting('sep.gallery_staff',true)='true') WITH CHECK ("gallery_releases"."organization_id" = nullif(current_setting('sep.organization_id', true), '')::uuid AND "gallery_releases"."event_id"=nullif(current_setting('sep.event_id',true),'')::uuid AND current_setting('sep.gallery_staff',true)='true');--> statement-breakpoint
CREATE POLICY "gallery_release_owner_read" ON "gallery_releases" AS PERMISSIVE FOR SELECT TO "sep_runtime" USING ("gallery_releases"."organization_id" = nullif(current_setting('sep.organization_id', true), '')::uuid AND "gallery_releases"."event_id"=nullif(current_setting('sep.event_id',true),'')::uuid AND (current_setting('sep.gallery_staff',true)='true' OR "gallery_releases"."owner_id" = nullif(current_setting('sep.person_id', true), '')::uuid));--> statement-breakpoint
CREATE POLICY "gallery_release_owner_withdraw" ON "gallery_releases" AS PERMISSIVE FOR UPDATE TO "sep_runtime" USING ("gallery_releases"."organization_id" = nullif(current_setting('sep.organization_id', true), '')::uuid AND "gallery_releases"."event_id"=nullif(current_setting('sep.event_id',true),'')::uuid AND (current_setting('sep.gallery_staff',true)='true' OR "gallery_releases"."owner_id" = nullif(current_setting('sep.person_id', true), '')::uuid)) WITH CHECK ("gallery_releases"."organization_id" = nullif(current_setting('sep.organization_id', true), '')::uuid AND "gallery_releases"."event_id"=nullif(current_setting('sep.event_id',true),'')::uuid AND (current_setting('sep.gallery_staff',true)='true' OR "gallery_releases"."owner_id" = nullif(current_setting('sep.person_id', true), '')::uuid) AND NOT "gallery_releases"."active");--> statement-breakpoint
CREATE POLICY "gallery_public_read" ON "gallery_releases" AS PERMISSIVE FOR SELECT TO "sep_runtime" USING ("gallery_releases"."organization_id" = nullif(current_setting('sep.organization_id', true), '')::uuid AND "gallery_releases"."event_id"=nullif(current_setting('sep.event_id',true),'')::uuid AND current_setting('sep.gallery_public',true)='true' AND "gallery_releases"."active");
--> statement-breakpoint
ALTER TABLE gallery_entries FORCE ROW LEVEL SECURITY;
ALTER TABLE gallery_releases FORCE ROW LEVEL SECURITY;
ALTER TABLE gallery_history FORCE ROW LEVEL SECURITY;
GRANT SELECT,INSERT,UPDATE ON gallery_entries,gallery_releases TO sep_runtime;
GRANT SELECT,INSERT ON gallery_history TO sep_runtime;
CREATE TRIGGER gallery_history_immutable BEFORE UPDATE OR DELETE ON gallery_history FOR EACH ROW EXECUTE FUNCTION sep_registration_history_immutable();
CREATE FUNCTION sep_gallery_release_immutable() RETURNS trigger LANGUAGE plpgsql SET search_path=pg_catalog AS $$
BEGIN
 IF TG_OP='DELETE' THEN RAISE EXCEPTION 'Poster preservation' USING ERRCODE='42501'; END IF;
 IF NOT OLD.active OR NEW.active OR NEW.id<>OLD.id OR NEW.organization_id<>OLD.organization_id OR NEW.event_id<>OLD.event_id OR NEW.work_id<>OLD.work_id OR NEW.owner_id<>OLD.owner_id OR NEW.content IS DISTINCT FROM OLD.content OR NEW.pdf<>OLD.pdf OR NEW.entry_revision<>OLD.entry_revision OR NEW.published_at<>OLD.published_at OR coalesce(length(btrim(NEW.withdrawal_reason)),0)<10 THEN RAISE EXCEPTION 'Poster is immutable' USING ERRCODE='42501'; END IF;
 RETURN NEW;
END $$;
CREATE TRIGGER gallery_release_immutable BEFORE UPDATE OR DELETE ON gallery_releases FOR EACH ROW EXECUTE FUNCTION sep_gallery_release_immutable();
