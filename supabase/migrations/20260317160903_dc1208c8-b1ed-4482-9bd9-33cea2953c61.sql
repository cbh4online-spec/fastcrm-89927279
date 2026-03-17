-- Atomic payment registration to prevent inconsistent invoice totals
CREATE OR REPLACE FUNCTION public.register_invoice_payment(
  p_invoice_id UUID,
  p_workspace_id UUID,
  p_amount NUMERIC,
  p_payment_date DATE DEFAULT CURRENT_DATE,
  p_payment_method TEXT DEFAULT NULL,
  p_reference TEXT DEFAULT NULL,
  p_notes TEXT DEFAULT NULL
)
RETURNS TABLE(total_paid NUMERIC, new_status TEXT)
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public
AS $$
DECLARE
  v_invoice RECORD;
  v_amount NUMERIC;
  v_new_total NUMERIC;
  v_status TEXT;
BEGIN
  v_amount := ROUND(COALESCE(p_amount, 0)::NUMERIC, 2);

  IF v_amount <= 0 THEN
    RAISE EXCEPTION 'Payment amount must be greater than zero';
  END IF;

  SELECT id, workspace_id, total, COALESCE(amount_paid, 0) AS amount_paid, status
  INTO v_invoice
  FROM public.invoices
  WHERE id = p_invoice_id
    AND workspace_id = p_workspace_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Invoice not found for workspace';
  END IF;

  IF v_invoice.status = 'cancelled' THEN
    RAISE EXCEPTION 'Cannot register payment for cancelled invoice';
  END IF;

  IF v_invoice.amount_paid >= v_invoice.total THEN
    RAISE EXCEPTION 'Invoice already fully paid';
  END IF;

  IF v_amount > (v_invoice.total - v_invoice.amount_paid) THEN
    RAISE EXCEPTION 'Payment exceeds remaining balance';
  END IF;

  INSERT INTO public.invoice_payments (
    invoice_id,
    workspace_id,
    amount,
    payment_date,
    payment_method,
    reference,
    notes,
    created_by
  ) VALUES (
    p_invoice_id,
    p_workspace_id,
    v_amount,
    COALESCE(p_payment_date, CURRENT_DATE),
    NULLIF(p_payment_method, ''),
    NULLIF(p_reference, ''),
    NULLIF(p_notes, ''),
    auth.uid()
  );

  v_new_total := ROUND(v_invoice.amount_paid + v_amount, 2);
  v_status := CASE
    WHEN v_new_total >= v_invoice.total THEN 'paid'
    ELSE 'partially_paid'
  END;

  UPDATE public.invoices
  SET
    amount_paid = v_new_total,
    status = v_status,
    paid_at = CASE
      WHEN v_status = 'paid' THEN COALESCE(paid_at, NOW())
      ELSE NULL
    END
  WHERE id = p_invoice_id;

  RETURN QUERY SELECT v_new_total, v_status;
END;
$$;

GRANT EXECUTE ON FUNCTION public.register_invoice_payment(UUID, UUID, NUMERIC, DATE, TEXT, TEXT, TEXT) TO authenticated;