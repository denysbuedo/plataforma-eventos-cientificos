CREATE TABLE "account_link_history" (
	"id" uuid PRIMARY KEY NOT NULL,
	"actor_id" uuid NOT NULL,
	"other_id" uuid NOT NULL,
	"provider" text NOT NULL,
	"archive" jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "account_link_history" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "account_link_tickets" (
	"token_hash" text PRIMARY KEY NOT NULL,
	"actor_id" uuid NOT NULL,
	"other_id" uuid NOT NULL,
	"provider" text NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"used_at" timestamp with time zone,
	CONSTRAINT "account_link_ticket_hash" CHECK ("account_link_tickets"."token_hash" ~ '^[a-f0-9]{64}$'),
	CONSTRAINT "account_link_provider" CHECK ("account_link_tickets"."provider" IN ('oidc','google','local'))
);
--> statement-breakpoint
ALTER TABLE "account_link_tickets" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "account_link_history" ADD CONSTRAINT "account_link_history_actor_id_people_id_fk" FOREIGN KEY ("actor_id") REFERENCES "public"."people"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "account_link_history" ADD CONSTRAINT "account_link_history_other_id_people_id_fk" FOREIGN KEY ("other_id") REFERENCES "public"."people"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "account_link_tickets" ADD CONSTRAINT "account_link_tickets_actor_id_people_id_fk" FOREIGN KEY ("actor_id") REFERENCES "public"."people"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "account_link_tickets" ADD CONSTRAINT "account_link_tickets_other_id_people_id_fk" FOREIGN KEY ("other_id") REFERENCES "public"."people"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE POLICY "account_link_read" ON "account_link_history" AS PERMISSIVE FOR SELECT TO "sep_runtime" USING ("account_link_history"."actor_id" = nullif(current_setting('sep.person_id', true), '')::uuid);--> statement-breakpoint
CREATE POLICY "account_link_service_read" ON "account_link_history" AS PERMISSIVE FOR SELECT TO "sep_account_linker" USING (current_setting('sep.account_link',true)='true');--> statement-breakpoint
CREATE POLICY "account_link_service_insert" ON "account_link_history" AS PERMISSIVE FOR INSERT TO "sep_account_linker" WITH CHECK (current_setting('sep.account_link',true)='true');--> statement-breakpoint
CREATE POLICY "account_link_service" ON "account_link_tickets" AS PERMISSIVE FOR ALL TO "sep_account_linker" USING (current_setting('sep.account_link',true)='true') WITH CHECK (current_setting('sep.account_link',true)='true');
--> statement-breakpoint
ALTER TABLE account_link_tickets FORCE ROW LEVEL SECURITY;
ALTER TABLE account_link_history FORCE ROW LEVEL SECURITY;
REVOKE ALL ON account_link_tickets,account_link_history FROM PUBLIC,sep_runtime;
GRANT SELECT ON account_link_history TO sep_runtime;
--> statement-breakpoint
DO $$ DECLARE t record; BEGIN
 FOR t IN SELECT DISTINCT c.relname FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace
 WHERE n.nspname='public' AND c.relkind='r' AND c.relrowsecurity AND c.relname NOT IN ('account_link_tickets','account_link_history') LOOP
  EXECUTE format('CREATE POLICY account_link_service_read ON public.%I FOR SELECT TO sep_account_linker USING (current_setting(''sep.account_link'',true)=''true'')',t.relname);
 END LOOP;
END $$;
--> statement-breakpoint
DO $$ DECLARE tbl text; BEGIN
 FOREACH tbl IN ARRAY ARRAY['people','identities','local_accounts','local_sessions','local_challenges'] LOOP
 EXECUTE format('CREATE POLICY account_link_service_write ON public.%I FOR ALL TO sep_account_linker USING (current_setting(''sep.account_link'',true)=''true'') WITH CHECK (current_setting(''sep.account_link'',true)=''true'')',tbl);
 END LOOP;
END $$;
--> statement-breakpoint
CREATE FUNCTION sep_account_link_unused(who uuid) RETURNS boolean
LANGUAGE plpgsql SET search_path=pg_catalog,public SET row_security=on AS $$
DECLARE r record; present boolean;
BEGIN
 -- Fail closed for new person relationships: an account with any business history is not consolidated automatically.
 FOR r IN SELECT DISTINCT c.relname,a.attname FROM pg_constraint fk JOIN pg_class c ON c.oid=fk.conrelid JOIN pg_namespace n ON n.oid=c.relnamespace JOIN pg_attribute a ON a.attrelid=c.oid AND a.attnum=ANY(fk.conkey)
 WHERE fk.contype='f' AND fk.confrelid='public.people'::regclass AND n.nspname='public'
 AND c.relname NOT IN ('identities','local_accounts','researcher_profiles','communication_contacts','affiliations','audit_entries','account_link_tickets') ORDER BY c.relname,a.attname LOOP
  IF NOT EXISTS(SELECT 1 FROM pg_policy p JOIN pg_class c ON c.oid=p.polrelid WHERE c.relname=r.relname AND p.polname IN ('account_link_service_read','account_link_read')) THEN RETURN false; END IF;
  EXECUTE format('SELECT EXISTS(SELECT 1 FROM public.%I WHERE %I=$1)',r.relname,r.attname) INTO present USING who;
  IF present THEN RETURN false; END IF;
 END LOOP;
 IF EXISTS(SELECT 1 FROM public.audit_entries WHERE person_id=who AND action<>'identity.profile.updated') THEN RETURN false; END IF;
 -- Registered coauthor references are also preserved, even before an authorship claim is filed.
 IF EXISTS(SELECT 1 FROM public.author_works WHERE position(who::text IN authors::text)>0) THEN RETURN false; END IF;
 IF EXISTS(SELECT 1 FROM public.work_versions WHERE position(who::text IN content::text)>0) THEN RETURN false; END IF;
 RETURN true;
END $$;
REVOKE ALL ON FUNCTION sep_account_link_unused(uuid) FROM PUBLIC,sep_runtime;
--> statement-breakpoint
CREATE FUNCTION sep_account_links(command text,d jsonb) RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog,public SET row_security=on AS $$
DECLARE actor uuid=nullif(current_setting('sep.person_id',true),'')::uuid; other uuid; r record; ticket public.account_link_tickets%ROWTYPE; result jsonb; snapshot jsonb; local_count integer;
BEGIN
 IF actor IS NULL THEN RAISE EXCEPTION 'Missing actor' USING ERRCODE='42501'; END IF;
 PERFORM set_config('sep.account_link','true',true);
 IF NOT EXISTS(SELECT 1 FROM public.people WHERE id=actor AND active) THEN RAISE EXCEPTION 'Inactive actor' USING ERRCODE='42501'; END IF;
 IF command='list' THEN
  SELECT jsonb_build_object('methods',coalesce(jsonb_agg(jsonb_build_object('id',i.id,'provider',CASE WHEN i.issuer='sep-local' THEN 'local' WHEN i.issuer='https://accounts.google.com' THEN 'google' ELSE 'oidc' END)), '[]'::jsonb)) INTO result FROM public.identities i WHERE i.person_id=actor AND i.active AND (i.issuer<>'sep-local' OR EXISTS(SELECT 1 FROM public.local_accounts a WHERE a.person_id=actor AND a.active AND a.verified_at IS NOT NULL));
  result=result||jsonb_build_object('history',coalesce((SELECT jsonb_agg(jsonb_build_object('id',h.id,'provider',h.provider,'createdAt',h.created_at,'previousProfile',h.archive) ORDER BY h.created_at DESC) FROM (SELECT * FROM public.account_link_history WHERE actor_id=actor ORDER BY created_at DESC LIMIT 20) h),'[]'::jsonb));
 ELSIF command='prepare' THEN
  other=(d->>'otherId')::uuid;
  IF actor=other THEN result=jsonb_build_object('alreadyLinked',true);
  ELSIF NOT EXISTS(SELECT 1 FROM public.people WHERE id=other AND active) THEN result=jsonb_build_object('blocked','inactive');
  ELSIF NOT public.sep_account_link_unused(other) THEN result=jsonb_build_object('blocked','existing_activity');
  ELSIF EXISTS(SELECT 1 FROM public.local_accounts WHERE person_id=actor) AND EXISTS(SELECT 1 FROM public.local_accounts WHERE person_id=other AND active) THEN result=jsonb_build_object('blocked','two_local_accounts');
  ELSE
   DELETE FROM public.account_link_tickets WHERE actor_id=actor AND used_at IS NULL;
   INSERT INTO public.account_link_tickets(token_hash,actor_id,other_id,provider,expires_at) VALUES(d->>'tokenHash',actor,other,d->>'provider',now()+interval '10 minutes');
   SELECT jsonb_build_object('name',name,'profile',(SELECT to_jsonb(p)-'person_id' FROM public.researcher_profiles p WHERE p.person_id=other),'institutions',coalesce((SELECT jsonb_agg(institution) FROM public.affiliations WHERE person_id=other),'[]'::jsonb)) INTO snapshot FROM public.people WHERE id=other;
   result=jsonb_build_object('ready',true,'previousProfile',snapshot);
  END IF;
 ELSIF command='confirm' THEN
  SELECT * INTO ticket FROM public.account_link_tickets WHERE token_hash=d->>'tokenHash' AND actor_id=actor AND used_at IS NULL AND expires_at>now() FOR UPDATE;
  IF NOT FOUND THEN result=jsonb_build_object('blocked','expired'); ELSE
   other=ticket.other_id;
   -- Scoped requests hold this shared lock; consolidation waits for in-flight operations.
   PERFORM pg_advisory_xact_lock(hashtextextended('person-session:'||other::text,0));
   PERFORM 1 FROM public.people WHERE id IN (actor,other) ORDER BY id FOR UPDATE;
   IF NOT EXISTS(SELECT 1 FROM public.people WHERE id=other AND active) OR NOT public.sep_account_link_unused(other) THEN result=jsonb_build_object('blocked','existing_activity');
   ELSIF EXISTS(SELECT 1 FROM public.local_accounts WHERE person_id=actor) AND EXISTS(SELECT 1 FROM public.local_accounts WHERE person_id=other AND active) THEN result=jsonb_build_object('blocked','two_local_accounts'); ELSE
    SELECT jsonb_build_object('name',name,'profile',(SELECT to_jsonb(p)-'person_id' FROM public.researcher_profiles p WHERE p.person_id=other),'institutions',coalesce((SELECT jsonb_agg(institution) FROM public.affiliations WHERE person_id=other),'[]'::jsonb)) INTO snapshot FROM public.people WHERE id=other;
    DELETE FROM public.local_sessions WHERE person_id=other;
    DELETE FROM public.local_challenges WHERE person_id=other;
    UPDATE public.local_accounts SET person_id=actor,credential_version=credential_version+1 WHERE person_id=other;
    UPDATE public.identities SET person_id=actor WHERE person_id=other;
    snapshot=snapshot||jsonb_build_object('requestId',d->>'requestId','primaryProvider',d->>'provider');
    INSERT INTO public.account_link_history(id,actor_id,other_id,provider,archive) VALUES(gen_random_uuid(),actor,other,ticket.provider,snapshot);
    UPDATE public.people SET active=false WHERE id=other;
    UPDATE public.account_link_tickets SET used_at=now() WHERE token_hash=ticket.token_hash;
    result=jsonb_build_object('linked',true);
   END IF;
  END IF;
 ELSE RAISE EXCEPTION 'Unknown operation' USING ERRCODE='22023'; END IF;
 PERFORM set_config('sep.account_link','false',true);
 RETURN result;
EXCEPTION WHEN OTHERS THEN PERFORM set_config('sep.account_link','false',true); RAISE;
END $$;
REVOKE ALL ON FUNCTION sep_account_links(text,jsonb) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION sep_account_links(text,jsonb) TO sep_runtime;
--> statement-breakpoint
CREATE FUNCTION sep_account_link_history_immutable() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN RAISE EXCEPTION 'Link history is immutable' USING ERRCODE='42501'; END $$;
CREATE TRIGGER account_link_history_immutable BEFORE UPDATE OR DELETE ON account_link_history FOR EACH ROW EXECUTE FUNCTION sep_account_link_history_immutable();

--> statement-breakpoint
CREATE FUNCTION sep_registered_member(command text,d jsonb) RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog,public SET row_security=on AS $$
DECLARE actor uuid=nullif(current_setting('sep.person_id',true),'')::uuid; org uuid=nullif(current_setting('sep.organization_id',true),'')::uuid; who uuid; result jsonb; touched integer;
BEGIN
 PERFORM set_config('sep.account_link','true',true);
 IF actor IS NULL OR org IS NULL OR coalesce(current_setting('sep.event_id',true),'')<>'' OR NOT EXISTS(SELECT 1 FROM public.memberships m JOIN public.role_assignments r ON r.membership_id=m.id JOIN public.people p ON p.id=m.person_id WHERE m.person_id=actor AND m.organization_id=org AND m.event_id IS NULL AND m.active AND p.active AND r.role='organization_admin' AND r.active AND r.valid_from<=now() AND (r.valid_until IS NULL OR r.valid_until>now())) THEN RAISE EXCEPTION 'Not authorized' USING ERRCODE='42501'; END IF;
 IF command='find' THEN
 SELECT coalesce(jsonb_agg(jsonb_build_object('personId',p.id,'name',p.name,'member',EXISTS(SELECT 1 FROM public.memberships m WHERE m.person_id=p.id AND m.organization_id=org AND m.active),'providers',coalesce((SELECT jsonb_agg(DISTINCT CASE WHEN i.issuer='sep-local' THEN 'local' WHEN i.issuer='https://accounts.google.com' THEN 'google' ELSE 'oidc' END) FROM public.identities i WHERE i.person_id=p.id AND i.active),'[]'::jsonb))),'[]'::jsonb) INTO result FROM (SELECT p.id,p.name FROM public.people p WHERE p.active AND (EXISTS(SELECT 1 FROM public.communication_contacts c WHERE c.person_id=p.id AND c.email=lower(trim(d->>'email'))) OR EXISTS(SELECT 1 FROM public.local_accounts a WHERE a.person_id=p.id AND a.active AND a.verified_at IS NOT NULL AND a.email=lower(trim(d->>'email')))) ORDER BY p.name,p.id LIMIT 10) p;
 ELSIF command='add' THEN
 who=(d->>'personId')::uuid;PERFORM pg_advisory_xact_lock_shared(hashtextextended('person-session:'||who::text,0));
 IF NOT EXISTS(SELECT 1 FROM public.people p WHERE p.id=who AND p.active AND (EXISTS(SELECT 1 FROM public.communication_contacts c WHERE c.person_id=p.id AND c.email=lower(trim(d->>'email'))) OR EXISTS(SELECT 1 FROM public.local_accounts a WHERE a.person_id=p.id AND a.active AND a.verified_at IS NOT NULL AND a.email=lower(trim(d->>'email'))))) THEN result=jsonb_build_object('found',false);
 ELSE
 PERFORM pg_advisory_xact_lock(hashtextextended('membership:'||org::text||':'||who::text,0));
 INSERT INTO public.memberships(id,organization_id,person_id,event_id,active) VALUES(gen_random_uuid(),org,who,NULL,true) ON CONFLICT (person_id,organization_id) WHERE event_id IS NULL DO UPDATE SET active=true WHERE NOT memberships.active;
 GET DIAGNOSTICS touched=ROW_COUNT;
 result=jsonb_build_object('found',true,'changed',touched>0);
 END IF;
 ELSE RAISE EXCEPTION 'Unknown operation' USING ERRCODE='22023'; END IF;
 PERFORM set_config('sep.account_link','false',true);RETURN result;
EXCEPTION WHEN OTHERS THEN PERFORM set_config('sep.account_link','false',true);RAISE;
END $$;
REVOKE ALL ON FUNCTION sep_registered_member(text,jsonb) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION sep_registered_member(text,jsonb) TO sep_runtime;
--> statement-breakpoint
CREATE POLICY registered_member_write ON memberships FOR ALL TO sep_account_linker USING(current_setting('sep.account_link',true)='true') WITH CHECK(current_setting('sep.account_link',true)='true');

--> statement-breakpoint
-- A separate non-login owner prevents unrelated SECURITY DEFINER functions from inheriting these policies.
GRANT USAGE,CREATE ON SCHEMA public TO sep_account_linker;
GRANT SELECT ON ALL TABLES IN SCHEMA public TO sep_account_linker;
GRANT INSERT,UPDATE,DELETE ON account_link_tickets TO sep_account_linker;
GRANT INSERT ON account_link_history TO sep_account_linker;
GRANT UPDATE ON people,identities,local_accounts TO sep_account_linker;
GRANT DELETE ON local_sessions,local_challenges TO sep_account_linker;
GRANT INSERT,UPDATE ON memberships TO sep_account_linker;
ALTER FUNCTION sep_account_link_unused(uuid) OWNER TO sep_account_linker;
ALTER FUNCTION sep_account_links(text,jsonb) OWNER TO sep_account_linker;
ALTER FUNCTION sep_registered_member(text,jsonb) OWNER TO sep_account_linker;
REVOKE CREATE ON SCHEMA public FROM sep_account_linker;
