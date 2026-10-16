ALTER TABLE public.authorship_claims FORCE ROW LEVEL SECURITY;
--> statement-breakpoint
-- No table grants to runtime: pending claims never grant private work/file access.
CREATE FUNCTION public.sep_authorship(operation text, target_work uuid, target_author uuid,
  target_claim uuid, expected_revision integer, decision_message text, audit_request uuid)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog AS $$
DECLARE
  actor uuid:=nullif(current_setting('sep.person_id',true),'')::uuid;
  org uuid:=nullif(current_setting('sep.organization_id',true),'')::uuid;
  event uuid:=nullif(current_setting('sep.event_id',true),'')::uuid;
  previous_flag text:=current_setting('sep.authorship_rpc',true);
  actor_name text; verified_email text:=nullif(current_setting('sep.authorship_email',true),'');
  actor_orcid text; is_staff boolean; responsible uuid; declaration jsonb; evidence text;
  w public.author_works%ROWTYPE; c public.authorship_claims%ROWTYPE;
  result jsonb; new_id uuid; change_action text; own_conflict boolean;
BEGIN
  SELECT name INTO actor_name FROM public.people WHERE id=actor AND active;
  IF actor_name IS NULL THEN RETURN jsonb_build_object('error','UNAUTHORIZED'); END IF;
  IF event IS NULL OR org IS NULL THEN RETURN jsonb_build_object('error','NOT_FOUND'); END IF;
  PERFORM set_config('sep.authorship_rpc','true',true);
  IF NOT EXISTS(SELECT 1 FROM public.events WHERE id=event AND organization_id=org) THEN
    result:=jsonb_build_object('error','NOT_FOUND');
  ELSE
    SELECT o.orcid INTO actor_orcid FROM public.orcid_connections o
      WHERE o.person_id=actor AND o.environment='production' AND o.connected_at IS NOT NULL;
    SELECT EXISTS(SELECT 1 FROM public.memberships m JOIN public.role_assignments r ON r.membership_id=m.id
      WHERE m.organization_id=org AND m.event_id=event AND m.person_id=actor AND m.active
      AND r.role='organizer' AND r.active AND r.valid_from<=now() AND (r.valid_until IS NULL OR r.valid_until>now())) INTO is_staff;
    IF operation='synchronize' THEN
      SELECT * INTO w FROM public.author_works WHERE id=target_work AND owner_id=actor AND NOT hidden FOR UPDATE;
      IF w.id IS NULL THEN result:=jsonb_build_object('error','NOT_FOUND'); ELSE
        UPDATE public.authorship_claims ac SET status='revoked',revision=ac.revision+1,decided_by=actor,decided_at=now(),message='Association changed by submission owner'
          WHERE ac.work_id=w.id AND ac.status='approved' AND NOT EXISTS(SELECT 1 FROM jsonb_array_elements(w.authors) a
            WHERE a->>'id'=ac.author_id::text AND a->>'personId'=ac.claimant_id::text AND a->>'authorshipConfirmed'='true');
        IF FOUND THEN
          INSERT INTO public.work_history(id,organization_id,event_id,work_id,actor_id,actor_name,actor,action,message)
            VALUES(gen_random_uuid(),org,event,w.id,actor,actor_name,'author','authorship_links_changed','');
          INSERT INTO public.audit_entries(id,organization_id,event_id,person_id,action,resource_id,request_id)
            VALUES(gen_random_uuid(),org,event,actor,'work.authorship_links_changed',w.id,audit_request);
        END IF;
        result:=jsonb_build_object('ok',true);
      END IF;
    ELSIF operation IN ('list','staff_list') THEN
      IF operation='staff_list' AND NOT is_staff THEN result:=jsonb_build_object('error','FORBIDDEN'); ELSE
      WITH work_scope AS (
        SELECT aw.*,coalesce((SELECT wc.person_id FROM public.work_collaborations wc
          JOIN LATERAL jsonb_array_elements(aw.authors) a ON true
          WHERE wc.work_id=aw.id AND wc.status='accepted' AND wc.responsibility_accepted_at IS NOT NULL
          AND a->>'id'=wc.author_id::text AND a->>'personId'=wc.person_id::text
          AND a->>'email'=wc.email AND a->>'corresponding'='true' AND a->>'authorshipConfirmed'='true' LIMIT 1),aw.owner_id) AS responsible_id
        FROM public.author_works aw WHERE aw.organization_id=org AND aw.event_id=event AND NOT aw.hidden
      ), declarations AS (
        SELECT ws.*,a AS declaration,CASE WHEN a->>'personId'=actor::text THEN 'account'
          WHEN nullif(a->>'personId','') IS NULL AND verified_email IS NOT NULL AND lower(a->>'email')=verified_email THEN 'email'
          WHEN nullif(a->>'personId','') IS NULL AND actor_orcid IS NOT NULL AND a->>'orcid'=actor_orcid THEN 'orcid' END AS basis
        FROM work_scope ws CROSS JOIN LATERAL jsonb_array_elements(ws.authors) a
      ), requests AS (
        SELECT ac.*,ws.responsible_id,ws.owner_id,ws.title,ws.submitted_content,ws.submitted_at,ws.authors,
          (SELECT a FROM jsonb_array_elements(ws.authors) a WHERE a->>'id'=ac.author_id::text) AS current_declaration,
          (ws.owner_id=actor OR EXISTS(SELECT 1 FROM jsonb_array_elements(ws.authors) a WHERE a->>'personId'=actor::text)
            OR EXISTS(SELECT 1 FROM jsonb_array_elements(coalesce(ws.submitted_content->'authors','[]'::jsonb)) a WHERE a->>'personId'=actor::text)) AS staff_conflict
        FROM public.authorship_claims ac JOIN work_scope ws ON ws.id=ac.work_id
        WHERE ac.claimant_id=actor OR ws.responsible_id=actor OR (operation='staff_list' AND is_staff)
      )
      SELECT jsonb_build_object(
        'candidates',coalesce((SELECT jsonb_agg(item) FROM (SELECT jsonb_build_object('workId',d.id,'authorId',d.declaration->>'id',
          'fullName',d.declaration->>'fullName','basis',d.basis) AS item FROM declarations d
          WHERE operation='list' AND d.basis IS NOT NULL AND d.declaration->>'authorshipConfirmed' IS DISTINCT FROM 'true'
          AND NOT EXISTS(SELECT 1 FROM public.authorship_claims ac WHERE ac.work_id=d.id AND ac.author_id::text=d.declaration->>'id' AND ac.claimant_id=actor AND (ac.status IN ('pending','approved') OR ac.status='rejected' AND ac.declaration=d.declaration))
          ORDER BY d.created_at,d.id,d.declaration->>'id' LIMIT 100) items),'[]'::jsonb),
        'contributions',coalesce((SELECT jsonb_agg(item) FROM (SELECT jsonb_build_object('workId',d.id,'authorId',d.declaration->>'id',
          'title',d.title,'status',d.status,'fullName',d.declaration->>'fullName') AS item FROM declarations d
          WHERE operation='list' AND d.declaration->>'personId'=actor::text AND d.declaration->>'authorshipConfirmed'='true'
          ORDER BY d.created_at DESC,d.id LIMIT 100) items),'[]'::jsonb),
        'claims',coalesce((SELECT jsonb_agg(item) FROM (SELECT jsonb_build_object('id',r.id,'workId',r.work_id,'authorId',r.author_id,
          'fullName',r.declaration->>'fullName','claimantName',r.claimant_name,'status',r.status,'basis',r.basis,'revision',r.revision,
          'createdAt',r.created_at,'decidedAt',r.decided_at,'message',r.message,
          'title',CASE WHEN r.responsible_id=actor THEN r.title WHEN operation='staff_list' THEN coalesce(r.submitted_content->>'title','') WHEN r.status='approved' AND r.current_declaration->>'personId'=actor::text AND r.current_declaration->>'authorshipConfirmed'='true' THEN r.title ELSE NULL END,
          'stale',r.current_declaration IS DISTINCT FROM r.declaration AND r.status='pending',
          'responsibility',CASE WHEN r.responsible_id=r.owner_id THEN 'submitter' ELSE 'corresponding' END,
          'needsIndependentReview',r.responsible_id=r.claimant_id,
          'canDecide',r.status='pending' AND r.claimant_id<>actor AND
             ((operation='list' AND r.responsible_id=actor) OR (operation='staff_list' AND is_staff AND NOT r.staff_conflict)),
          'canCancel',r.status='pending' AND r.claimant_id=actor,
          'canRevoke',r.status='approved' AND (r.claimant_id=actor OR (operation='list' AND r.responsible_id=actor) OR (operation='staff_list' AND is_staff AND NOT r.staff_conflict))) AS item
          FROM requests r ORDER BY (r.status='pending') DESC,r.created_at DESC,r.id LIMIT 100) items),'[]'::jsonb),
        'responsibilities',coalesce((SELECT jsonb_agg(item) FROM (SELECT jsonb_build_object('workId',ws.id,'title',ws.title,'revision',ws.revision,
          'responsibility',CASE WHEN ws.responsible_id=ws.owner_id THEN 'submitter' ELSE 'corresponding' END,
          'canAccept',ws.responsible_id<>actor AND EXISTS(SELECT 1 FROM public.work_collaborations wc JOIN LATERAL jsonb_array_elements(ws.authors) a ON true
            WHERE wc.work_id=ws.id AND wc.person_id=actor AND wc.status='accepted' AND a->>'id'=wc.author_id::text AND a->>'personId'=actor::text AND a->>'email'=wc.email AND a->>'corresponding'='true' AND a->>'authorshipConfirmed'='true'),
          'canRelease',ws.responsible_id<>ws.owner_id AND (ws.responsible_id=actor OR ws.owner_id=actor)) AS item
          FROM work_scope ws WHERE operation='list' AND (ws.owner_id=actor OR EXISTS(SELECT 1 FROM public.work_collaborations wc WHERE wc.work_id=ws.id AND wc.person_id=actor AND wc.status='accepted'))
          ORDER BY ws.created_at DESC,ws.id LIMIT 100) items),'[]'::jsonb)) INTO result;
      END IF;
    ELSE
      IF operation NOT IN ('request','decline','approve','reject','cancel','revoke','staff_approve','staff_reject','staff_revoke','accept_responsibility','release_responsibility')
        OR length(coalesce(decision_message,''))>2000 THEN result:=jsonb_build_object('error','VALIDATION_FAILED');
      ELSE
        IF target_claim IS NOT NULL THEN
          SELECT * INTO c FROM public.authorship_claims WHERE id=target_claim;
          target_work:=c.work_id;
        END IF;
        SELECT * INTO w FROM public.author_works WHERE id=target_work AND organization_id=org AND event_id=event AND NOT hidden FOR UPDATE;
        IF w.id IS NULL THEN result:=jsonb_build_object('error','NOT_FOUND'); ELSE
          SELECT coalesce((SELECT wc.person_id FROM public.work_collaborations wc JOIN LATERAL jsonb_array_elements(w.authors) a ON true
            WHERE wc.work_id=w.id AND wc.status='accepted' AND wc.responsibility_accepted_at IS NOT NULL
            AND a->>'id'=wc.author_id::text AND a->>'personId'=wc.person_id::text AND a->>'email'=wc.email AND a->>'corresponding'='true' AND a->>'authorshipConfirmed'='true' LIMIT 1),w.owner_id) INTO responsible;
          IF operation IN ('request','decline') THEN
            SELECT a INTO declaration FROM jsonb_array_elements(w.authors) a WHERE a->>'id'=target_author::text;
            evidence:=CASE WHEN declaration->>'personId'=actor::text THEN 'account'
              WHEN nullif(declaration->>'personId','') IS NULL AND verified_email IS NOT NULL AND lower(declaration->>'email')=verified_email THEN 'email'
              WHEN nullif(declaration->>'personId','') IS NULL AND actor_orcid IS NOT NULL AND declaration->>'orcid'=actor_orcid THEN 'orcid' END;
            IF evidence IS NULL THEN result:=jsonb_build_object('error','NOT_FOUND');
            ELSIF declaration->>'authorshipConfirmed'='true' OR EXISTS(SELECT 1 FROM public.authorship_claims WHERE work_id=w.id AND author_id=target_author AND claimant_id=actor AND status IN ('pending','approved')) THEN result:=jsonb_build_object('error','CONFLICT');
            ELSIF (SELECT count(*) FROM public.authorship_claims WHERE work_id=w.id)>=200 THEN result:=jsonb_build_object('error','AUTHORSHIP_LIMIT');
            ELSE
              new_id:=gen_random_uuid();
              INSERT INTO public.authorship_claims(id,organization_id,event_id,work_id,author_id,claimant_id,claimant_name,declaration,basis,verified_orcid,status,decided_by,decided_at,message)
                VALUES(new_id,org,event,w.id,target_author,actor,actor_name,declaration,evidence,actor_orcid,CASE WHEN operation='decline' THEN 'rejected' ELSE 'pending' END,
                CASE WHEN operation='decline' THEN actor ELSE NULL END,CASE WHEN operation='decline' THEN now() ELSE NULL END,coalesce(decision_message,''));
              change_action:=CASE WHEN operation='decline' THEN 'authorship_declined' ELSE 'authorship_requested' END;
            END IF;
          ELSIF operation IN ('accept_responsibility','release_responsibility') THEN
            IF expected_revision IS DISTINCT FROM w.revision THEN result:=jsonb_build_object('error','REVISION_CONFLICT');
            ELSIF operation='accept_responsibility' AND (responsible=actor OR NOT EXISTS(SELECT 1 FROM public.work_collaborations wc JOIN LATERAL jsonb_array_elements(w.authors) a ON true
              WHERE wc.work_id=w.id AND wc.status='accepted' AND wc.person_id=actor AND a->>'id'=wc.author_id::text AND a->>'personId'=actor::text AND a->>'email'=wc.email AND a->>'corresponding'='true' AND a->>'authorshipConfirmed'='true')) THEN result:=jsonb_build_object('error','FORBIDDEN');
            ELSIF operation='release_responsibility' AND (responsible=w.owner_id OR actor NOT IN (responsible,w.owner_id)) THEN result:=jsonb_build_object('error','FORBIDDEN');
            ELSE
              UPDATE public.work_collaborations SET responsibility_accepted_at=CASE WHEN operation='accept_responsibility' THEN now() ELSE NULL END
                WHERE work_id=w.id AND status='accepted' AND (operation='release_responsibility' OR person_id=actor);
              UPDATE public.author_works SET revision=revision+1,updated_at=now() WHERE id=w.id;
              change_action:=CASE WHEN operation='accept_responsibility' THEN 'authorship_responsibility_accepted' ELSE 'authorship_responsibility_released' END;new_id:=w.id;
            END IF;
          ELSE
            SELECT * INTO c FROM public.authorship_claims WHERE id=target_claim AND work_id=w.id FOR UPDATE;
            SELECT a INTO declaration FROM jsonb_array_elements(w.authors) a WHERE a->>'id'=c.author_id::text;
            own_conflict:=w.owner_id=actor OR EXISTS(SELECT 1 FROM jsonb_array_elements(w.authors) a WHERE a->>'personId'=actor::text)
              OR EXISTS(SELECT 1 FROM jsonb_array_elements(coalesce(w.submitted_content->'authors','[]'::jsonb)) a WHERE a->>'personId'=actor::text);
            IF c.id IS NULL OR (c.claimant_id<>actor AND responsible<>actor AND NOT (operation LIKE 'staff_%' AND is_staff)) THEN result:=jsonb_build_object('error','NOT_FOUND');
            ELSIF expected_revision IS DISTINCT FROM c.revision THEN result:=jsonb_build_object('error','REVISION_CONFLICT');
            ELSIF operation='cancel' AND (c.claimant_id<>actor OR c.status<>'pending') THEN result:=jsonb_build_object('error','FORBIDDEN');
            ELSIF operation LIKE 'staff_%' AND (NOT is_staff OR own_conflict OR c.claimant_id=actor) THEN result:=jsonb_build_object('error','AUTHORSHIP_SELF_APPROVAL');
            ELSIF operation IN ('approve','reject') AND (responsible<>actor OR c.claimant_id=actor) THEN result:=jsonb_build_object('error','AUTHORSHIP_SELF_APPROVAL');
            ELSIF operation='revoke' AND actor NOT IN (c.claimant_id,responsible) THEN result:=jsonb_build_object('error','FORBIDDEN');
            ELSIF operation IN ('approve','reject','staff_approve','staff_reject','cancel') AND c.status<>'pending' OR operation IN ('revoke','staff_revoke') AND c.status<>'approved' THEN result:=jsonb_build_object('error','CONFLICT');
            ELSIF operation IN ('reject','staff_reject','staff_approve','revoke','staff_revoke') AND length(btrim(coalesce(decision_message,'')))<3 THEN result:=jsonb_build_object('error','VALIDATION_FAILED');
            ELSIF operation IN ('approve','staff_approve') AND NOT EXISTS(SELECT 1 FROM public.people WHERE id=c.claimant_id AND active) THEN result:=jsonb_build_object('error','CONFLICT');
            ELSIF operation IN ('approve','staff_approve') AND declaration IS DISTINCT FROM c.declaration THEN result:=jsonb_build_object('error','AUTHORSHIP_STALE');
            ELSIF operation IN ('approve','staff_approve') AND EXISTS(SELECT 1 FROM jsonb_array_elements(w.authors) a WHERE a->>'id'<>c.author_id::text AND a->>'personId'=c.claimant_id::text) THEN result:=jsonb_build_object('error','CONFLICT');
            ELSE
              IF operation IN ('approve','staff_approve') THEN
                UPDATE public.author_works SET authors=(SELECT jsonb_agg(CASE WHEN a->>'id'=c.author_id::text THEN
                  a || jsonb_build_object('personId',c.claimant_id,'authorshipConfirmed',true,'orcid',coalesce(c.verified_orcid,a->>'orcid',''),'orcidVerified',c.verified_orcid IS NOT NULL) ELSE a END ORDER BY ordinal)
                  FROM jsonb_array_elements(w.authors) WITH ORDINALITY AS x(a,ordinal)),revision=revision+1,updated_at=now() WHERE id=w.id;
              ELSIF operation IN ('revoke','staff_revoke') AND declaration->>'personId'=c.claimant_id::text THEN
                UPDATE public.author_works SET authors=(SELECT jsonb_agg(CASE WHEN a->>'id'=c.author_id::text THEN
                  (a-'personId') || jsonb_build_object('authorshipConfirmed',false,'orcidVerified',false) ELSE a END ORDER BY ordinal)
                  FROM jsonb_array_elements(w.authors) WITH ORDINALITY AS x(a,ordinal)),revision=revision+1,updated_at=now() WHERE id=w.id;
                UPDATE public.work_collaborations SET status='revoked',responsibility_accepted_at=NULL WHERE work_id=w.id AND author_id=c.author_id AND person_id=c.claimant_id AND status IN ('pending','accepted');
              END IF;
              UPDATE public.authorship_claims SET status=CASE WHEN operation IN ('approve','staff_approve') THEN 'approved' WHEN operation IN ('reject','staff_reject') THEN 'rejected' ELSE 'revoked' END,
                revision=revision+1,decided_by=actor,decided_at=now(),message=coalesce(decision_message,'') WHERE id=c.id;
              change_action:=CASE WHEN operation IN ('approve','staff_approve') THEN 'authorship_approved' WHEN operation IN ('reject','staff_reject') THEN 'authorship_rejected' WHEN operation='cancel' THEN 'authorship_cancelled' ELSE 'authorship_revoked' END;new_id:=c.id;
            END IF;
          END IF;
          IF change_action IS NOT NULL THEN
            INSERT INTO public.work_history(id,organization_id,event_id,work_id,actor_id,actor_name,actor,action,message)
              VALUES(gen_random_uuid(),org,event,w.id,actor,actor_name,CASE WHEN operation LIKE 'staff_%' THEN 'staff' ELSE 'author' END,change_action,coalesce(decision_message,''));
            INSERT INTO public.audit_entries(id,organization_id,event_id,person_id,action,resource_id,request_id)
              VALUES(gen_random_uuid(),org,event,actor,'work.'||change_action,new_id,audit_request);
            result:=jsonb_build_object('ok',true);
          END IF;
        END IF;
      END IF;
    END IF;
  END IF;
  PERFORM set_config('sep.authorship_rpc',coalesce(previous_flag,''),true);
  RETURN coalesce(result,jsonb_build_object('error','CONFLICT'));
EXCEPTION WHEN OTHERS THEN
  PERFORM set_config('sep.authorship_rpc',coalesce(previous_flag,''),true);RAISE;
END $$;
--> statement-breakpoint
REVOKE ALL ON FUNCTION public.sep_authorship(text,uuid,uuid,uuid,integer,text,uuid) FROM PUBLIC;
--> statement-breakpoint
GRANT EXECUTE ON FUNCTION public.sep_authorship(text,uuid,uuid,uuid,integer,text,uuid) TO sep_runtime;
