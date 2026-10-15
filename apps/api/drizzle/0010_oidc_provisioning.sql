GRANT INSERT ON people, identities TO sep_runtime;
--> statement-breakpoint
GRANT SELECT (person_id, issuer, subject, active) ON identities TO sep_runtime;
--> statement-breakpoint
CREATE FUNCTION sep_guard_oidc_provisioning() RETURNS trigger
LANGUAGE plpgsql SET search_path = pg_catalog AS $$
BEGIN
  IF current_user <> 'sep_runtime' THEN RETURN NEW; END IF;
  IF current_setting('sep.auth_provision', true) IS DISTINCT FROM 'true'
    OR nullif(current_setting('sep.auth_issuer', true), '') IS NULL
    OR nullif(current_setting('sep.auth_subject', true), '') IS NULL THEN
    RAISE EXCEPTION 'Verified identity context required' USING ERRCODE = '42501';
  END IF;
  IF TG_TABLE_NAME = 'people' THEN
    IF NEW.id IS DISTINCT FROM nullif(current_setting('sep.person_id', true), '')::uuid OR NOT NEW.active THEN
      RAISE EXCEPTION 'Invalid provisioned person' USING ERRCODE = '42501';
    END IF;
  ELSE
    IF NEW.person_id IS DISTINCT FROM nullif(current_setting('sep.person_id', true), '')::uuid OR NOT NEW.active
      OR NEW.issuer IS DISTINCT FROM current_setting('sep.auth_issuer', true)
      OR NEW.subject IS DISTINCT FROM current_setting('sep.auth_subject', true) THEN
      RAISE EXCEPTION 'Invalid provisioned identity' USING ERRCODE = '42501';
    END IF;
  END IF;
  RETURN NEW;
END
$$;
--> statement-breakpoint
CREATE TRIGGER oidc_person_guard BEFORE INSERT ON people
FOR EACH ROW EXECUTE FUNCTION sep_guard_oidc_provisioning();
--> statement-breakpoint
CREATE TRIGGER oidc_identity_guard BEFORE INSERT ON identities
FOR EACH ROW EXECUTE FUNCTION sep_guard_oidc_provisioning();
