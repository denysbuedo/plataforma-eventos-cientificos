-- All notices and queue entries commit with their originating business action.
ALTER TABLE communication_contacts FORCE ROW LEVEL SECURITY;
ALTER TABLE notification_preferences FORCE ROW LEVEL SECURITY;
ALTER TABLE event_notifications FORCE ROW LEVEL SECURITY;
ALTER TABLE mail_deliveries FORCE ROW LEVEL SECURITY;
ALTER TABLE mail_attempts FORCE ROW LEVEL SECURITY;
ALTER TABLE event_announcements FORCE ROW LEVEL SECURITY;
GRANT SELECT,INSERT,UPDATE ON communication_contacts,notification_preferences TO sep_runtime;
GRANT SELECT ON event_notifications,mail_deliveries,mail_attempts,event_announcements TO sep_runtime;
GRANT UPDATE(read_at) ON event_notifications TO sep_runtime;
GRANT INSERT ON event_announcements TO sep_runtime;
CREATE TRIGGER mail_attempt_immutable BEFORE UPDATE OR DELETE ON mail_attempts FOR EACH ROW EXECUTE FUNCTION sep_registration_history_immutable();
CREATE TRIGGER announcement_immutable BEFORE UPDATE OR DELETE ON event_announcements FOR EACH ROW EXECUTE FUNCTION sep_registration_history_immutable();
--> statement-breakpoint
CREATE FUNCTION sep_enqueue_notice(o uuid,e uuid,p uuid,k text,kind text,target text,resource uuid,category text DEFAULT 'operational',es text DEFAULT '',en text DEFAULT '') RETURNS void LANGUAGE plpgsql SET search_path=pg_catalog AS $$
DECLARE n uuid;
BEGIN
 IF p IS NULL THEN RETURN; END IF;
 INSERT INTO public.event_notifications(id,organization_id,event_id,person_id,source_key,kind,target,resource_id,category,message_es,message_en)
 VALUES(gen_random_uuid(),o,e,p,k,kind,target,resource,category,es,en) ON CONFLICT(organization_id,event_id,source_key,person_id) DO NOTHING RETURNING id INTO n;
 IF n IS NOT NULL THEN INSERT INTO public.mail_deliveries(id,organization_id,event_id,notification_id) VALUES(gen_random_uuid(),o,e,n); END IF;
END $$;
REVOKE ALL ON FUNCTION sep_enqueue_notice(uuid,uuid,uuid,text,text,text,uuid,text,text,text) FROM PUBLIC;
--> statement-breakpoint
CREATE FUNCTION sep_notice_audience(o uuid,e uuid,source text,kind text,target text,resource uuid,audience text) RETURNS void LANGUAGE plpgsql SET search_path=pg_catalog AS $$
DECLARE p uuid;label text:='';
BEGIN
 IF audience IN ('authors','staff') AND resource IS NOT NULL THEN SELECT title INTO label FROM public.author_works WHERE organization_id=o AND event_id=e AND id=resource;END IF;
 FOR p IN
  SELECT DISTINCT id FROM (
   SELECT w.owner_id id FROM public.author_works w WHERE audience='authors' AND w.organization_id=o AND w.event_id=e AND w.id=resource
   UNION SELECT c.person_id FROM public.work_collaborations c WHERE audience='authors' AND c.organization_id=o AND c.event_id=e AND c.work_id=resource AND c.status='accepted'
   UNION SELECT m.person_id FROM public.memberships m JOIN public.role_assignments r ON r.membership_id=m.id WHERE audience='staff' AND m.organization_id=o AND m.event_id=e AND m.active AND r.active AND r.role='organizer' AND r.valid_from<=now() AND (r.valid_until IS NULL OR r.valid_until>now())
   UNION SELECT x.person_id FROM public.registration_entries x WHERE audience='participants' AND x.organization_id=o AND x.event_id=e AND x.status='confirmed'
   UNION SELECT w.owner_id FROM public.author_works w WHERE audience='participants' AND w.organization_id=o AND w.event_id=e AND w.status IN ('accepted','final_requested','final_submitted')
   UNION SELECT a.reviewer_id FROM public.review_assignments a WHERE audience='round' AND a.organization_id=o AND a.event_id=e AND a.round_id=resource AND a.status IN ('invited','accepted')
  ) recipients WHERE id IS NOT NULL
 LOOP PERFORM public.sep_enqueue_notice(o,e,p,source,kind,target,resource,'operational',coalesce(label,''),coalesce(label,'')); END LOOP;
END $$;
REVOKE ALL ON FUNCTION sep_notice_audience(uuid,uuid,text,text,text,uuid,text) FROM PUBLIC;
--> statement-breakpoint
CREATE FUNCTION sep_communications_audit() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog AS $$
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
REVOKE ALL ON FUNCTION sep_communications_audit() FROM PUBLIC;
CREATE TRIGGER communications_audit AFTER INSERT ON audit_entries FOR EACH ROW EXECUTE FUNCTION sep_communications_audit();
--> statement-breakpoint
CREATE FUNCTION sep_communications_response() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog AS $$
DECLARE previous text:=current_setting('sep.communication_rpc',true);
BEGIN
 PERFORM set_config('sep.communication_rpc','true',true);
 PERFORM public.sep_enqueue_notice(NEW.organization_id,NEW.event_id,NEW.reviewer_id,'response:'||NEW.id,'review.response.available','reviews',NEW.id);
 PERFORM set_config('sep.communication_rpc',coalesce(previous,''),true);RETURN NEW;
END $$;
REVOKE ALL ON FUNCTION sep_communications_response() FROM PUBLIC;
CREATE TRIGGER communications_response AFTER INSERT ON review_response_checks FOR EACH ROW EXECUTE FUNCTION sep_communications_response();
--> statement-breakpoint
CREATE FUNCTION sep_communications_announcement() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog AS $$
DECLARE previous text:=current_setting('sep.communication_rpc',true);p uuid;
BEGIN
 PERFORM set_config('sep.communication_rpc','true',true);
 FOR p IN SELECT person_id FROM public.registration_entries WHERE NEW.audience='registrants' AND organization_id=NEW.organization_id AND event_id=NEW.event_id AND status='confirmed'
 UNION SELECT person_id FROM public.review_members WHERE NEW.audience='reviewers' AND organization_id=NEW.organization_id AND event_id=NEW.event_id AND status='accepted'
 LOOP PERFORM public.sep_enqueue_notice(NEW.organization_id,NEW.event_id,p,'announcement:'||NEW.id,'announcement','notifications',NEW.id,NEW.category,NEW.message_es,NEW.message_en); END LOOP;
 PERFORM set_config('sep.communication_rpc',coalesce(previous,''),true);RETURN NEW;
END $$;
REVOKE ALL ON FUNCTION sep_communications_announcement() FROM PUBLIC;
CREATE TRIGGER communications_announcement AFTER INSERT ON event_announcements FOR EACH ROW EXECUTE FUNCTION sep_communications_announcement();
--> statement-breakpoint
-- Internal sender: one lease per message; SMTP runs outside the database transaction.
CREATE FUNCTION sep_mail_claim() RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog AS $$
DECLARE previous text:=current_setting('sep.mail_worker',true);d public.mail_deliveries;n public.event_notifications;p public.notification_preferences;address text;active_person boolean;lease uuid;result jsonb;es text;en text;
BEGIN
 PERFORM set_config('sep.mail_worker','true',true);
 SELECT * INTO d FROM public.mail_deliveries WHERE ((status IN ('pending','retry') AND next_attempt_at<=now()) OR (status='processing' AND lease_until<now())) ORDER BY next_attempt_at,id FOR UPDATE SKIP LOCKED LIMIT 1;
 IF NOT FOUND THEN PERFORM set_config('sep.mail_worker',coalesce(previous,''),true);RETURN NULL;END IF;
 SELECT * INTO n FROM public.event_notifications WHERE id=d.notification_id;
 SELECT * INTO p FROM public.notification_preferences WHERE organization_id=n.organization_id AND event_id=n.event_id AND person_id=n.person_id;
 SELECT email INTO address FROM public.communication_contacts WHERE person_id=n.person_id;
 SELECT active INTO active_person FROM public.people WHERE id=n.person_id;
 IF NOT coalesce(active_person,false) OR NOT coalesce(p.email_enabled,true) OR (n.category='optional' AND NOT coalesce(p.optional_email,false)) OR address IS NULL THEN
  UPDATE public.mail_deliveries SET status=CASE WHEN address IS NULL THEN 'blocked' ELSE 'suppressed' END,error_code=CASE WHEN address IS NULL THEN 'no_verified_email' ELSE 'preferences_or_inactive' END,lease_id=NULL,lease_until=NULL,next_attempt_at=NULL WHERE id=d.id;
  INSERT INTO public.mail_attempts(id,organization_id,event_id,delivery_id,status,error_code) VALUES(gen_random_uuid(),d.organization_id,d.event_id,d.id,CASE WHEN address IS NULL THEN 'blocked' ELSE 'suppressed' END,CASE WHEN address IS NULL THEN 'no_verified_email' ELSE 'preferences_or_inactive' END);
  PERFORM set_config('sep.mail_worker',coalesce(previous,''),true);RETURN jsonb_build_object('skipped',true);
 END IF;
 IF d.attempts>=5 THEN
  UPDATE public.mail_deliveries SET status='failed',error_code='attempt_limit',lease_id=NULL,lease_until=NULL,next_attempt_at=NULL WHERE id=d.id;
  PERFORM set_config('sep.mail_worker',coalesce(previous,''),true);RETURN jsonb_build_object('skipped',true);
 END IF;
 lease:=gen_random_uuid();
 UPDATE public.mail_deliveries SET status='processing',recipient=address,attempts=attempts+1,lease_id=lease,lease_until=now()+interval '2 minutes',next_attempt_at=NULL,error_code=NULL WHERE id=d.id;
 SELECT name_es,name_en INTO es,en FROM public.events WHERE organization_id=n.organization_id AND id=n.event_id;
 result:=jsonb_build_object('id',d.id,'lease',lease,'email',address,'kind',n.kind,'locale',coalesce(p.locale,'es'),'eventId',n.event_id,'eventEs',es,'eventEn',en,'target',n.target,'resourceId',n.resource_id,'messageEs',n.message_es,'messageEn',n.message_en);
 PERFORM set_config('sep.mail_worker',coalesce(previous,''),true);RETURN result;
END $$;
REVOKE ALL ON FUNCTION sep_mail_claim() FROM PUBLIC;GRANT EXECUTE ON FUNCTION sep_mail_claim() TO sep_runtime;
--> statement-breakpoint
CREATE FUNCTION sep_mail_finish(delivery uuid,lease uuid,outcome text,code text) RETURNS boolean LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog AS $$
DECLARE previous text:=current_setting('sep.mail_worker',true);d public.mail_deliveries;state text;
BEGIN
 IF outcome NOT IN ('sent','retry','failed') OR code IS NOT NULL AND code NOT IN ('smtp_temporary','smtp_permanent','smtp_connection','smtp_configuration') THEN RAISE EXCEPTION 'Invalid outcome';END IF;
 PERFORM set_config('sep.mail_worker','true',true);
 SELECT * INTO d FROM public.mail_deliveries WHERE id=delivery AND lease_id=lease AND status='processing' FOR UPDATE;
 IF NOT FOUND THEN PERFORM set_config('sep.mail_worker',coalesce(previous,''),true);RETURN false;END IF;
 state:=CASE WHEN outcome='retry' AND d.attempts>=5 THEN 'failed' ELSE outcome END;
 UPDATE public.mail_deliveries SET status=state,error_code=code,lease_id=NULL,lease_until=NULL,delivered_at=CASE WHEN state='sent' THEN now() ELSE NULL END,next_attempt_at=CASE WHEN state='retry' THEN now()+make_interval(secs=>least(3600,60*power(2,d.attempts-1)::integer)) ELSE NULL END WHERE id=delivery;
 INSERT INTO public.mail_attempts(id,organization_id,event_id,delivery_id,status,error_code) VALUES(gen_random_uuid(),d.organization_id,d.event_id,d.id,state,code);
 PERFORM set_config('sep.mail_worker',coalesce(previous,''),true);RETURN true;
END $$;
REVOKE ALL ON FUNCTION sep_mail_finish(uuid,uuid,text,text) FROM PUBLIC;GRANT EXECUTE ON FUNCTION sep_mail_finish(uuid,uuid,text,text) TO sep_runtime;
--> statement-breakpoint
CREATE FUNCTION sep_mail_retry(delivery uuid) RETURNS boolean LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog AS $$
DECLARE previous text:=current_setting('sep.communication_rpc',true);d public.mail_deliveries;
BEGIN
 IF current_setting('sep.communication_staff',true) IS DISTINCT FROM 'true' THEN RETURN false; END IF;
 PERFORM set_config('sep.communication_rpc','true',true);
 SELECT * INTO d FROM public.mail_deliveries WHERE id=delivery AND organization_id=nullif(current_setting('sep.organization_id',true),'')::uuid AND event_id=nullif(current_setting('sep.event_id',true),'')::uuid AND status IN ('failed','blocked','suppressed') FOR UPDATE;
 IF NOT FOUND THEN PERFORM set_config('sep.communication_rpc',coalesce(previous,''),true);RETURN false;END IF;
 UPDATE public.mail_deliveries SET status='pending',attempts=0,error_code=NULL,next_attempt_at=now() WHERE id=d.id;
 INSERT INTO public.mail_attempts(id,organization_id,event_id,delivery_id,status,error_code) VALUES(gen_random_uuid(),d.organization_id,d.event_id,d.id,'manual_retry',NULL);
 PERFORM set_config('sep.communication_rpc',coalesce(previous,''),true);RETURN true;
END $$;
REVOKE ALL ON FUNCTION sep_mail_retry(uuid) FROM PUBLIC;GRANT EXECUTE ON FUNCTION sep_mail_retry(uuid) TO sep_runtime;
