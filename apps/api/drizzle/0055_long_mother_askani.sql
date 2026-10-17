ALTER TABLE "review_rounds" ADD COLUMN "deadline_extensions" jsonb DEFAULT '[]'::jsonb NOT NULL;--> statement-breakpoint
ALTER TABLE "review_rounds" ADD CONSTRAINT "review_deadline_extensions_limit" CHECK (jsonb_typeof("review_rounds"."deadline_extensions")='array' AND jsonb_array_length("review_rounds"."deadline_extensions")<=20);
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
 AND EXISTS(SELECT 1 FROM public.review_assignments a JOIN public.review_rounds r ON r.id=a.round_id WHERE a.organization_id=org AND a.event_id=event AND a.work_id=work AND a.reviewer_id=actor AND r.version_id=version AND r.status='open' AND coalesce(r.deadline_extensions->-1->>'deadline',r.deadline::text)::date >= (now() AT TIME ZONE r.timezone)::date AND a.status IN ('invited','accepted','submitted'))
 AND NOT public.sep_review_conflict(org,event,work,actor);
 PERFORM set_config('sep.review_rpc',coalesce(old_flag,''),true);
 RETURN coalesce(result,false);
END $$;

--> statement-breakpoint
CREATE OR REPLACE FUNCTION sep_review_waiting(org uuid,event uuid,work uuid,version uuid,lock_work boolean) RETURNS boolean
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
 AND EXISTS(SELECT 1 FROM public.review_assignments a JOIN public.review_rounds r ON r.id=a.round_id WHERE a.organization_id=org AND a.event_id=event AND a.work_id=work AND a.reviewer_id=actor AND r.version_id=version AND r.status='open' AND a.status IN ('invited','accepted','submitted'))
 AND NOT public.sep_review_conflict(org,event,work,actor);
 PERFORM set_config('sep.review_rpc',coalesce(old_flag,''),true);
 RETURN coalesce(result,false);
END $$;

--> statement-breakpoint
REVOKE ALL ON FUNCTION sep_review_waiting(uuid,uuid,uuid,uuid,boolean) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION sep_review_waiting(uuid,uuid,uuid,uuid,boolean) TO sep_runtime;
--> statement-breakpoint
CREATE FUNCTION sep_review_deadline_append() RETURNS trigger LANGUAGE plpgsql SET search_path=pg_catalog AS $$
DECLARE n integer; item jsonb; previous text;
BEGIN
 IF NEW.deadline_extensions IS NOT DISTINCT FROM OLD.deadline_extensions THEN RETURN NEW; END IF;
 n:=jsonb_array_length(NEW.deadline_extensions);
 IF current_setting('sep.submissions_staff',true) IS DISTINCT FROM 'true' OR OLD.status<>'open' OR NEW.status<>'open' OR NEW.revision<>OLD.revision+1 OR n<>jsonb_array_length(OLD.deadline_extensions)+1 OR n>20 OR NEW.deadline_extensions-(n-1) IS DISTINCT FROM OLD.deadline_extensions THEN RAISE EXCEPTION 'Invalid deadline extension' USING ERRCODE='42501'; END IF;
 item:=NEW.deadline_extensions->-1; previous:=coalesce(OLD.deadline_extensions->-1->>'deadline',OLD.deadline::text);
 IF item->>'previousDeadline' IS DISTINCT FROM previous OR item->>'deadline' IS NULL OR (item->>'deadline')::date<=previous::date OR (item->>'deadline')::date<(now() AT TIME ZONE OLD.timezone)::date OR item->>'message' IS NULL OR length(btrim(item->>'message')) NOT BETWEEN 10 AND 2000 OR item->>'createdAt' IS NULL THEN RAISE EXCEPTION 'Invalid deadline extension details' USING ERRCODE='42501'; END IF;
 IF NOT EXISTS(SELECT 1 FROM public.author_works w WHERE w.id=OLD.work_id AND w.status IN ('submitted','in_review','final_submitted')) OR EXISTS(SELECT 1 FROM public.work_versions v WHERE v.work_id=OLD.work_id AND v.number>OLD.version_number) THEN RAISE EXCEPTION 'Inactive review round' USING ERRCODE='42501'; END IF;
 RETURN NEW;
END $$;
CREATE TRIGGER review_deadline_append BEFORE UPDATE ON review_rounds FOR EACH ROW EXECUTE FUNCTION sep_review_deadline_append();
