-- Only an organization administrator can read sign-in labels and operational delegations.
GRANT CREATE ON SCHEMA public TO sep_account_linker;
SET ROLE sep_account_linker;
DO $migration$
DECLARE definition text; original text;
BEGIN
 SELECT pg_get_functiondef('public.sep_registered_member(text,jsonb)'::regprocedure) INTO original;
 definition=replace(original,$old$IF command='find' THEN$old$,$new$IF command='roster' THEN
 SELECT coalesce(jsonb_agg(jsonb_build_object('personId',p.id,
 'email',coalesce((SELECT email FROM public.communication_contacts c WHERE c.person_id=p.id),(SELECT a.email FROM public.local_accounts a WHERE coalesce(a.principal_id,a.person_id)=p.id AND a.active AND a.verified_at IS NOT NULL ORDER BY a.created_at,a.email LIMIT 1)),
 'providers',coalesce((SELECT jsonb_agg(DISTINCT CASE WHEN i.issuer='sep-local' THEN 'local' WHEN i.issuer='https://accounts.google.com' THEN 'google' ELSE 'oidc' END) FROM public.identities i WHERE i.person_id=p.id AND i.active AND (i.issuer<>'sep-local' OR EXISTS(SELECT 1 FROM public.local_accounts a WHERE a.person_id::text=i.subject AND coalesce(a.principal_id,a.person_id)=p.id AND a.active AND a.verified_at IS NOT NULL))),'[]'::jsonb),
 'reviews',coalesce((SELECT jsonb_agg(jsonb_build_object('eventId',r.event_id,'status',r.status)) FROM public.review_members r WHERE r.person_id=p.id AND r.organization_id=org),'[]'::jsonb),
 'accreditation',coalesce((SELECT jsonb_agg(o.event_id) FROM public.attendance_operators o WHERE o.person_id=p.id AND o.organization_id=org AND o.active AND EXISTS(SELECT 1 FROM public.memberships m WHERE m.person_id=p.id AND m.organization_id=org AND m.event_id=o.event_id AND m.active)),'[]'::jsonb)
 ) ORDER BY p.id),'[]'::jsonb) INTO result FROM public.people p WHERE p.active AND EXISTS(SELECT 1 FROM public.memberships m WHERE m.person_id=p.id AND m.organization_id=org AND m.active);
 ELSIF command='find' THEN$new$);
 definition=replace(definition,$old$c.email=lower(trim(d->>'email'))$old$,$new$(c.email=lower(trim(d->>'email')) OR c.verified_emails @> jsonb_build_array(lower(trim(d->>'email'))))$new$);
 IF definition=original THEN RAISE EXCEPTION 'Registered member function did not match';END IF;
 EXECUTE definition;
END $migration$;
RESET ROLE;
REVOKE CREATE ON SCHEMA public FROM sep_account_linker;
