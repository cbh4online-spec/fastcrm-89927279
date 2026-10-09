CREATE OR REPLACE FUNCTION public.set_store_visitor_score(p_workspace_id uuid, p_session_id text, p_score integer)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF p_workspace_id IS NULL OR p_session_id IS NULL OR length(p_session_id) = 0 OR length(p_session_id) > 120 THEN RAISE EXCEPTION 'invalid_session'; END IF;
  UPDATE public.store_visitor_sessions SET visitor_score = greatest(0, least(coalesce(p_score,0), 100))::smallint
  WHERE workspace_id = p_workspace_id AND session_id = p_session_id;
END $$;
REVOKE ALL ON FUNCTION public.set_store_visitor_score(uuid, text, integer) FROM public;
GRANT EXECUTE ON FUNCTION public.set_store_visitor_score(uuid, text, integer) TO anon, authenticated, service_role;