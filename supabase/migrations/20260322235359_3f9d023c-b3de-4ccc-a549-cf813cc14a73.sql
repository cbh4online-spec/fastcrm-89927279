
-- ═══════════════════════════════════════════════════
-- VIEW MATERIALIZADA: entity_purchase_history
-- ═══════════════════════════════════════════════════
CREATE MATERIALIZED VIEW IF NOT EXISTS public.entity_purchase_history AS
SELECT
  i.workspace_id,
  i.contact_id,
  i.company_id,
  ii.product_id,
  p.category,
  COUNT(DISTINCT ii.invoice_id)     AS purchase_count,
  SUM(ii.quantity)                   AS total_qty,
  SUM(ii.unit_price * ii.quantity)   AS total_spent,
  MAX(i.issue_date)::timestamptz    AS last_purchased_at,
  MIN(i.issue_date)::timestamptz    AS first_purchased_at,
  CASE WHEN COUNT(DISTINCT ii.invoice_id) > 1
    THEN EXTRACT(EPOCH FROM (MAX(i.issue_date)::timestamptz - MIN(i.issue_date)::timestamptz))
         / 86400.0 / NULLIF(COUNT(DISTINCT ii.invoice_id) - 1, 0)
  END                                AS avg_reorder_days
FROM public.invoice_items ii
JOIN public.invoices i ON i.id = ii.invoice_id AND i.status = 'paid'
JOIN public.products p ON p.id = ii.product_id
WHERE i.workspace_id IS NOT NULL
GROUP BY i.workspace_id, i.contact_id, i.company_id, ii.product_id, p.category;

CREATE UNIQUE INDEX IF NOT EXISTS idx_eph_unique ON public.entity_purchase_history(workspace_id, COALESCE(contact_id, '00000000-0000-0000-0000-000000000000'::uuid), COALESCE(company_id, '00000000-0000-0000-0000-000000000000'::uuid), product_id);
CREATE INDEX IF NOT EXISTS idx_eph_contact ON public.entity_purchase_history(workspace_id, contact_id, product_id) WHERE contact_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_eph_company ON public.entity_purchase_history(workspace_id, company_id, product_id) WHERE company_id IS NOT NULL;

-- ═══════════════════════════════════════════════════
-- VIEW MATERIALIZADA: product_cooccurrence
-- ═══════════════════════════════════════════════════
CREATE MATERIALIZED VIEW IF NOT EXISTS public.product_cooccurrence AS
SELECT
  i.workspace_id,
  a.product_id   AS product_a,
  b.product_id   AS product_b,
  COUNT(DISTINCT a.invoice_id) AS cooccurrence_count
FROM public.invoice_items a
JOIN public.invoice_items b
  ON  a.invoice_id   = b.invoice_id
  AND a.product_id  != b.product_id
JOIN public.invoices i ON i.id = a.invoice_id AND i.status = 'paid'
WHERE i.workspace_id IS NOT NULL
GROUP BY i.workspace_id, a.product_id, b.product_id
HAVING COUNT(DISTINCT a.invoice_id) >= 2;

CREATE UNIQUE INDEX IF NOT EXISTS idx_cooc_unique ON public.product_cooccurrence(workspace_id, product_a, product_b);
CREATE INDEX IF NOT EXISTS idx_cooc_lookup ON public.product_cooccurrence(workspace_id, product_a, cooccurrence_count DESC);

-- ═══════════════════════════════════════════════════
-- Função de refresh
-- ═══════════════════════════════════════════════════
CREATE OR REPLACE FUNCTION public.refresh_recommendation_views()
RETURNS void LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  REFRESH MATERIALIZED VIEW CONCURRENTLY public.entity_purchase_history;
  REFRESH MATERIALIZED VIEW CONCURRENTLY public.product_cooccurrence;
END;
$$;
