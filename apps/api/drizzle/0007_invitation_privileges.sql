ALTER TABLE organization_invitations FORCE ROW LEVEL SECURITY;
--> statement-breakpoint
GRANT SELECT, INSERT ON organization_invitations TO sep_runtime;
--> statement-breakpoint
GRANT UPDATE (status, accepted_by, accepted_at) ON organization_invitations TO sep_runtime;
--> statement-breakpoint
CREATE OR REPLACE FUNCTION sep_guard_organizer_management() RETURNS trigger
LANGUAGE plpgsql SET search_path = pg_catalog AS $$
DECLARE target_org uuid; target_event uuid;
BEGIN
  IF current_user <> 'sep_runtime' THEN RETURN NEW; END IF;
  IF TG_TABLE_NAME = 'memberships' THEN
    target_org := NEW.organization_id; target_event := NEW.event_id;
    IF target_event IS NULL AND NEW.person_id = nullif(current_setting('sep.person_id', true), '')::uuid
      AND target_org = nullif(current_setting('sep.organization_id', true), '')::uuid AND NEW.active
      AND EXISTS (SELECT 1 FROM public.organization_invitations i WHERE i.organization_id = target_org
        AND i.token_hash = current_setting('sep.invitation_hash', true) AND i.status = 'pending' AND i.expires_at > now())
    THEN RETURN NEW; END IF;
  ELSE
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
--> statement-breakpoint
CREATE FUNCTION sep_guard_invitation_update() RETURNS trigger
LANGUAGE plpgsql SET search_path = pg_catalog AS $$
BEGIN
  IF current_user <> 'sep_runtime' THEN RETURN NEW; END IF;
  IF OLD.status <> 'pending' THEN RAISE EXCEPTION 'Invitation is closed' USING ERRCODE = '23514'; END IF;
  IF NEW.status = 'revoked' AND current_setting('sep.organization_admin', true) = 'true' THEN RETURN NEW; END IF;
  IF NEW.status = 'accepted' AND OLD.expires_at > now()
    AND OLD.token_hash = current_setting('sep.invitation_hash', true)
    AND NEW.accepted_by = nullif(current_setting('sep.person_id', true), '')::uuid AND NEW.accepted_at IS NOT NULL
  THEN RETURN NEW; END IF;
  RAISE EXCEPTION 'Invalid invitation transition' USING ERRCODE = '42501';
END
$$;
--> statement-breakpoint
CREATE TRIGGER invitation_transition_guard BEFORE UPDATE ON organization_invitations
FOR EACH ROW EXECUTE FUNCTION sep_guard_invitation_update();
