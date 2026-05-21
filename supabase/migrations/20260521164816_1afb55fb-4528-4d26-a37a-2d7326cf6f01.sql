ALTER FUNCTION public.register_invoice_payment(uuid, uuid, numeric, date, text, text, text) SECURITY DEFINER;

CREATE OR REPLACE FUNCTION public.register_invoice_payment(
  p_invoice_id uuid,
  p_workspace_id uuid,
  p_amount numeric,
  p_payment_date date DEFAULT CURRENT_DATE,
  p_payment_method text DEFAULT NULL,
  p_reference text DEFAULT NULL,
  p_notes text DEFAULT NULL
)
RETURNS TABLE(total_paid numeric, new_status text)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_invoice RECORD;
  v_amount NUMERIC;
  v_new_total NUMERIC;
  v_status TEXT;
  v_uid uuid := auth.uid();
  v_is_member boolean;
BEGIN
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'Authentication required';
  END IF;

  SELECT EXISTS (
    SELECT 1 FROM public.workspace_members
    WHERE workspace_id = p_workspace_id AND user_id = v_uid
  ) OR public.is_super_admin(v_uid) INTO v_is_member;

  IF NOT v_is_member THEN
    RAISE EXCEPTION 'Not a member of workspace';
  END IF;

  v_amount := ROUND(COALESCE(p_amount, 0)::NUMERIC, 2);
  IF v_amount <= 0 THEN
    RAISE EXCEPTION 'Payment amount must be greater than zero';
  END IF;

  SELECT id, workspace_id, total, COALESCE(amount_paid, 0) AS amount_paid, status
  INTO v_invoice
  FROM public.invoices
  WHERE id = p_invoice_id AND workspace_id = p_workspace_id
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
    invoice_id, workspace_id, amount, payment_date,
    payment_method, reference, notes, created_by
  ) VALUES (
    p_invoice_id, p_workspace_id, v_amount,
    COALESCE(p_payment_date, CURRENT_DATE),
    NULLIF(p_payment_method, ''),
    NULLIF(p_reference, ''),
    NULLIF(p_notes, ''),
    v_uid
  );

  v_new_total := ROUND(v_invoice.amount_paid + v_amount, 2);
  v_status := CASE WHEN v_new_total >= v_invoice.total THEN 'paid' ELSE 'partially_paid' END;

  UPDATE public.invoices
  SET amount_paid = v_new_total,
      status = v_status,
      updated_at = now()
  WHERE id = p_invoice_id;

  total_paid := v_new_total;
  new_status := v_status;
  RETURN NEXT;
END;
$function$;