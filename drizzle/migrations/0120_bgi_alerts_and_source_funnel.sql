ALTER TABLE public.workspace_bgi_settings ADD COLUMN IF NOT EXISTS alert_thresholds jsonb NOT NULL DEFAULT '{}'::jsonb;

CREATE OR REPLACE FUNCTION public.bgi_validate_alert_thresholds() RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
DECLARE k text; v jsonb;
BEGIN
  IF jsonb_typeof(NEW.alert_thresholds) <> 'object' THEN RAISE EXCEPTION 'Limites inválidos'; END IF;
  FOR k, v IN SELECT * FROM jsonb_each(NEW.alert_thresholds) LOOP
    IF k NOT IN ('drop_pct','risk_pct') THEN RAISE EXCEPTION 'Limite desconhecido: %', k; END IF;
    IF jsonb_typeof(v) <> 'number' OR (v)::numeric < 1 OR (v)::numeric > 100 THEN RAISE EXCEPTION 'Limite % fora de 1–100', k; END IF;
  END LOOP;
  RETURN NEW;
END $$;
DROP TRIGGER IF EXISTS trg_bgi_validate_alert_thresholds ON public.workspace_bgi_settings;
CREATE TRIGGER trg_bgi_validate_alert_thresholds BEFORE INSERT OR UPDATE ON public.workspace_bgi_settings
  FOR EACH ROW EXECUTE FUNCTION public.bgi_validate_alert_thresholds();

CREATE TABLE public.bgi_alert_dismissals (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  user_id uuid NOT NULL DEFAULT auth.uid(),
  alert_key text NOT NULL CHECK (char_length(alert_key) BETWEEN 1 AND 120),
  period_key text NOT NULL CHECK (char_length(period_key) BETWEEN 1 AND 40),
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (workspace_id, user_id, alert_key, period_key)
);
GRANT SELECT, INSERT, DELETE ON public.bgi_alert_dismissals TO authenticated;
GRANT ALL ON public.bgi_alert_dismissals TO service_role;
ALTER TABLE public.bgi_alert_dismissals ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own dismissals read" ON public.bgi_alert_dismissals FOR SELECT TO authenticated
  USING (user_id = auth.uid() AND workspace_id IN (SELECT public.get_user_workspace_ids()));
CREATE POLICY "own dismissals insert" ON public.bgi_alert_dismissals FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid() AND workspace_id IN (SELECT public.get_user_workspace_ids()));
CREATE POLICY "own dismissals delete" ON public.bgi_alert_dismissals FOR DELETE TO authenticated
  USING (user_id = auth.uid());

CREATE OR REPLACE FUNCTION public.bgi_funnel_by_source(_workspace_id uuid, _period text DEFAULT 'month', _anchor date DEFAULT NULL)
RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
DECLARE
  a date := COALESCE(_anchor, (now() AT TIME ZONE 'Europe/Lisbon')::date);
  s date; e date; res jsonb;
BEGIN
  IF auth.uid() IS NULL OR NOT (
    _workspace_id IN (SELECT public.get_user_workspace_ids()) OR public.is_super_admin(auth.uid())
  ) THEN RAISE EXCEPTION 'Sem acesso a este workspace' USING ERRCODE = '42501'; END IF;
  IF NOT public.is_super_admin(auth.uid()) AND NOT EXISTS (
    SELECT 1 FROM workspace_modules wm JOIN marketplace_modules m ON m.id = wm.module_id
    WHERE wm.workspace_id = _workspace_id AND m.slug = 'growth-intelligence'
      AND wm.status IN ('active','trial','trialing')
  ) THEN RAISE EXCEPTION 'Módulo Crescimento não ativo' USING ERRCODE = '42501'; END IF;
  IF _period = 'quarter' THEN s := date_trunc('quarter', a)::date; e := (s + interval '3 months')::date;
  ELSIF _period = 'year' THEN s := date_trunc('year', a)::date; e := (s + interval '1 year')::date;
  ELSIF _period = 'month' THEN s := date_trunc('month', a)::date; e := (s + interval '1 month')::date;
  ELSE RAISE EXCEPTION 'Período inválido'; END IF;

  WITH ld AS (
    SELECT l.id, l.status, l.archived_at,
      CASE WHEN l.source IS NULL OR btrim(l.source) = '' THEN 'sem_origem'
           WHEN lower(l.source) LIKE 'ghl%' THEN 'ghl'
           ELSE lower(btrim(l.source)) END src
    FROM leads l
    WHERE l.workspace_id = _workspace_id
      AND l.created_at >= (s::timestamp AT TIME ZONE 'Europe/Lisbon')
      AND l.created_at < (e::timestamp AT TIME ZONE 'Europe/Lisbon')
  ), op AS (
    SELECT o.lead_id, o.status FROM opportunities o
    WHERE o.workspace_id = _workspace_id AND o.lead_id IN (SELECT id FROM ld)
  ), inv AS (
    SELECT i.lead_id, CASE WHEN i.document_type = 'credit_note' THEN -1 ELSE 1 END * (COALESCE(i.total,0) - COALESCE(i.tax_amount,0)) net
    FROM invoices i
    WHERE i.workspace_id = _workspace_id AND i.lead_id IN (SELECT id FROM ld)
      AND i.issue_date >= s AND i.issue_date < e
      AND i.document_type IN ('invoice','debit_note','credit_note')
      AND COALESCE(i.status,'') NOT IN ('cancelled','draft')
  )
  SELECT jsonb_build_object('start', s, 'end', e, 'rows', COALESCE(jsonb_agg(r ORDER BY r.leads DESC), '[]'::jsonb)) INTO res
  FROM (
    SELECT ld.src AS source,
      count(*) AS leads,
      count(*) FILTER (WHERE ld.archived_at IS NOT NULL AND ld.status = 'completed') AS converted,
      (SELECT count(*) FROM op JOIN ld x ON x.id = op.lead_id WHERE x.src = ld.src) AS opportunities,
      (SELECT count(*) FROM op JOIN ld x ON x.id = op.lead_id WHERE x.src = ld.src AND op.status = 'won') AS won,
      (SELECT COALESCE(round(sum(inv.net),2),0) FROM inv JOIN ld x ON x.id = inv.lead_id WHERE x.src = ld.src) AS invoiced_net
    FROM ld GROUP BY ld.src
  ) r;
  RETURN res;
END $$;
REVOKE ALL ON FUNCTION public.bgi_funnel_by_source(uuid, text, date) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.bgi_funnel_by_source(uuid, text, date) TO authenticated;