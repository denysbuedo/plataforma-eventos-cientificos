-- Explicit privileges: registry lookups are functions, identity grants are read-only,
-- event writes are narrow, and audit entries cannot be rewritten by the runtime.
REVOKE CREATE ON SCHEMA public FROM PUBLIC;
--> statement-breakpoint
GRANT USAGE ON SCHEMA public TO sep_runtime;
--> statement-breakpoint
GRANT SELECT ON people, memberships, role_assignments, events TO sep_runtime;
--> statement-breakpoint
GRANT INSERT ON events, audit_entries TO sep_runtime;
--> statement-breakpoint
GRANT UPDATE (name_es, name_en) ON events TO sep_runtime;
--> statement-breakpoint
ALTER TABLE people FORCE ROW LEVEL SECURITY;
--> statement-breakpoint
ALTER TABLE identities FORCE ROW LEVEL SECURITY;
--> statement-breakpoint
ALTER TABLE affiliations FORCE ROW LEVEL SECURITY;
--> statement-breakpoint
ALTER TABLE memberships FORCE ROW LEVEL SECURITY;
--> statement-breakpoint
ALTER TABLE role_assignments FORCE ROW LEVEL SECURITY;
--> statement-breakpoint
ALTER TABLE events FORCE ROW LEVEL SECURITY;
--> statement-breakpoint
ALTER TABLE event_series FORCE ROW LEVEL SECURITY;
--> statement-breakpoint
ALTER TABLE event_editions FORCE ROW LEVEL SECURITY;
--> statement-breakpoint
ALTER TABLE audit_entries FORCE ROW LEVEL SECURITY;
--> statement-breakpoint
CREATE FUNCTION sep_resolve_domain(p_hostname text)
RETURNS TABLE (organization_id uuid, event_id uuid)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = pg_catalog
AS $$
  SELECT d.organization_id, d.event_id FROM public.domains d
  JOIN public.organizations o ON o.id = d.organization_id
  WHERE d.hostname = p_hostname AND d.active AND d.verified AND o.active
$$;
--> statement-breakpoint
REVOKE ALL ON FUNCTION sep_resolve_domain(text) FROM PUBLIC;
--> statement-breakpoint
GRANT EXECUTE ON FUNCTION sep_resolve_domain(text) TO sep_runtime;
--> statement-breakpoint
CREATE FUNCTION sep_validate_role_scope() RETURNS trigger
LANGUAGE plpgsql SET search_path = pg_catalog AS $$
DECLARE scope_event uuid;
BEGIN
  SELECT event_id INTO scope_event FROM public.memberships WHERE id = NEW.membership_id;
  IF NOT FOUND THEN RAISE EXCEPTION 'Membership does not exist' USING ERRCODE = '23503'; END IF;
  IF (NEW.role = 'organization_admin') IS DISTINCT FROM (scope_event IS NULL) THEN
    RAISE EXCEPTION 'Role scope mismatch' USING ERRCODE = '23514';
  END IF;
  RETURN NEW;
END
$$;
--> statement-breakpoint
CREATE TRIGGER role_scope_check BEFORE INSERT OR UPDATE ON role_assignments
FOR EACH ROW EXECUTE FUNCTION sep_validate_role_scope();
--> statement-breakpoint
CREATE FUNCTION sep_immutable_membership_scope() RETURNS trigger
LANGUAGE plpgsql SET search_path = pg_catalog AS $$
BEGIN
  IF NEW.organization_id IS DISTINCT FROM OLD.organization_id OR NEW.event_id IS DISTINCT FROM OLD.event_id
    OR NEW.person_id IS DISTINCT FROM OLD.person_id THEN
    RAISE EXCEPTION 'Membership scope is immutable' USING ERRCODE = '23514';
  END IF;
  RETURN NEW;
END
$$;
--> statement-breakpoint
CREATE TRIGGER membership_scope_immutable BEFORE UPDATE ON memberships
FOR EACH ROW EXECUTE FUNCTION sep_immutable_membership_scope();
