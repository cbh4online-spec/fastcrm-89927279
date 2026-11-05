CREATE OR REPLACE FUNCTION public.bgi_action_lists(_workspace_id uuid, _start date, _end date)
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

  WITH base AS (
    SELECT i.*, COALESCE(i.company_id, i.contact_id) cid,
           CASE WHEN i.company_id IS NOT NULL THEN 'company' ELSE 'contact' END ctype
    FROM invoices i
    WHERE i.workspace_id = _workspace_id AND i.document_type IN ('invoice','debit_note')
      AND COALESCE(i.status,'') NOT IN ('cancelled','draft')
      AND COALESCE(i.company_id, i.contact_id) IS NOT NULL
  ),
  collect AS (
    SELECT cid, max(ctype) ctype, max(client_name) cname,
           sum(GREATEST(COALESCE(total,0)-COALESCE(amount_paid,0),0)) amount, count(*) n,
           max(today - COALESCE(due_date, issue_date)) max_od
    FROM base
    WHERE status IN ('sent','partially_paid','overdue') AND COALESCE(total,0)-COALESCE(amount_paid,0) > 0.005
      AND today - COALESCE(due_date, issue_date) > 60
    GROUP BY cid ORDER BY amount DESC LIMIT 100
  ),
  hist AS (SELECT * FROM base WHERE issue_date >= today - 730),
  days AS (SELECT DISTINCT cid, issue_date FROM hist),
  gaps AS (SELECT cid, issue_date - lag(issue_date) OVER (PARTITION BY cid ORDER BY issue_date) g FROM days),
  freq AS (SELECT cid, avg(g) avg_gap, count(*) + 1 purchases FROM gaps WHERE g IS NOT NULL GROUP BY cid),
  lastp AS (SELECT cid, max(ctype) ctype, max(client_name) cname, max(issue_date) last_date FROM hist GROUP BY cid),
  reactivate AS (
    SELECT l.cid, l.ctype, l.cname, l.last_date, today - l.last_date idle, round(f.avg_gap) avg_gap,
           (SELECT COALESCE(sum(COALESCE(total,0)-COALESCE(tax_amount,0)),0) FROM hist h WHERE h.cid = l.cid AND h.issue_date > l.last_date - 365) amount
    FROM lastp l JOIN freq f ON f.cid = l.cid
    WHERE today - l.last_date > GREATEST(60, 2 * f.avg_gap)
    ORDER BY amount DESC LIMIT 100
  ),
  upsell AS (
    SELECT cid, max(ctype) ctype, max(client_name) cname, count(*) n, round(avg(total),2) avg_ticket, round(sum(total),2) amount
    FROM base WHERE issue_date >= _start AND issue_date < _end AND COALESCE(total,0) > 0
    GROUP BY cid HAVING count(*) >= 3 AND avg(total) < 150
    ORDER BY count(*) DESC, sum(total) DESC LIMIT 100
  ),
  allc AS (
    SELECT cid, ctype, cname FROM collect UNION SELECT cid, ctype, cname FROM reactivate UNION SELECT cid, ctype, cname FROM upsell
  ),
  info AS (
    SELECT DISTINCT ON (a.cid) a.cid,
      COALESCE(co.name, NULLIF(trim(COALESCE(ct.first_name,'')||' '||COALESCE(ct.last_name,'')),''), ct.name, a.cname, 'Sem nome') name,
      COALESCE(NULLIF(co.phone,''), NULLIF(ct.phone,''),
        (SELECT c2.phone FROM contacts c2 WHERE a.ctype = 'company' AND c2.company_id = a.cid AND c2.workspace_id = _workspace_id
           AND c2.deleted_at IS NULL AND NULLIF(c2.phone,'') IS NOT NULL ORDER BY c2.created_at LIMIT 1)) phone
    FROM allc a
    LEFT JOIN companies co ON a.ctype = 'company' AND co.id = a.cid
    LEFT JOIN contacts ct ON a.ctype = 'contact' AND ct.id = a.cid
    ORDER BY a.cid, co.name NULLS LAST
  )
  SELECT jsonb_build_object(
    'today', today,
    'collect', COALESCE((SELECT jsonb_agg(jsonb_build_object('id', c.cid, 'type', c.ctype, 'name', i.name, 'phone', i.phone,
        'amount', round(c.amount,2), 'invoices', c.n, 'max_overdue_days', c.max_od) ORDER BY c.amount DESC)
      FROM collect c JOIN info i ON i.cid = c.cid), '[]'::jsonb),
    'reactivate', COALESCE((SELECT jsonb_agg(jsonb_build_object('id', r.cid, 'type', r.ctype, 'name', i.name, 'phone', i.phone,
        'amount', round(r.amount,2), 'last_date', r.last_date, 'idle_days', r.idle, 'avg_gap_days', r.avg_gap) ORDER BY r.amount DESC)
      FROM reactivate r JOIN info i ON i.cid = r.cid), '[]'::jsonb),
    'upsell', COALESCE((SELECT jsonb_agg(jsonb_build_object('id', u.cid, 'type', u.ctype, 'name', i.name, 'phone', i.phone,
        'amount', u.amount, 'invoices', u.n, 'avg_ticket', u.avg_ticket) ORDER BY u.n DESC, u.amount DESC)
      FROM upsell u JOIN info i ON i.cid = u.cid), '[]'::jsonb)
  ) INTO res;
  RETURN res;
END $$;
REVOKE ALL ON FUNCTION public.bgi_action_lists(uuid, date, date) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.bgi_action_lists(uuid, date, date) TO authenticated;