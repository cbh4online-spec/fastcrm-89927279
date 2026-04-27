CREATE OR REPLACE FUNCTION public.verify_builder_domain(
  _domain_id uuid,
  _resolved_token text
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_token text;
  v_workspace uuid;
BEGIN
  SELECT verification_token, workspace_id
    INTO v_token, v_workspace
  FROM public.builder_asset_domains
  WHERE id = _domain_id;

  IF v_token IS NULL THEN
    RAISE EXCEPTION 'Domain not found';
  END IF;

  IF NOT (
    EXISTS (
      SELECT 1 FROM public.workspace_members
      WHERE workspace_id = v_workspace AND user_id = auth.uid()
    ) OR public.is_super_admin(auth.uid())
  ) THEN
    RAISE EXCEPTION 'Not authorized';
  END IF;

  IF _resolved_token IS NOT NULL AND trim(_resolved_token) = v_token THEN
    UPDATE public.builder_asset_domains
       SET verified = true, updated_at = now()
     WHERE id = _domain_id;
    RETURN true;
  END IF;

  -- Se já não bate, marca como não verificado
  UPDATE public.builder_asset_domains
     SET verified = false, updated_at = now()
   WHERE id = _domain_id AND verified = true;

  RETURN false;
END;
$$;