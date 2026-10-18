ALTER TABLE editorial_drafts FORCE ROW LEVEL SECURITY;
ALTER TABLE editorial_selections FORCE ROW LEVEL SECURITY;
ALTER TABLE publication_permissions FORCE ROW LEVEL SECURITY;
ALTER TABLE publication_releases FORCE ROW LEVEL SECURITY;
ALTER TABLE publication_assets FORCE ROW LEVEL SECURITY;
ALTER TABLE editorial_history FORCE ROW LEVEL SECURITY;
GRANT SELECT,INSERT,UPDATE ON editorial_drafts,editorial_selections,publication_permissions,publication_releases TO sep_runtime;
GRANT SELECT,INSERT ON publication_assets,editorial_history TO sep_runtime;
CREATE TRIGGER editorial_history_immutable BEFORE UPDATE OR DELETE ON editorial_history FOR EACH ROW EXECUTE FUNCTION sep_registration_history_immutable();
CREATE TRIGGER publication_asset_immutable BEFORE UPDATE OR DELETE ON publication_assets FOR EACH ROW EXECUTE FUNCTION sep_registration_history_immutable();
--> statement-breakpoint
CREATE FUNCTION sep_publication_immutable() RETURNS trigger LANGUAGE plpgsql SET search_path=pg_catalog AS $$
BEGIN
 IF OLD.status<>'published' OR NEW.status<>'withdrawn' OR NEW.revision<>OLD.revision+1 OR NEW.withdrawn_at IS NULL OR NEW.withdraw_reason IS NULL OR length(btrim(NEW.withdraw_reason))<10 OR NEW.id<>OLD.id OR NEW.organization_id<>OLD.organization_id OR NEW.event_id<>OLD.event_id OR NEW.kind<>OLD.kind OR NEW.edition<>OLD.edition OR NEW.draft_revision<>OLD.draft_revision OR NEW.proof<>OLD.proof OR NEW.snapshot IS DISTINCT FROM OLD.snapshot OR NEW.pdf IS DISTINCT FROM OLD.pdf OR NEW.sha256<>OLD.sha256 OR NEW.published_at<>OLD.published_at THEN RAISE EXCEPTION 'Published edition is immutable' USING ERRCODE='42501'; END IF;
 RETURN NEW;
END $$;
CREATE TRIGGER publication_immutable BEFORE UPDATE ON publication_releases FOR EACH ROW EXECUTE FUNCTION sep_publication_immutable();
--> statement-breakpoint
CREATE FUNCTION sep_editorial_notices() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog AS $$
DECLARE previous text:=current_setting('sep.communication_rpc',true);p uuid;paper jsonb;source text:='editorial:'||NEW.id;kind text;
BEGIN
 PERFORM set_config('sep.communication_rpc','true',true);
 IF NEW.action='selection_requested' THEN
  SELECT owner_id INTO p FROM public.author_works WHERE organization_id=NEW.organization_id AND event_id=NEW.event_id AND id=NEW.work_id;
  PERFORM public.sep_enqueue_notice(NEW.organization_id,NEW.event_id,p,source,'editorial.permission.requested','publications',NEW.work_id);
 ELSIF NEW.action IN ('permission_granted','permission_revoked') THEN
  PERFORM public.sep_notice_audience(NEW.organization_id,NEW.event_id,source,'editorial.permission.updated','editorial',NEW.work_id,'staff');
 ELSIF NEW.action IN ('release_published','release_withdrawn') THEN
  kind:=CASE WHEN NEW.action='release_published' THEN 'editorial.published' ELSE 'editorial.withdrawn' END;
  FOR paper IN SELECT jsonb_array_elements(snapshot->'papers') FROM public.publication_releases WHERE organization_id=NEW.organization_id AND event_id=NEW.event_id AND id=NEW.release_id
  LOOP
   SELECT owner_id INTO p FROM public.author_works WHERE organization_id=NEW.organization_id AND event_id=NEW.event_id AND id=(paper->>'id')::uuid;
   PERFORM public.sep_enqueue_notice(NEW.organization_id,NEW.event_id,p,source,kind,'publications',NEW.release_id);
  END LOOP;
 END IF;
 PERFORM set_config('sep.communication_rpc',coalesce(previous,''),true);RETURN NEW;
END $$;
REVOKE ALL ON FUNCTION sep_editorial_notices() FROM PUBLIC;
CREATE TRIGGER editorial_notices AFTER INSERT ON editorial_history FOR EACH ROW EXECUTE FUNCTION sep_editorial_notices();
