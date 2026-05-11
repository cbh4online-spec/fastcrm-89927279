
ALTER TABLE public.invoices ADD COLUMN IF NOT EXISTS public_token text UNIQUE;

CREATE INDEX IF NOT EXISTS idx_invoices_public_token ON public.invoices(public_token) WHERE public_token IS NOT NULL;

CREATE OR REPLACE FUNCTION public.ensure_invoice_public_token(_invoice_id uuid)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _token text;
  _ws uuid;
BEGIN
  SELECT public_token, workspace_id INTO _token, _ws FROM public.invoices WHERE id = _invoice_id;
  IF _ws IS NULL THEN
    RAISE EXCEPTION 'Invoice not found';
  END IF;
  -- Check membership or super admin
  IF NOT (
    public.is_super_admin(auth.uid())
    OR EXISTS (SELECT 1 FROM public.workspace_members wm WHERE wm.workspace_id = _ws AND wm.user_id = auth.uid())
  ) THEN
    RAISE EXCEPTION 'Not authorized';
  END IF;
  IF _token IS NULL OR length(_token) < 16 THEN
    _token := encode(gen_random_bytes(24), 'hex');
    UPDATE public.invoices SET public_token = _token WHERE id = _invoice_id;
  END IF;
  RETURN _token;
END;
$$;

GRANT EXECUTE ON FUNCTION public.ensure_invoice_public_token(uuid) TO authenticated;
