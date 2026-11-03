CREATE TABLE public.invoice_payments_replaced (
  id uuid PRIMARY KEY,
  invoice_id uuid NOT NULL,
  workspace_id uuid NOT NULL,
  amount numeric,
  payment_date date,
  payment_method text,
  reference text,
  notes text,
  created_by uuid,
  created_at timestamptz,
  replaced_at timestamptz NOT NULL DEFAULT now(),
  replaced_reason text NOT NULL DEFAULT 'saft_import'
);
GRANT SELECT ON public.invoice_payments_replaced TO authenticated;
GRANT ALL ON public.invoice_payments_replaced TO service_role;
ALTER TABLE public.invoice_payments_replaced ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Members read replaced payments" ON public.invoice_payments_replaced
  FOR SELECT TO authenticated
  USING (workspace_id IN (SELECT public.get_user_workspace_ids()) OR (SELECT public.is_super_admin(auth.uid())));
CREATE INDEX idx_invoice_payments_replaced_invoice ON public.invoice_payments_replaced(invoice_id);

-- Remove (com arquivo) pagamentos manuais de faturas que já têm recibo SAF-T oficial
CREATE OR REPLACE FUNCTION public.replace_manual_payments_with_saft(_workspace_id uuid, _invoice_ids uuid[] DEFAULT NULL)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE v_count integer := 0;
BEGIN
  WITH target AS (
    SELECT p.* FROM public.invoice_payments p
    WHERE p.workspace_id = _workspace_id
      AND p.saft_import_id IS NULL
      AND (_invoice_ids IS NULL OR p.invoice_id = ANY(_invoice_ids))
      AND EXISTS (SELECT 1 FROM public.invoice_payments s
                  WHERE s.invoice_id = p.invoice_id AND s.saft_import_id IS NOT NULL)
  ), arch AS (
    INSERT INTO public.invoice_payments_replaced
      (id, invoice_id, workspace_id, amount, payment_date, payment_method, reference, notes, created_by, created_at)
    SELECT id, invoice_id, workspace_id, amount, payment_date, payment_method, reference, notes, created_by, created_at FROM target
    ON CONFLICT (id) DO NOTHING
    RETURNING id
  ), del AS (
    DELETE FROM public.invoice_payments p USING target t WHERE p.id = t.id RETURNING p.id
  )
  SELECT count(*) INTO v_count FROM del;
  RETURN v_count;
END;
$$;
REVOKE ALL ON FUNCTION public.replace_manual_payments_with_saft(uuid, uuid[]) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.replace_manual_payments_with_saft(uuid, uuid[]) TO service_role;