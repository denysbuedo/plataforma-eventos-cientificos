-- Extend the existing administrator-only projection; never expose identity credentials or other tenants.
CREATE POLICY organization_people_events ON events FOR SELECT TO sep_account_linker USING(current_setting('sep.account_link',true)='true' AND organization_id=nullif(current_setting('sep.organization_id',true),'')::uuid AND deleted_at IS NULL);
--> statement-breakpoint
GRANT CREATE ON SCHEMA public TO sep_account_linker;
SET ROLE sep_account_linker;
DO $migration$
DECLARE definition text; original text;
BEGIN
 SELECT pg_get_functiondef('public.sep_registered_member(text,jsonb)'::regprocedure) INTO original;
 definition=replace(original,$old$IF command='roster' THEN$old$,$new$IF command IN('directory','person') THEN
 who=nullif(d->>'personId','')::uuid;
 SELECT coalesce(jsonb_agg(item ORDER BY item->>'name'),'[]'::jsonb) INTO result FROM (
 SELECT jsonb_build_object('personId',p.id,'name',p.name,
 'email',coalesce((SELECT c.email FROM public.communication_contacts c WHERE c.person_id=p.id),(SELECT a.email FROM public.local_accounts a WHERE coalesce(a.principal_id,a.person_id)=p.id AND a.active AND a.verified_at IS NOT NULL ORDER BY a.created_at,a.email LIMIT 1)),
 'affiliations',coalesce(rp.affiliations,'[]'::jsonb),'position',coalesce(rp.background->>'position',''),
 'orcid',(SELECT jsonb_build_object('id',o.orcid,'environment',o.environment) FROM public.orcid_connections o WHERE o.person_id=p.id AND o.orcid IS NOT NULL AND o.connected_at IS NOT NULL),
 'eventCount',(SELECT count(DISTINCT m.event_id) FROM public.memberships m JOIN public.events e ON e.id=m.event_id AND e.organization_id=org AND e.deleted_at IS NULL WHERE m.person_id=p.id AND m.organization_id=org AND m.active))
 ||CASE WHEN command='person' THEN jsonb_build_object('background',rp.background,'events',coalesce((
 SELECT jsonb_agg(activity ORDER BY activity->>'nameEs') FROM (
 SELECT jsonb_build_object('id',e.id,'nameEs',e.name_es,'nameEn',e.name_en,
 'registrations',coalesce((SELECT jsonb_agg(jsonb_build_object('id',r.id,'status',r.status,'modality',r.modality) ORDER BY r.requested_at DESC) FROM public.registration_entries r WHERE r.organization_id=org AND r.event_id=e.id AND r.person_id=p.id),'[]'::jsonb),
 'works',coalesce((SELECT jsonb_agg(jsonb_build_object('id',w.id,'title',w.title,'status',w.status,'relationship',CASE WHEN w.owner_id=p.id THEN 'submitter' ELSE 'author' END) ORDER BY w.title)
 FROM public.author_works w WHERE w.organization_id=org AND w.event_id=e.id AND NOT w.hidden AND w.status<>'draft' AND w.submitted_at IS NOT NULL AND
 (w.owner_id=p.id OR EXISTS(SELECT 1 FROM jsonb_array_elements(coalesce(w.submitted_content->'authors',w.authors)) a WHERE public.sep_canonical_person(nullif(a->>'personId','')::uuid)=p.id AND a->>'authorshipConfirmed'='true') OR EXISTS(SELECT 1 FROM public.authorship_claims c WHERE c.organization_id=org AND c.event_id=e.id AND c.work_id=w.id AND c.claimant_id=p.id AND c.status='approved'))),'[]'::jsonb),
 'reviews',coalesce((SELECT jsonb_agg(jsonb_build_object('id',a.id,'title',w.title,'status',a.status) ORDER BY w.title,a.id) FROM public.review_assignments a JOIN public.author_works w ON w.id=a.work_id AND w.organization_id=org AND w.event_id=e.id WHERE a.organization_id=org AND a.event_id=e.id AND a.reviewer_id=p.id),'[]'::jsonb),
 'reviewStatus',(SELECT m.status FROM public.review_members m WHERE m.organization_id=org AND m.event_id=e.id AND m.person_id=p.id)) AS activity
 FROM public.events e WHERE e.organization_id=org AND e.deleted_at IS NULL
 ) event_activity WHERE jsonb_array_length(activity->'registrations')>0 OR jsonb_array_length(activity->'works')>0 OR jsonb_array_length(activity->'reviews')>0 OR activity->>'reviewStatus' IS NOT NULL
 ),'[]'::jsonb)) ELSE '{}'::jsonb END AS item
 FROM public.people p LEFT JOIN public.researcher_profiles rp ON rp.person_id=p.id
 WHERE p.active AND (command='directory' OR p.id=who) AND EXISTS(SELECT 1 FROM public.memberships m WHERE m.organization_id=org AND m.person_id=p.id AND m.active)
 ORDER BY p.name,p.id LIMIT 200
 ) directory;
 IF command='person' THEN result=result->0;END IF;
 ELSIF command='roster' THEN$new$);
 IF definition=original THEN RAISE EXCEPTION 'Registered member projection did not match';END IF;
 EXECUTE definition;
END $migration$;
RESET ROLE;
REVOKE CREATE ON SCHEMA public FROM sep_account_linker;
