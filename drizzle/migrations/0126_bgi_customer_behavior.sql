CREATE OR REPLACE FUNCTION public.bgi_customer_behavior(_workspace_id uuid, _start date, _end date)
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

  WITH hist AS (
    SELECT COALESCE(i.company_id, i.contact_id) cid,
           CASE WHEN i.company_id IS NOT NULL THEN 'company' ELSE 'contact' END ctype,
           i.client_name, i.issue_date, COALESCE(i.total,0) - COALESCE(i.tax_amount,0) net
    FROM invoices i
    WHERE i.workspace_id = _workspace_id AND i.document_type IN ('invoice','debit_note')
      AND COALESCE(i.status,'') NOT IN ('cancelled','draft')
      AND i.issue_date >= today - 730 AND COALESCE(i.company_id, i.contact_id) IS NOT NULL
  ),
  days AS (SELECT DISTINCT cid, issue_date FROM hist),
  gaps AS (SELECT cid, issue_date - lag(issue_date) OVER (PARTITION BY cid ORDER BY issue_date) g FROM days),
  freq AS (SELECT cid, avg(g) avg_gap FROM gaps WHERE g IS NOT NULL GROUP BY cid),
  cust AS (
    SELECT h.cid, max(h.ctype) ctype, max(h.client_name) cname, max(h.issue_date) last_date,
           count(DISTINCT h.issue_date) purchases
    FROM hist h GROUP BY h.cid
  ),
  dorm AS (
    SELECT c.*, today - c.last_date idle, f.avg_gap,
           (SELECT COALESCE(sum(net),0) FROM hist h WHERE h.cid = c.cid AND h.issue_date > c.last_date - 365) value12
    FROM cust c LEFT JOIN freq f ON f.cid = c.cid
    WHERE c.purchases >= 2 AND today - c.last_date > 60
  ),
  nm AS (
    SELECT d.cid, COALESCE(co.name, NULLIF(trim(COALESCE(ct.first_name,'')||' '||COALESCE(ct.last_name,'')),''), ct.name, d.cname, 'Sem nome') name
    FROM dorm d
    LEFT JOIN companies co ON d.ctype = 'company' AND co.id = d.cid
    LEFT JOIN contacts ct ON d.ctype = 'contact' AND ct.id = d.cid
  ),
  tk AS (
    SELECT COALESCE(i.total,0) t FROM invoices i
    WHERE i.workspace_id = _workspace_id AND i.document_type IN ('invoice','debit_note')
      AND COALESCE(i.status,'') NOT IN ('cancelled','draft')
      AND i.issue_date >= _start AND i.issue_date < _end AND COALESCE(i.total,0) > 0
  ),
  b AS (
    SELECT CASE WHEN t < 100 THEN 1 WHEN t < 300 THEN 2 WHEN t < 1000 THEN 3 ELSE 4 END k, count(*) n, sum(t) v
    FROM tk GROUP BY 1
  )
  SELECT jsonb_build_object(
    'start', _start, 'end', _end, 'today', today,
    'frequency', jsonb_build_object(
      'recurring_customers', (SELECT count(*) FROM freq),
      'median_gap_days', (SELECT round(percentile_cont(0.5) WITHIN GROUP (ORDER BY avg_gap)::numeric) FROM freq)
    ),
    'dormant', jsonb_build_object(
      'count', (SELECT count(*) FROM dorm),
      'd61_90', (SELECT count(*) FROM dorm WHERE idle <= 90),
      'd91_180', (SELECT count(*) FROM dorm WHERE idle BETWEEN 91 AND 180),
      'd180_plus', (SELECT count(*) FROM dorm WHERE idle > 180),
      'value_at_risk', (SELECT round(COALESCE(sum(value12),0),2) FROM dorm),
      'top', COALESCE((SELECT jsonb_agg(x) FROM (
        SELECT jsonb_build_object('id', d.cid, 'type', d.ctype, 'name', nm.name, 'last_date', d.last_date,
          'idle_days', d.idle, 'purchases', d.purchases, 'avg_gap_days', round(d.avg_gap::numeric), 'value12', round(d.value12,2)) x
        FROM dorm d JOIN nm ON nm.cid = d.cid ORDER BY d.value12 DESC LIMIT 15) q), '[]'::jsonb)
    ),
    'tickets', jsonb_build_object(
      'count', (SELECT count(*) FROM tk),
      'avg', (SELECT round(avg(t),2) FROM tk),
      'median', (SELECT round(percentile_cont(0.5) WITHIN GROUP (ORDER BY t)::numeric,2) FROM tk),
      'buckets', (SELECT jsonb_agg(jsonb_build_object('key', k.key, 'count', COALESCE(b.n,0), 'value', round(COALESCE(b.v,0),2)) ORDER BY k.i)
                  FROM (VALUES (1,'lt100'),(2,'100_300'),(3,'300_1000'),(4,'gte1000')) k(i,key) LEFT JOIN b ON b.k = k.i)
    )
  ) INTO res;
  RETURN res;
END $$;
REVOKE ALL ON FUNCTION public.bgi_customer_behavior(uuid, date, date) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.bgi_customer_behavior(uuid, date, date) TO authenticated;