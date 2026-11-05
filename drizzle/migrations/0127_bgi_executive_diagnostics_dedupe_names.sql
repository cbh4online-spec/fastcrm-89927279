CREATE OR REPLACE FUNCTION public.bgi_executive_diagnostics(_workspace_id uuid, _start date, _end date)
RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path TO 'public' AS $$
DECLARE
  today date := (now() AT TIME ZONE 'Europe/Lisbon')::date;
  res jsonb;
BEGIN
  IF auth.uid() IS NULL OR NOT (
    _workspace_id IN (SELECT public.get_user_workspace_ids()) OR public.is_super_admin(auth.uid())
  ) THEN RAISE EXCEPTION 'Sem acesso a este workspace' USING ERRCODE = '42501'; END IF;
  IF NOT public.is_super_admin(auth.uid()) AND NOT EXISTS (
    SELECT 1 FROM workspace_modules wm JOIN marketplace_modules m ON m.id = wm.module_id
    WHERE wm.workspace_id = _workspace_id AND m.slug = 'growth-intelligence'
      AND wm.status IN ('active','trial','trialing')
  ) THEN RAISE EXCEPTION 'Módulo Crescimento não ativo' USING ERRCODE = '42501'; END IF;
  IF _start IS NULL OR _end IS NULL OR _end <= _start OR _end - _start > 1100 THEN
    RAISE EXCEPTION 'Período inválido' USING ERRCODE = '22023'; END IF;

  WITH inv AS (
    SELECT i.*, CASE WHEN i.document_type = 'credit_note' THEN -1 ELSE 1 END sg,
           COALESCE(i.company_id, i.contact_id) cid,
           CASE WHEN i.company_id IS NOT NULL THEN 'company' WHEN i.contact_id IS NOT NULL THEN 'contact' END ctype
    FROM invoices i
    WHERE i.workspace_id = _workspace_id AND i.issue_date >= _start AND i.issue_date < _end
      AND i.document_type IN ('invoice','debit_note','credit_note')
      AND COALESCE(i.status,'') NOT IN ('cancelled','draft')
  ),
  per_cust AS (
    SELECT cid, max(ctype) ctype, max(client_name) cname,
           sum(sg * (COALESCE(total,0) - COALESCE(tax_amount,0))) net,
           count(*) FILTER (WHERE sg = 1) n
    FROM inv WHERE cid IS NOT NULL GROUP BY cid
  ),
  ranked AS (SELECT *, row_number() OVER (ORDER BY net DESC) rk FROM per_cust WHERE net > 0),
  tot AS (SELECT COALESCE(sum(net),0) t, count(*) c FROM ranked),
  open_inv AS (
    SELECT i.*, COALESCE(i.company_id, i.contact_id) cid,
           CASE WHEN i.company_id IS NOT NULL THEN 'company' WHEN i.contact_id IS NOT NULL THEN 'contact' END ctype,
           GREATEST(COALESCE(i.total,0) - COALESCE(i.amount_paid,0),0) bal,
           today - COALESCE(i.due_date, i.issue_date) od
    FROM invoices i
    WHERE i.workspace_id = _workspace_id AND i.document_type IN ('invoice','debit_note')
      AND i.status IN ('sent','partially_paid','overdue')
      AND COALESCE(i.total,0) - COALESCE(i.amount_paid,0) > 0.005
  ),
  debt AS (
    SELECT cid, max(ctype) ctype, max(client_name) cname, sum(bal) bal, max(od) max_od, count(*) n
    FROM open_inv WHERE cid IS NOT NULL GROUP BY cid
  ),
  nm AS (
    SELECT DISTINCT ON (x.cid) x.cid, COALESCE(co.name, NULLIF(trim(COALESCE(ct.first_name,'')||' '||COALESCE(ct.last_name,'')),''), ct.name, x.cname, 'Sem nome') name
    FROM (SELECT cid, ctype, cname FROM ranked WHERE rk <= 10 UNION SELECT cid, ctype, cname FROM debt) x
    LEFT JOIN companies co ON x.ctype = 'company' AND co.id = x.cid
    LEFT JOIN contacts ct ON x.ctype = 'contact' AND ct.id = x.cid
    ORDER BY x.cid, co.name NULLS LAST
  )
  SELECT jsonb_build_object(
    'start', _start, 'end', _end, 'today', today,
    'concentration', jsonb_build_object(
      'total_net', (SELECT round(t,2) FROM tot),
      'customers', (SELECT c FROM tot),
      'top3_share', (SELECT CASE WHEN t > 0 THEN round(100 * (SELECT COALESCE(sum(net),0) FROM ranked WHERE rk <= 3) / t, 1) END FROM tot),
      'top10_share', (SELECT CASE WHEN t > 0 THEN round(100 * (SELECT COALESCE(sum(net),0) FROM ranked WHERE rk <= 10) / t, 1) END FROM tot),
      'top20_share', (SELECT CASE WHEN t > 0 THEN round(100 * (SELECT COALESCE(sum(net),0) FROM ranked WHERE rk <= 20) / t, 1) END FROM tot),
      'customers_for_80pct', (SELECT min(rk) FROM (SELECT rk, sum(net) OVER (ORDER BY rk) cum FROM ranked) z, tot WHERE t > 0 AND cum >= 0.8 * t),
      'top', COALESCE((SELECT jsonb_agg(jsonb_build_object(
          'id', r.cid, 'type', r.ctype, 'name', nm.name, 'net', round(r.net,2), 'invoices', r.n,
          'share', CASE WHEN tot.t > 0 THEN round(100 * r.net / tot.t, 1) END,
          'open', COALESCE((SELECT round(bal,2) FROM debt d WHERE d.cid = r.cid),0)
        ) ORDER BY r.rk) FROM ranked r JOIN nm ON nm.cid = r.cid, tot WHERE r.rk <= 10), '[]'::jsonb)
    ),
    'collection', jsonb_build_object(
      'invoiced_gross', (SELECT round(COALESCE(sum(total),0),2) FROM inv WHERE sg = 1),
      'paid_gross', (SELECT round(COALESCE(sum(LEAST(COALESCE(amount_paid,0), COALESCE(total,0))),0),2) FROM inv WHERE sg = 1),
      'rate', (SELECT CASE WHEN sum(total) > 0 THEN round(100 * sum(LEAST(COALESCE(amount_paid,0), COALESCE(total,0))) / sum(total), 1) END FROM inv WHERE sg = 1)
    ),
    'aging', jsonb_build_object(
      'total', (SELECT round(COALESCE(sum(bal),0),2) FROM open_inv),
      'invoices', (SELECT count(*) FROM open_inv),
      'not_due', (SELECT round(COALESCE(sum(bal),0),2) FROM open_inv WHERE od <= 0),
      'd1_30', (SELECT round(COALESCE(sum(bal),0),2) FROM open_inv WHERE od BETWEEN 1 AND 30),
      'd31_60', (SELECT round(COALESCE(sum(bal),0),2) FROM open_inv WHERE od BETWEEN 31 AND 60),
      'd61_90', (SELECT round(COALESCE(sum(bal),0),2) FROM open_inv WHERE od BETWEEN 61 AND 90),
      'd90_plus', (SELECT round(COALESCE(sum(bal),0),2) FROM open_inv WHERE od > 90),
      'top_debtors', COALESCE((SELECT jsonb_agg(x ORDER BY (x->>'balance')::numeric DESC) FROM (
          SELECT jsonb_build_object('id', d.cid, 'type', d.ctype, 'name', nm.name, 'balance', round(d.bal,2),
                                    'max_overdue_days', GREATEST(d.max_od,0), 'invoices', d.n) x
          FROM debt d JOIN nm ON nm.cid = d.cid ORDER BY d.bal DESC LIMIT 10) q), '[]'::jsonb)
    )
  ) INTO res;
  RETURN res;
END $$;
REVOKE ALL ON FUNCTION public.bgi_executive_diagnostics(uuid, date, date) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.bgi_executive_diagnostics(uuid, date, date) TO authenticated;