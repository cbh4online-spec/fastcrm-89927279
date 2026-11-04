CREATE OR REPLACE FUNCTION public.bgi_compute_indicators(_workspace_id uuid, _period text DEFAULT 'month', _anchor date DEFAULT NULL)
RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
DECLARE
  a date := COALESCE(_anchor, (now() AT TIME ZONE 'Europe/Lisbon')::date);
  step interval; s date; e date; ps date; pe date; ys date; ye date;
  res jsonb := '{}'::jsonb; w record;
BEGIN
  IF auth.uid() IS NULL OR NOT (
    _workspace_id IN (SELECT public.get_user_workspace_ids()) OR public.is_super_admin(auth.uid())
  ) THEN RAISE EXCEPTION 'Sem acesso a este workspace' USING ERRCODE = '42501'; END IF;
  IF NOT public.is_super_admin(auth.uid()) AND NOT EXISTS (
    SELECT 1 FROM workspace_modules wm JOIN marketplace_modules m ON m.id = wm.module_id
    WHERE wm.workspace_id = _workspace_id AND m.slug = 'growth-intelligence'
      AND wm.status IN ('active','trial','trialing')
  ) THEN RAISE EXCEPTION 'Módulo Crescimento não ativo' USING ERRCODE = '42501'; END IF;

  IF _period = 'quarter' THEN s := date_trunc('quarter', a)::date; step := interval '3 months';
  ELSIF _period = 'year' THEN s := date_trunc('year', a)::date; step := interval '1 year';
  ELSIF _period = 'month' THEN s := date_trunc('month', a)::date; step := interval '1 month';
  ELSE RAISE EXCEPTION 'Período inválido'; END IF;
  e := (s + step)::date; ps := (s - step)::date; pe := s;
  ys := (s - interval '1 year')::date; ye := (e - interval '1 year')::date;

  FOR w IN SELECT * FROM (VALUES ('current', s, e), ('previous', ps, pe), ('yoy', ys, ye)) v(k, f, t) LOOP
    res := jsonb_set(res, ARRAY[w.k], (
      WITH inv AS (
        SELECT i.*, CASE WHEN i.document_type = 'credit_note' THEN -1 ELSE 1 END sg
        FROM invoices i
        WHERE i.workspace_id = _workspace_id AND i.issue_date >= w.f AND i.issue_date < w.t
          AND i.document_type IN ('invoice','debit_note','credit_note')
          AND COALESCE(i.status,'') NOT IN ('cancelled','draft')
      ),
      opp_open AS (SELECT * FROM opportunities WHERE workspace_id = _workspace_id AND status = 'open'),
      ld AS (SELECT * FROM leads WHERE workspace_id = _workspace_id AND created_at >= w.f AND created_at < w.t),
      so AS (SELECT * FROM store_orders WHERE workspace_id = _workspace_id AND created_at >= w.f AND created_at < w.t
             AND paid_at IS NOT NULL AND refunded_at IS NULL),
      cust AS (SELECT COALESCE(company_id, contact_id) cid, count(*) n FROM inv WHERE sg = 1 AND COALESCE(company_id, contact_id) IS NOT NULL GROUP BY 1),
      en AS (SELECT * FROM sj_enrollments WHERE workspace_id = _workspace_id AND created_at >= w.f AND created_at < w.t),
      coh AS (SELECT c.id, c.capacity FROM sj_cohorts c WHERE c.workspace_id = _workspace_id AND c.start_date >= w.f AND c.start_date < w.t AND COALESCE(c.capacity,0) > 0)
      SELECT jsonb_build_object(
        'sum_invoiced_net', (SELECT COALESCE(sum(sg * (COALESCE(total,0) - COALESCE(tax_amount,0))),0) FROM inv),
        'sum_amount_paid', (SELECT COALESCE(sum(p.amount),0) FROM invoice_payments p WHERE p.workspace_id = _workspace_id AND p.payment_date >= w.f AND p.payment_date < w.t),
        'sum_open_balance', (SELECT COALESCE(sum(GREATEST(COALESCE(total,0) - COALESCE(amount_paid,0),0)),0) FROM invoices
                             WHERE workspace_id = _workspace_id AND issue_date < w.t AND document_type IN ('invoice','debit_note')
                               AND status IN ('sent','partially_paid')),
        'count_active_customers', (SELECT count(*) FROM cust),
        'repeat_purchase_rate', (SELECT CASE WHEN count(*) = 0 THEN NULL ELSE round(100.0 * count(*) FILTER (WHERE n > 1) / count(*), 1) END FROM cust),
        'count_new_leads', (SELECT count(*) FROM ld),
        'lead_to_customer_rate', (SELECT CASE WHEN count(*) = 0 THEN NULL ELSE round(100.0 * count(*) FILTER (WHERE archived_at IS NOT NULL AND status = 'completed') / count(*), 1) END FROM ld),
        'sum_pipeline_value', (SELECT COALESCE(sum(value),0) FROM opp_open),
        'weighted_pipeline', (SELECT COALESCE(sum(COALESCE(value,0) * COALESCE(probability,0) / 100.0),0) FROM opp_open),
        'count_closed_deals', (SELECT count(*) FROM opportunities WHERE workspace_id = _workspace_id AND status = 'won' AND updated_at >= w.f AND updated_at < w.t),
        'count_orders', (SELECT count(*) FROM so),
        'avg_order_value', (SELECT round(avg(total),2) FROM so),
        'count_enrollments', (SELECT count(*) FROM en),
        'class_occupancy_pct', (SELECT CASE WHEN COALESCE(sum(capacity),0) = 0 THEN NULL ELSE round(100.0 * (SELECT count(*) FROM sj_enrollments x WHERE x.cohort_id IN (SELECT id FROM coh)) / sum(capacity), 1) END FROM coh),
        'revenue_per_course', (SELECT CASE WHEN count(DISTINCT course_id) = 0 THEN NULL ELSE round(sum(COALESCE(agreed_amount,0)) / count(DISTINCT course_id), 2) END FROM en)
      )
    ));
  END LOOP;
  RETURN res || jsonb_build_object('period', _period, 'start', s, 'end', e);
END $$;
REVOKE ALL ON FUNCTION public.bgi_compute_indicators(uuid, text, date) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.bgi_compute_indicators(uuid, text, date) TO authenticated;