
-- ============================================
-- FASE 1S — REVENUE ATTRIBUTION & EXECUTIVE DASHBOARD
-- ============================================

-- 1) revenue_attribution_events
CREATE TABLE IF NOT EXISTS public.revenue_attribution_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid NOT NULL,
  attribution_type text NOT NULL CHECK (attribution_type IN (
    'lead_created','product_shared','product_clicked','opportunity_created',
    'proposal_sent','payment_link_sent','deal_won','deal_lost',
    'manual_conversion','revenue_adjustment'
  )),
  channel_type text CHECK (channel_type IS NULL OR channel_type IN (
    'whatsapp','website_chat','website_form','email','phone','voice','manual','other'
  )),
  source_entity_type text,
  source_entity_id uuid,
  contact_id uuid,
  lead_id uuid,
  deal_id uuid,
  ticket_id uuid,
  product_id uuid,
  agent_id uuid,
  team_id uuid,
  campaign_id uuid,
  utm_source text,
  utm_medium text,
  utm_campaign text,
  attributed_revenue numeric NOT NULL DEFAULT 0,
  attributed_margin numeric,
  currency text NOT NULL DEFAULT 'EUR',
  attribution_model text NOT NULL DEFAULT 'last_touch' CHECK (attribution_model IN (
    'first_touch','last_touch','linear','manual','assisted','custom'
  )),
  confidence numeric,
  occurred_at timestamptz NOT NULL DEFAULT now(),
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_rae_workspace_occurred ON public.revenue_attribution_events(workspace_id, occurred_at DESC);
CREATE INDEX IF NOT EXISTS idx_rae_channel ON public.revenue_attribution_events(workspace_id, channel_type, occurred_at DESC);
CREATE INDEX IF NOT EXISTS idx_rae_type ON public.revenue_attribution_events(workspace_id, attribution_type);
CREATE INDEX IF NOT EXISTS idx_rae_contact ON public.revenue_attribution_events(contact_id) WHERE contact_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_rae_deal ON public.revenue_attribution_events(deal_id) WHERE deal_id IS NOT NULL;

ALTER TABLE public.revenue_attribution_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "rae_select_workspace" ON public.revenue_attribution_events
  FOR SELECT USING (workspace_id IN (SELECT workspace_id FROM public.workspace_members WHERE user_id = auth.uid()));
CREATE POLICY "rae_insert_workspace" ON public.revenue_attribution_events
  FOR INSERT WITH CHECK (workspace_id IN (SELECT workspace_id FROM public.workspace_members WHERE user_id = auth.uid()));
CREATE POLICY "rae_update_workspace" ON public.revenue_attribution_events
  FOR UPDATE USING (workspace_id IN (SELECT workspace_id FROM public.workspace_members WHERE user_id = auth.uid()));
CREATE POLICY "rae_delete_workspace" ON public.revenue_attribution_events
  FOR DELETE USING (workspace_id IN (SELECT workspace_id FROM public.workspace_members WHERE user_id = auth.uid()));

-- 2) executive_metric_snapshots
CREATE TABLE IF NOT EXISTS public.executive_metric_snapshots (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid NOT NULL,
  period_start timestamptz NOT NULL,
  period_end timestamptz NOT NULL,
  metric_group text NOT NULL CHECK (metric_group IN (
    'revenue','channels','support','voice','team','quality','products','opportunities','risks','overall'
  )),
  metrics jsonb NOT NULL,
  generated_by text NOT NULL DEFAULT 'system' CHECK (generated_by IN ('system','manual','ai')),
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_ems_workspace_period ON public.executive_metric_snapshots(workspace_id, period_start DESC, metric_group);

ALTER TABLE public.executive_metric_snapshots ENABLE ROW LEVEL SECURITY;

CREATE POLICY "ems_select_workspace" ON public.executive_metric_snapshots
  FOR SELECT USING (workspace_id IN (SELECT workspace_id FROM public.workspace_members WHERE user_id = auth.uid()));
CREATE POLICY "ems_insert_workspace" ON public.executive_metric_snapshots
  FOR INSERT WITH CHECK (workspace_id IN (SELECT workspace_id FROM public.workspace_members WHERE user_id = auth.uid()));

-- 3) executive_recommendations
CREATE TABLE IF NOT EXISTS public.executive_recommendations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid NOT NULL,
  title text NOT NULL,
  description text,
  recommendation_type text CHECK (recommendation_type IN (
    'revenue_leak','followup','staffing','product','support','voice','quality',
    'automation','opportunity','risk','growth'
  )),
  priority text NOT NULL DEFAULT 'medium' CHECK (priority IN ('low','medium','high','critical')),
  status text NOT NULL DEFAULT 'open' CHECK (status IN (
    'open','acknowledged','in_progress','completed','dismissed'
  )),
  confidence numeric,
  expected_impact text,
  estimated_revenue_impact numeric,
  currency text NOT NULL DEFAULT 'EUR',
  related_entity_type text,
  related_entity_id uuid,
  assigned_to uuid,
  due_at timestamptz,
  source text NOT NULL DEFAULT 'ai' CHECK (source IN ('ai','system','manager','automation')),
  action_payload jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  completed_at timestamptz
);

CREATE INDEX IF NOT EXISTS idx_er_workspace_status ON public.executive_recommendations(workspace_id, status, priority);
CREATE INDEX IF NOT EXISTS idx_er_assigned ON public.executive_recommendations(assigned_to) WHERE assigned_to IS NOT NULL;

ALTER TABLE public.executive_recommendations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "er_select_workspace" ON public.executive_recommendations
  FOR SELECT USING (workspace_id IN (SELECT workspace_id FROM public.workspace_members WHERE user_id = auth.uid()));
CREATE POLICY "er_insert_workspace" ON public.executive_recommendations
  FOR INSERT WITH CHECK (workspace_id IN (SELECT workspace_id FROM public.workspace_members WHERE user_id = auth.uid()));
CREATE POLICY "er_update_workspace" ON public.executive_recommendations
  FOR UPDATE USING (workspace_id IN (SELECT workspace_id FROM public.workspace_members WHERE user_id = auth.uid()));
CREATE POLICY "er_delete_workspace" ON public.executive_recommendations
  FOR DELETE USING (workspace_id IN (SELECT workspace_id FROM public.workspace_members WHERE user_id = auth.uid()));

-- 4) executive_action_items
CREATE TABLE IF NOT EXISTS public.executive_action_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid NOT NULL,
  recommendation_id uuid REFERENCES public.executive_recommendations(id) ON DELETE SET NULL,
  title text NOT NULL,
  description text,
  owner_id uuid,
  priority text NOT NULL DEFAULT 'medium' CHECK (priority IN ('low','medium','high','critical')),
  status text NOT NULL DEFAULT 'open' CHECK (status IN (
    'open','in_progress','completed','dismissed','overdue'
  )),
  due_at timestamptz,
  related_entity_type text,
  related_entity_id uuid,
  action_type text CHECK (action_type IS NULL OR action_type IN (
    'create_followup','call_back','send_whatsapp','create_ticket','create_deal',
    'assign_agent','review_quality','update_product','create_automation','other'
  )),
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  completed_at timestamptz
);

CREATE INDEX IF NOT EXISTS idx_eai_workspace_status ON public.executive_action_items(workspace_id, status, priority);
CREATE INDEX IF NOT EXISTS idx_eai_owner ON public.executive_action_items(owner_id) WHERE owner_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_eai_recommendation ON public.executive_action_items(recommendation_id);

ALTER TABLE public.executive_action_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "eai_select_workspace" ON public.executive_action_items
  FOR SELECT USING (workspace_id IN (SELECT workspace_id FROM public.workspace_members WHERE user_id = auth.uid()));
CREATE POLICY "eai_insert_workspace" ON public.executive_action_items
  FOR INSERT WITH CHECK (workspace_id IN (SELECT workspace_id FROM public.workspace_members WHERE user_id = auth.uid()));
CREATE POLICY "eai_update_workspace" ON public.executive_action_items
  FOR UPDATE USING (workspace_id IN (SELECT workspace_id FROM public.workspace_members WHERE user_id = auth.uid()));
CREATE POLICY "eai_delete_workspace" ON public.executive_action_items
  FOR DELETE USING (workspace_id IN (SELECT workspace_id FROM public.workspace_members WHERE user_id = auth.uid()));

-- updated_at triggers (reuse existing function)
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'update_updated_at_column' AND pronamespace = 'public'::regnamespace) THEN
    EXECUTE 'CREATE TRIGGER trg_rae_updated BEFORE UPDATE ON public.revenue_attribution_events FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column()';
    EXECUTE 'CREATE TRIGGER trg_er_updated BEFORE UPDATE ON public.executive_recommendations FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column()';
    EXECUTE 'CREATE TRIGGER trg_eai_updated BEFORE UPDATE ON public.executive_action_items FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column()';
  END IF;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- ============================================
-- AGGREGATE RPC: revenue_attribution_by_channel
-- ============================================
CREATE OR REPLACE FUNCTION public.executive_revenue_by_channel(
  p_workspace_id uuid,
  p_from timestamptz,
  p_to timestamptz,
  p_model text DEFAULT 'last_touch'
) RETURNS TABLE (
  channel_type text,
  events bigint,
  leads bigint,
  opportunities bigint,
  conversions bigint,
  revenue numeric,
  margin numeric
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    COALESCE(channel_type, 'manual') AS channel_type,
    COUNT(*)::bigint AS events,
    COUNT(*) FILTER (WHERE attribution_type = 'lead_created')::bigint AS leads,
    COUNT(*) FILTER (WHERE attribution_type = 'opportunity_created')::bigint AS opportunities,
    COUNT(*) FILTER (WHERE attribution_type IN ('deal_won','manual_conversion'))::bigint AS conversions,
    COALESCE(SUM(attributed_revenue) FILTER (WHERE attribution_type IN ('deal_won','manual_conversion')), 0) AS revenue,
    COALESCE(SUM(attributed_margin) FILTER (WHERE attribution_type IN ('deal_won','manual_conversion')), 0) AS margin
  FROM public.revenue_attribution_events
  WHERE workspace_id = p_workspace_id
    AND occurred_at BETWEEN p_from AND p_to
    AND attribution_model = p_model
    AND workspace_id IN (SELECT workspace_id FROM public.workspace_members WHERE user_id = auth.uid())
  GROUP BY COALESCE(channel_type, 'manual')
  ORDER BY revenue DESC;
$$;

CREATE OR REPLACE FUNCTION public.executive_overview(
  p_workspace_id uuid,
  p_from timestamptz,
  p_to timestamptz,
  p_model text DEFAULT 'last_touch'
) RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_result jsonb;
  v_revenue numeric := 0;
  v_margin numeric := 0;
  v_leads bigint := 0;
  v_opps bigint := 0;
  v_conversions bigint := 0;
  v_open_leaks bigint := 0;
  v_critical_recs bigint := 0;
  v_open_actions bigint := 0;
  v_overdue_actions bigint := 0;
BEGIN
  -- Auth check
  IF NOT EXISTS (SELECT 1 FROM public.workspace_members WHERE user_id = auth.uid() AND workspace_id = p_workspace_id) THEN
    RAISE EXCEPTION 'unauthorized';
  END IF;

  SELECT
    COALESCE(SUM(attributed_revenue) FILTER (WHERE attribution_type IN ('deal_won','manual_conversion')), 0),
    COALESCE(SUM(attributed_margin) FILTER (WHERE attribution_type IN ('deal_won','manual_conversion')), 0),
    COUNT(*) FILTER (WHERE attribution_type = 'lead_created'),
    COUNT(*) FILTER (WHERE attribution_type = 'opportunity_created'),
    COUNT(*) FILTER (WHERE attribution_type IN ('deal_won','manual_conversion'))
  INTO v_revenue, v_margin, v_leads, v_opps, v_conversions
  FROM public.revenue_attribution_events
  WHERE workspace_id = p_workspace_id
    AND occurred_at BETWEEN p_from AND p_to
    AND attribution_model = p_model;

  SELECT COUNT(*) INTO v_open_leaks
  FROM public.revenue_leaks
  WHERE workspace_id = p_workspace_id AND status = 'open';

  SELECT COUNT(*) INTO v_critical_recs
  FROM public.executive_recommendations
  WHERE workspace_id = p_workspace_id AND status IN ('open','acknowledged','in_progress') AND priority IN ('high','critical');

  SELECT
    COUNT(*) FILTER (WHERE status IN ('open','in_progress')),
    COUNT(*) FILTER (WHERE status = 'overdue' OR (status IN ('open','in_progress') AND due_at < now()))
  INTO v_open_actions, v_overdue_actions
  FROM public.executive_action_items
  WHERE workspace_id = p_workspace_id;

  v_result := jsonb_build_object(
    'period', jsonb_build_object('from', p_from, 'to', p_to, 'model', p_model),
    'revenue', v_revenue,
    'margin', v_margin,
    'leads', v_leads,
    'opportunities', v_opps,
    'conversions', v_conversions,
    'conversion_rate', CASE WHEN v_leads > 0 THEN ROUND((v_conversions::numeric / v_leads::numeric) * 100, 2) ELSE 0 END,
    'open_leaks', v_open_leaks,
    'critical_recommendations', v_critical_recs,
    'open_actions', v_open_actions,
    'overdue_actions', v_overdue_actions
  );

  RETURN v_result;
END;
$$;

-- ============================================
-- WORKFLOW EVENT EMITTER (best-effort)
-- ============================================
CREATE OR REPLACE FUNCTION public.emit_executive_workflow_event(
  p_workspace_id uuid,
  p_event_name text,
  p_payload jsonb
) RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Best-effort: insere em workflow_executions se a tabela existir
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name='workflow_executions') THEN
    BEGIN
      INSERT INTO public.workflow_executions (workspace_id, workflow_id, status, trigger_payload, created_at)
      SELECT p_workspace_id, wd.id, 'pending', jsonb_build_object('event', p_event_name, 'data', p_payload), now()
      FROM public.workflow_definitions wd
      WHERE wd.workspace_id = p_workspace_id
        AND wd.is_active = true
        AND wd.trigger_event = p_event_name;
    EXCEPTION WHEN OTHERS THEN
      -- Falhou silenciosamente: schema diferente ou tabela ausente
      NULL;
    END;
  END IF;
END;
$$;

CREATE OR REPLACE FUNCTION public.trg_executive_recommendation_created()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  PERFORM public.emit_executive_workflow_event(
    NEW.workspace_id,
    'executive.recommendation_created',
    jsonb_build_object('recommendation_id', NEW.id, 'priority', NEW.priority, 'type', NEW.recommendation_type)
  );
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_er_workflow_emit ON public.executive_recommendations;
CREATE TRIGGER trg_er_workflow_emit
  AFTER INSERT ON public.executive_recommendations
  FOR EACH ROW EXECUTE FUNCTION public.trg_executive_recommendation_created();

CREATE OR REPLACE FUNCTION public.trg_executive_action_overdue_check()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.due_at IS NOT NULL AND NEW.due_at < now() AND NEW.status IN ('open','in_progress') THEN
    NEW.status := 'overdue';
    PERFORM public.emit_executive_workflow_event(
      NEW.workspace_id,
      'executive.action_item_overdue',
      jsonb_build_object('action_item_id', NEW.id, 'owner_id', NEW.owner_id, 'priority', NEW.priority)
    );
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_eai_overdue_check ON public.executive_action_items;
CREATE TRIGGER trg_eai_overdue_check
  BEFORE INSERT OR UPDATE ON public.executive_action_items
  FOR EACH ROW EXECUTE FUNCTION public.trg_executive_action_overdue_check();
