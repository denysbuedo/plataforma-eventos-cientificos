ALTER TABLE "registration_entries" DROP CONSTRAINT "registration_entries_organization_id_event_id_person_id_unique";--> statement-breakpoint
ALTER TABLE "review_assignments" DROP CONSTRAINT "review_assignments_round_id_reviewer_id_unique";--> statement-breakpoint
DROP INDEX "certificate_active_unique";--> statement-breakpoint
DROP INDEX "membership_organization_unique";--> statement-breakpoint
DROP INDEX "membership_event_unique";--> statement-breakpoint
DROP INDEX "charge_one_active_fee";--> statement-breakpoint
ALTER TABLE "account_link_tickets" ADD COLUMN "plan" jsonb DEFAULT '{}'::jsonb NOT NULL;--> statement-breakpoint
ALTER TABLE "certificates" ADD COLUMN "origin_account_id" uuid;--> statement-breakpoint
ALTER TABLE "local_accounts" ADD COLUMN "principal_id" uuid;--> statement-breakpoint
ALTER TABLE "memberships" ADD COLUMN "origin_account_id" uuid;--> statement-breakpoint
ALTER TABLE "payment_charges" ADD COLUMN "origin_account_id" uuid;--> statement-breakpoint
ALTER TABLE "registration_entries" ADD COLUMN "origin_account_id" uuid;--> statement-breakpoint
ALTER TABLE "review_assignments" ADD COLUMN "origin_account_id" uuid;--> statement-breakpoint
ALTER TABLE "local_accounts" ADD CONSTRAINT "local_accounts_principal_id_people_id_fk" FOREIGN KEY ("principal_id") REFERENCES "public"."people"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "account_link_other_unique" ON "account_link_history" USING btree ("other_id");--> statement-breakpoint
CREATE UNIQUE INDEX "registration_person_current_unique" ON "registration_entries" USING btree ("organization_id","event_id","person_id") WHERE "registration_entries"."origin_account_id" IS NULL;--> statement-breakpoint
CREATE UNIQUE INDEX "review_assignment_current_unique" ON "review_assignments" USING btree ("round_id","reviewer_id") WHERE "review_assignments"."origin_account_id" IS NULL;--> statement-breakpoint
CREATE UNIQUE INDEX "certificate_active_unique" ON "certificates" USING btree ("organization_id","event_id","template_id","person_id","subject_key") WHERE "certificates"."status"='issued' AND "certificates"."origin_account_id" IS NULL;--> statement-breakpoint
CREATE UNIQUE INDEX "membership_organization_unique" ON "memberships" USING btree ("person_id","organization_id") WHERE "memberships"."event_id" IS NULL AND "memberships"."origin_account_id" IS NULL;--> statement-breakpoint
CREATE UNIQUE INDEX "membership_event_unique" ON "memberships" USING btree ("person_id","organization_id","event_id") WHERE "memberships"."event_id" IS NOT NULL AND "memberships"."origin_account_id" IS NULL;--> statement-breakpoint
CREATE UNIQUE INDEX "charge_one_active_fee" ON "payment_charges" USING btree ("organization_id","event_id","person_id","fee_id") WHERE "payment_charges"."state"<>'cancelled' AND "payment_charges"."origin_account_id" IS NULL;
--> statement-breakpoint
-- Account consolidation retains immutable documents and original actors. Only ownership references move.
GRANT USAGE,CREATE ON SCHEMA public TO sep_account_linker;
--> statement-breakpoint
CREATE FUNCTION sep_canonical_person(who uuid) RETURNS uuid
LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog,public SET row_security=on AS $$
DECLARE next_id uuid; seen uuid[]='{}'; old_flag text=current_setting('sep.account_link',true);
BEGIN
 PERFORM set_config('sep.account_link','true',true);
 LOOP
  IF who=ANY(seen) THEN RAISE EXCEPTION 'Account link cycle' USING ERRCODE='23514'; END IF;
  seen=array_append(seen,who);
  SELECT actor_id INTO next_id FROM public.account_link_history WHERE other_id=who;
  EXIT WHEN NOT FOUND;
  who=next_id;
 END LOOP;
 PERFORM set_config('sep.account_link',coalesce(old_flag,'false'),true);
 RETURN who;
EXCEPTION WHEN OTHERS THEN PERFORM set_config('sep.account_link',coalesce(old_flag,'false'),true);RAISE;
END $$;
REVOKE ALL ON FUNCTION sep_canonical_person(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION sep_canonical_person(uuid) TO sep_runtime,sep_migrator;
ALTER FUNCTION sep_canonical_person(uuid) OWNER TO sep_account_linker;
--> statement-breakpoint
CREATE FUNCTION sep_account_resolve_json(value jsonb) RETURNS jsonb
LANGUAGE plpgsql SET search_path=pg_catalog,public AS $$
DECLARE result jsonb; item record;
BEGIN
 IF jsonb_typeof(value)='array' THEN SELECT coalesce(jsonb_agg(public.sep_account_resolve_json(v)),'[]'::jsonb) INTO result FROM jsonb_array_elements(value) v; RETURN result;
 ELSIF jsonb_typeof(value)='object' THEN
  result='{}';FOR item IN SELECT * FROM jsonb_each(value) LOOP
   IF item.key IN ('moderatorIds','coordinatorIds') AND jsonb_typeof(item.value)='array' THEN
    result=result||jsonb_build_object(item.key,(SELECT coalesce(jsonb_agg(DISTINCT public.sep_canonical_person(v::uuid)),'[]'::jsonb) FROM jsonb_array_elements_text(item.value) v));
   ELSIF item.key IN ('personId','presenterPersonId','ownerId') AND item.value#>>'{}' ~ '^[a-f0-9]{8}-[a-f0-9-]{27}$' THEN
    result=result||jsonb_build_object(item.key,public.sep_canonical_person((item.value#>>'{}')::uuid));
   ELSE result=result||jsonb_build_object(item.key,public.sep_account_resolve_json(item.value));END IF;
  END LOOP;RETURN result;
 END IF;RETURN value;
END $$;
REVOKE ALL ON FUNCTION sep_account_resolve_json(jsonb) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION sep_account_resolve_json(jsonb) TO sep_runtime,sep_migrator,sep_account_linker;
--> statement-breakpoint
-- This is not an escape hatch for runtime: only the non-login owner of the consolidation RPC can use it.
CREATE FUNCTION sep_account_reference_move(before_row jsonb,after_row jsonb,columns text[]) RETURNS boolean
LANGUAGE sql SET search_path=pg_catalog AS $$
 SELECT current_user='sep_account_linker' AND current_setting('sep.account_link',true)='true'
 AND (before_row-columns)=(after_row-columns)
 AND NOT EXISTS(SELECT 1 FROM unnest(columns) col WHERE before_row->col IS DISTINCT FROM after_row->col
   AND col NOT IN ('origin_account_id','registration_id')
   AND NOT (before_row->>col=current_setting('sep.account_link_other',true) AND after_row->>col=current_setting('sep.person_id',true)))
$$;
REVOKE ALL ON FUNCTION sep_account_reference_move(jsonb,jsonb,text[]) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION sep_account_reference_move(jsonb,jsonb,text[]) TO sep_runtime,sep_migrator,sep_account_linker;
--> statement-breakpoint
-- Permit only audited ownership moves through existing immutability guards; all other rules remain intact.
DO $$ DECLARE fn text; definition text; cols text; BEGIN
 FOR fn,cols IN SELECT * FROM (VALUES
 ('sep_immutable_membership_scope','person_id,origin_account_id'),
 ('sep_attendance_context_immutable','person_id,registration_id'),
 ('sep_certificate_immutable','person_id,origin_account_id'),
 ('sep_payment_charge_immutable','person_id,registration_id,origin_account_id'),
 ('sep_review_immutable','reviewer_id,origin_account_id'),
 ('sep_response_check_immutable','reviewer_id'),
 ('sep_gallery_release_immutable','owner_id')) v(fn,cols) LOOP
  SELECT pg_get_functiondef(oid) INTO definition FROM pg_proc WHERE proname=fn AND pronamespace='public'::regnamespace;
  definition=regexp_replace(definition,'BEGIN',format('BEGIN IF TG_OP=''UPDATE'' AND public.sep_account_reference_move(to_jsonb(OLD),to_jsonb(NEW),string_to_array(%L,'','')) THEN RETURN NEW; END IF;',cols),'i');
  EXECUTE definition;
 END LOOP;
 -- Histories keep original actor identifiers. Composite ownership foreign keys follow the new owner.
 SELECT pg_get_functiondef(oid) INTO definition FROM pg_proc WHERE proname='sep_registration_history_immutable' AND pronamespace='public'::regnamespace;
 definition=regexp_replace(definition,'BEGIN','BEGIN IF TG_OP=''UPDATE'' AND public.sep_account_reference_move(to_jsonb(OLD),to_jsonb(NEW),ARRAY[''person_id'',''owner_id'']) THEN RETURN NEW; END IF;','i');
 EXECUTE definition;
END $$;
--> statement-breakpoint
CREATE FUNCTION sep_account_origin_guard() RETURNS trigger LANGUAGE plpgsql SET search_path=pg_catalog AS $$
BEGIN
 IF (TG_OP='INSERT' AND NEW.origin_account_id IS NOT NULL) OR (TG_OP='UPDATE' AND NEW.origin_account_id IS DISTINCT FROM OLD.origin_account_id) THEN
  IF current_user<>'sep_account_linker' OR current_setting('sep.account_link',true) IS DISTINCT FROM 'true' THEN RAISE EXCEPTION 'Consolidation provenance is protected' USING ERRCODE='42501'; END IF;
 END IF;
 RETURN NEW;
END $$;
DO $$ DECLARE tbl text; BEGIN
 FOREACH tbl IN ARRAY ARRAY['memberships','registration_entries','review_assignments','certificates','payment_charges'] LOOP
  EXECUTE format('CREATE TRIGGER account_origin_guard BEFORE INSERT OR UPDATE ON public.%I FOR EACH ROW EXECUTE FUNCTION sep_account_origin_guard()',tbl);
 END LOOP;
END $$;
--> statement-breakpoint
-- Defer the composite ownership constraints while both ends are moved in one transaction.
DO $$ DECLARE r record; BEGIN
 FOR r IN SELECT c.relname,k.conname FROM pg_constraint k JOIN pg_class c ON c.oid=k.conrelid JOIN pg_namespace n ON n.oid=c.relnamespace
 WHERE k.contype='f' AND n.nspname='public' AND EXISTS(SELECT 1 FROM pg_attribute a WHERE a.attrelid=c.oid AND a.attnum=ANY(k.conkey) AND a.attname IN ('person_id','owner_id','reviewer_id')) LOOP
  EXECUTE format('ALTER TABLE public.%I ALTER CONSTRAINT %I DEFERRABLE INITIALLY IMMEDIATE',r.relname,r.conname);
 END LOOP;
END $$;
--> statement-breakpoint
-- All supported ownership columns, including composite foreign keys. Historical actors never move.
CREATE FUNCTION sep_account_move_columns() RETURNS TABLE(tbl text,col text)
LANGUAGE sql SET search_path=pg_catalog AS $$ SELECT * FROM (VALUES
 ('identities','person_id'),('affiliations','person_id'),('memberships','person_id'),
 ('author_works','owner_id'),('work_files','owner_id'),('work_versions','owner_id'),
 ('work_collaborations','owner_id'),('work_collaborations','person_id'),('authorship_claims','claimant_id'),
 ('review_members','person_id'),('review_assignments','reviewer_id'),('review_conflicts','person_id'),('review_response_checks','reviewer_id'),
 ('registration_entries','person_id'),('registration_history','person_id'),('attendance_credentials','person_id'),('attendance_records','person_id'),('attendance_history','person_id'),
 ('attendance_operators','person_id'),('certificates','person_id'),('certificate_history','person_id'),
 ('event_notifications','person_id'),('notification_preferences','person_id'),
 ('publication_permissions','person_id'),('gallery_entries','owner_id'),('gallery_releases','owner_id'),
 ('session_bookings','person_id'),('gallery_history','owner_id'),('operations_history','person_id'),('payment_charges','person_id'),('payment_history','person_id'),('work_notice_reads','person_id')
 ) v(tbl,col) $$;
REVOKE ALL ON FUNCTION sep_account_move_columns() FROM PUBLIC,sep_runtime;
--> statement-breakpoint
CREATE FUNCTION sep_account_link_plan(actor uuid,other uuid) RETURNS jsonb
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
 fingerprints=fingerprints||jsonb_build_object('profiles',(SELECT md5(coalesce(string_agg(to_jsonb(p)::text,'' ORDER BY p.person_id),'')) FROM public.researcher_profiles p WHERE person_id IN(actor,other)),
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
 RETURN jsonb_build_object('counts',counts,'warnings',warnings,'fingerprint',md5(fingerprints::text||conflict_works::text),'conflictWorks',conflict_works,'currentProfile',result);
END $$;
REVOKE ALL ON FUNCTION sep_account_link_plan(uuid,uuid) FROM PUBLIC,sep_runtime;
--> statement-breakpoint
CREATE FUNCTION sep_account_consolidate(actor uuid,other uuid,profile_source text) RETURNS void
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
 INSERT INTO public.communication_contacts(person_id,email,updated_at) SELECT actor,email,updated_at FROM public.communication_contacts WHERE person_id=other ON CONFLICT(person_id) DO NOTHING;
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
REVOKE ALL ON FUNCTION sep_account_consolidate(uuid,uuid,text) FROM PUBLIC,sep_runtime;
--> statement-breakpoint
SET LOCAL ROLE sep_account_linker;
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
   IF plan->>'fingerprint' IS DISTINCT FROM ticket.plan->>'fingerprint' THEN result=jsonb_build_object('blocked','changed');
   ELSE
    SELECT jsonb_build_object('name',name,'email',(SELECT email FROM public.communication_contacts WHERE person_id=other),'orcid',(SELECT jsonb_build_object('id',orcid,'environment',environment) FROM public.orcid_connections WHERE person_id=other AND orcid IS NOT NULL),'profile',(SELECT to_jsonb(p)-'person_id' FROM public.researcher_profiles p WHERE p.person_id=other),'institutions',coalesce((SELECT jsonb_agg(institution) FROM public.affiliations WHERE person_id=other),'[]'::jsonb),
     'requestId',d->>'requestId','primaryProvider',d->>'provider','profileSource',source,'summary',plan-'fingerprint',
     'previousCurrentProfile',plan->'currentProfile','orcidRecords',(SELECT coalesce(jsonb_agg(to_jsonb(o)-'state_hash'-'expires_at'-'return_to'),'[]'::jsonb) FROM public.orcid_connections o WHERE person_id IN(actor,other)),
     'reservations',(SELECT coalesce(jsonb_agg(to_jsonb(b)),'[]'::jsonb) FROM public.session_bookings b WHERE person_id IN(actor,other))) INTO snapshot FROM public.people WHERE id=other;
    INSERT INTO public.account_link_history(id,actor_id,other_id,provider,archive) VALUES(gen_random_uuid(),actor,other,ticket.provider,snapshot);
    PERFORM public.sep_account_consolidate(actor,other,source);
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
--> statement-breakpoint
-- Functions used by local passwords resolve their stable credential account to the shared principal.
DO $$ DECLARE definition text; BEGIN
 SELECT pg_get_functiondef(oid) INTO definition FROM pg_proc WHERE proname='sep_local_identity' AND pronamespace='public'::regnamespace;
 definition=replace(definition,'a.person_id::text,true','coalesce(a.principal_id,a.person_id)::text,true');
 definition=replace(definition,'WHERE id=a.person_id AND active','WHERE id=coalesce(a.principal_id,a.person_id) AND active');
 definition=replace(definition,'''personId'',a.person_id,''email'',a.email);','''personId'',coalesce(a.principal_id,a.person_id),''email'',a.email);');
 definition=replace(definition,'''sep.person_id'',who::text,true','''sep.person_id'',coalesce(a.principal_id,who)::text,true');
 definition=replace(definition,'WHERE id=who AND active','WHERE id=coalesce(a.principal_id,who) AND active');
 EXECUTE definition;
 SELECT pg_get_functiondef(oid) INTO definition FROM pg_proc WHERE proname='sep_registered_member' AND pronamespace='public'::regnamespace;
 definition=replace(definition,'a.person_id=p.id','coalesce(a.principal_id,a.person_id)=p.id');
 definition=replace(definition,'WHERE event_id IS NULL DO UPDATE','WHERE event_id IS NULL AND origin_account_id IS NULL DO UPDATE');
 SET LOCAL ROLE sep_account_linker;EXECUTE definition;RESET ROLE;
 -- Historic author references still participate in conflict checks after consolidation.
 SELECT pg_get_functiondef(oid) INTO definition FROM pg_proc WHERE proname='sep_review_conflict' AND pronamespace='public'::regnamespace;
 definition=replace(definition,'a->>''personId''=reviewer::text','public.sep_canonical_person(nullif(a->>''personId'','''')::uuid)=reviewer');
 EXECUTE definition;
END $$;
--> statement-breakpoint
DO $$ DECLARE tbl text; BEGIN
 FOREACH tbl IN ARRAY ARRAY['affiliations','author_works','work_files','work_versions','work_collaborations','authorship_claims','review_members','review_assignments','review_conflicts','review_response_checks','registration_entries','registration_history','attendance_credentials','attendance_records','attendance_history','attendance_operators','certificates','certificate_history','event_notifications','notification_preferences','publication_permissions','gallery_entries','gallery_releases','session_bookings','payment_charges','payment_history','work_notice_reads','researcher_profiles','orcid_connections','communication_contacts','mail_deliveries','gallery_history','operations_history'] LOOP
  EXECUTE format('GRANT SELECT,INSERT,UPDATE,DELETE ON public.%I TO sep_account_linker',tbl);
  EXECUTE format('CREATE POLICY account_consolidation_write ON public.%I FOR ALL TO sep_account_linker USING(current_setting(''sep.account_link'',true)=''true'') WITH CHECK(current_setting(''sep.account_link'',true)=''true'')',tbl);
 END LOOP;
END $$;
GRANT EXECUTE ON FUNCTION sep_enqueue_notice(uuid,uuid,uuid,text,text,text,uuid,text,text,text) TO sep_account_linker;
ALTER FUNCTION sep_account_move_columns() OWNER TO sep_account_linker;
ALTER FUNCTION sep_account_link_plan(uuid,uuid) OWNER TO sep_account_linker;
ALTER FUNCTION sep_account_consolidate(uuid,uuid,text) OWNER TO sep_account_linker;
REVOKE CREATE ON SCHEMA public FROM sep_account_linker;

--> statement-breakpoint
CREATE OR REPLACE FUNCTION sep_registration_counts(org uuid,event uuid)
RETURNS TABLE(pending bigint,confirmed bigint,waitlisted bigint,in_person bigint,virtual bigint,own_position bigint)
LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog AS $$
DECLARE previous text=current_setting('sep.registration_rpc',true);
BEGIN
 IF org IS DISTINCT FROM nullif(current_setting('sep.organization_id',true),'')::uuid OR event IS DISTINCT FROM nullif(current_setting('sep.event_id',true),'')::uuid THEN RETURN;END IF;
 PERFORM set_config('sep.registration_rpc','true',true);
 RETURN QUERY WITH current_entries AS (
  SELECT DISTINCT ON(person_id) person_id,status,modality,requested_at,id FROM public.registration_entries WHERE organization_id=org AND event_id=event
  ORDER BY person_id,CASE status WHEN 'confirmed' THEN 0 WHEN 'pending' THEN 1 WHEN 'waitlisted' THEN 2 ELSE 3 END,origin_account_id IS NOT NULL,requested_at,id
 ), queue AS (SELECT person_id,row_number() OVER(PARTITION BY modality ORDER BY requested_at,id) AS position FROM current_entries WHERE status='waitlisted')
 SELECT count(*) FILTER(WHERE r.status='pending'),count(*) FILTER(WHERE r.status='confirmed'),count(*) FILTER(WHERE r.status='waitlisted'),count(*) FILTER(WHERE r.status IN('pending','confirmed') AND r.modality='in_person'),count(*) FILTER(WHERE r.status IN('pending','confirmed') AND r.modality='virtual'),(SELECT q.position FROM queue q WHERE q.person_id=nullif(current_setting('sep.person_id',true),'')::uuid) FROM current_entries r;
 PERFORM set_config('sep.registration_rpc',coalesce(previous,''),true);
END $$;
