
-- ═══════ 1. deal_intelligence_reports ═══════
CREATE TABLE IF NOT EXISTS public.deal_intelligence_reports (
  id                    uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id          uuid NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  opportunity_id        uuid NOT NULL REFERENCES public.opportunities(id) ON DELETE CASCADE,
  win_probability       integer NOT NULL DEFAULT 50,
  win_probability_delta integer,
  confidence_level      text NOT NULL DEFAULT 'medium',
  health_score          integer NOT NULL DEFAULT 50,
  health_trend          text DEFAULT 'stable',
  risk_signals          jsonb DEFAULT '[]',
  next_actions          jsonb DEFAULT '[]',
  coaching_summary      text,
  key_strengths         text[],
  key_weaknesses        text[],
  competitive_intel     text,
  stakeholder_analysis  text,
  sentiment             text DEFAULT 'unknown',
  sentiment_reasoning   text,
  days_since_activity   integer,
  stall_risk            boolean NOT NULL DEFAULT false,
  tokens_used           integer,
  generated_at          timestamptz NOT NULL DEFAULT now(),
  expires_at            timestamptz NOT NULL DEFAULT (now() + interval '24 hours'),
  is_stale              boolean NOT NULL DEFAULT false,
  created_at            timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_deal_intel_opportunity
  ON public.deal_intelligence_reports(opportunity_id) WHERE is_stale = false;

CREATE INDEX IF NOT EXISTS idx_deal_intel_workspace
  ON public.deal_intelligence_reports(workspace_id, generated_at DESC);

ALTER TABLE public.deal_intelligence_reports ENABLE ROW LEVEL SECURITY;

CREATE POLICY "workspace_members_select_deal_intel" ON public.deal_intelligence_reports
  FOR SELECT TO authenticated
  USING (workspace_id IN (
    SELECT wm.workspace_id FROM public.workspace_members wm WHERE wm.user_id = auth.uid()
  ));

CREATE POLICY "service_role_all_deal_intel" ON public.deal_intelligence_reports
  FOR ALL TO service_role USING (true) WITH CHECK (true);

-- ═══════ 2. pipeline_risk_reports ═══════
CREATE TABLE IF NOT EXISTS public.pipeline_risk_reports (
  id                    uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id          uuid NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  pipeline_id           uuid,
  pipeline_health_score integer NOT NULL DEFAULT 50,
  at_risk_count         integer NOT NULL DEFAULT 0,
  at_risk_value         numeric(15,2) NOT NULL DEFAULT 0,
  critical_count        integer NOT NULL DEFAULT 0,
  risk_breakdown        jsonb DEFAULT '{}',
  deal_risks            jsonb DEFAULT '[]',
  avg_deal_age_days     integer,
  avg_days_per_stage    jsonb DEFAULT '{}',
  conversion_rates      jsonb DEFAULT '{}',
  executive_summary     text,
  top_3_priorities      text[],
  tokens_used           integer,
  generated_at          timestamptz NOT NULL DEFAULT now(),
  expires_at            timestamptz NOT NULL DEFAULT (now() + interval '4 hours'),
  is_stale              boolean NOT NULL DEFAULT false,
  created_at            timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_pipeline_risk_workspace
  ON public.pipeline_risk_reports(workspace_id, generated_at DESC);

CREATE INDEX IF NOT EXISTS idx_pipeline_risk_latest
  ON public.pipeline_risk_reports(workspace_id, pipeline_id) WHERE is_stale = false;

ALTER TABLE public.pipeline_risk_reports ENABLE ROW LEVEL SECURITY;

CREATE POLICY "workspace_members_select_pipeline_risk" ON public.pipeline_risk_reports
  FOR SELECT TO authenticated
  USING (workspace_id IN (
    SELECT wm.workspace_id FROM public.workspace_members wm WHERE wm.user_id = auth.uid()
  ));

CREATE POLICY "service_role_all_pipeline_risk" ON public.pipeline_risk_reports
  FOR ALL TO service_role USING (true) WITH CHECK (true);

-- ═══════ 3. multi_pipeline_intel_reports ═══════
CREATE TABLE IF NOT EXISTS public.multi_pipeline_intel_reports (
  id                    uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id          uuid NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  pipeline_comparison   jsonb DEFAULT '[]',
  winning_patterns      text[],
  losing_patterns       text[],
  best_source           text,
  best_stage_velocity   jsonb DEFAULT '{}',
  rep_performance       jsonb DEFAULT '[]',
  bottleneck_stages     jsonb DEFAULT '[]',
  strategic_insights    text[],
  growth_opportunities  text[],
  forecast_accuracy     float,
  tokens_used           integer,
  generated_at          timestamptz NOT NULL DEFAULT now(),
  expires_at            timestamptz NOT NULL DEFAULT (now() + interval '12 hours'),
  is_stale              boolean NOT NULL DEFAULT false,
  created_at            timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_multi_pipeline_intel_workspace
  ON public.multi_pipeline_intel_reports(workspace_id, generated_at DESC);

ALTER TABLE public.multi_pipeline_intel_reports ENABLE ROW LEVEL SECURITY;

CREATE POLICY "workspace_members_select_multi_pipeline" ON public.multi_pipeline_intel_reports
  FOR SELECT TO authenticated
  USING (workspace_id IN (
    SELECT wm.workspace_id FROM public.workspace_members wm WHERE wm.user_id = auth.uid()
  ));

CREATE POLICY "service_role_all_multi_pipeline" ON public.multi_pipeline_intel_reports
  FOR ALL TO service_role USING (true) WITH CHECK (true);

-- ═══════ 4. Cache invalidation trigger ═══════
CREATE OR REPLACE FUNCTION public.invalidate_deal_intel_on_opportunity_change()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  UPDATE deal_intelligence_reports SET is_stale = true
  WHERE opportunity_id = NEW.id AND is_stale = false;

  UPDATE pipeline_risk_reports SET is_stale = true
  WHERE workspace_id = NEW.workspace_id AND is_stale = false;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_invalidate_deal_intel ON public.opportunities;
CREATE TRIGGER trg_invalidate_deal_intel
  AFTER UPDATE ON public.opportunities
  FOR EACH ROW
  WHEN (
    OLD.stage_id IS DISTINCT FROM NEW.stage_id OR
    OLD.value IS DISTINCT FROM NEW.value OR
    OLD.probability IS DISTINCT FROM NEW.probability OR
    OLD.status IS DISTINCT FROM NEW.status
  )
  EXECUTE FUNCTION public.invalidate_deal_intel_on_opportunity_change();
