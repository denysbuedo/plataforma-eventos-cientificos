ALTER TABLE "communication_contacts" ADD COLUMN "verified_emails" jsonb DEFAULT '[]'::jsonb NOT NULL;
--> statement-breakpoint
-- Preserve previously verified contact addresses, including accounts already consolidated.
GRANT CREATE ON SCHEMA public TO sep_account_linker;
SET ROLE sep_account_linker;
SELECT set_config('sep.account_link','true',true);
UPDATE public.communication_contacts SET verified_emails=jsonb_build_array(email);
WITH candidates AS (
 SELECT public.sep_canonical_person(person_id) AS person_id,email FROM public.communication_contacts
 UNION SELECT coalesce(principal_id,person_id),email FROM public.local_accounts WHERE active AND verified_at IS NOT NULL
), combined AS (SELECT person_id,jsonb_agg(DISTINCT email ORDER BY email) AS emails FROM candidates GROUP BY person_id)
UPDATE public.communication_contacts c SET verified_emails=combined.emails FROM combined WHERE c.person_id=combined.person_id;
SELECT set_config('sep.account_link','false',true);
--> statement-breakpoint
CREATE OR REPLACE FUNCTION sep_account_link_plan(actor uuid,other uuid) RETURNS jsonb
LANGUAGE plpgsql SET search_path=pg_catalog,public SET row_security=on AS $$
DECLARE result jsonb='{}';counts jsonb='{}';fingerprints jsonb='{}';r record; n bigint; digest text; column_list text; warnings jsonb='[]';conflict_works jsonb='[]';
BEGIN
 FOR r IN SELECT c.relname AS tbl,a.attname AS col FROM pg_constraint k JOIN pg_class c ON c.oid=k.conrelid JOIN pg_namespace ns ON ns.oid=c.relnamespace JOIN pg_attribute a ON a.attrelid=c.oid AND a.attnum=ANY(k.conkey)
 WHERE k.contype='f' AND k.confrelid='public.people'::regclass AND ns.nspname='public'
 AND c.relname NOT IN('account_link_tickets','account_link_history','local_accounts','researcher_profiles','orcid_connections','communication_contacts','audit_entries','access_history','attendance_operator_history')
 AND a.attname NOT IN('actor_id','created_by','accepted_by','decided_by','published_by')
 AND NOT EXISTS(SELECT 1 FROM public.sep_account_move_columns() m WHERE m.tbl=c.relname AND m.col=a.attname) LOOP
  EXECUTE format('SELECT count(*) FROM public.%I WHERE %I=$1',r.tbl,r.col) INTO n USING other;
  IF n>0 THEN RETURN jsonb_build_object('blocked','unsupported_relationship');END IF;
 END LOOP;
 FOR r IN SELECT * FROM public.sep_account_move_columns() LOOP
  SELECT string_agg(format('%I',attname),',' ORDER BY attnum) INTO column_list FROM pg_attribute WHERE attrelid=format('public.%I',r.tbl)::regclass AND attnum>0 AND NOT attisdropped AND atttypid<>'bytea'::regtype;
  EXECUTE format('SELECT count(*),md5(coalesce(string_agg(to_jsonb(t)::text,'''' ORDER BY to_jsonb(t)::text),'''')) FROM (SELECT %s FROM public.%I WHERE %I IN ($1,$2)) t',column_list,r.tbl,r.col) INTO n,digest USING actor,other;
  fingerprints=fingerprints||jsonb_build_object(r.tbl||'.'||r.col,digest);
  EXECUTE format('SELECT count(*) FROM public.%I WHERE %I=$1',r.tbl,r.col) INTO n USING other;
  counts=counts||jsonb_build_object(r.tbl||'.'||r.col,n);
 END LOOP;
 fingerprints=fingerprints||jsonb_build_object('contacts',(SELECT md5(coalesce(string_agg(to_jsonb(c)::text,'' ORDER BY c.person_id),'')) FROM public.communication_contacts c WHERE person_id IN(actor,other)), 'profiles',(SELECT md5(coalesce(string_agg(to_jsonb(p)::text,'' ORDER BY p.person_id),'')) FROM public.researcher_profiles p WHERE person_id IN(actor,other)),
 'roles',(SELECT md5(coalesce(string_agg(to_jsonb(grant_row)::text,'' ORDER BY grant_row.id),'')) FROM public.role_assignments grant_row JOIN public.memberships m ON m.id=grant_row.membership_id WHERE m.person_id IN(actor,other)),
 'orcid',(SELECT md5(coalesce(string_agg(to_jsonb(o)::text,'' ORDER BY person_id),'')) FROM public.orcid_connections o WHERE person_id IN(actor,other)),
 'local',(SELECT md5(coalesce(string_agg(email||credential_version::text||coalesce(verified_at::text,''),'' ORDER BY email),'')) FROM public.local_accounts WHERE coalesce(principal_id,person_id) IN(actor,other)));
 IF EXISTS(SELECT 1 FROM public.registration_entries a JOIN public.registration_entries b USING(organization_id,event_id) WHERE a.person_id=actor AND b.person_id=other) THEN warnings=warnings||'"registrations"'::jsonb;END IF;
 IF EXISTS(SELECT 1 FROM public.review_assignments a JOIN public.review_assignments b USING(round_id) WHERE a.reviewer_id=actor AND b.reviewer_id=other) THEN warnings=warnings||'"reviews"'::jsonb;END IF;
 IF EXISTS(SELECT 1 FROM public.payment_charges a JOIN public.payment_charges b USING(organization_id,event_id,fee_id) WHERE a.person_id=actor AND b.person_id=other AND a.state<>'cancelled' AND b.state<>'cancelled') THEN warnings=warnings||'"payments"'::jsonb;END IF;
 IF EXISTS(SELECT 1 FROM public.certificates a JOIN public.certificates b USING(organization_id,event_id,template_id,subject_key) WHERE a.person_id=actor AND b.person_id=other AND a.status='issued' AND b.status='issued') THEN warnings=warnings||'"certificates"'::jsonb;END IF;
 IF (SELECT count(DISTINCT environment||':'||orcid) FROM public.orcid_connections WHERE person_id IN(actor,other) AND orcid IS NOT NULL)>1 THEN warnings=warnings||'"orcid"'::jsonb;END IF;
 IF (SELECT count(*) FROM public.local_accounts WHERE coalesce(principal_id,person_id) IN(actor,other) AND active AND verified_at IS NOT NULL)>1 THEN warnings=warnings||'"local_accounts"'::jsonb;END IF;
 SELECT coalesce(jsonb_agg(DISTINCT a.work_id ORDER BY a.work_id),'[]'::jsonb) INTO conflict_works FROM public.review_assignments a JOIN public.author_works w ON w.id=a.work_id WHERE a.reviewer_id IN(actor,other) AND
 (w.owner_id IN(actor,other) OR EXISTS(SELECT 1 FROM public.review_conflicts c WHERE c.work_id=w.id AND c.person_id IN(actor,other))
 OR EXISTS(SELECT 1 FROM public.work_collaborations c WHERE c.work_id=w.id AND c.status='accepted' AND c.person_id IN(actor,other))
 OR EXISTS(SELECT 1 FROM jsonb_array_elements(w.authors||coalesce(w.submitted_content->'authors','[]'::jsonb)||coalesce((SELECT jsonb_agg(x) FROM public.work_versions v CROSS JOIN LATERAL jsonb_array_elements(v.content->'authors') x WHERE v.work_id=w.id),'[]'::jsonb)) x
 WHERE public.sep_canonical_person(nullif(x->>'personId','')::uuid) IN(actor,other) OR x->>'orcid' IN(SELECT orcid FROM public.orcid_connections WHERE person_id IN(actor,other) AND environment='production' AND connected_at IS NOT NULL)));
 IF jsonb_array_length(conflict_works)>0 THEN warnings=warnings||'"review_conflict"'::jsonb;END IF;
 IF EXISTS(SELECT 1 FROM public.author_works w WHERE (SELECT count(*) FROM jsonb_array_elements(w.authors) x WHERE public.sep_canonical_person(nullif(x->>'personId','')::uuid) IN(actor,other))>1) THEN warnings=warnings||'"authorship_duplicates"'::jsonb;END IF;
 SELECT jsonb_build_object('name',name,'email',(SELECT email FROM public.communication_contacts WHERE person_id=actor),'orcid',(SELECT jsonb_build_object('id',orcid,'environment',environment) FROM public.orcid_connections WHERE person_id=actor AND orcid IS NOT NULL),'profile',(SELECT to_jsonb(p)-'person_id' FROM public.researcher_profiles p WHERE p.person_id=actor)) INTO result FROM public.people WHERE id=actor;
 RETURN jsonb_build_object('notificationEmails',(SELECT coalesce(jsonb_agg(address ORDER BY address),'[]'::jsonb) FROM (SELECT DISTINCT jsonb_array_elements_text(c.verified_emails) AS address FROM public.communication_contacts c WHERE person_id IN(actor,other)) e),'notificationEmail',coalesce((SELECT email FROM public.communication_contacts WHERE person_id=actor),(SELECT email FROM public.communication_contacts WHERE person_id=other)),'counts',counts,'warnings',warnings,'fingerprint',md5(fingerprints::text||conflict_works::text),'conflictWorks',conflict_works,'currentProfile',result);
END $$;
--> statement-breakpoint
CREATE OR REPLACE FUNCTION sep_account_consolidate(actor uuid,other uuid,profile_source text) RETURNS void
LANGUAGE plpgsql SET search_path=pg_catalog,public SET row_security=on AS $$
DECLARE r record; duplicate uuid;profile_id uuid; profile_row public.researcher_profiles%ROWTYPE;
BEGIN
 SET CONSTRAINTS ALL DEFERRED;
 PERFORM set_config('sep.account_link_other',other::text,true);
 -- Keep all membership records and grant periods, avoiding any expansion of their validity.
 UPDATE public.memberships s SET origin_account_id=coalesce(s.origin_account_id,other) WHERE s.person_id=other AND EXISTS(SELECT 1 FROM public.memberships p WHERE p.person_id=actor AND p.organization_id=s.organization_id AND p.event_id IS NOT DISTINCT FROM s.event_id AND p.origin_account_id IS NULL);
 UPDATE public.registration_entries s SET origin_account_id=coalesce(s.origin_account_id,other) WHERE s.person_id=other AND EXISTS(SELECT 1 FROM public.registration_entries p WHERE p.person_id=actor AND p.organization_id=s.organization_id AND p.event_id=s.event_id AND p.origin_account_id IS NULL);
 UPDATE public.review_assignments s SET origin_account_id=coalesce(s.origin_account_id,other) WHERE s.reviewer_id=other AND EXISTS(SELECT 1 FROM public.review_assignments p WHERE p.reviewer_id=actor AND p.round_id=s.round_id AND p.origin_account_id IS NULL);
 UPDATE public.certificates s SET origin_account_id=coalesce(s.origin_account_id,other) WHERE s.person_id=other AND EXISTS(SELECT 1 FROM public.certificates p WHERE p.person_id=actor AND p.organization_id=s.organization_id AND p.event_id=s.event_id AND p.template_id=s.template_id AND p.subject_key=s.subject_key AND p.status='issued' AND p.origin_account_id IS NULL);
 UPDATE public.payment_charges s SET origin_account_id=coalesce(s.origin_account_id,other) WHERE s.person_id=other AND EXISTS(SELECT 1 FROM public.payment_charges p WHERE p.person_id=actor AND p.organization_id=s.organization_id AND p.event_id=s.event_id AND p.fee_id=s.fee_id AND p.state<>'cancelled' AND p.origin_account_id IS NULL);
 -- Small duplicate state is combined without overwriting immutable business evidence.
 INSERT INTO public.review_members SELECT organization_id,event_id,actor,name,status,expertise,revision+1,created_at FROM public.review_members WHERE person_id=other
 ON CONFLICT(organization_id,event_id,person_id) DO UPDATE SET status=CASE WHEN review_members.status='accepted' OR excluded.status='accepted' THEN 'accepted' WHEN review_members.status='invited' OR excluded.status='invited' THEN 'invited' ELSE review_members.status END,revision=review_members.revision+1;
 DELETE FROM public.review_members WHERE person_id=other;
 INSERT INTO public.attendance_operators SELECT organization_id,event_id,actor,active,revision+1,updated_at FROM public.attendance_operators WHERE person_id=other ON CONFLICT(organization_id,event_id,person_id) DO UPDATE SET active=attendance_operators.active OR excluded.active,revision=attendance_operators.revision+1;
 DELETE FROM public.attendance_operators WHERE person_id=other;
 INSERT INTO public.review_conflicts SELECT organization_id,event_id,work_id,actor,reason,created_at FROM public.review_conflicts WHERE person_id=other ON CONFLICT DO NOTHING;
 DELETE FROM public.review_conflicts WHERE person_id=other;
 INSERT INTO public.work_notice_reads SELECT organization_id,event_id,work_id,actor,seen_ids FROM public.work_notice_reads WHERE person_id=other ON CONFLICT(organization_id,event_id,work_id,person_id) DO UPDATE SET seen_ids=ARRAY(SELECT DISTINCT x FROM unnest(work_notice_reads.seen_ids||excluded.seen_ids) x);
 DELETE FROM public.work_notice_reads WHERE person_id=other;
 -- Preserve a pending claim as history if the same authorship is already claimed by the principal.
 UPDATE public.authorship_claims s SET status='revoked',revision=s.revision+1 WHERE s.claimant_id=other AND s.status IN('pending','approved') AND EXISTS(SELECT 1 FROM public.authorship_claims p WHERE p.claimant_id=actor AND p.work_id=s.work_id AND p.author_id=s.author_id AND p.status IN('pending','approved'));
 -- Both notifications and their delivery evidence survive; source keys remain unique.
 UPDATE public.event_notifications s SET source_key=s.source_key||':consolidated:'||s.id::text WHERE s.person_id=other AND EXISTS(SELECT 1 FROM public.event_notifications p WHERE p.person_id=actor AND p.organization_id=s.organization_id AND p.event_id=s.event_id AND p.source_key=s.source_key);
 INSERT INTO public.notification_preferences SELECT organization_id,event_id,actor,email_enabled,optional_email,locale,revision+1 FROM public.notification_preferences WHERE person_id=other
 ON CONFLICT(organization_id,event_id,person_id) DO UPDATE SET email_enabled=notification_preferences.email_enabled AND excluded.email_enabled,optional_email=notification_preferences.optional_email AND excluded.optional_email,revision=notification_preferences.revision+1;
 DELETE FROM public.notification_preferences WHERE person_id=other;
 -- One reservation per session; preserve the strongest state and archive both originals in the link record.
 UPDATE public.session_bookings p SET state=CASE WHEN s.state='confirmed' THEN 'confirmed' WHEN p.state='cancelled' THEN s.state ELSE p.state END,revision=p.revision+1
 FROM public.session_bookings s WHERE p.person_id=actor AND s.person_id=other AND p.organization_id=s.organization_id AND p.event_id=s.event_id AND p.session_id=s.session_id;
 DELETE FROM public.session_bookings s WHERE s.person_id=other AND EXISTS(SELECT 1 FROM public.session_bookings p WHERE p.person_id=actor AND p.organization_id=s.organization_id AND p.event_id=s.event_id AND p.session_id=s.session_id);
 profile_id=CASE WHEN profile_source='other' THEN other ELSE actor END;
 SELECT * INTO profile_row FROM public.researcher_profiles WHERE person_id=profile_id;
 IF FOUND THEN
  INSERT INTO public.researcher_profiles(person_id,background,affiliations,discoverable,revision) VALUES(actor,profile_row.background,profile_row.affiliations,profile_row.discoverable,profile_row.revision+1)
  ON CONFLICT(person_id) DO UPDATE SET background=excluded.background,affiliations=excluded.affiliations,discoverable=excluded.discoverable,revision=greatest(researcher_profiles.revision,excluded.revision)+1;
 ELSE
  DELETE FROM public.researcher_profiles WHERE person_id=actor;
 END IF;
 IF profile_source='other' THEN UPDATE public.people SET name=(SELECT name FROM public.people WHERE id=other) WHERE id=actor;END IF;
 -- Only one verified ORCID is active; both original profiles and ORCIDs are archived before the move.
 IF profile_source='other' AND EXISTS(SELECT 1 FROM public.orcid_connections WHERE person_id=other AND orcid IS NOT NULL) THEN DELETE FROM public.orcid_connections WHERE person_id=actor;END IF;
 IF NOT EXISTS(SELECT 1 FROM public.orcid_connections WHERE person_id=actor AND orcid IS NOT NULL) THEN
  DELETE FROM public.orcid_connections WHERE person_id=actor;
  UPDATE public.orcid_connections SET person_id=actor,state_hash=NULL,expires_at=NULL,return_to=NULL WHERE person_id=other;
 END IF;
 -- Local credentials retain their email and account key; all resolve to the chosen principal.
 DELETE FROM public.local_sessions WHERE person_id IN(SELECT person_id FROM public.local_accounts WHERE coalesce(principal_id,person_id)=other);
 DELETE FROM public.local_challenges WHERE person_id IN(SELECT person_id FROM public.local_accounts WHERE coalesce(principal_id,person_id)=other);
 UPDATE public.local_accounts SET principal_id=actor,credential_version=credential_version+1 WHERE coalesce(principal_id,person_id)=other;
 INSERT INTO public.communication_contacts(person_id,email,verified_emails,updated_at) SELECT actor,email,verified_emails,updated_at FROM public.communication_contacts WHERE person_id=other ON CONFLICT(person_id) DO UPDATE SET verified_emails=(SELECT coalesce(jsonb_agg(address ORDER BY address),'[]'::jsonb) FROM (SELECT DISTINCT jsonb_array_elements_text(communication_contacts.verified_emails||excluded.verified_emails) address) e);
 DELETE FROM public.orcid_connections WHERE person_id=other;
 FOR r IN SELECT * FROM public.sep_account_move_columns() LOOP
  EXECUTE format('UPDATE public.%I SET %I=$1 WHERE %I=$2',r.tbl,r.col,r.col) USING actor,other;
 END LOOP;
 UPDATE public.author_works SET authors=public.sep_account_resolve_json(authors),submitted_content=public.sep_account_resolve_json(submitted_content) WHERE position(other::text IN authors::text)>0 OR position(other::text IN submitted_content::text)>0;
 INSERT INTO public.review_conflicts(organization_id,event_id,work_id,person_id,reason)
 SELECT w.organization_id,w.event_id,w.id,actor,'Conflicto de autoría detectado al consolidar cuentas.' FROM public.author_works w
 JOIN jsonb_array_elements_text((SELECT archive#>'{summary,conflictWorks}' FROM public.account_link_history WHERE actor_id=actor AND other_id=other)) selected ON selected.value::uuid=w.id
 ON CONFLICT DO NOTHING;
 UPDATE public.review_assignments a SET status='conflict',revision=revision+1,message=concat_ws(E'\n',nullif(message,''),'Conflicto de autoría detectado al consolidar cuentas; se conserva la evaluación original.') WHERE a.reviewer_id=actor AND a.status IN('invited','accepted','submitted') AND EXISTS(SELECT 1 FROM public.review_conflicts c WHERE c.work_id=a.work_id AND c.person_id=actor);
 FOR r IN SELECT DISTINCT c.organization_id,c.event_id,c.work_id,m.person_id FROM public.review_conflicts c JOIN public.memberships m ON m.organization_id=c.organization_id AND m.event_id=c.event_id JOIN public.role_assignments g ON g.membership_id=m.id WHERE c.person_id=actor AND m.active AND g.role='organizer' AND g.active AND g.valid_from<=now() AND (g.valid_until IS NULL OR g.valid_until>now()) LOOP
  PERFORM public.sep_enqueue_notice(r.organization_id,r.event_id,r.person_id,'account-merge:'||other::text||':'||r.work_id::text,'account.review_conflict','submissions',r.work_id,'operational','La consolidación de cuentas reveló un conflicto entre autoría y revisión. La evaluación se conserva, pero no cuenta para el dictamen. Revisa las asignaciones del trabajo.','Account consolidation revealed an authorship and review conflict. The evaluation is retained but excluded from the decision. Review the submission’s assignments.');
 END LOOP;
 FOR r IN SELECT w.organization_id,w.event_id,w.id AS work_id,w.owner_id FROM public.author_works w WHERE (SELECT count(*) FROM jsonb_array_elements(w.authors) x WHERE x->>'personId'=actor::text)>1 LOOP
  PERFORM public.sep_enqueue_notice(r.organization_id,r.event_id,r.owner_id,'account-authors:'||other::text||':'||r.work_id::text,'account.authorship_duplicate','works',r.work_id,'operational','La vinculación de cuentas ha identificado varias entradas de la misma persona entre los autores. Revisa la autoría del trabajo; los documentos y versiones anteriores se conservan.','Linking accounts identified multiple entries for the same person among the authors. Review the submission’s authorship; original documents and versions are preserved.');
 END LOOP;
 -- Saved versions and publications stay byte-for-byte unchanged. Their person references resolve on reading.
 UPDATE public.people SET active=false WHERE id=other;
 SET CONSTRAINTS ALL IMMEDIATE;
 PERFORM set_config('sep.account_link_other','',true);
END $$;
--> statement-breakpoint
CREATE OR REPLACE FUNCTION sep_account_links(command text,d jsonb) RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog,public SET row_security=on AS $$
DECLARE actor uuid=nullif(current_setting('sep.person_id',true),'')::uuid;other uuid;ticket public.account_link_tickets%ROWTYPE;result jsonb;plan jsonb;snapshot jsonb;source text; r record;
BEGIN
 IF actor IS NULL THEN RAISE EXCEPTION 'Missing actor' USING ERRCODE='42501';END IF;
 PERFORM set_config('sep.account_link','true',true);
 IF command='confirm' THEN
  SELECT * INTO ticket FROM public.account_link_tickets WHERE token_hash=d->>'tokenHash' AND actor_id=actor AND used_at IS NULL AND expires_at>now();
  IF NOT FOUND THEN PERFORM set_config('sep.account_link','false',true);RETURN jsonb_build_object('blocked','expired');END IF;
  other=ticket.other_id;
  -- All affected principals are locked in a stable order, without upgrading an existing shared lock.
  FOR r IN SELECT id FROM public.people WHERE id IN(actor,other) ORDER BY id LOOP PERFORM pg_advisory_xact_lock(hashtextextended('person-session:'||r.id::text,0));END LOOP;
  SELECT * INTO ticket FROM public.account_link_tickets WHERE token_hash=d->>'tokenHash' AND actor_id=actor AND used_at IS NULL AND expires_at>now() FOR UPDATE;
  IF NOT FOUND THEN PERFORM set_config('sep.account_link','false',true);RETURN jsonb_build_object('blocked','expired');END IF;
  PERFORM 1 FROM public.local_accounts WHERE coalesce(principal_id,person_id) IN(actor,other) ORDER BY person_id FOR UPDATE;
 END IF;
 IF NOT EXISTS(SELECT 1 FROM public.people WHERE id=actor AND active) THEN
  IF command='confirm' THEN PERFORM set_config('sep.account_link','false',true);RETURN jsonb_build_object('blocked','expired');END IF;
  RAISE EXCEPTION 'Inactive actor' USING ERRCODE='42501';
 END IF;
 IF command='list' THEN
  SELECT jsonb_build_object('methods',coalesce(jsonb_agg(jsonb_build_object('id',i.id,'provider',CASE WHEN i.issuer='sep-local' THEN 'local' WHEN i.issuer='https://accounts.google.com' THEN 'google' ELSE 'oidc' END)), '[]'::jsonb)) INTO result FROM public.identities i WHERE i.person_id=actor AND i.active AND (i.issuer<>'sep-local' OR EXISTS(SELECT 1 FROM public.local_accounts a WHERE a.person_id::text=i.subject AND coalesce(a.principal_id,a.person_id)=actor AND a.active AND a.verified_at IS NOT NULL));
  result=result||jsonb_build_object('history',coalesce((SELECT jsonb_agg(jsonb_build_object('id',h.id,'provider',h.provider,'createdAt',h.created_at,'previousProfile',h.archive) ORDER BY h.created_at DESC) FROM (SELECT * FROM public.account_link_history WHERE public.sep_canonical_person(actor_id)=actor ORDER BY created_at DESC LIMIT 50) h),'[]'::jsonb));
  result=result||jsonb_build_object('notificationEmail',(SELECT email FROM public.communication_contacts WHERE person_id=actor),'notificationEmails',coalesce((SELECT verified_emails FROM public.communication_contacts WHERE person_id=actor),'[]'::jsonb));
 ELSIF command='email' THEN
  IF NOT EXISTS(SELECT 1 FROM public.communication_contacts WHERE person_id=actor AND verified_emails @> jsonb_build_array(d->>'email')) THEN result=jsonb_build_object('blocked','unverified_email');
  ELSE UPDATE public.communication_contacts SET email=d->>'email',updated_at=now() WHERE person_id=actor;result=jsonb_build_object('saved',true);END IF;
 ELSIF command='prepare' THEN
  other=(d->>'otherId')::uuid;
  IF actor=other THEN result=jsonb_build_object('alreadyLinked',true);
  ELSIF NOT EXISTS(SELECT 1 FROM public.people WHERE id=other AND active) THEN result=jsonb_build_object('blocked','inactive');
  ELSE
   plan=public.sep_account_link_plan(actor,other);
   IF plan ? 'blocked' THEN PERFORM set_config('sep.account_link','false',true);RETURN plan;END IF;
   DELETE FROM public.account_link_tickets WHERE actor_id=actor AND used_at IS NULL;
   INSERT INTO public.account_link_tickets(token_hash,actor_id,other_id,provider,expires_at,plan) VALUES(d->>'tokenHash',actor,other,d->>'provider',now()+interval '10 minutes',plan);
   SELECT jsonb_build_object('name',name,'email',(SELECT email FROM public.communication_contacts WHERE person_id=other),'orcid',(SELECT jsonb_build_object('id',orcid,'environment',environment) FROM public.orcid_connections WHERE person_id=other AND orcid IS NOT NULL),'profile',(SELECT to_jsonb(p)-'person_id' FROM public.researcher_profiles p WHERE p.person_id=other),'institutions',coalesce((SELECT jsonb_agg(institution) FROM public.affiliations WHERE person_id=other),'[]'::jsonb)) INTO snapshot FROM public.people WHERE id=other;
   result=jsonb_build_object('ready',true,'previousProfile',snapshot,'consolidation',plan-'fingerprint');
  END IF;
 ELSIF command='confirm' THEN
  source=coalesce(d->>'profileSource','current');
  IF source NOT IN('current','other') OR d->>'accepted' IS DISTINCT FROM 'true' THEN result=jsonb_build_object('blocked','confirmation_required');
  ELSIF NOT EXISTS(SELECT 1 FROM public.people WHERE id=other AND active) THEN result=jsonb_build_object('blocked','expired');
  ELSE
   plan=public.sep_account_link_plan(actor,other);
   IF d ? 'notificationEmail' AND NOT (plan->'notificationEmails' @> jsonb_build_array(d->>'notificationEmail')) THEN result=jsonb_build_object('blocked','confirmation_required');
   ELSIF plan->>'fingerprint' IS DISTINCT FROM ticket.plan->>'fingerprint' THEN result=jsonb_build_object('blocked','changed');
   ELSE
    SELECT jsonb_build_object('name',name,'email',(SELECT email FROM public.communication_contacts WHERE person_id=other),'orcid',(SELECT jsonb_build_object('id',orcid,'environment',environment) FROM public.orcid_connections WHERE person_id=other AND orcid IS NOT NULL),'profile',(SELECT to_jsonb(p)-'person_id' FROM public.researcher_profiles p WHERE p.person_id=other),'institutions',coalesce((SELECT jsonb_agg(institution) FROM public.affiliations WHERE person_id=other),'[]'::jsonb),
     'requestId',d->>'requestId','primaryProvider',d->>'provider','profileSource',source,'notificationEmail',coalesce(d->>'notificationEmail',plan->>'notificationEmail'),'summary',plan-'fingerprint',
     'previousCurrentProfile',plan->'currentProfile','orcidRecords',(SELECT coalesce(jsonb_agg(to_jsonb(o)-'state_hash'-'expires_at'-'return_to'),'[]'::jsonb) FROM public.orcid_connections o WHERE person_id IN(actor,other)),
     'reservations',(SELECT coalesce(jsonb_agg(to_jsonb(b)),'[]'::jsonb) FROM public.session_bookings b WHERE person_id IN(actor,other))) INTO snapshot FROM public.people WHERE id=other;
    INSERT INTO public.account_link_history(id,actor_id,other_id,provider,archive) VALUES(gen_random_uuid(),actor,other,ticket.provider,snapshot);
    PERFORM public.sep_account_consolidate(actor,other,source);
    UPDATE public.communication_contacts SET email=coalesce(d->>'notificationEmail',plan->>'notificationEmail'),updated_at=now() WHERE person_id=actor;
    UPDATE public.account_link_tickets SET used_at=now() WHERE token_hash=ticket.token_hash;
    result=jsonb_build_object('linked',true,'consolidated',true,'warnings',plan->'warnings');
   END IF;
  END IF;
 ELSE RAISE EXCEPTION 'Unknown operation' USING ERRCODE='22023';END IF;
 PERFORM set_config('sep.account_link','false',true);
 RETURN result;
EXCEPTION WHEN OTHERS THEN PERFORM set_config('sep.account_link','false',true),set_config('sep.account_link_other','',true);RAISE;
END $$;
--> statement-breakpoint
RESET ROLE;
REVOKE CREATE ON SCHEMA public FROM sep_account_linker;
