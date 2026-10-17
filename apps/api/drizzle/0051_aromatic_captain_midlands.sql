CREATE TABLE "review_response_checks" (
	"id" uuid PRIMARY KEY NOT NULL,
	"organization_id" uuid NOT NULL,
	"event_id" uuid NOT NULL,
	"work_id" uuid NOT NULL,
	"version_id" uuid NOT NULL,
	"assignment_id" uuid NOT NULL,
	"reviewer_id" uuid NOT NULL,
	"title" text NOT NULL,
	"version_number" integer NOT NULL,
	"source_version_number" integer NOT NULL,
	"number" integer NOT NULL,
	"content" jsonb NOT NULL,
	"revision" integer DEFAULT 1 NOT NULL,
	"verdict" text,
	"message" text DEFAULT '' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"assessed_at" timestamp with time zone,
	CONSTRAINT "review_response_checks_version_id_assignment_id_unique" UNIQUE("version_id","assignment_id"),
	CONSTRAINT "response_check_verdict" CHECK (("review_response_checks"."verdict" IS NULL AND "review_response_checks"."assessed_at" IS NULL) OR ("review_response_checks"."verdict" IN ('accepted','rejected') AND "review_response_checks"."assessed_at" IS NOT NULL AND length("review_response_checks"."message")>=10))
);
--> statement-breakpoint
ALTER TABLE "review_response_checks" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "work_history" ADD COLUMN "review_recipients" jsonb;--> statement-breakpoint
ALTER TABLE "review_response_checks" ADD CONSTRAINT "review_response_checks_assignment_id_review_assignments_id_fk" FOREIGN KEY ("assignment_id") REFERENCES "public"."review_assignments"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "review_response_checks" ADD CONSTRAINT "review_response_checks_organization_id_event_id_work_id_version_id_work_versions_organization_id_event_id_work_id_id_fk" FOREIGN KEY ("organization_id","event_id","work_id","version_id") REFERENCES "public"."work_versions"("organization_id","event_id","work_id","id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "review_response_checks" ADD CONSTRAINT "review_response_checks_organization_id_event_id_reviewer_id_review_members_organization_id_event_id_person_id_fk" FOREIGN KEY ("organization_id","event_id","reviewer_id") REFERENCES "public"."review_members"("organization_id","event_id","person_id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "response_checks_reviewer_event_idx" ON "review_response_checks" USING btree ("organization_id","event_id","reviewer_id");--> statement-breakpoint
CREATE POLICY "review_registry" ON "work_history" AS PERMISSIVE FOR SELECT TO "sep_migrator" USING (current_setting('sep.review_rpc',true)='true' AND "work_history"."organization_id" = nullif(current_setting('sep.organization_id', true), '')::uuid AND "work_history"."event_id"=nullif(current_setting('sep.event_id',true),'')::uuid);--> statement-breakpoint
CREATE POLICY "review_registry" ON "review_response_checks" AS PERMISSIVE FOR ALL TO "sep_migrator" USING ("review_response_checks"."organization_id" = nullif(current_setting('sep.organization_id', true), '')::uuid AND "review_response_checks"."event_id"=nullif(current_setting('sep.event_id',true),'')::uuid AND current_setting('sep.review_rpc',true)='true') WITH CHECK ("review_response_checks"."organization_id" = nullif(current_setting('sep.organization_id', true), '')::uuid AND "review_response_checks"."event_id"=nullif(current_setting('sep.event_id',true),'')::uuid AND current_setting('sep.review_rpc',true)='true');--> statement-breakpoint
CREATE POLICY "context_scope" ON "review_response_checks" AS PERMISSIVE FOR ALL TO "sep_runtime" USING ("review_response_checks"."organization_id" = nullif(current_setting('sep.organization_id', true), '')::uuid AND "review_response_checks"."event_id"=nullif(current_setting('sep.event_id',true),'')::uuid AND current_setting('sep.submissions_staff',true)='true' OR ("review_response_checks"."organization_id" = nullif(current_setting('sep.organization_id', true), '')::uuid AND "review_response_checks"."event_id"=nullif(current_setting('sep.event_id',true),'')::uuid AND "review_response_checks"."reviewer_id" = nullif(current_setting('sep.person_id', true), '')::uuid AND EXISTS(SELECT 1 FROM review_members m WHERE m.organization_id="review_response_checks"."organization_id" AND m.event_id="review_response_checks"."event_id" AND m.person_id="review_response_checks"."reviewer_id" AND m.status='accepted'))) WITH CHECK ("review_response_checks"."organization_id" = nullif(current_setting('sep.organization_id', true), '')::uuid AND "review_response_checks"."event_id"=nullif(current_setting('sep.event_id',true),'')::uuid AND current_setting('sep.submissions_staff',true)='true' OR ("review_response_checks"."organization_id" = nullif(current_setting('sep.organization_id', true), '')::uuid AND "review_response_checks"."event_id"=nullif(current_setting('sep.event_id',true),'')::uuid AND "review_response_checks"."reviewer_id" = nullif(current_setting('sep.person_id', true), '')::uuid AND EXISTS(SELECT 1 FROM review_members m WHERE m.organization_id="review_response_checks"."organization_id" AND m.event_id="review_response_checks"."event_id" AND m.person_id="review_response_checks"."reviewer_id" AND m.status='accepted')));
--> statement-breakpoint
ALTER TABLE review_response_checks FORCE ROW LEVEL SECURITY;
GRANT SELECT ON review_response_checks TO sep_runtime;
GRANT UPDATE (verdict,message,assessed_at,revision) ON review_response_checks TO sep_runtime;
CREATE FUNCTION sep_review_response_sync(org uuid,event uuid,work uuid) RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog AS $$
DECLARE actor uuid:=nullif(current_setting('sep.person_id',true),'')::uuid; old_flag text:=current_setting('sep.review_rpc',true); v public.work_versions%ROWTYPE; h public.work_history%ROWTYPE; w public.author_works%ROWTYPE; recipient jsonb; recipients jsonb; candidate jsonb; matches integer:=0; source public.review_assignments%ROWTYPE; item record; response jsonb;
BEGIN
 IF actor IS NULL OR org IS DISTINCT FROM nullif(current_setting('sep.organization_id',true),'')::uuid OR event IS DISTINCT FROM nullif(current_setting('sep.event_id',true),'')::uuid THEN RETURN; END IF;
 PERFORM set_config('sep.review_rpc','true',true);
 IF work IS NULL THEN
  IF EXISTS(SELECT 1 FROM public.review_members m WHERE m.organization_id=org AND m.event_id=event AND m.person_id=actor AND m.status='accepted') THEN
   FOR item IN SELECT DISTINCT a.work_id FROM public.review_assignments a WHERE a.organization_id=org AND a.event_id=event AND a.reviewer_id=actor AND a.submitted_at IS NOT NULL LOOP PERFORM public.sep_review_response_sync(org,event,item.work_id); END LOOP;
  END IF;
  PERFORM set_config('sep.review_rpc',coalesce(old_flag,''),true);RETURN;
 END IF;
 SELECT * INTO w FROM public.author_works WHERE organization_id=org AND event_id=event AND id=work;
 IF w.id IS NULL OR w.hidden OR NOT(w.owner_id=actor OR EXISTS(SELECT 1 FROM public.work_collaborations c WHERE c.organization_id=org AND c.event_id=event AND c.work_id=work AND c.person_id=actor AND c.status='accepted') OR EXISTS(SELECT 1 FROM public.review_assignments a WHERE a.organization_id=org AND a.event_id=event AND a.work_id=work AND a.reviewer_id=actor AND a.submitted_at IS NOT NULL)) THEN PERFORM set_config('sep.review_rpc',coalesce(old_flag,''),true);RETURN; END IF;
 SELECT * INTO v FROM public.work_versions WHERE organization_id=org AND event_id=event AND work_id=work ORDER BY number DESC LIMIT 1;response:=v.content->'reviewResponse';
 IF response IS NULL THEN PERFORM set_config('sep.review_rpc',coalesce(old_flag,''),true);RETURN; END IF;
 SELECT * INTO h FROM public.work_history p WHERE p.organization_id=org AND p.event_id=event AND p.work_id=work AND p.action='peer_reviews_released' AND p.actor='staff' AND p.message=response->>'feedbackMessage' AND ((response->>'feedbackId' IS NOT NULL AND p.id=(response->>'feedbackId')::uuid) OR (response->>'feedbackId' IS NULL AND p.created_at<=(SELECT d.created_at FROM public.work_history d WHERE d.organization_id=org AND d.event_id=event AND d.work_id=work AND d.id=(response->>'decisionId')::uuid))) ORDER BY p.created_at DESC,p.id DESC LIMIT 1;
 IF h.id IS NULL THEN PERFORM set_config('sep.review_rpc',coalesce(old_flag,''),true);RETURN; END IF;
 recipients:=h.review_recipients;
 -- Legacy mapping is recovered only when the complete published text matches one round exactly.
 IF recipients IS NULL THEN
  FOR item IN SELECT r.id FROM public.review_rounds r WHERE r.organization_id=org AND r.event_id=event AND r.work_id=work AND r.version_number=(response->>'versionNumber')::integer AND (response->>'roundNumber' IS NULL OR r.number=(response->>'roundNumber')::integer) LOOP
   SELECT jsonb_agg(jsonb_build_object('assignmentId',a.id,'reviewerId',a.reviewer_id,'number',a.n) ORDER BY a.n) INTO candidate FROM (SELECT x.*,row_number() OVER(ORDER BY x.id) n FROM public.review_assignments x WHERE x.round_id=item.id AND x.submitted_at IS NOT NULL) a HAVING string_agg('Evaluación / Review '||a.n||E'\n'||(a.evaluation->>'authorComments'),E'\n\n' ORDER BY a.n)=h.message;
   IF candidate IS NOT NULL THEN matches:=matches+1;recipients:=candidate; END IF;
  END LOOP;
  IF matches<>1 THEN PERFORM set_config('sep.review_rpc',coalesce(old_flag,''),true);RETURN; END IF;
 END IF;
 FOR recipient IN SELECT value FROM jsonb_array_elements(recipients) LOOP
  SELECT * INTO source FROM public.review_assignments a WHERE a.organization_id=org AND a.event_id=event AND a.work_id=work AND a.id=(recipient->>'assignmentId')::uuid AND a.reviewer_id=(recipient->>'reviewerId')::uuid AND a.submitted_at IS NOT NULL;
  IF source.id IS NULL THEN CONTINUE; END IF;
  INSERT INTO public.review_response_checks(id,organization_id,event_id,work_id,version_id,assignment_id,reviewer_id,title,version_number,source_version_number,number,content)
  VALUES(gen_random_uuid(),org,event,work,v.id,source.id,source.reviewer_id,v.content->>'title',v.number,(response->>'versionNumber')::integer,(recipient->>'number')::integer,jsonb_build_object('summary',response->>'summary','observation',source.evaluation->>'authorComments','reply',coalesce((SELECT reply->>'text' FROM jsonb_array_elements(coalesce(response->'replies','[]'::jsonb)) reply WHERE (reply->>'number')::integer=(recipient->>'number')::integer),''),'decisionMessage',response->>'decisionMessage')) ON CONFLICT(version_id,assignment_id) DO NOTHING;
 END LOOP;
 PERFORM set_config('sep.review_rpc',coalesce(old_flag,''),true);
END $$;
REVOKE ALL ON FUNCTION sep_review_response_sync(uuid,uuid,uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION sep_review_response_sync(uuid,uuid,uuid) TO sep_runtime;
--> statement-breakpoint
CREATE FUNCTION sep_review_response_access(org uuid,event uuid,check_id uuid,lock_work boolean) RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog AS $$
DECLARE actor uuid:=nullif(current_setting('sep.person_id',true),'')::uuid; old_flag text:=current_setting('sep.review_rpc',true); q public.review_response_checks%ROWTYPE; w public.author_works%ROWTYPE; readable boolean:=false; assessable boolean:=false;
BEGIN
 IF actor IS NULL OR org IS DISTINCT FROM nullif(current_setting('sep.organization_id',true),'')::uuid OR event IS DISTINCT FROM nullif(current_setting('sep.event_id',true),'')::uuid THEN RETURN jsonb_build_object('read',false,'assess',false); END IF;
 PERFORM set_config('sep.review_rpc','true',true);
 SELECT * INTO q FROM public.review_response_checks WHERE organization_id=org AND event_id=event AND id=check_id AND reviewer_id=actor;
 IF q.id IS NOT NULL THEN
  IF lock_work THEN SELECT * INTO w FROM public.author_works WHERE organization_id=org AND event_id=event AND id=q.work_id FOR UPDATE;
  ELSE SELECT * INTO w FROM public.author_works WHERE organization_id=org AND event_id=event AND id=q.work_id; END IF;
  readable:=w.id IS NOT NULL AND NOT w.hidden AND w.status<>'withdrawn'
   AND EXISTS(SELECT 1 FROM public.events e WHERE e.organization_id=org AND e.id=event AND e.status<>'archived')
   AND NOT EXISTS(SELECT 1 FROM public.event_configurations c WHERE c.organization_id=org AND c.event_id=event AND c.lifecycle IN ('completed','cancelled'))
   AND EXISTS(SELECT 1 FROM public.review_members m WHERE m.organization_id=org AND m.event_id=event AND m.person_id=actor AND m.status='accepted')
   AND EXISTS(SELECT 1 FROM public.review_assignments a WHERE a.id=q.assignment_id AND a.status='submitted') AND NOT public.sep_review_conflict(org,event,q.work_id,actor);
  assessable:=readable AND w.status IN ('submitted','in_review','final_submitted') AND q.verdict IS NULL AND q.version_id=(SELECT v.id FROM public.work_versions v WHERE v.organization_id=org AND v.event_id=event AND v.work_id=q.work_id ORDER BY v.number DESC LIMIT 1);
 END IF;
 PERFORM set_config('sep.review_rpc',coalesce(old_flag,''),true);
 RETURN jsonb_build_object('read',coalesce(readable,false),'assess',coalesce(assessable,false));
END $$;
REVOKE ALL ON FUNCTION sep_review_response_access(uuid,uuid,uuid,boolean) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION sep_review_response_access(uuid,uuid,uuid,boolean) TO sep_runtime;
--> statement-breakpoint
CREATE FUNCTION sep_response_check_immutable() RETURNS trigger LANGUAGE plpgsql SET search_path=pg_catalog AS $$
BEGIN
 IF OLD.verdict IS NOT NULL OR NEW.content IS DISTINCT FROM OLD.content OR NEW.version_id<>OLD.version_id OR NEW.assignment_id<>OLD.assignment_id OR NEW.reviewer_id<>OLD.reviewer_id OR NEW.work_id<>OLD.work_id OR NEW.organization_id<>OLD.organization_id OR NEW.event_id<>OLD.event_id OR NEW.title<>OLD.title OR NEW.number<>OLD.number OR NEW.version_number<>OLD.version_number OR NEW.source_version_number<>OLD.source_version_number OR NEW.created_at<>OLD.created_at THEN RAISE EXCEPTION 'Response assessment is immutable' USING ERRCODE='42501'; END IF;
 IF NEW.reviewer_id IS DISTINCT FROM nullif(current_setting('sep.person_id',true),'')::uuid OR NOT coalesce((public.sep_review_response_access(NEW.organization_id,NEW.event_id,NEW.id,false)->>'assess')::boolean,false) THEN RAISE EXCEPTION 'Response assessment unavailable' USING ERRCODE='42501'; END IF;
 RETURN NEW;
END $$;
CREATE TRIGGER response_check_immutable BEFORE UPDATE ON review_response_checks FOR EACH ROW EXECUTE FUNCTION sep_response_check_immutable();
