CREATE OR REPLACE FUNCTION public.get_companies_financials_by_year(_workspace_id uuid, _year int)
RETURNS TABLE(company_id uuid, invoice_count bigint, net_total numeric, gross_total numeric, paid_total numeric, pending_total numeric, overdue_total numeric)
LANGUAGE sql STABLE SECURITY INVOKER SET search_path TO 'public'
AS $$
  WITH inv AS (
    SELECT DISTINCT ON (i.id)
      COALESCE(i.company_id, c.company_id) AS cid,
      COALESCE(i.subtotal, 0) AS net, COALESCE(i.total, 0) AS gross,
      COALESCE(i.amount_paid, 0) AS paid, i.due_date
    FROM public.invoices i
    LEFT JOIN public.contacts c ON c.id = i.contact_id
    WHERE i.workspace_id = _workspace_id
      AND lower(COALESCE(i.status, '')) NOT IN ('cancelled','draft','refunded','void')
      AND COALESCE(i.company_id, c.company_id) IS NOT NULL
      AND i.issue_date >= make_date(_year, 1, 1)
      AND i.issue_date < make_date(_year + 1, 1, 1)
  )
  SELECT cid, count(*), sum(net), sum(gross), sum(paid),
    sum(GREATEST(gross - paid, 0)),
    sum(CASE WHEN due_date IS NOT NULL AND due_date < CURRENT_DATE THEN GREATEST(gross - paid, 0) ELSE 0 END)
  FROM inv GROUP BY cid;
$$;
GRANT EXECUTE ON FUNCTION public.get_companies_financials_by_year(uuid, int) TO authenticated;