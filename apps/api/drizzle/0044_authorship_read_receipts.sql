-- Acknowledge only the decisions actually displayed, at the displayed revision.
CREATE FUNCTION public.sep_authorship_read(seen jsonb)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog AS $$
DECLARE
  actor uuid:=nullif(current_setting('sep.person_id',true),'')::uuid;
  previous_flag text:=current_setting('sep.authorship_rpc',true);
BEGIN
  IF NOT EXISTS(SELECT 1 FROM public.people WHERE id=actor AND active) THEN
    RETURN jsonb_build_object('error','UNAUTHORIZED');
  END IF;
  IF jsonb_typeof(seen) IS DISTINCT FROM 'array' THEN RAISE EXCEPTION 'Invalid receipts' USING ERRCODE='22023'; END IF;
  IF jsonb_array_length(seen) NOT BETWEEN 1 AND 100 THEN RAISE EXCEPTION 'Invalid receipt count' USING ERRCODE='22023'; END IF;
  PERFORM set_config('sep.authorship_rpc','true',true);
  UPDATE public.authorship_claims c SET claimant_seen_revision=c.revision
    FROM jsonb_to_recordset(seen) AS item(id uuid,revision integer)
    WHERE c.id=item.id AND c.claimant_id=actor AND c.revision=item.revision AND c.status<>'pending';
  PERFORM set_config('sep.authorship_rpc',coalesce(previous_flag,''),true);
  RETURN jsonb_build_object('ok',true);
EXCEPTION WHEN OTHERS THEN
  PERFORM set_config('sep.authorship_rpc',coalesce(previous_flag,''),true);RAISE;
END $$;
--> statement-breakpoint
REVOKE ALL ON FUNCTION public.sep_authorship_read(jsonb) FROM PUBLIC;
--> statement-breakpoint
GRANT EXECUTE ON FUNCTION public.sep_authorship_read(jsonb) TO sep_runtime;
