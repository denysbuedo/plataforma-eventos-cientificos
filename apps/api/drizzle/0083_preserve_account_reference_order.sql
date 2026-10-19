-- Preserve author and program ordering while resolving consolidated identities.
CREATE OR REPLACE FUNCTION sep_account_resolve_json(value jsonb) RETURNS jsonb
LANGUAGE plpgsql SET search_path=pg_catalog,public AS $$
DECLARE result jsonb; item record;
BEGIN
 IF jsonb_typeof(value)='array' THEN SELECT coalesce(jsonb_agg(public.sep_account_resolve_json(v) ORDER BY pos),'[]'::jsonb) INTO result FROM jsonb_array_elements(value) WITH ORDINALITY x(v,pos); RETURN result;
 ELSIF jsonb_typeof(value)='object' THEN
  result='{}';FOR item IN SELECT * FROM jsonb_each(value) LOOP
   IF item.key IN ('moderatorIds','coordinatorIds') AND jsonb_typeof(item.value)='array' THEN
    result=result||jsonb_build_object(item.key,(SELECT coalesce(jsonb_agg(id ORDER BY first_pos),'[]'::jsonb) FROM (SELECT public.sep_canonical_person(v::uuid) AS id,min(pos) AS first_pos FROM jsonb_array_elements_text(item.value) WITH ORDINALITY x(v,pos) GROUP BY public.sep_canonical_person(v::uuid)) ordered_ids));
   ELSIF item.key IN ('personId','presenterPersonId','ownerId') AND item.value#>>'{}' ~ '^[a-f0-9]{8}-[a-f0-9-]{27}$' THEN
    result=result||jsonb_build_object(item.key,public.sep_canonical_person((item.value#>>'{}')::uuid));
   ELSE result=result||jsonb_build_object(item.key,public.sep_account_resolve_json(item.value));END IF;
  END LOOP;RETURN result;
 END IF;RETURN value;
END $$;
