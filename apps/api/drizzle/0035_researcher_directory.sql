ALTER TABLE researcher_profiles FORCE ROW LEVEL SECURITY;
--> statement-breakpoint
GRANT SELECT, INSERT, UPDATE ON researcher_profiles TO sep_runtime;
--> statement-breakpoint
GRANT UPDATE (name) ON people TO sep_runtime;
--> statement-breakpoint
-- The function exposes only explicitly discoverable profile metadata. Runtime
-- cannot directly read other profiles, people or ORCID connections through RLS.
CREATE FUNCTION sep_researcher_directory(search_query text, selected_id uuid)
RETURNS TABLE(person_id uuid, name text, affiliations jsonb, orcid text)
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = pg_catalog AS $$
DECLARE previous_flag text := current_setting('sep.directory_read',true);
BEGIN
  IF NOT EXISTS (SELECT 1 FROM public.people actor
    WHERE actor.id=nullif(current_setting('sep.person_id',true),'')::uuid AND actor.active)
    THEN RAISE EXCEPTION 'Unauthenticated directory lookup' USING ERRCODE='42501'; END IF;
  IF selected_id IS NULL AND (search_query IS NULL OR char_length(btrim(search_query))<3 OR char_length(search_query)>100)
    THEN RAISE EXCEPTION 'Invalid directory search' USING ERRCODE='22023'; END IF;
  PERFORM set_config('sep.directory_read','true',true);
  RETURN QUERY
    SELECT p.id,p.name,r.affiliations,o.orcid
    FROM public.researcher_profiles r
    JOIN public.people p ON p.id=r.person_id AND p.active
    LEFT JOIN public.orcid_connections o ON o.person_id=p.id AND o.environment='production' AND o.connected_at IS NOT NULL
    WHERE r.discoverable AND
      ((selected_id IS NOT NULL AND p.id=selected_id) OR
       (selected_id IS NULL AND
        (strpos(lower(p.name),lower(btrim(search_query)))>0 OR lower(o.orcid)=lower(btrim(search_query)) OR EXISTS
         (SELECT 1 FROM jsonb_array_elements(r.affiliations) a WHERE strpos(lower(a->>'institution'),lower(btrim(search_query)))>0))))
    ORDER BY lower(p.name),p.id LIMIT 10;
  PERFORM set_config('sep.directory_read',coalesce(previous_flag,''),true);
EXCEPTION WHEN OTHERS THEN
  PERFORM set_config('sep.directory_read',coalesce(previous_flag,''),true);
  RAISE;
END
$$;
--> statement-breakpoint
REVOKE ALL ON FUNCTION sep_researcher_directory(text,uuid) FROM PUBLIC;
--> statement-breakpoint
GRANT EXECUTE ON FUNCTION sep_researcher_directory(text,uuid) TO sep_runtime;
