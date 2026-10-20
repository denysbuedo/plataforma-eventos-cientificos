-- Server-side search and pagination. Only the selected page includes contact/profile projections.
GRANT CREATE ON SCHEMA public TO sep_account_linker;
SET ROLE sep_account_linker;
DO $migration$
DECLARE definition text; original text;
BEGIN
 SELECT pg_get_functiondef('public.sep_registered_member(text,jsonb)'::regprocedure) INTO original;
 definition=replace(original,$old$IF command IN('directory','person') THEN$old$,$new$IF command='directory_page' THEN
 WITH eligible AS MATERIALIZED (
 SELECT p.id,p.name,rp.affiliations,rp.background,
 coalesce((SELECT c.email FROM public.communication_contacts c WHERE c.person_id=p.id),(SELECT a.email FROM public.local_accounts a WHERE coalesce(a.principal_id,a.person_id)=p.id AND a.active AND a.verified_at IS NOT NULL ORDER BY a.created_at,a.email LIMIT 1)) AS email
 FROM public.people p LEFT JOIN public.researcher_profiles rp ON rp.person_id=p.id
 WHERE p.active AND EXISTS(SELECT 1 FROM public.memberships m WHERE m.organization_id=org AND m.person_id=p.id AND m.active)
 ), filtered AS MATERIALIZED (
 SELECT * FROM eligible WHERE coalesce(d->>'q','')='' OR strpos(lower(name||' '||coalesce(email,'')||' '||coalesce((SELECT string_agg(a->>'institution',' ') FROM jsonb_array_elements(affiliations) a),'')),lower(d->>'q'))>0
 ), paged AS (
 SELECT * FROM filtered ORDER BY lower(name),id LIMIT least(100,greatest(1,coalesce((d->>'limit')::int,20))) OFFSET greatest(0,coalesce((d->>'offset')::int,0))
 )
 SELECT jsonb_build_object('total',(SELECT count(*) FROM filtered),'people',coalesce((
 SELECT jsonb_agg(jsonb_build_object('personId',p.id,'name',p.name,'email',p.email,'eventCount',(SELECT count(DISTINCT m.event_id) FROM public.memberships m JOIN public.events e ON e.id=m.event_id AND e.organization_id=org AND e.deleted_at IS NULL WHERE m.person_id=p.id AND m.organization_id=org AND m.active),
 'primaryAffiliation',CASE WHEN jsonb_typeof(p.background->'primaryAffiliationIndex')='number' THEN p.affiliations->((p.background->>'primaryAffiliationIndex')::int) END,
 'affiliations',CASE WHEN jsonb_typeof(p.background->'primaryAffiliationIndex')='number' AND p.affiliations->((p.background->>'primaryAffiliationIndex')::int) IS NOT NULL THEN jsonb_build_array(p.affiliations->((p.background->>'primaryAffiliationIndex')::int)) ELSE '[]'::jsonb END,'position',coalesce(p.background->>'position',''),
 'orcid',(SELECT jsonb_build_object('id',o.orcid,'environment',o.environment) FROM public.orcid_connections o WHERE o.person_id=p.id AND o.orcid IS NOT NULL AND o.connected_at IS NOT NULL)) ORDER BY lower(p.name),p.id) FROM paged p),'[]'::jsonb)) INTO result;
 ELSIF command IN('directory','person') THEN$new$);
 definition=replace(definition,$old$'affiliations',coalesce(rp.affiliations,'[]'::jsonb),'position'$old$,$new$'primaryAffiliation',CASE WHEN jsonb_typeof(rp.background->'primaryAffiliationIndex')='number' THEN rp.affiliations->((rp.background->>'primaryAffiliationIndex')::int) END,
 'affiliations',coalesce(rp.affiliations,'[]'::jsonb),'position'$new$);
 IF definition=original THEN RAISE EXCEPTION 'People directory definition did not match';END IF;
 EXECUTE definition;
END $migration$;
RESET ROLE;
REVOKE CREATE ON SCHEMA public FROM sep_account_linker;
