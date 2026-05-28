
CREATE OR REPLACE FUNCTION public.financial_reports_summary(
  p_workspace_id uuid,
  p_date_from date DEFAULT NULL,
  p_date_to date DEFAULT NULL,
  p_owner_id uuid DEFAULT NULL,
  p_company_id uuid DEFAULT NULL,
  p_contact_id uuid DEFAULT NULL,
  p_product_category text DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_result jsonb;
  v_today date := CURRENT_DATE;
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM public.workspace_members
    WHERE workspace_id = p_workspace_id AND user_id = auth.uid()
  ) AND NOT public.is_super_admin(auth.uid()) THEN
    RAISE EXCEPTION 'Not authorized';
  END IF;

  WITH base_inv AS (
    SELECT i.*
    FROM public.invoices i
    WHERE i.workspace_id = p_workspace_id
      AND i.status NOT IN ('draft','cancelled')
      AND (p_date_from IS NULL OR i.issue_date >= p_date_from)
      AND (p_date_to IS NULL OR i.issue_date <= p_date_to)
      AND (p_owner_id IS NULL OR i.created_by = p_owner_id)
      AND (p_company_id IS NULL OR i.company_id = p_company_id)
      AND (p_contact_id IS NULL OR i.contact_id = p_contact_id)
  ),
  filtered_inv AS (
    SELECT b.* FROM base_inv b
    WHERE p_product_category IS NULL
       OR EXISTS (
         SELECT 1 FROM public.invoice_items it
         LEFT JOIN public.products p ON p.id = it.product_id
         WHERE it.invoice_id = b.id AND p.category = p_product_category
       )
  ),
  -- SSoT: real paid amount per invoice comes from invoice_payments
  paid_per_invoice AS (
    SELECT invoice_id, SUM(amount)::numeric AS paid_real
    FROM public.invoice_payments
    WHERE invoice_id IN (SELECT id FROM filtered_inv)
    GROUP BY invoice_id
  ),
  inv_enriched AS (
    SELECT f.*,
           COALESCE(p.paid_real, 0)::numeric AS paid_real,
           GREATEST(f.total - COALESCE(p.paid_real, 0), 0)::numeric AS remaining
    FROM filtered_inv f
    LEFT JOIN paid_per_invoice p ON p.invoice_id = f.id
  ),
  kpis AS (
    SELECT
      COALESCE(SUM(total),0)::numeric AS total_invoiced,
      COALESCE(SUM(paid_real),0)::numeric AS total_received,
      COALESCE(SUM(remaining) FILTER (
        WHERE due_date IS NOT NULL AND due_date < v_today AND remaining > 0
      ),0)::numeric AS overdue,
      COUNT(*)::int AS invoice_count
    FROM inv_enriched
  ),
  monthly_inv AS (
    SELECT to_char(issue_date,'YYYY-MM') AS m, SUM(total) AS invoiced
    FROM filtered_inv
    WHERE issue_date IS NOT NULL
    GROUP BY 1
  ),
  monthly_pay AS (
    SELECT to_char(pay.payment_date,'YYYY-MM') AS m, SUM(pay.amount) AS received
    FROM public.invoice_payments pay
    JOIN filtered_inv f ON f.id = pay.invoice_id
    WHERE pay.payment_date IS NOT NULL
    GROUP BY 1
  ),
  monthly AS (
    SELECT COALESCE(i.m, p.m) AS m,
           COALESCE(i.invoiced,0) AS invoiced,
           COALESCE(p.received,0) AS received
    FROM monthly_inv i
    FULL OUTER JOIN monthly_pay p ON p.m = i.m
  ),
  top_clients AS (
    SELECT
      COALESCE(f.company_id::text, f.contact_id::text, 'name:'||COALESCE(f.client_name,'-')) AS id,
      COALESCE(c.name, ct.name, f.client_name, '—') AS name,
      SUM(f.total)::numeric AS total,
      SUM(f.paid_real)::numeric AS received,
      SUM(f.remaining)::numeric AS due,
      COUNT(*)::int AS cnt
    FROM inv_enriched f
    LEFT JOIN public.companies c ON c.id = f.company_id
    LEFT JOIN public.contacts ct ON ct.id = f.contact_id
    GROUP BY 1,2
    ORDER BY total DESC
    LIMIT 10
  ),
  items_scoped AS (
    SELECT it.invoice_id, it.product_id, it.description, it.quantity,
           COALESCE(it.total, it.net_total, 0) AS total,
           p.name AS product_name, p.category AS product_category
    FROM public.invoice_items it
    LEFT JOIN public.products p ON p.id = it.product_id
    WHERE it.invoice_id IN (SELECT id FROM filtered_inv)
      AND (p_product_category IS NULL OR p.category = p_product_category)
  ),
  top_products AS (
    SELECT
      COALESCE(product_id::text, 'desc:'||COALESCE(description,'-')) AS id,
      COALESCE(product_name, description, '—') AS name,
      product_category AS category,
      SUM(quantity)::numeric AS qty,
      SUM(total)::numeric AS total
    FROM items_scoped
    GROUP BY 1,2,3
    ORDER BY total DESC
    LIMIT 10
  ),
  aging AS (
    SELECT
      SUM(CASE WHEN due_date IS NULL OR due_date >= v_today THEN remaining ELSE 0 END) AS current_amt,
      SUM(CASE WHEN due_date IS NULL OR due_date >= v_today THEN 1 ELSE 0 END) AS current_cnt,
      SUM(CASE WHEN (v_today - due_date) BETWEEN 1 AND 30 THEN remaining ELSE 0 END) AS d30_amt,
      SUM(CASE WHEN (v_today - due_date) BETWEEN 1 AND 30 THEN 1 ELSE 0 END) AS d30_cnt,
      SUM(CASE WHEN (v_today - due_date) BETWEEN 31 AND 60 THEN remaining ELSE 0 END) AS d60_amt,
      SUM(CASE WHEN (v_today - due_date) BETWEEN 31 AND 60 THEN 1 ELSE 0 END) AS d60_cnt,
      SUM(CASE WHEN (v_today - due_date) BETWEEN 61 AND 90 THEN remaining ELSE 0 END) AS d90_amt,
      SUM(CASE WHEN (v_today - due_date) BETWEEN 61 AND 90 THEN 1 ELSE 0 END) AS d90_cnt,
      SUM(CASE WHEN (v_today - due_date) > 90 THEN remaining ELSE 0 END) AS d90p_amt,
      SUM(CASE WHEN (v_today - due_date) > 90 THEN 1 ELSE 0 END) AS d90p_cnt
    FROM (
      SELECT due_date, remaining FROM inv_enriched WHERE remaining > 0
    ) s
  ),
  owners AS (
    SELECT pr.user_id AS id, COALESCE(pr.full_name, pr.email, substring(pr.user_id::text,1,8)) AS label
    FROM public.profiles pr
    WHERE pr.user_id IN (SELECT DISTINCT created_by FROM base_inv WHERE created_by IS NOT NULL)
  ),
  categories AS (
    SELECT DISTINCT p.category AS cat
    FROM public.invoice_items it
    JOIN public.products p ON p.id = it.product_id
    WHERE it.invoice_id IN (SELECT id FROM base_inv)
      AND p.category IS NOT NULL
  )
  SELECT jsonb_build_object(
    'kpis', (SELECT to_jsonb(k) FROM kpis k),
    'monthly', COALESCE((SELECT jsonb_agg(jsonb_build_object('month',m,'invoiced',invoiced,'received',received) ORDER BY m) FROM monthly), '[]'::jsonb),
    'topClients', COALESCE((SELECT jsonb_agg(jsonb_build_object('id',id,'name',name,'total',total,'received',received,'due',due,'count',cnt)) FROM top_clients), '[]'::jsonb),
    'topProducts', COALESCE((SELECT jsonb_agg(jsonb_build_object('id',id,'name',name,'category',category,'qty',qty,'total',total)) FROM top_products), '[]'::jsonb),
    'aging', (SELECT to_jsonb(a) FROM aging a),
    'owners', COALESCE((SELECT jsonb_agg(jsonb_build_object('id',id,'label',label)) FROM owners), '[]'::jsonb),
    'categories', COALESCE((SELECT jsonb_agg(cat ORDER BY cat) FROM categories), '[]'::jsonb)
  ) INTO v_result;

  RETURN v_result;
END;
$$;

GRANT EXECUTE ON FUNCTION public.financial_reports_summary(uuid, date, date, uuid, uuid, uuid, text) TO authenticated, service_role;
