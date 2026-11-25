CREATE OR REPLACE FUNCTION public.get_lead_filter_options(_workspace_id uuid, _archive_state text DEFAULT 'active')
RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
DECLARE r jsonb;
BEGIN
  IF NOT (_workspace_id IN (SELECT get_user_workspace_ids()) OR is_super_admin(auth.uid())) THEN
    RAISE EXCEPTION 'forbidden' USING ERRCODE = '42501';
  END IF;
  WITH l AS (
    SELECT source, status, ai_temperature, tags FROM leads
    WHERE workspace_id = _workspace_id
      AND (_archive_state = 'all' OR (_archive_state = 'archived') = (archived_at IS NOT NULL))
  )
  SELECT jsonb_build_object(
    'sources', COALESCE((SELECT jsonb_agg(jsonb_build_object('value', s, 'count', c) ORDER BY c DESC) FROM (SELECT trim(source) s, count(*) c FROM l WHERE coalesce(trim(source),'') <> '' GROUP BY 1) x), '[]'::jsonb),
    'statuses', COALESCE((SELECT jsonb_agg(jsonb_build_object('value', s, 'count', c) ORDER BY c DESC) FROM (SELECT status s, count(*) c FROM l WHERE status IS NOT NULL GROUP BY 1) x), '[]'::jsonb),
    'temperatures', COALESCE((SELECT jsonb_agg(jsonb_build_object('value', s, 'count', c) ORDER BY c DESC) FROM (SELECT ai_temperature s, count(*) c FROM l WHERE ai_temperature IS NOT NULL GROUP BY 1) x), '[]'::jsonb),
    'tags', COALESCE((SELECT jsonb_agg(jsonb_build_object('value', s, 'count', c) ORDER BY c DESC) FROM (SELECT trim(t) s, count(*) c FROM l, unnest(tags) t WHERE coalesce(trim(t),'') <> '' GROUP BY 1) x), '[]'::jsonb)
  ) INTO r;
  RETURN r;
END $$;
REVOKE EXECUTE ON FUNCTION public.get_lead_filter_options(uuid, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_lead_filter_options(uuid, text) TO authenticated, service_role;