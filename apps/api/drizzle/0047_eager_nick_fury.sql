CREATE INDEX "review_reviewer_event_idx" ON "review_assignments" USING btree ("organization_id","event_id","reviewer_id");--> statement-breakpoint
CREATE POLICY "review_registry" ON "people" AS PERMISSIVE FOR SELECT TO "sep_migrator" USING (current_setting('sep.review_rpc',true)='true' AND "people"."id" = nullif(current_setting('sep.person_id', true), '')::uuid);
--> statement-breakpoint
CREATE OR REPLACE FUNCTION sep_review_available(org uuid,event uuid,work uuid,version uuid,lock_work boolean) RETURNS boolean
LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog AS $$
DECLARE old_flag text:=current_setting('sep.review_rpc',true); current_work public.author_works%ROWTYPE; result boolean; actor uuid:=nullif(current_setting('sep.person_id',true),'')::uuid;
BEGIN
 IF org IS DISTINCT FROM nullif(current_setting('sep.organization_id',true),'')::uuid OR event IS DISTINCT FROM nullif(current_setting('sep.event_id',true),'')::uuid OR actor IS NULL THEN RETURN false; END IF;
 PERFORM set_config('sep.review_rpc','true',true);
 IF lock_work THEN SELECT * INTO current_work FROM public.author_works WHERE id=work AND organization_id=org AND event_id=event FOR UPDATE;
 ELSE SELECT * INTO current_work FROM public.author_works WHERE id=work AND organization_id=org AND event_id=event; END IF;
 result:=EXISTS(SELECT 1 FROM public.people p WHERE p.id=actor AND p.active) AND current_work.status IN ('submitted','in_review','final_submitted')
 AND EXISTS(SELECT 1 FROM public.events e WHERE e.organization_id=org AND e.id=event AND e.status='published')
 AND NOT EXISTS(SELECT 1 FROM public.event_configurations c WHERE c.organization_id=org AND c.event_id=event AND c.lifecycle IN ('completed','cancelled'))
 AND version=(SELECT v.id FROM public.work_versions v WHERE v.organization_id=org AND v.event_id=event AND v.work_id=work ORDER BY v.number DESC LIMIT 1)
 AND EXISTS(SELECT 1 FROM public.review_members m WHERE m.organization_id=org AND m.event_id=event AND m.person_id=actor AND m.status='accepted')
 AND EXISTS(SELECT 1 FROM public.review_assignments a JOIN public.review_rounds r ON r.id=a.round_id WHERE a.organization_id=org AND a.event_id=event AND a.work_id=work AND a.reviewer_id=actor AND r.version_id=version AND r.status='open' AND r.deadline >= (now() AT TIME ZONE r.timezone)::date AND a.status IN ('invited','accepted','submitted'))
 AND NOT public.sep_review_conflict(org,event,work,actor);
 PERFORM set_config('sep.review_rpc',coalesce(old_flag,''),true);
 RETURN coalesce(result,false);
END $$;

--> statement-breakpoint
CREATE FUNCTION sep_review_round_immutable() RETURNS trigger LANGUAGE plpgsql SET search_path=pg_catalog AS $$
BEGIN
 IF NEW.version_id IS DISTINCT FROM OLD.version_id OR NEW.version_number IS DISTINCT FROM OLD.version_number OR NEW.work_id IS DISTINCT FROM OLD.work_id OR NEW.organization_id IS DISTINCT FROM OLD.organization_id OR NEW.event_id IS DISTINCT FROM OLD.event_id OR NEW.number IS DISTINCT FROM OLD.number OR NEW.criteria IS DISTINCT FROM OLD.criteria OR NEW.timezone IS DISTINCT FROM OLD.timezone OR NEW.minimum_reviews IS DISTINCT FROM OLD.minimum_reviews OR NEW.deadline IS DISTINCT FROM OLD.deadline THEN RAISE EXCEPTION 'Review round snapshot is immutable' USING ERRCODE='42501'; END IF;
 RETURN NEW;
END $$;
CREATE TRIGGER review_round_snapshot_immutable BEFORE UPDATE ON review_rounds FOR EACH ROW EXECUTE FUNCTION sep_review_round_immutable();
