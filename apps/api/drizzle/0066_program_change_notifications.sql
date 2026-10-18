-- Notify people removed from a newly published programme as well as its new participants.
CREATE FUNCTION sep_communications_program_previous() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog AS $$
DECLARE previous text:=current_setting('sep.communication_rpc',true);p uuid;source text;
BEGIN
 IF NEW.organization_id IS DISTINCT FROM nullif(current_setting('sep.organization_id',true),'')::uuid OR NEW.event_id IS DISTINCT FROM nullif(current_setting('sep.event_id',true),'')::uuid THEN RETURN NEW; END IF;
 PERFORM set_config('sep.communication_rpc','true',true);
 source:='program:'||NEW.event_id||':'||NEW.revision||':'||NEW.published_at::text;
 FOR p IN SELECT DISTINCT (value#>>'{}')::uuid FROM (
  SELECT value FROM jsonb_path_query(OLD.snapshot,'$.sessions[*].slots[*].presenterPersonId') value
  UNION SELECT value FROM jsonb_path_query(OLD.snapshot,'$.sessions[*].moderatorIds[*]') value
  UNION SELECT value FROM jsonb_path_query(OLD.snapshot,'$.sessions[*].participants[*].personId') value
  UNION SELECT value FROM jsonb_path_query(OLD.snapshot,'$.activities[*].coordinatorIds[*]') value
 ) recipients WHERE jsonb_typeof(value)='string'
 LOOP PERFORM public.sep_enqueue_notice(NEW.organization_id,NEW.event_id,p,source,'program.published','participation',NULL); END LOOP;
 PERFORM set_config('sep.communication_rpc',coalesce(previous,''),true);RETURN NEW;
END $$;
REVOKE ALL ON FUNCTION sep_communications_program_previous() FROM PUBLIC;
CREATE TRIGGER communications_program_previous BEFORE UPDATE ON program_publications FOR EACH ROW EXECUTE FUNCTION sep_communications_program_previous();
--> statement-breakpoint
CREATE OR REPLACE FUNCTION sep_communications_audit() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog AS $$
DECLARE previous text:=current_setting('sep.communication_rpc',true); p uuid; r record; source text;
BEGIN
 IF NEW.event_id IS NULL OR NEW.organization_id IS DISTINCT FROM nullif(current_setting('sep.organization_id',true),'')::uuid OR NEW.event_id IS DISTINCT FROM nullif(current_setting('sep.event_id',true),'')::uuid THEN RETURN NEW; END IF;
 PERFORM set_config('sep.communication_rpc','true',true);
 source:='audit:'||NEW.id;
 CASE NEW.action
 WHEN 'work.decision','review.released' THEN
  PERFORM public.sep_notice_audience(NEW.organization_id,NEW.event_id,source,NEW.action,'works',NEW.resource_id,'authors');
 WHEN 'work.submitted','work.withdrawn' THEN
  PERFORM public.sep_notice_audience(NEW.organization_id,NEW.event_id,source,NEW.action,'submissions',NEW.resource_id,'staff');
 WHEN 'review.member.invited' THEN
  PERFORM public.sep_enqueue_notice(NEW.organization_id,NEW.event_id,NEW.resource_id,source,NEW.action,'reviews',NULL);
 WHEN 'review.assigned' THEN
  FOR r IN SELECT id,reviewer_id,revision FROM public.review_assignments WHERE organization_id=NEW.organization_id AND event_id=NEW.event_id AND work_id=NEW.resource_id AND status='invited'
  LOOP PERFORM public.sep_enqueue_notice(NEW.organization_id,NEW.event_id,r.reviewer_id,'assignment:'||r.id||':'||r.revision,NEW.action,'reviews',r.id); END LOOP;
 WHEN 'review.assignment.revoked' THEN
  SELECT reviewer_id INTO p FROM public.review_assignments WHERE organization_id=NEW.organization_id AND event_id=NEW.event_id AND id=NEW.resource_id;
  PERFORM public.sep_enqueue_notice(NEW.organization_id,NEW.event_id,p,source,NEW.action,'reviews',NEW.resource_id);
 WHEN 'review.deadline.extended' THEN
  PERFORM public.sep_notice_audience(NEW.organization_id,NEW.event_id,source,NEW.action,'reviews',NEW.resource_id,'round');
 WHEN 'review.submitted' THEN
  SELECT work_id INTO p FROM public.review_assignments WHERE organization_id=NEW.organization_id AND event_id=NEW.event_id AND id=NEW.resource_id;
  PERFORM public.sep_notice_audience(NEW.organization_id,NEW.event_id,source,NEW.action,'submissions',p,'staff');
 WHEN 'review.response.assessed' THEN
  SELECT work_id INTO p FROM public.review_response_checks WHERE organization_id=NEW.organization_id AND event_id=NEW.event_id AND id=NEW.resource_id;
  PERFORM public.sep_notice_audience(NEW.organization_id,NEW.event_id,source,NEW.action,'submissions',p,'staff');
 WHEN 'registration.requested' THEN
  PERFORM public.sep_notice_audience(NEW.organization_id,NEW.event_id,source,NEW.action,'registrations',NEW.resource_id,'staff');
  SELECT person_id INTO p FROM public.registration_entries WHERE organization_id=NEW.organization_id AND event_id=NEW.event_id AND id=NEW.resource_id;
  PERFORM public.sep_enqueue_notice(NEW.organization_id,NEW.event_id,p,source,'registration.decided','registration',NEW.resource_id);
 WHEN 'registration.decided','registration.cancelled' THEN
  SELECT person_id INTO p FROM public.registration_entries WHERE organization_id=NEW.organization_id AND event_id=NEW.event_id AND id=NEW.resource_id;
  PERFORM public.sep_enqueue_notice(NEW.organization_id,NEW.event_id,p,source,'registration.decided','registration',NEW.resource_id);
 WHEN 'certificate.issued','certificate.revoked' THEN
  SELECT person_id INTO p FROM public.certificates WHERE organization_id=NEW.organization_id AND event_id=NEW.event_id AND id=NEW.resource_id;
  PERFORM public.sep_enqueue_notice(NEW.organization_id,NEW.event_id,p,source,NEW.action,'certificates',NEW.resource_id);
 WHEN 'program.published','program.withdrawn' THEN
  IF NEW.action='program.published' THEN SELECT 'program:'||event_id||':'||revision||':'||published_at::text INTO source FROM public.program_publications WHERE organization_id=NEW.organization_id AND event_id=NEW.event_id;END IF;
  PERFORM public.sep_notice_audience(NEW.organization_id,NEW.event_id,source,NEW.action,'participation',NULL,'participants');
  FOR p IN SELECT DISTINCT (v#>>'{}')::uuid FROM public.program_publications pp CROSS JOIN LATERAL jsonb_path_query(pp.snapshot,'$.sessions[*].slots[*].presenterPersonId') v WHERE pp.organization_id=NEW.organization_id AND pp.event_id=NEW.event_id AND jsonb_typeof(v)='string'
  LOOP PERFORM public.sep_enqueue_notice(NEW.organization_id,NEW.event_id,p,source,NEW.action,'participation',NULL); END LOOP;
  FOR p IN SELECT DISTINCT (v#>>'{}')::uuid FROM public.program_publications pp CROSS JOIN LATERAL jsonb_path_query(pp.snapshot,'$.sessions[*].moderatorIds[*]') v WHERE pp.organization_id=NEW.organization_id AND pp.event_id=NEW.event_id
  LOOP PERFORM public.sep_enqueue_notice(NEW.organization_id,NEW.event_id,p,source,NEW.action,'participation',NULL); END LOOP;
  FOR p IN SELECT DISTINCT (v#>>'{}')::uuid FROM public.program_publications pp CROSS JOIN LATERAL jsonb_path_query(pp.snapshot,'$.sessions[*].participants[*].personId') v WHERE pp.organization_id=NEW.organization_id AND pp.event_id=NEW.event_id
  LOOP PERFORM public.sep_enqueue_notice(NEW.organization_id,NEW.event_id,p,source,NEW.action,'participation',NULL); END LOOP;
  FOR p IN SELECT DISTINCT (v#>>'{}')::uuid FROM public.program_publications pp CROSS JOIN LATERAL jsonb_path_query(pp.snapshot,'$.activities[*].coordinatorIds[*]') v WHERE pp.organization_id=NEW.organization_id AND pp.event_id=NEW.event_id
  LOOP PERFORM public.sep_enqueue_notice(NEW.organization_id,NEW.event_id,p,source,NEW.action,'participation',NULL); END LOOP;
 ELSE NULL;
 END CASE;
 PERFORM set_config('sep.communication_rpc',coalesce(previous,''),true); RETURN NEW;
END $$;
