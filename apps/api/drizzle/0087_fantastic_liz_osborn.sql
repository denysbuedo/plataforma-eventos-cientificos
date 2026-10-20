ALTER TABLE "events" ADD COLUMN "deleted_at" timestamp with time zone;--> statement-breakpoint
CREATE POLICY "event_not_deleted" ON "events" AS RESTRICTIVE FOR SELECT TO "sep_runtime" USING ("events"."deleted_at" IS NULL);
--> statement-breakpoint
-- Organization administrators have effective event management, without invented organizer grants.
DO $migration$
DECLARE definition text; original text;
BEGIN
 SELECT pg_get_functiondef(p.oid) INTO original FROM pg_proc p WHERE p.proname='sep_authorship' AND p.pronamespace='public'::regnamespace;
 definition=replace(original,'m.event_id=event AND m.person_id=actor','(m.event_id=event OR m.event_id IS NULL) AND m.person_id=actor');
 definition=replace(definition,$old$r.role='organizer'$old$,$new$((m.event_id=event AND r.role='organizer') OR (m.event_id IS NULL AND r.role='organization_admin'))$new$);
 IF definition=original THEN RAISE EXCEPTION 'Authorship authorization definition did not match';END IF;
 EXECUTE definition;
END $migration$;
--> statement-breakpoint
GRANT CREATE ON SCHEMA public TO sep_account_linker;
GRANT UPDATE(deleted_at,status) ON events TO sep_account_linker;
GRANT UPDATE(active) ON domains TO sep_account_linker;
GRANT INSERT ON access_history TO sep_account_linker;
CREATE POLICY event_removal_audit ON access_history FOR INSERT TO sep_account_linker WITH CHECK(current_setting('sep.event_remove',true)='true');
CREATE POLICY event_removal_service ON events FOR ALL TO sep_account_linker USING(current_setting('sep.event_remove',true)='true') WITH CHECK(current_setting('sep.event_remove',true)='true');
DO $$ DECLARE tbl text; BEGIN
 FOREACH tbl IN ARRAY ARRAY['site_publications','scientific_call_publications','program_publications','registration_publications','publication_releases','sponsorship_releases','gallery_releases','author_works','registration_entries','certificates','payment_charges','review_members','attendance_operators','session_bookings','sponsor_commitments','event_announcements'] LOOP
  EXECUTE format('CREATE POLICY event_removal_read ON public.%I FOR SELECT TO sep_account_linker USING(current_setting(''sep.event_remove'',true)=''true'')',tbl);
 END LOOP;
END $$;
--> statement-breakpoint
SET ROLE sep_account_linker;
CREATE FUNCTION sep_event_remove(target uuid,confirmation text,reason text,request uuid) RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog,public SET row_security=on AS $$
DECLARE actor uuid=nullif(current_setting('sep.person_id',true),'')::uuid;org uuid=nullif(current_setting('sep.organization_id',true),'')::uuid;e public.events%ROWTYPE;tbl text;found_data boolean;result jsonb;old_link text=current_setting('sep.account_link',true);old_remove text=current_setting('sep.event_remove',true);
BEGIN
 PERFORM set_config('sep.account_link','true',true),set_config('sep.event_remove','true',true);
 IF actor IS NULL OR org IS NULL OR target IS DISTINCT FROM nullif(current_setting('sep.event_id',true),'')::uuid OR NOT EXISTS(SELECT 1 FROM public.memberships m JOIN public.role_assignments r ON r.membership_id=m.id JOIN public.people p ON p.id=m.person_id WHERE p.id=actor AND p.active AND m.organization_id=org AND m.event_id IS NULL AND m.active AND r.role='organization_admin' AND r.active AND r.valid_from<=now() AND (r.valid_until IS NULL OR r.valid_until>now())) THEN RAISE EXCEPTION 'Organization administrator required' USING ERRCODE='42501';END IF;
 SELECT * INTO e FROM public.events WHERE id=target AND organization_id=org FOR UPDATE;
 IF NOT FOUND THEN result=jsonb_build_object('error','NOT_FOUND');
 ELSIF length(btrim(reason))<10 OR confirmation NOT IN(e.name_es,e.name_en) THEN result=jsonb_build_object('error','EVENT_DELETE_CONFIRMATION');
 ELSIF e.deleted_at IS NOT NULL THEN result=jsonb_build_object('removed',true);
 ELSIF e.status<>'draft' THEN result=jsonb_build_object('error','EVENT_DELETE_BLOCKED');
 ELSE
  found_data=false;
  FOREACH tbl IN ARRAY ARRAY['site_publications','scientific_call_publications','program_publications','registration_publications','publication_releases','sponsorship_releases','gallery_releases','author_works','registration_entries','certificates','payment_charges','review_members','attendance_operators','session_bookings','sponsor_commitments','event_announcements'] LOOP
   EXECUTE format('SELECT EXISTS(SELECT 1 FROM public.%I WHERE organization_id=$1 AND event_id=$2)',tbl) INTO found_data USING org,target;
   EXIT WHEN found_data;
  END LOOP;
  IF found_data THEN result=jsonb_build_object('error','EVENT_DELETE_BLOCKED');
  ELSE
   INSERT INTO public.access_history(id,organization_id,actor_id,actor_name,person_id,person_name,active,reason,before,after) SELECT gen_random_uuid(),org,actor,name,actor,name,false,btrim(reason),to_jsonb(e),jsonb_build_object('kind','event_deleted','eventId',target,'requestId',request) FROM public.people WHERE id=actor;
   UPDATE public.events SET deleted_at=now(),status='archived' WHERE id=target AND organization_id=org;
   UPDATE public.domains SET active=false WHERE event_id=target AND organization_id=org;
   UPDATE public.memberships SET active=false WHERE event_id=target AND organization_id=org;
   result=jsonb_build_object('removed',true);
  END IF;
 END IF;
 PERFORM set_config('sep.account_link',coalesce(old_link,'false'),true),set_config('sep.event_remove',coalesce(old_remove,'false'),true);
 RETURN result;
EXCEPTION WHEN OTHERS THEN PERFORM set_config('sep.account_link',coalesce(old_link,'false'),true),set_config('sep.event_remove',coalesce(old_remove,'false'),true);RAISE;
END $$;
REVOKE ALL ON FUNCTION sep_event_remove(uuid,text,text,uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION sep_event_remove(uuid,text,text,uuid) TO sep_runtime;
--> statement-breakpoint
-- Serialize new scientific or financial evidence with event removal; never attach it to a removed event.
CREATE FUNCTION sep_guard_removed_event() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog,public SET row_security=on AS $$
DECLARE removed timestamptz;old_remove text=current_setting('sep.event_remove',true);
BEGIN
 PERFORM set_config('sep.event_remove','true',true);
 SELECT deleted_at INTO removed FROM public.events WHERE id=NEW.event_id AND organization_id=NEW.organization_id FOR KEY SHARE;
 IF NOT FOUND OR removed IS NOT NULL THEN RAISE EXCEPTION 'Event is unavailable' USING ERRCODE='23514';END IF;
 PERFORM set_config('sep.event_remove',coalesce(old_remove,'false'),true);RETURN NEW;
EXCEPTION WHEN OTHERS THEN PERFORM set_config('sep.event_remove',coalesce(old_remove,'false'),true);RAISE;
END $$;
REVOKE ALL ON FUNCTION sep_guard_removed_event() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION sep_guard_removed_event() TO sep_migrator;
RESET ROLE;
DO $$ DECLARE tbl text;BEGIN
 FOREACH tbl IN ARRAY ARRAY['site_publications','scientific_call_publications','program_publications','registration_publications','publication_releases','sponsorship_releases','gallery_releases','author_works','registration_entries','certificates','payment_charges','review_members','attendance_operators','session_bookings','sponsor_commitments','event_announcements'] LOOP
  EXECUTE format('CREATE TRIGGER removed_event_guard BEFORE INSERT OR UPDATE ON public.%I FOR EACH ROW EXECUTE FUNCTION public.sep_guard_removed_event()',tbl);
 END LOOP;
END $$;
REVOKE CREATE ON SCHEMA public FROM sep_account_linker;

--> statement-breakpoint
CREATE FUNCTION sep_guard_event_tombstone() RETURNS trigger LANGUAGE plpgsql SET search_path=pg_catalog AS $$ BEGIN
 IF current_user='sep_runtime' AND NEW.deleted_at IS DISTINCT FROM OLD.deleted_at THEN RAISE EXCEPTION 'Use the audited event removal service' USING ERRCODE='42501';END IF;RETURN NEW;
END $$;
CREATE TRIGGER event_tombstone_guard BEFORE UPDATE OF deleted_at ON events FOR EACH ROW EXECUTE FUNCTION sep_guard_event_tombstone();
