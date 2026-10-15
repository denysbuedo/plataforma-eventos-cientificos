-- Runtime can only change event organizer grants after actual organization-admin validation.
GRANT INSERT ON memberships, role_assignments TO sep_runtime;
--> statement-breakpoint
GRANT UPDATE (active) ON memberships TO sep_runtime;
--> statement-breakpoint
GRANT UPDATE (active, valid_from, valid_until) ON role_assignments TO sep_runtime;
--> statement-breakpoint
CREATE FUNCTION sep_guard_organizer_management() RETURNS trigger
LANGUAGE plpgsql SET search_path = pg_catalog AS $$
DECLARE target_org uuid; target_event uuid;
BEGIN
  IF current_user <> 'sep_runtime' THEN RETURN NEW; END IF;
  IF TG_TABLE_NAME = 'memberships' THEN
    target_org := NEW.organization_id; target_event := NEW.event_id;
  ELSE
    IF NEW.role <> 'organizer' THEN
      RAISE EXCEPTION 'Only organizer assignments are delegable' USING ERRCODE = '42501';
    END IF;
    SELECT organization_id, event_id INTO target_org, target_event
      FROM public.memberships WHERE id = NEW.membership_id;
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
    ) THEN
    RAISE EXCEPTION 'Organization administrator required' USING ERRCODE = '42501';
  END IF;
  RETURN NEW;
END
$$;
--> statement-breakpoint
CREATE TRIGGER organizer_membership_guard BEFORE INSERT OR UPDATE ON memberships
FOR EACH ROW EXECUTE FUNCTION sep_guard_organizer_management();
--> statement-breakpoint
CREATE TRIGGER organizer_assignment_guard BEFORE INSERT OR UPDATE ON role_assignments
FOR EACH ROW EXECUTE FUNCTION sep_guard_organizer_management();
