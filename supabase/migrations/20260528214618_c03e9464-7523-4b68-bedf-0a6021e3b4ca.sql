
CREATE OR REPLACE FUNCTION public.financial_reports_verify(
  p_workspace_id uuid,
  p_date_from date DEFAULT NULL,
  p_date_to date DEFAULT NULL,
  p_owner_id uuid DEFAULT NULL,
  p_company_id uuid DEFAULT NULL,
  p_contact_id uuid DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_authorized boolean;
  v_total_invoiced numeric := 0;
  v_invoice_count int := 0;
  v_total_received numeric := 0;
  v_total_due numeric := 0;
  v_collection_rate numeric := 0;
BEGIN
  -- authz: must be member of workspace OR super admin
  SELECT EXISTS (
    SELECT 1 FROM public.workspace_members wm
    WHERE wm.workspace_id = p_workspace_id AND wm.user_id = auth.uid()
  ) OR public.is_super_admin(auth.uid())
  INTO v_authorized;

  IF NOT v_authorized THEN
    RAISE EXCEPTION 'Not authorized';
  END IF;

  -- ground-truth totals: invoices filtered exactly as the summary RPC (except product category)
  SELECT
    COALESCE(SUM(i.total), 0),
    COUNT(*)
  INTO v_total_invoiced, v_invoice_count
  FROM public.invoices i
  WHERE i.workspace_id = p_workspace_id
    AND COALESCE(i.deleted_at, NULL) IS NULL
    AND (p_date_from IS NULL OR i.issue_date >= p_date_from)
    AND (p_date_to   IS NULL OR i.issue_date <= p_date_to)
    AND (p_owner_id  IS NULL OR i.owner_id  = p_owner_id)
    AND (p_company_id IS NULL OR i.company_id = p_company_id)
    AND (p_contact_id IS NULL OR i.contact_id = p_contact_id);

  -- ground-truth received: sum invoice_payments joined to invoices in scope
  SELECT COALESCE(SUM(p.amount), 0)
  INTO v_total_received
  FROM public.invoice_payments p
  JOIN public.invoices i ON i.id = p.invoice_id
  WHERE i.workspace_id = p_workspace_id
    AND COALESCE(i.deleted_at, NULL) IS NULL
    AND (p_date_from IS NULL OR i.issue_date >= p_date_from)
    AND (p_date_to   IS NULL OR i.issue_date <= p_date_to)
    AND (p_owner_id  IS NULL OR i.owner_id  = p_owner_id)
    AND (p_company_id IS NULL OR i.company_id = p_company_id)
    AND (p_contact_id IS NULL OR i.contact_id = p_contact_id);

  v_total_due := GREATEST(v_total_invoiced - v_total_received, 0);
  v_collection_rate := CASE WHEN v_total_invoiced > 0
    THEN (v_total_received / v_total_invoiced) * 100 ELSE 0 END;

  RETURN jsonb_build_object(
    'total_invoiced', v_total_invoiced,
    'total_received', v_total_received,
    'total_due', v_total_due,
    'collection_rate', v_collection_rate,
    'invoice_count', v_invoice_count,
    'computed_at', now()
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.financial_reports_verify(uuid, date, date, uuid, uuid, uuid) TO authenticated, service_role;
