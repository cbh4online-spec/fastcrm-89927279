CREATE OR REPLACE FUNCTION public.reconcile_invoice_payments(
  _workspace_id uuid DEFAULT NULL,
  _invoice_ids uuid[] DEFAULT NULL
)
RETURNS TABLE(updated_count integer, overpaid_count integer)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_updated integer := 0;
  v_over integer := 0;
BEGIN
  WITH target AS (
    SELECT i.id, i.total, i.status, i.amount_paid
    FROM public.invoices i
    WHERE i.status NOT IN ('cancelled','draft')
      AND (_workspace_id IS NULL OR i.workspace_id = _workspace_id)
      AND (_invoice_ids IS NULL OR i.id = ANY(_invoice_ids))
  ), agg AS (
    SELECT t.id,
           t.total,
           t.status,
           t.amount_paid,
           COALESCE((SELECT SUM(p.amount) FROM public.invoice_payments p WHERE p.invoice_id = t.id), 0)::numeric AS paid
    FROM target t
  ), upd AS (
    UPDATE public.invoices i
    SET amount_paid = ROUND(a.paid, 2),
        status = CASE
          WHEN a.paid >= COALESCE(i.total,0) - 0.01 AND COALESCE(i.total,0) > 0 THEN 'paid'
          WHEN a.paid > 0 THEN 'partially_paid'
          ELSE 'sent'
        END,
        paid_at = CASE
          WHEN a.paid >= COALESCE(i.total,0) - 0.01 AND COALESCE(i.total,0) > 0
            THEN COALESCE(i.paid_at, (SELECT MAX(p.payment_date)::timestamptz FROM public.invoice_payments p WHERE p.invoice_id = i.id), now())
          ELSE NULL
        END,
        updated_at = now()
    FROM agg a
    WHERE i.id = a.id
      AND (
        ROUND(COALESCE(i.amount_paid,0),2) IS DISTINCT FROM ROUND(a.paid,2)
        OR i.status IS DISTINCT FROM CASE
          WHEN a.paid >= COALESCE(i.total,0) - 0.01 AND COALESCE(i.total,0) > 0 THEN 'paid'
          WHEN a.paid > 0 THEN 'partially_paid'
          ELSE 'sent'
        END
      )
    RETURNING i.id
  )
  SELECT (SELECT COUNT(*) FROM upd), (SELECT COUNT(*) FROM agg WHERE paid > total + 0.01)
  INTO v_updated, v_over;

  RETURN QUERY SELECT v_updated, v_over;
END;
$$;

REVOKE ALL ON FUNCTION public.reconcile_invoice_payments(uuid, uuid[]) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.reconcile_invoice_payments(uuid, uuid[]) TO authenticated, service_role;

CREATE OR REPLACE FUNCTION public.trg_sync_invoice_payment()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_ids uuid[];
BEGIN
  v_ids := ARRAY(SELECT DISTINCT x FROM unnest(ARRAY[
    CASE WHEN TG_OP <> 'DELETE' THEN NEW.invoice_id END,
    CASE WHEN TG_OP <> 'INSERT' THEN OLD.invoice_id END
  ]) AS x WHERE x IS NOT NULL);

  IF array_length(v_ids, 1) > 0 THEN
    PERFORM public.reconcile_invoice_payments(NULL, v_ids);
  END IF;

  RETURN NULL;
END;
$$;

DROP TRIGGER IF EXISTS sync_invoice_payment ON public.invoice_payments;
CREATE TRIGGER sync_invoice_payment
AFTER INSERT OR UPDATE OR DELETE ON public.invoice_payments
FOR EACH ROW EXECUTE FUNCTION public.trg_sync_invoice_payment();

SELECT public.reconcile_invoice_payments('0662fc16-6286-4156-a908-08c7dfec0fb7'::uuid, NULL);