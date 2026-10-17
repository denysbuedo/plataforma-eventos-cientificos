CREATE TABLE "review_assignments" (
	"id" uuid PRIMARY KEY NOT NULL,
	"organization_id" uuid NOT NULL,
	"event_id" uuid NOT NULL,
	"work_id" uuid NOT NULL,
	"round_id" uuid NOT NULL,
	"reviewer_id" uuid NOT NULL,
	"reviewer_name" text NOT NULL,
	"status" text DEFAULT 'invited' NOT NULL,
	"content" jsonb NOT NULL,
	"revision" integer DEFAULT 1 NOT NULL,
	"message" text DEFAULT '' NOT NULL,
	"evaluation" jsonb,
	"submitted_at" timestamp with time zone,
	CONSTRAINT "review_assignments_round_id_reviewer_id_unique" UNIQUE("round_id","reviewer_id"),
	CONSTRAINT "review_assignment_status" CHECK ("review_assignments"."status" IN ('invited','accepted','declined','conflict','revoked','submitted')),
	CONSTRAINT "review_assignment_revision" CHECK ("review_assignments"."revision">0),
	CONSTRAINT "review_assignment_submitted" CHECK ("review_assignments"."status"<>'submitted' OR ("review_assignments"."submitted_at" IS NOT NULL AND "review_assignments"."evaluation" IS NOT NULL))
);
--> statement-breakpoint
ALTER TABLE "review_assignments" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "review_conflicts" (
	"organization_id" uuid NOT NULL,
	"event_id" uuid NOT NULL,
	"work_id" uuid NOT NULL,
	"person_id" uuid NOT NULL,
	"reason" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "review_conflicts_organization_id_event_id_work_id_person_id_pk" PRIMARY KEY("organization_id","event_id","work_id","person_id")
);
--> statement-breakpoint
ALTER TABLE "review_conflicts" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "review_members" (
	"organization_id" uuid NOT NULL,
	"event_id" uuid NOT NULL,
	"person_id" uuid NOT NULL,
	"name" text NOT NULL,
	"status" text DEFAULT 'invited' NOT NULL,
	"expertise" text DEFAULT '' NOT NULL,
	"revision" integer DEFAULT 1 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "review_members_organization_id_event_id_person_id_pk" PRIMARY KEY("organization_id","event_id","person_id"),
	CONSTRAINT "review_member_status" CHECK ("review_members"."status" IN ('invited','accepted','declined','revoked')),
	CONSTRAINT "review_member_revision" CHECK ("review_members"."revision">0)
);
--> statement-breakpoint
ALTER TABLE "review_members" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "review_rounds" (
	"id" uuid PRIMARY KEY NOT NULL,
	"organization_id" uuid NOT NULL,
	"event_id" uuid NOT NULL,
	"work_id" uuid NOT NULL,
	"version_id" uuid NOT NULL,
	"version_number" integer NOT NULL,
	"number" integer NOT NULL,
	"status" text DEFAULT 'open' NOT NULL,
	"deadline" date NOT NULL,
	"timezone" text NOT NULL,
	"minimum_reviews" integer NOT NULL,
	"criteria" jsonb NOT NULL,
	"revision" integer DEFAULT 1 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"closed_at" timestamp with time zone,
	CONSTRAINT "review_rounds_organization_id_event_id_work_id_id_unique" UNIQUE("organization_id","event_id","work_id","id"),
	CONSTRAINT "review_rounds_work_id_number_unique" UNIQUE("work_id","number"),
	CONSTRAINT "review_round_status" CHECK ("review_rounds"."status" IN ('open','closed') AND ("review_rounds"."status"='closed')=("review_rounds"."closed_at" IS NOT NULL)),
	CONSTRAINT "review_round_limits" CHECK ("review_rounds"."minimum_reviews" BETWEEN 1 AND 5 AND "review_rounds"."number" BETWEEN 1 AND 20 AND "review_rounds"."revision">0)
);
--> statement-breakpoint
ALTER TABLE "review_rounds" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "work_versions" ADD CONSTRAINT "work_versions_review_scope" UNIQUE("organization_id","event_id","work_id","id");--> statement-breakpoint
ALTER TABLE "review_assignments" ADD CONSTRAINT "review_assignments_organization_id_event_id_work_id_round_id_review_rounds_organization_id_event_id_work_id_id_fk" FOREIGN KEY ("organization_id","event_id","work_id","round_id") REFERENCES "public"."review_rounds"("organization_id","event_id","work_id","id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "review_assignments" ADD CONSTRAINT "review_assignments_organization_id_event_id_reviewer_id_review_members_organization_id_event_id_person_id_fk" FOREIGN KEY ("organization_id","event_id","reviewer_id") REFERENCES "public"."review_members"("organization_id","event_id","person_id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "review_conflicts" ADD CONSTRAINT "review_conflicts_organization_id_event_id_work_id_author_works_organization_id_event_id_id_fk" FOREIGN KEY ("organization_id","event_id","work_id") REFERENCES "public"."author_works"("organization_id","event_id","id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "review_conflicts" ADD CONSTRAINT "review_conflicts_organization_id_event_id_person_id_review_members_organization_id_event_id_person_id_fk" FOREIGN KEY ("organization_id","event_id","person_id") REFERENCES "public"."review_members"("organization_id","event_id","person_id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "review_members" ADD CONSTRAINT "review_members_person_id_people_id_fk" FOREIGN KEY ("person_id") REFERENCES "public"."people"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "review_members" ADD CONSTRAINT "review_members_organization_id_event_id_events_organization_id_id_fk" FOREIGN KEY ("organization_id","event_id") REFERENCES "public"."events"("organization_id","id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "review_rounds" ADD CONSTRAINT "review_rounds_organization_id_event_id_work_id_version_id_work_versions_organization_id_event_id_work_id_id_fk" FOREIGN KEY ("organization_id","event_id","work_id","version_id") REFERENCES "public"."work_versions"("organization_id","event_id","work_id","id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "review_round_open" ON "review_rounds" USING btree ("work_id") WHERE "review_rounds"."status"='open';--> statement-breakpoint
CREATE POLICY "review_registry" ON "author_works" AS PERMISSIVE FOR SELECT TO "sep_migrator" USING (current_setting('sep.review_rpc',true)='true' AND "author_works"."organization_id" = nullif(current_setting('sep.organization_id', true), '')::uuid AND "author_works"."event_id"=nullif(current_setting('sep.event_id',true),'')::uuid);--> statement-breakpoint
CREATE POLICY "review_registry_lock" ON "author_works" AS PERMISSIVE FOR UPDATE TO "sep_migrator" USING (current_setting('sep.review_rpc',true)='true' AND "author_works"."organization_id" = nullif(current_setting('sep.organization_id', true), '')::uuid AND "author_works"."event_id"=nullif(current_setting('sep.event_id',true),'')::uuid) WITH CHECK (false);--> statement-breakpoint
CREATE POLICY "review_registry" ON "event_configurations" AS PERMISSIVE FOR SELECT TO "sep_migrator" USING (current_setting('sep.review_rpc',true)='true' AND "event_configurations"."organization_id" = nullif(current_setting('sep.organization_id', true), '')::uuid AND "event_configurations"."event_id"=nullif(current_setting('sep.event_id',true),'')::uuid);--> statement-breakpoint
CREATE POLICY "review_registry" ON "events" AS PERMISSIVE FOR SELECT TO "sep_migrator" USING (current_setting('sep.review_rpc',true)='true' AND "events"."organization_id" = nullif(current_setting('sep.organization_id', true), '')::uuid AND "events"."id"=nullif(current_setting('sep.event_id',true),'')::uuid);--> statement-breakpoint
CREATE POLICY "review_registry" ON "orcid_connections" AS PERMISSIVE FOR SELECT TO "sep_migrator" USING (current_setting('sep.review_rpc',true)='true' AND "orcid_connections"."person_id"=nullif(current_setting('sep.review_target',true),'')::uuid);--> statement-breakpoint
CREATE POLICY "review_registry" ON "work_collaborations" AS PERMISSIVE FOR SELECT TO "sep_migrator" USING (current_setting('sep.review_rpc',true)='true' AND "work_collaborations"."organization_id" = nullif(current_setting('sep.organization_id', true), '')::uuid AND "work_collaborations"."event_id"=nullif(current_setting('sep.event_id',true),'')::uuid);--> statement-breakpoint

CREATE POLICY "review_registry" ON "work_versions" AS PERMISSIVE FOR SELECT TO "sep_migrator" USING (current_setting('sep.review_rpc',true)='true' AND "work_versions"."organization_id" = nullif(current_setting('sep.organization_id', true), '')::uuid AND "work_versions"."event_id"=nullif(current_setting('sep.event_id',true),'')::uuid);--> statement-breakpoint
CREATE POLICY "review_registry" ON "review_assignments" AS PERMISSIVE FOR SELECT TO "sep_migrator" USING ("review_assignments"."organization_id" = nullif(current_setting('sep.organization_id', true), '')::uuid AND "review_assignments"."event_id"=nullif(current_setting('sep.event_id',true),'')::uuid AND current_setting('sep.review_rpc',true)='true');--> statement-breakpoint
CREATE POLICY "context_scope" ON "review_assignments" AS PERMISSIVE FOR ALL TO "sep_runtime" USING ("review_assignments"."organization_id" = nullif(current_setting('sep.organization_id', true), '')::uuid AND "review_assignments"."event_id"=nullif(current_setting('sep.event_id',true),'')::uuid AND current_setting('sep.submissions_staff',true)='true' OR ("review_assignments"."organization_id" = nullif(current_setting('sep.organization_id', true), '')::uuid AND "review_assignments"."event_id"=nullif(current_setting('sep.event_id',true),'')::uuid AND "review_assignments"."reviewer_id" = nullif(current_setting('sep.person_id', true), '')::uuid AND EXISTS(SELECT 1 FROM review_members m WHERE m.organization_id="review_assignments"."organization_id" AND m.event_id="review_assignments"."event_id" AND m.person_id="review_assignments"."reviewer_id" AND m.status='accepted'))) WITH CHECK ("review_assignments"."organization_id" = nullif(current_setting('sep.organization_id', true), '')::uuid AND "review_assignments"."event_id"=nullif(current_setting('sep.event_id',true),'')::uuid AND current_setting('sep.submissions_staff',true)='true' OR ("review_assignments"."organization_id" = nullif(current_setting('sep.organization_id', true), '')::uuid AND "review_assignments"."event_id"=nullif(current_setting('sep.event_id',true),'')::uuid AND "review_assignments"."reviewer_id" = nullif(current_setting('sep.person_id', true), '')::uuid AND EXISTS(SELECT 1 FROM review_members m WHERE m.organization_id="review_assignments"."organization_id" AND m.event_id="review_assignments"."event_id" AND m.person_id="review_assignments"."reviewer_id" AND m.status='accepted')));--> statement-breakpoint
CREATE POLICY "review_registry" ON "review_conflicts" AS PERMISSIVE FOR SELECT TO "sep_migrator" USING ("review_conflicts"."organization_id" = nullif(current_setting('sep.organization_id', true), '')::uuid AND "review_conflicts"."event_id"=nullif(current_setting('sep.event_id',true),'')::uuid AND current_setting('sep.review_rpc',true)='true');--> statement-breakpoint
CREATE POLICY "context_scope" ON "review_conflicts" AS PERMISSIVE FOR ALL TO "sep_runtime" USING ("review_conflicts"."organization_id" = nullif(current_setting('sep.organization_id', true), '')::uuid AND "review_conflicts"."event_id"=nullif(current_setting('sep.event_id',true),'')::uuid AND current_setting('sep.submissions_staff',true)='true' OR ("review_conflicts"."organization_id" = nullif(current_setting('sep.organization_id', true), '')::uuid AND "review_conflicts"."event_id"=nullif(current_setting('sep.event_id',true),'')::uuid AND "review_conflicts"."person_id" = nullif(current_setting('sep.person_id', true), '')::uuid)) WITH CHECK ("review_conflicts"."organization_id" = nullif(current_setting('sep.organization_id', true), '')::uuid AND "review_conflicts"."event_id"=nullif(current_setting('sep.event_id',true),'')::uuid AND current_setting('sep.submissions_staff',true)='true' OR ("review_conflicts"."organization_id" = nullif(current_setting('sep.organization_id', true), '')::uuid AND "review_conflicts"."event_id"=nullif(current_setting('sep.event_id',true),'')::uuid AND "review_conflicts"."person_id" = nullif(current_setting('sep.person_id', true), '')::uuid));--> statement-breakpoint
CREATE POLICY "review_registry" ON "review_members" AS PERMISSIVE FOR SELECT TO "sep_migrator" USING ("review_members"."organization_id" = nullif(current_setting('sep.organization_id', true), '')::uuid AND "review_members"."event_id"=nullif(current_setting('sep.event_id',true),'')::uuid AND current_setting('sep.review_rpc',true)='true');--> statement-breakpoint
CREATE POLICY "context_scope" ON "review_members" AS PERMISSIVE FOR ALL TO "sep_runtime" USING ("review_members"."organization_id" = nullif(current_setting('sep.organization_id', true), '')::uuid AND "review_members"."event_id"=nullif(current_setting('sep.event_id',true),'')::uuid AND current_setting('sep.submissions_staff',true)='true' OR ("review_members"."organization_id" = nullif(current_setting('sep.organization_id', true), '')::uuid AND "review_members"."event_id"=nullif(current_setting('sep.event_id',true),'')::uuid AND "review_members"."person_id" = nullif(current_setting('sep.person_id', true), '')::uuid)) WITH CHECK ("review_members"."organization_id" = nullif(current_setting('sep.organization_id', true), '')::uuid AND "review_members"."event_id"=nullif(current_setting('sep.event_id',true),'')::uuid AND current_setting('sep.submissions_staff',true)='true' OR ("review_members"."organization_id" = nullif(current_setting('sep.organization_id', true), '')::uuid AND "review_members"."event_id"=nullif(current_setting('sep.event_id',true),'')::uuid AND "review_members"."person_id" = nullif(current_setting('sep.person_id', true), '')::uuid));--> statement-breakpoint
CREATE POLICY "review_registry" ON "review_rounds" AS PERMISSIVE FOR SELECT TO "sep_migrator" USING ("review_rounds"."organization_id" = nullif(current_setting('sep.organization_id', true), '')::uuid AND "review_rounds"."event_id"=nullif(current_setting('sep.event_id',true),'')::uuid AND current_setting('sep.review_rpc',true)='true');--> statement-breakpoint
CREATE POLICY "review_staff" ON "review_rounds" AS PERMISSIVE FOR ALL TO "sep_runtime" USING ("review_rounds"."organization_id" = nullif(current_setting('sep.organization_id', true), '')::uuid AND "review_rounds"."event_id"=nullif(current_setting('sep.event_id',true),'')::uuid AND current_setting('sep.submissions_staff',true)='true') WITH CHECK ("review_rounds"."organization_id" = nullif(current_setting('sep.organization_id', true), '')::uuid AND "review_rounds"."event_id"=nullif(current_setting('sep.event_id',true),'')::uuid AND current_setting('sep.submissions_staff',true)='true');--> statement-breakpoint
CREATE POLICY "review_assigned" ON "review_rounds" AS PERMISSIVE FOR SELECT TO "sep_runtime" USING ("review_rounds"."organization_id" = nullif(current_setting('sep.organization_id', true), '')::uuid AND "review_rounds"."event_id"=nullif(current_setting('sep.event_id',true),'')::uuid AND EXISTS(SELECT 1 FROM review_assignments a WHERE a.round_id="review_rounds"."id" AND a.reviewer_id=nullif(current_setting('sep.person_id',true),'')::uuid));
--> statement-breakpoint
ALTER TABLE review_members FORCE ROW LEVEL SECURITY;
ALTER TABLE review_rounds FORCE ROW LEVEL SECURITY;
ALTER TABLE review_assignments FORCE ROW LEVEL SECURITY;
ALTER TABLE review_conflicts FORCE ROW LEVEL SECURITY;
GRANT SELECT,INSERT,UPDATE ON review_members,review_rounds,review_assignments,review_conflicts TO sep_runtime;
--> statement-breakpoint
CREATE FUNCTION sep_review_conflict(org uuid, event uuid, work uuid, reviewer uuid) RETURNS boolean
LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog AS $$
DECLARE old_flag text:=current_setting('sep.review_rpc',true); old_target text:=current_setting('sep.review_target',true); result boolean; target_orcid text; current_work public.author_works%ROWTYPE;
BEGIN
 IF org IS DISTINCT FROM nullif(current_setting('sep.organization_id',true),'')::uuid OR event IS DISTINCT FROM nullif(current_setting('sep.event_id',true),'')::uuid OR
 (reviewer IS DISTINCT FROM nullif(current_setting('sep.person_id',true),'')::uuid AND current_setting('sep.submissions_staff',true) IS DISTINCT FROM 'true') THEN RETURN true; END IF;
 PERFORM set_config('sep.review_rpc','true',true),set_config('sep.review_target',reviewer::text,true);
 SELECT * INTO current_work FROM public.author_works WHERE id=work AND organization_id=org AND event_id=event;
 SELECT orcid INTO target_orcid FROM public.orcid_connections WHERE person_id=reviewer AND environment='production' AND connected_at IS NOT NULL;
 result:=current_work.id IS NULL OR current_work.owner_id=reviewer OR EXISTS(SELECT 1 FROM public.review_conflicts c WHERE c.organization_id=org AND c.event_id=event AND c.work_id=work AND c.person_id=reviewer)
 OR EXISTS(SELECT 1 FROM public.work_collaborations c WHERE c.organization_id=org AND c.event_id=event AND c.work_id=work AND c.person_id=reviewer AND c.status='accepted')
 OR EXISTS(SELECT 1 FROM jsonb_array_elements(current_work.authors || coalesce(current_work.submitted_content->'authors','[]'::jsonb) || coalesce((SELECT jsonb_agg(a) FROM public.work_versions v CROSS JOIN LATERAL jsonb_array_elements(v.content->'authors') a WHERE v.organization_id=org AND v.event_id=event AND v.work_id=work),'[]'::jsonb)) a
 WHERE a->>'personId'=reviewer::text OR (target_orcid IS NOT NULL AND a->>'orcid'=target_orcid) OR
 (reviewer=nullif(current_setting('sep.person_id',true),'')::uuid AND nullif(current_setting('sep.review_email',true),'') IS NOT NULL AND lower(a->>'email')=lower(current_setting('sep.review_email',true))));
 PERFORM set_config('sep.review_rpc',coalesce(old_flag,''),true),set_config('sep.review_target',coalesce(old_target,''),true);
 RETURN result;
END $$;
REVOKE ALL ON FUNCTION sep_review_conflict(uuid,uuid,uuid,uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION sep_review_conflict(uuid,uuid,uuid,uuid) TO sep_runtime;
--> statement-breakpoint
CREATE FUNCTION sep_review_available(org uuid,event uuid,work uuid,version uuid,lock_work boolean) RETURNS boolean
LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog AS $$
DECLARE old_flag text:=current_setting('sep.review_rpc',true); current_work public.author_works%ROWTYPE; result boolean; actor uuid:=nullif(current_setting('sep.person_id',true),'')::uuid;
BEGIN
 IF org IS DISTINCT FROM nullif(current_setting('sep.organization_id',true),'')::uuid OR event IS DISTINCT FROM nullif(current_setting('sep.event_id',true),'')::uuid OR actor IS NULL THEN RETURN false; END IF;
 PERFORM set_config('sep.review_rpc','true',true);
 IF lock_work THEN SELECT * INTO current_work FROM public.author_works WHERE id=work AND organization_id=org AND event_id=event FOR UPDATE;
 ELSE SELECT * INTO current_work FROM public.author_works WHERE id=work AND organization_id=org AND event_id=event; END IF;
 result:=current_work.status IN ('submitted','in_review','final_submitted')
 AND EXISTS(SELECT 1 FROM public.events e WHERE e.organization_id=org AND e.id=event AND e.status<>'archived')
 AND NOT EXISTS(SELECT 1 FROM public.event_configurations c WHERE c.organization_id=org AND c.event_id=event AND c.lifecycle IN ('completed','cancelled'))
 AND version=(SELECT v.id FROM public.work_versions v WHERE v.organization_id=org AND v.event_id=event AND v.work_id=work ORDER BY v.number DESC LIMIT 1)
 AND EXISTS(SELECT 1 FROM public.review_members m WHERE m.organization_id=org AND m.event_id=event AND m.person_id=actor AND m.status='accepted')
 AND EXISTS(SELECT 1 FROM public.review_assignments a JOIN public.review_rounds r ON r.id=a.round_id WHERE a.organization_id=org AND a.event_id=event AND a.work_id=work AND a.reviewer_id=actor AND r.version_id=version AND r.status='open' AND a.status IN ('invited','accepted','submitted'))
 AND NOT public.sep_review_conflict(org,event,work,actor);
 PERFORM set_config('sep.review_rpc',coalesce(old_flag,''),true);
 RETURN coalesce(result,false);
END $$;
REVOKE ALL ON FUNCTION sep_review_available(uuid,uuid,uuid,uuid,boolean) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION sep_review_available(uuid,uuid,uuid,uuid,boolean) TO sep_runtime;
--> statement-breakpoint
CREATE FUNCTION sep_review_immutable() RETURNS trigger LANGUAGE plpgsql SET search_path=pg_catalog AS $$
BEGIN
 IF OLD.submitted_at IS NOT NULL AND (NEW.evaluation IS DISTINCT FROM OLD.evaluation OR NEW.submitted_at IS DISTINCT FROM OLD.submitted_at) THEN RAISE EXCEPTION 'Submitted evaluation is immutable' USING ERRCODE='42501'; END IF;
 IF NEW.content IS DISTINCT FROM OLD.content OR NEW.round_id IS DISTINCT FROM OLD.round_id OR NEW.reviewer_id IS DISTINCT FROM OLD.reviewer_id OR NEW.work_id IS DISTINCT FROM OLD.work_id OR NEW.organization_id IS DISTINCT FROM OLD.organization_id OR NEW.event_id IS DISTINCT FROM OLD.event_id THEN RAISE EXCEPTION 'Assigned version is immutable' USING ERRCODE='42501'; END IF;
 RETURN NEW;
END $$;
CREATE TRIGGER review_evaluation_immutable BEFORE UPDATE ON review_assignments FOR EACH ROW EXECUTE FUNCTION sep_review_immutable();
--> statement-breakpoint
CREATE POLICY "review_file_read" ON "work_files" AS PERMISSIVE FOR SELECT TO "sep_runtime" USING ("work_files"."organization_id" = nullif(current_setting('sep.organization_id', true), '')::uuid AND "work_files"."event_id"=nullif(current_setting('sep.event_id',true),'')::uuid AND EXISTS(SELECT 1 FROM review_assignments a JOIN review_rounds r ON r.id=a.round_id WHERE a.organization_id="work_files"."organization_id" AND a.event_id="work_files"."event_id" AND a.work_id="work_files"."work_id" AND a.reviewer_id=nullif(current_setting('sep.person_id',true),'')::uuid AND a.status IN ('accepted','submitted') AND a.content->'manuscript'->>'id'="work_files"."id"::text AND r.status='open' AND sep_review_available("work_files"."organization_id","work_files"."event_id","work_files"."work_id",r.version_id,false)));--> statement-breakpoint
