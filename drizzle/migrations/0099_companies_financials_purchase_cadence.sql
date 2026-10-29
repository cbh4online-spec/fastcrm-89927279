DROP FUNCTION IF EXISTS public.get_companies_financials(uuid);
CREATE FUNCTION public.get_companies_financials(_workspace_id uuid)
RETURNS TABLE (
  company_id uuid, invoice_count bigint, net_total numeric, gross_total numeric,
  paid_total numeric, pending_total numeric, overdue_total numeric,
  sales_2023 numeric, sales_2024 numeric, sales_2025 numeric, sales_2026 numeric,
  last_invoice_date date, first_invoice_date date, purchase_days bigint, last_invoice_net numeric
)
LANGUAGE sql STABLE SECURITY INVOKER SET search_path = public
AS $$
  WITH inv AS (
    SELECT DISTINCT ON (i.id)
      COALESCE(i.company_id, c.company_id) AS cid, i.id,
      COALESCE(i.subtotal, 0) AS net, COALESCE(i.total, 0) AS gross,
      COALESCE(i.amount_paid, 0) AS paid, i.issue_date, i.due_date
    FROM public.invoices i
    LEFT JOIN public.contacts c ON c.id = i.contact_id
    WHERE i.workspace_id = _workspace_id
      AND lower(COALESCE(i.status, '')) NOT IN ('cancelled','draft','refunded','void')
      AND COALESCE(i.company_id, c.company_id) IS NOT NULL
  ),
  last_day AS (
    SELECT cid, issue_date, sum(net) AS net_day,
      row_number() OVER (PARTITION BY cid ORDER BY issue_date DESC) AS rn
    FROM inv WHERE issue_date IS NOT NULL GROUP BY cid, issue_date
  )
  SELECT
    inv.cid, count(*), sum(net), sum(gross), sum(paid),
    sum(GREATEST(gross - paid, 0)),
    sum(CASE WHEN due_date IS NOT NULL AND due_date < CURRENT_DATE THEN GREATEST(gross - paid, 0) ELSE 0 END),
    sum(CASE WHEN EXTRACT(YEAR FROM issue_date) = 2023 THEN net ELSE 0 END),
    sum(CASE WHEN EXTRACT(YEAR FROM issue_date) = 2024 THEN net ELSE 0 END),
    sum(CASE WHEN EXTRACT(YEAR FROM issue_date) = 2025 THEN net ELSE 0 END),
    sum(CASE WHEN EXTRACT(YEAR FROM issue_date) = 2026 THEN net ELSE 0 END),
    max(issue_date), min(issue_date), count(DISTINCT issue_date),
    (SELECT ld.net_day FROM last_day ld WHERE ld.cid = inv.cid AND ld.rn = 1)
  FROM inv GROUP BY inv.cid;
$$;
GRANT EXECUTE ON FUNCTION public.get_companies_financials(uuid) TO authenticated;