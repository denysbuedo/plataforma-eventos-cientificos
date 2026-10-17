CREATE OR REPLACE FUNCTION sep_review_response_sync(org uuid,event uuid,work uuid) RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog AS $$
DECLARE actor uuid:=nullif(current_setting('sep.person_id',true),'')::uuid; old_flag text:=current_setting('sep.review_rpc',true); v public.work_versions%ROWTYPE; h public.work_history%ROWTYPE; w public.author_works%ROWTYPE; recipient jsonb; recipients jsonb; candidate jsonb; matches integer:=0; source public.review_assignments%ROWTYPE; item record; response jsonb;
BEGIN
 IF actor IS NULL OR org IS DISTINCT FROM nullif(current_setting('sep.organization_id',true),'')::uuid OR event IS DISTINCT FROM nullif(current_setting('sep.event_id',true),'')::uuid THEN RETURN; END IF;
 PERFORM set_config('sep.review_rpc','true',true);
 IF work IS NULL THEN
  IF EXISTS(SELECT 1 FROM public.review_members m WHERE m.organization_id=org AND m.event_id=event AND m.person_id=actor AND m.status='accepted') THEN
   FOR item IN SELECT DISTINCT a.work_id FROM public.review_assignments a WHERE a.organization_id=org AND a.event_id=event AND a.reviewer_id=actor AND a.submitted_at IS NOT NULL LOOP PERFORM public.sep_review_response_sync(org,event,item.work_id); END LOOP;
  END IF;
  PERFORM set_config('sep.review_rpc',coalesce(old_flag,''),true);RETURN;
 END IF;
 SELECT * INTO w FROM public.author_works WHERE organization_id=org AND event_id=event AND id=work;
 IF w.id IS NULL OR w.hidden OR NOT(current_setting('sep.submissions_staff',true) IS NOT DISTINCT FROM 'true' OR w.owner_id=actor OR EXISTS(SELECT 1 FROM public.work_collaborations c WHERE c.organization_id=org AND c.event_id=event AND c.work_id=work AND c.person_id=actor AND c.status='accepted') OR EXISTS(SELECT 1 FROM public.review_assignments a WHERE a.organization_id=org AND a.event_id=event AND a.work_id=work AND a.reviewer_id=actor AND a.submitted_at IS NOT NULL)) THEN PERFORM set_config('sep.review_rpc',coalesce(old_flag,''),true);RETURN; END IF;
 SELECT * INTO v FROM public.work_versions WHERE organization_id=org AND event_id=event AND work_id=work ORDER BY number DESC LIMIT 1;response:=v.content->'reviewResponse';
 IF response IS NULL THEN PERFORM set_config('sep.review_rpc',coalesce(old_flag,''),true);RETURN; END IF;
 SELECT * INTO h FROM public.work_history p WHERE p.organization_id=org AND p.event_id=event AND p.work_id=work AND p.action='peer_reviews_released' AND p.actor='staff' AND p.message=response->>'feedbackMessage' AND ((response->>'feedbackId' IS NOT NULL AND p.id=(response->>'feedbackId')::uuid) OR (response->>'feedbackId' IS NULL AND p.created_at<=(SELECT d.created_at FROM public.work_history d WHERE d.organization_id=org AND d.event_id=event AND d.work_id=work AND d.id=(response->>'decisionId')::uuid))) ORDER BY p.created_at DESC,p.id DESC LIMIT 1;
 IF h.id IS NULL THEN PERFORM set_config('sep.review_rpc',coalesce(old_flag,''),true);RETURN; END IF;
 recipients:=h.review_recipients;
 -- Legacy mapping is recovered only when the complete published text matches one round exactly.
 IF recipients IS NULL THEN
  FOR item IN SELECT r.id FROM public.review_rounds r WHERE r.organization_id=org AND r.event_id=event AND r.work_id=work AND r.version_number=(response->>'versionNumber')::integer AND (response->>'roundNumber' IS NULL OR r.number=(response->>'roundNumber')::integer) LOOP
   SELECT jsonb_agg(jsonb_build_object('assignmentId',a.id,'reviewerId',a.reviewer_id,'number',a.n) ORDER BY a.n) INTO candidate FROM (SELECT x.*,row_number() OVER(ORDER BY x.id) n FROM public.review_assignments x WHERE x.round_id=item.id AND x.submitted_at IS NOT NULL) a HAVING string_agg('Evaluación / Review '||a.n||E'\n'||(a.evaluation->>'authorComments'),E'\n\n' ORDER BY a.n)=h.message;
   IF candidate IS NOT NULL THEN matches:=matches+1;recipients:=candidate; END IF;
  END LOOP;
  IF matches<>1 THEN PERFORM set_config('sep.review_rpc',coalesce(old_flag,''),true);RETURN; END IF;
 END IF;
 FOR recipient IN SELECT value FROM jsonb_array_elements(recipients) LOOP
  SELECT * INTO source FROM public.review_assignments a WHERE a.organization_id=org AND a.event_id=event AND a.work_id=work AND a.id=(recipient->>'assignmentId')::uuid AND a.reviewer_id=(recipient->>'reviewerId')::uuid AND a.submitted_at IS NOT NULL;
  IF source.id IS NULL THEN CONTINUE; END IF;
  INSERT INTO public.review_response_checks(id,organization_id,event_id,work_id,version_id,assignment_id,reviewer_id,title,version_number,source_version_number,number,content)
  VALUES(gen_random_uuid(),org,event,work,v.id,source.id,source.reviewer_id,v.content->>'title',v.number,(response->>'versionNumber')::integer,(recipient->>'number')::integer,jsonb_build_object('summary',response->>'summary','observation',source.evaluation->>'authorComments','reply',coalesce((SELECT reply->>'text' FROM jsonb_array_elements(coalesce(response->'replies','[]'::jsonb)) reply WHERE (reply->>'number')::integer=(recipient->>'number')::integer),''),'decisionMessage',response->>'decisionMessage')) ON CONFLICT(version_id,assignment_id) DO NOTHING;
 END LOOP;
 PERFORM set_config('sep.review_rpc',coalesce(old_flag,''),true);
END $$;

