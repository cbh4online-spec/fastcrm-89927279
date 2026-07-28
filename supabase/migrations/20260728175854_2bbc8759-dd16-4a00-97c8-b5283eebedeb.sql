CREATE OR REPLACE FUNCTION public.get_companies_financials(_workspace_id uuid)
RETURNS TABLE (
  company_id uuid,
  invoice_count bigint,
  net_total numeric,
  gross_total numeric,
  paid_total numeric,
  pending_total numeric,
  overdue_total numeric,
  sales_2023 numeric,
  sales_2024 numeric,
  sales_2025 numeric,
  sales_2026 numeric,
  last_invoice_date date
)
LANGUAGE sql
STABLE
SECURITY INVOKER
SET search_path = public
AS $$
  WITH inv AS (
    SELECT DISTINCT ON (i.id)
      COALESCE(i.company_id, c.company_id) AS cid,
      i.id,
      COALESCE(i.subtotal, 0) AS net,
      COALESCE(i.total, 0) AS gross,
      COALESCE(i.amount_paid, 0) AS paid,
      i.issue_date,
      i.due_date,
      lower(COALESCE(i.status, '')) AS status
    FROM public.invoices i
    LEFT JOIN public.contacts c ON c.id = i.contact_id
    WHERE i.workspace_id = _workspace_id
      AND lower(COALESCE(i.status, '')) NOT IN ('cancelled','draft','refunded','void')
      AND COALESCE(i.company_id, c.company_id) IS NOT NULL
  )
  SELECT
    cid AS company_id,
    count(*) AS invoice_count,
    sum(net) AS net_total,
    sum(gross) AS gross_total,
    sum(paid) AS paid_total,
    sum(GREATEST(gross - paid, 0)) AS pending_total,
    sum(CASE WHEN due_date IS NOT NULL AND due_date < CURRENT_DATE THEN GREATEST(gross - paid, 0) ELSE 0 END) AS overdue_total,
    sum(CASE WHEN EXTRACT(YEAR FROM issue_date) = 2023 THEN net ELSE 0 END) AS sales_2023,
    sum(CASE WHEN EXTRACT(YEAR FROM issue_date) = 2024 THEN net ELSE 0 END) AS sales_2024,
    sum(CASE WHEN EXTRACT(YEAR FROM issue_date) = 2025 THEN net ELSE 0 END) AS sales_2025,
    sum(CASE WHEN EXTRACT(YEAR FROM issue_date) = 2026 THEN net ELSE 0 END) AS sales_2026,
    max(issue_date) AS last_invoice_date
  FROM inv
  GROUP BY cid;
$$;

GRANT EXECUTE ON FUNCTION public.get_companies_financials(uuid) TO authenticated;