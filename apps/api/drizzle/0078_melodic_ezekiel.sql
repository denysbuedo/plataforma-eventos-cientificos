CREATE TABLE "access_history" (
	"id" uuid PRIMARY KEY NOT NULL,
	"organization_id" uuid NOT NULL,
	"actor_id" uuid NOT NULL,
	"actor_name" text NOT NULL,
	"person_id" uuid NOT NULL,
	"person_name" text NOT NULL,
	"active" boolean NOT NULL,
	"reason" text NOT NULL,
	"before" jsonb NOT NULL,
	"after" jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "access_history" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "access_history" ADD CONSTRAINT "access_history_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "access_history" ADD CONSTRAINT "access_history_actor_id_people_id_fk" FOREIGN KEY ("actor_id") REFERENCES "public"."people"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "access_history" ADD CONSTRAINT "access_history_person_id_people_id_fk" FOREIGN KEY ("person_id") REFERENCES "public"."people"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE POLICY "access_history_read" ON "access_history" AS PERMISSIVE FOR SELECT TO "sep_runtime" USING ("access_history"."organization_id" = nullif(current_setting('sep.organization_id', true), '')::uuid AND current_setting('sep.organization_admin',true)='true' AND nullif(current_setting('sep.event_id',true),'') IS NULL);--> statement-breakpoint
CREATE POLICY "access_history_insert" ON "access_history" AS PERMISSIVE FOR INSERT TO "sep_runtime" WITH CHECK ("access_history"."organization_id" = nullif(current_setting('sep.organization_id', true), '')::uuid AND current_setting('sep.access_manage',true)='true' AND current_setting('sep.organization_admin',true)='true' AND "access_history"."actor_id" = nullif(current_setting('sep.person_id', true), '')::uuid AND nullif(current_setting('sep.event_id',true),'') IS NULL);
--> statement-breakpoint
ALTER TABLE access_history FORCE ROW LEVEL SECURITY;
GRANT SELECT,INSERT ON access_history TO sep_runtime;
CREATE TRIGGER access_history_immutable BEFORE UPDATE OR DELETE ON access_history FOR EACH ROW EXECUTE FUNCTION sep_registration_history_immutable();
CREATE OR REPLACE FUNCTION sep_guard_organizer_management() RETURNS trigger
LANGUAGE plpgsql SET search_path = pg_catalog AS $$
DECLARE target_org uuid; target_event uuid;
BEGIN
  IF current_user <> 'sep_runtime' THEN RETURN NEW; END IF;
  IF TG_TABLE_NAME = 'memberships' THEN
    target_org := NEW.organization_id; target_event := NEW.event_id;
    IF target_event IS NULL AND current_setting('sep.access_manage',true)='true' AND (current_setting('sep.organization_admin',true)='true' AND nullif(current_setting('sep.event_id',true),'') IS NULL AND EXISTS(SELECT 1 FROM public.memberships m JOIN public.role_assignments r ON r.membership_id=m.id JOIN public.people p ON p.id=m.person_id WHERE m.organization_id=nullif(current_setting('sep.organization_id',true),'')::uuid AND m.person_id=nullif(current_setting('sep.person_id',true),'')::uuid AND m.event_id IS NULL AND m.active AND p.active AND r.role='organization_admin' AND r.active AND r.valid_from<=now() AND (r.valid_until IS NULL OR r.valid_until>now()))) THEN RETURN NEW; END IF;
    IF target_event IS NULL AND NEW.person_id = nullif(current_setting('sep.person_id', true), '')::uuid
      AND target_org = nullif(current_setting('sep.organization_id', true), '')::uuid AND NEW.active
      AND EXISTS (SELECT 1 FROM public.organization_invitations i WHERE i.organization_id = target_org
        AND i.token_hash = current_setting('sep.invitation_hash', true) AND i.status = 'pending' AND i.expires_at > now())
    THEN RETURN NEW; END IF;
  ELSE
    IF NEW.role='organization_admin' THEN
      SELECT organization_id,event_id INTO target_org,target_event FROM public.memberships WHERE id=NEW.membership_id;
      IF target_event IS NULL AND current_setting('sep.access_manage',true)='true' AND (current_setting('sep.organization_admin',true)='true' AND nullif(current_setting('sep.event_id',true),'') IS NULL AND EXISTS(SELECT 1 FROM public.memberships m JOIN public.role_assignments r ON r.membership_id=m.id JOIN public.people p ON p.id=m.person_id WHERE m.organization_id=nullif(current_setting('sep.organization_id',true),'')::uuid AND m.person_id=nullif(current_setting('sep.person_id',true),'')::uuid AND m.event_id IS NULL AND m.active AND p.active AND r.role='organization_admin' AND r.active AND r.valid_from<=now() AND (r.valid_until IS NULL OR r.valid_until>now()))) THEN RETURN NEW; END IF;
      RAISE EXCEPTION 'Organization administrator management required' USING ERRCODE='42501';
    END IF;
    IF NEW.role <> 'organizer' THEN
      RAISE EXCEPTION 'Only organizer assignments are delegable' USING ERRCODE = '42501';
    END IF;
    SELECT organization_id, event_id INTO target_org, target_event FROM public.memberships WHERE id = NEW.membership_id;
  END IF;
  IF target_event IS NULL OR target_org IS DISTINCT FROM nullif(current_setting('sep.organization_id', true), '')::uuid
    OR target_event IS DISTINCT FROM nullif(current_setting('sep.event_id', true), '')::uuid
    OR NOT EXISTS (
      SELECT 1 FROM public.memberships m JOIN public.role_assignments r ON r.membership_id = m.id
      JOIN public.people p ON p.id = m.person_id
      WHERE m.person_id = nullif(current_setting('sep.person_id', true), '')::uuid
        AND m.organization_id = target_org AND m.event_id IS NULL AND m.active AND p.active
        AND r.role = 'organization_admin' AND r.active AND r.valid_from <= now()
        AND (r.valid_until IS NULL OR r.valid_until > now())
    ) THEN RAISE EXCEPTION 'Organization administrator required' USING ERRCODE = '42501'; END IF;
  RETURN NEW;
END
$$;
