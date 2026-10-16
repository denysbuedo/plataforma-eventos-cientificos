-- Registry tables retain no direct runtime grants. Every function uses the
-- organization/actor of an authorized transaction, never a caller's tenant ID.
CREATE FUNCTION sep_registry_admin() RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = pg_catalog AS $$
  SELECT current_setting('sep.organization_admin', true) = 'true'
    AND nullif(current_setting('sep.event_id', true), '') IS NULL
    AND EXISTS (SELECT 1 FROM public.memberships m
      JOIN public.role_assignments r ON r.membership_id = m.id
      JOIN public.people p ON p.id = m.person_id
      JOIN public.organizations o ON o.id = m.organization_id
      WHERE m.organization_id = nullif(current_setting('sep.organization_id', true), '')::uuid
        AND m.person_id = nullif(current_setting('sep.person_id', true), '')::uuid
        AND m.event_id IS NULL AND m.active AND p.active AND o.active
        AND r.role = 'organization_admin' AND r.active AND r.valid_from <= now()
        AND (r.valid_until IS NULL OR r.valid_until > now()))
$$;
--> statement-breakpoint
REVOKE ALL ON FUNCTION sep_registry_admin() FROM PUBLIC;
--> statement-breakpoint
CREATE FUNCTION sep_organization_settings() RETURNS jsonb
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = pg_catalog AS $$
DECLARE result jsonb;
BEGIN
  IF NOT public.sep_registry_admin() THEN RAISE EXCEPTION 'Forbidden' USING ERRCODE = '42501'; END IF;
  SELECT jsonb_build_object('organization', jsonb_build_object('id', o.id, 'name', o.name,
    'contactEmail', o.contact_email, 'website', o.website, 'description', o.description, 'revision', o.revision),
    'domains', COALESCE((SELECT jsonb_agg(jsonb_build_object('id', d.id, 'eventId', d.event_id,
      'hostname', d.hostname, 'active', d.active, 'verified', d.verified, 'tlsReady', d.tls_ready,
      'verificationToken', d.verification_token) ORDER BY d.hostname)
      FROM public.domains d WHERE d.organization_id = o.id), '[]'::jsonb)) INTO result
  FROM public.organizations o WHERE o.id = nullif(current_setting('sep.organization_id', true), '')::uuid;
  RETURN result;
END
$$;
--> statement-breakpoint
CREATE FUNCTION sep_update_organization(p_name text, p_email text, p_website text, p_description text, p_revision integer) RETURNS boolean
LANGUAGE plpgsql SECURITY DEFINER SET search_path = pg_catalog AS $$
BEGIN
  IF NOT public.sep_registry_admin() THEN RAISE EXCEPTION 'Forbidden' USING ERRCODE = '42501'; END IF;
  UPDATE public.organizations SET name = p_name, contact_email = p_email, website = p_website,
    description = p_description, revision = revision + 1
    WHERE id = nullif(current_setting('sep.organization_id', true), '')::uuid AND revision = p_revision;
  RETURN FOUND;
END
$$;
--> statement-breakpoint
CREATE FUNCTION sep_register_domain(p_id uuid, p_event uuid, p_hostname text, p_token text) RETURNS boolean
LANGUAGE plpgsql SECURITY DEFINER SET search_path = pg_catalog AS $$
DECLARE org uuid := nullif(current_setting('sep.organization_id', true), '')::uuid;
BEGIN
  IF NOT public.sep_registry_admin() THEN RAISE EXCEPTION 'Forbidden' USING ERRCODE = '42501'; END IF;
  PERFORM 1 FROM public.events WHERE id = p_event AND organization_id = org AND status <> 'archived' FOR UPDATE;
  IF NOT FOUND THEN RETURN false; END IF;
  -- Bound registry size and serialize registrations in an organization.
  PERFORM 1 FROM public.organizations WHERE id = org FOR UPDATE;
  IF (SELECT count(*) FROM public.domains WHERE organization_id = org) >= 100 THEN RETURN false; END IF;
  INSERT INTO public.domains (id, organization_id, event_id, hostname, verification_token)
    VALUES (p_id, org, p_event, p_hostname, p_token) ON CONFLICT (hostname) DO NOTHING;
  RETURN FOUND;
END
$$;
--> statement-breakpoint
CREATE FUNCTION sep_transition_domain(p_id uuid, p_action text, p_token text) RETURNS boolean
LANGUAGE plpgsql SECURITY DEFINER SET search_path = pg_catalog AS $$
DECLARE d public.domains%ROWTYPE;
BEGIN
  IF NOT public.sep_registry_admin() THEN RAISE EXCEPTION 'Forbidden' USING ERRCODE = '42501'; END IF;
  SELECT * INTO d FROM public.domains WHERE id = p_id
    AND organization_id = nullif(current_setting('sep.organization_id', true), '')::uuid FOR UPDATE;
  -- Organization ingress is provisioned by operations and cannot be disabled here.
  IF NOT FOUND OR d.event_id IS NULL THEN RETURN false; END IF;
  IF p_action = 'verify' AND d.verification_token IS NOT NULL AND d.verification_token = p_token THEN
    UPDATE public.domains SET verified = true WHERE id = d.id;
  ELSIF p_action = 'activate' AND d.verified AND d.tls_ready
    AND d.verification_token IS NOT NULL AND d.verification_token = p_token THEN
    UPDATE public.domains SET active = true WHERE id = d.id;
  ELSIF p_action = 'deactivate' THEN
    UPDATE public.domains SET active = false,
      verification_token = COALESCE(d.verification_token, replace(gen_random_uuid()::text || gen_random_uuid()::text, '-', '')),
      verified = CASE WHEN d.verification_token IS NULL THEN false ELSE d.verified END WHERE id = d.id;
  ELSIF p_action = 'delete' AND NOT d.active THEN
    DELETE FROM public.domains WHERE id = d.id;
  ELSE RETURN false;
  END IF;
  RETURN true;
END
$$;
--> statement-breakpoint
REVOKE ALL ON FUNCTION sep_organization_settings(), sep_update_organization(text,text,text,text,integer),
  sep_register_domain(uuid,uuid,text,text), sep_transition_domain(uuid,text,text) FROM PUBLIC;
--> statement-breakpoint
GRANT EXECUTE ON FUNCTION sep_organization_settings(), sep_update_organization(text,text,text,text,integer),
  sep_register_domain(uuid,uuid,text,text), sep_transition_domain(uuid,text,text) TO sep_runtime;
--> statement-breakpoint
-- Existing ingress was provisioned outside the UI; preserve it unchanged.
UPDATE domains SET tls_ready = true WHERE active AND verified;
