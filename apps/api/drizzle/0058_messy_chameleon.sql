CREATE TABLE "registration_drafts" (
	"organization_id" uuid NOT NULL,
	"event_id" uuid NOT NULL,
	"content" jsonb NOT NULL,
	"revision" integer NOT NULL,
	CONSTRAINT "registration_drafts_organization_id_event_id_pk" PRIMARY KEY("organization_id","event_id"),
	CONSTRAINT "registration_draft_revision" CHECK ("registration_drafts"."revision">0)
);
--> statement-breakpoint
ALTER TABLE "registration_drafts" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "registration_entries" (
	"id" uuid PRIMARY KEY NOT NULL,
	"organization_id" uuid NOT NULL,
	"event_id" uuid NOT NULL,
	"person_id" uuid NOT NULL,
	"name" text NOT NULL,
	"email" text,
	"affiliations" jsonb NOT NULL,
	"category" jsonb NOT NULL,
	"modality" text NOT NULL,
	"status" text NOT NULL,
	"policy" jsonb NOT NULL,
	"revision" integer DEFAULT 1 NOT NULL,
	"requested_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "registration_entries_organization_id_event_id_person_id_unique" UNIQUE("organization_id","event_id","person_id"),
	CONSTRAINT "registration_entries_organization_id_event_id_id_person_id_unique" UNIQUE("organization_id","event_id","id","person_id"),
	CONSTRAINT "registration_entry_status" CHECK ("registration_entries"."status" IN ('pending','confirmed','waitlisted','rejected','cancelled')),
	CONSTRAINT "registration_entry_modality" CHECK ("registration_entries"."modality" IN ('in_person','virtual')),
	CONSTRAINT "registration_entry_revision" CHECK ("registration_entries"."revision">0)
);
--> statement-breakpoint
ALTER TABLE "registration_entries" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "registration_history" (
	"id" uuid PRIMARY KEY NOT NULL,
	"organization_id" uuid NOT NULL,
	"event_id" uuid NOT NULL,
	"registration_id" uuid NOT NULL,
	"person_id" uuid NOT NULL,
	"actor_id" uuid NOT NULL,
	"actor_name" text NOT NULL,
	"action" text NOT NULL,
	"status" text NOT NULL,
	"message" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "registration_history" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "registration_publications" (
	"organization_id" uuid NOT NULL,
	"event_id" uuid NOT NULL,
	"snapshot" jsonb NOT NULL,
	"revision" integer NOT NULL,
	"active" boolean DEFAULT true NOT NULL,
	CONSTRAINT "registration_publications_organization_id_event_id_pk" PRIMARY KEY("organization_id","event_id"),
	CONSTRAINT "registration_publication_revision" CHECK ("registration_publications"."revision">0)
);
--> statement-breakpoint
ALTER TABLE "registration_publications" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "registration_drafts" ADD CONSTRAINT "registration_drafts_organization_id_event_id_events_organization_id_id_fk" FOREIGN KEY ("organization_id","event_id") REFERENCES "public"."events"("organization_id","id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "registration_entries" ADD CONSTRAINT "registration_entries_person_id_people_id_fk" FOREIGN KEY ("person_id") REFERENCES "public"."people"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "registration_entries" ADD CONSTRAINT "registration_entries_organization_id_event_id_events_organization_id_id_fk" FOREIGN KEY ("organization_id","event_id") REFERENCES "public"."events"("organization_id","id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "registration_history" ADD CONSTRAINT "registration_history_actor_id_people_id_fk" FOREIGN KEY ("actor_id") REFERENCES "public"."people"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "registration_history" ADD CONSTRAINT "registration_history_organization_id_event_id_registration_id_person_id_registration_entries_organization_id_event_id_id_person_id_fk" FOREIGN KEY ("organization_id","event_id","registration_id","person_id") REFERENCES "public"."registration_entries"("organization_id","event_id","id","person_id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "registration_publications" ADD CONSTRAINT "registration_publications_organization_id_event_id_events_organization_id_id_fk" FOREIGN KEY ("organization_id","event_id") REFERENCES "public"."events"("organization_id","id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "registration_status_queue_idx" ON "registration_entries" USING btree ("organization_id","event_id","status","modality","requested_at");--> statement-breakpoint
CREATE POLICY "context_scope" ON "registration_drafts" AS PERMISSIVE FOR ALL TO "sep_runtime" USING ("registration_drafts"."organization_id" = nullif(current_setting('sep.organization_id', true), '')::uuid AND "registration_drafts"."event_id"=nullif(current_setting('sep.event_id',true),'')::uuid AND current_setting('sep.registration_staff',true)='true') WITH CHECK ("registration_drafts"."organization_id" = nullif(current_setting('sep.organization_id', true), '')::uuid AND "registration_drafts"."event_id"=nullif(current_setting('sep.event_id',true),'')::uuid AND current_setting('sep.registration_staff',true)='true');--> statement-breakpoint
CREATE POLICY "context_scope" ON "registration_entries" AS PERMISSIVE FOR ALL TO "sep_runtime" USING ("registration_entries"."organization_id" = nullif(current_setting('sep.organization_id', true), '')::uuid AND "registration_entries"."event_id"=nullif(current_setting('sep.event_id',true),'')::uuid AND (current_setting('sep.registration_staff',true)='true' OR "registration_entries"."person_id" = nullif(current_setting('sep.person_id', true), '')::uuid)) WITH CHECK ("registration_entries"."organization_id" = nullif(current_setting('sep.organization_id', true), '')::uuid AND "registration_entries"."event_id"=nullif(current_setting('sep.event_id',true),'')::uuid AND (current_setting('sep.registration_staff',true)='true' OR "registration_entries"."person_id" = nullif(current_setting('sep.person_id', true), '')::uuid));--> statement-breakpoint
CREATE POLICY "registration_counter" ON "registration_entries" AS PERMISSIVE FOR SELECT TO "sep_migrator" USING ("registration_entries"."organization_id" = nullif(current_setting('sep.organization_id', true), '')::uuid AND "registration_entries"."event_id"=nullif(current_setting('sep.event_id',true),'')::uuid AND current_setting('sep.registration_rpc',true)='true');--> statement-breakpoint
CREATE POLICY "registration_history_read" ON "registration_history" AS PERMISSIVE FOR SELECT TO "sep_runtime" USING ("registration_history"."organization_id" = nullif(current_setting('sep.organization_id', true), '')::uuid AND "registration_history"."event_id"=nullif(current_setting('sep.event_id',true),'')::uuid AND (current_setting('sep.registration_staff',true)='true' OR "registration_history"."person_id" = nullif(current_setting('sep.person_id', true), '')::uuid));--> statement-breakpoint
CREATE POLICY "registration_history_insert" ON "registration_history" AS PERMISSIVE FOR INSERT TO "sep_runtime" WITH CHECK ("registration_history"."organization_id" = nullif(current_setting('sep.organization_id', true), '')::uuid AND "registration_history"."event_id"=nullif(current_setting('sep.event_id',true),'')::uuid AND "registration_history"."actor_id" = nullif(current_setting('sep.person_id', true), '')::uuid AND (current_setting('sep.registration_staff',true)='true' OR "registration_history"."person_id" = nullif(current_setting('sep.person_id', true), '')::uuid));--> statement-breakpoint
CREATE POLICY "registration_publication_read" ON "registration_publications" AS PERMISSIVE FOR SELECT TO "sep_runtime" USING ("registration_publications"."organization_id" = nullif(current_setting('sep.organization_id', true), '')::uuid AND "registration_publications"."event_id"=nullif(current_setting('sep.event_id',true),'')::uuid);--> statement-breakpoint
CREATE POLICY "registration_publication_insert" ON "registration_publications" AS PERMISSIVE FOR INSERT TO "sep_runtime" WITH CHECK ("registration_publications"."organization_id" = nullif(current_setting('sep.organization_id', true), '')::uuid AND "registration_publications"."event_id"=nullif(current_setting('sep.event_id',true),'')::uuid AND current_setting('sep.registration_staff',true)='true');--> statement-breakpoint
CREATE POLICY "registration_publication_update" ON "registration_publications" AS PERMISSIVE FOR UPDATE TO "sep_runtime" USING ("registration_publications"."organization_id" = nullif(current_setting('sep.organization_id', true), '')::uuid AND "registration_publications"."event_id"=nullif(current_setting('sep.event_id',true),'')::uuid AND current_setting('sep.registration_staff',true)='true') WITH CHECK ("registration_publications"."organization_id" = nullif(current_setting('sep.organization_id', true), '')::uuid AND "registration_publications"."event_id"=nullif(current_setting('sep.event_id',true),'')::uuid AND current_setting('sep.registration_staff',true)='true');
--> statement-breakpoint
ALTER TABLE registration_drafts FORCE ROW LEVEL SECURITY;
ALTER TABLE registration_publications FORCE ROW LEVEL SECURITY;
ALTER TABLE registration_entries FORCE ROW LEVEL SECURITY;
ALTER TABLE registration_history FORCE ROW LEVEL SECURITY;
GRANT SELECT,INSERT,UPDATE ON registration_drafts,registration_publications,registration_entries TO sep_runtime;
GRANT SELECT,INSERT ON registration_history TO sep_runtime;
--> statement-breakpoint
CREATE FUNCTION sep_registration_counts(org uuid,event uuid)
RETURNS TABLE(pending bigint,confirmed bigint,waitlisted bigint,in_person bigint,virtual bigint,own_position bigint)
LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog AS $$
DECLARE previous text:=current_setting('sep.registration_rpc',true);
BEGIN
 IF org IS DISTINCT FROM nullif(current_setting('sep.organization_id',true),'')::uuid OR event IS DISTINCT FROM nullif(current_setting('sep.event_id',true),'')::uuid THEN RETURN; END IF;
 PERFORM set_config('sep.registration_rpc','true',true);
 RETURN QUERY SELECT count(*) FILTER(WHERE r.status='pending'),count(*) FILTER(WHERE r.status='confirmed'),count(*) FILTER(WHERE r.status='waitlisted'),count(*) FILTER(WHERE r.status IN ('pending','confirmed') AND r.modality='in_person'),count(*) FILTER(WHERE r.status IN ('pending','confirmed') AND r.modality='virtual'),(SELECT q.position FROM (SELECT person_id,row_number() OVER(PARTITION BY modality ORDER BY requested_at,id) AS position FROM public.registration_entries WHERE organization_id=org AND event_id=event AND status='waitlisted') q WHERE q.person_id=nullif(current_setting('sep.person_id',true),'')::uuid) FROM public.registration_entries r WHERE r.organization_id=org AND r.event_id=event;
 PERFORM set_config('sep.registration_rpc',coalesce(previous,''),true);
END $$;
REVOKE ALL ON FUNCTION sep_registration_counts(uuid,uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION sep_registration_counts(uuid,uuid) TO sep_runtime;
--> statement-breakpoint
CREATE FUNCTION sep_registration_history_immutable() RETURNS trigger LANGUAGE plpgsql SET search_path=pg_catalog AS $$
BEGIN RAISE EXCEPTION 'Registration history is append only' USING ERRCODE='42501'; END $$;
CREATE TRIGGER registration_history_immutable BEFORE UPDATE OR DELETE ON registration_history FOR EACH ROW EXECUTE FUNCTION sep_registration_history_immutable();
