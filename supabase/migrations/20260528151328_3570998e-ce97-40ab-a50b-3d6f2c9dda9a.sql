CREATE OR REPLACE FUNCTION public.saft_imports_append_log(
  p_id uuid,
  p_step text,
  p_entry jsonb
) RETURNS void
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  UPDATE public.saft_imports
  SET
    last_step = p_step,
    last_step_at = now(),
    debug_log = COALESCE(debug_log, '[]'::jsonb) || jsonb_build_array(p_entry)
  WHERE id = p_id;
$$;

REVOKE ALL ON FUNCTION public.saft_imports_append_log(uuid, text, jsonb) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.saft_imports_append_log(uuid, text, jsonb) TO service_role;