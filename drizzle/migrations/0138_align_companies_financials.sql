CREATE OR REPLACE FUNCTION public.get_companies_financials_by_year(_workspace_id uuid, _year integer)
 RETURNS TABLE(company_id uuid, invoice_count bigint, net_total numeric, gross_total numeric, paid_total numeric, pending_total numeric, overdue_total numeric)
 LANGUAGE sql STABLE SET search_path TO 'public'
AS $function$
  WITH inv AS (
    SELECT DISTINCT ON (i.id)
      COALESCE(i.company_id, c.company_id) AS cid,
      (i.document_type IS NULL OR i.document_type IN ('invoice','receipt')) AS is_rev,
      (i.document_type IS NULL OR i.document_type IN ('invoice','debit_note')) AS is_recv,
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
  SELECT cid, count(*) FILTER (WHERE is_rev),
    COALESCE(sum(net) FILTER (WHERE is_rev),0), COALESCE(sum(gross) FILTER (WHERE is_rev),0),
    COALESCE(sum(paid) FILTER (WHERE is_recv),0),
    COALESCE(sum(GREATEST(gross - paid, 0)) FILTER (WHERE is_recv),0),
    COALESCE(sum(CASE WHEN due_date IS NOT NULL AND due_date < CURRENT_DATE THEN GREATEST(gross - paid, 0) ELSE 0 END) FILTER (WHERE is_recv),0)
  FROM inv GROUP BY cid;
$function$;

CREATE OR REPLACE FUNCTION public.get_companies_financials(_workspace_id uuid)
 RETURNS TABLE(company_id uuid, invoice_count bigint, net_total numeric, gross_total numeric, paid_total numeric, pending_total numeric, overdue_total numeric, sales_2023 numeric, sales_2024 numeric, sales_2025 numeric, sales_2026 numeric, last_invoice_date date, first_invoice_date date, purchase_days bigint, last_invoice_net numeric)
 LANGUAGE sql STABLE SET search_path TO 'public'
AS $function$
  WITH inv AS (
    SELECT DISTINCT ON (i.id)
      COALESCE(i.company_id, c.company_id) AS cid, i.id,
      (i.document_type IS NULL OR i.document_type IN ('invoice','receipt')) AS is_rev,
      (i.document_type IS NULL OR i.document_type IN ('invoice','debit_note')) AS is_recv,
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
    FROM inv WHERE issue_date IS NOT NULL AND is_rev GROUP BY cid, issue_date
  )
  SELECT
    inv.cid, count(*) FILTER (WHERE is_rev),
    COALESCE(sum(net) FILTER (WHERE is_rev),0), COALESCE(sum(gross) FILTER (WHERE is_rev),0),
    COALESCE(sum(paid) FILTER (WHERE is_recv),0),
    COALESCE(sum(GREATEST(gross - paid, 0)) FILTER (WHERE is_recv),0),
    COALESCE(sum(CASE WHEN due_date IS NOT NULL AND due_date < CURRENT_DATE THEN GREATEST(gross - paid, 0) ELSE 0 END) FILTER (WHERE is_recv),0),
    COALESCE(sum(net) FILTER (WHERE is_rev AND EXTRACT(YEAR FROM issue_date) = 2023),0),
    COALESCE(sum(net) FILTER (WHERE is_rev AND EXTRACT(YEAR FROM issue_date) = 2024),0),
    COALESCE(sum(net) FILTER (WHERE is_rev AND EXTRACT(YEAR FROM issue_date) = 2025),0),
    COALESCE(sum(net) FILTER (WHERE is_rev AND EXTRACT(YEAR FROM issue_date) = 2026),0),
    max(issue_date) FILTER (WHERE is_rev), min(issue_date) FILTER (WHERE is_rev),
    count(DISTINCT issue_date) FILTER (WHERE is_rev),
    (SELECT ld.net_day FROM last_day ld WHERE ld.cid = inv.cid AND ld.rn = 1)
  FROM inv GROUP BY inv.cid;
$function$;