
-- Revenue Flight Control Module Tables

-- 1. Revenue Targets
CREATE TABLE public.revenue_targets (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  period_type TEXT NOT NULL DEFAULT 'monthly',
  period_start DATE NOT NULL,
  period_end DATE NOT NULL,
  target_revenue NUMERIC NOT NULL DEFAULT 0,
  target_deals INTEGER NOT NULL DEFAULT 0,
  target_meetings INTEGER NOT NULL DEFAULT 0,
  target_proposals INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.revenue_targets ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can manage revenue targets in their workspace" ON public.revenue_targets FOR ALL TO authenticated USING (workspace_id IN (SELECT id FROM public.workspaces WHERE owner_id = auth.uid()) OR workspace_id IN (SELECT workspace_id FROM public.workspace_members WHERE user_id = auth.uid()));

-- 2. Revenue Forecast Snapshots
CREATE TABLE public.revenue_forecast_snapshots (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  period_type TEXT NOT NULL DEFAULT 'monthly',
  period_start DATE NOT NULL,
  period_end DATE NOT NULL,
  closed_revenue NUMERIC NOT NULL DEFAULT 0,
  weighted_pipeline NUMERIC NOT NULL DEFAULT 0,
  best_case_revenue NUMERIC NOT NULL DEFAULT 0,
  most_likely_revenue NUMERIC NOT NULL DEFAULT 0,
  worst_case_revenue NUMERIC NOT NULL DEFAULT 0,
  target_revenue NUMERIC NOT NULL DEFAULT 0,
  forecast_gap NUMERIC NOT NULL DEFAULT 0,
  target_hit_probability NUMERIC NOT NULL DEFAULT 0,
  forecast_confidence NUMERIC NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.revenue_forecast_snapshots ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view forecast snapshots in their workspace" ON public.revenue_forecast_snapshots FOR ALL TO authenticated USING (workspace_id IN (SELECT id FROM public.workspaces WHERE owner_id = auth.uid()) OR workspace_id IN (SELECT workspace_id FROM public.workspace_members WHERE user_id = auth.uid()));

-- 3. Deal Probability Scores
CREATE TABLE public.deal_probability_scores (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  opportunity_id UUID NOT NULL REFERENCES public.opportunities(id) ON DELETE CASCADE,
  probability_score NUMERIC NOT NULL DEFAULT 0,
  risk_score NUMERIC NOT NULL DEFAULT 0,
  health_score NUMERIC NOT NULL DEFAULT 0,
  momentum_score NUMERIC NOT NULL DEFAULT 0,
  confidence_score NUMERIC NOT NULL DEFAULT 0,
  model_version TEXT NOT NULL DEFAULT 'v1',
  explanation_json JSONB DEFAULT '{}',
  recommended_action TEXT,
  computed_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(workspace_id, opportunity_id)
);
ALTER TABLE public.deal_probability_scores ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can manage deal probability scores in their workspace" ON public.deal_probability_scores FOR ALL TO authenticated USING (workspace_id IN (SELECT id FROM public.workspaces WHERE owner_id = auth.uid()) OR workspace_id IN (SELECT workspace_id FROM public.workspace_members WHERE user_id = auth.uid()));

-- 4. Deal Risk Signals
CREATE TABLE public.deal_risk_signals (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  opportunity_id UUID NOT NULL REFERENCES public.opportunities(id) ON DELETE CASCADE,
  signal_type TEXT NOT NULL,
  severity TEXT NOT NULL DEFAULT 'medium',
  signal_score NUMERIC NOT NULL DEFAULT 0,
  reason TEXT NOT NULL,
  evidence_json JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  resolved_at TIMESTAMPTZ
);
ALTER TABLE public.deal_risk_signals ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can manage deal risk signals in their workspace" ON public.deal_risk_signals FOR ALL TO authenticated USING (workspace_id IN (SELECT id FROM public.workspaces WHERE owner_id = auth.uid()) OR workspace_id IN (SELECT workspace_id FROM public.workspace_members WHERE user_id = auth.uid()));

-- 5. Revenue Recommendations
CREATE TABLE public.revenue_recommendations (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  period_type TEXT NOT NULL DEFAULT 'monthly',
  period_start DATE,
  period_end DATE,
  recommendation_type TEXT NOT NULL,
  priority TEXT NOT NULL DEFAULT 'medium',
  title TEXT NOT NULL,
  description TEXT,
  impact_estimate NUMERIC DEFAULT 0,
  linked_entity_type TEXT,
  linked_entity_id UUID,
  status TEXT NOT NULL DEFAULT 'pending',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.revenue_recommendations ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can manage revenue recommendations in their workspace" ON public.revenue_recommendations FOR ALL TO authenticated USING (workspace_id IN (SELECT id FROM public.workspaces WHERE owner_id = auth.uid()) OR workspace_id IN (SELECT workspace_id FROM public.workspace_members WHERE user_id = auth.uid()));

-- 6. Revenue Scenarios
CREATE TABLE public.revenue_scenarios (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  scenario_name TEXT NOT NULL,
  scenario_type TEXT NOT NULL DEFAULT 'custom',
  input_json JSONB DEFAULT '{}',
  output_json JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.revenue_scenarios ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can manage revenue scenarios in their workspace" ON public.revenue_scenarios FOR ALL TO authenticated USING (workspace_id IN (SELECT id FROM public.workspaces WHERE owner_id = auth.uid()) OR workspace_id IN (SELECT workspace_id FROM public.workspace_members WHERE user_id = auth.uid()));

-- 7. Revenue Model Config
CREATE TABLE public.revenue_model_config (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE UNIQUE,
  avg_deal_value NUMERIC DEFAULT 0,
  avg_sales_cycle_days INTEGER DEFAULT 30,
  lead_to_meeting_rate NUMERIC DEFAULT 0.3,
  meeting_to_proposal_rate NUMERIC DEFAULT 0.5,
  proposal_to_close_rate NUMERIC DEFAULT 0.3,
  stalled_threshold_days INTEGER DEFAULT 7,
  hot_lead_threshold NUMERIC DEFAULT 70,
  hot_deal_threshold NUMERIC DEFAULT 75,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.revenue_model_config ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can manage revenue model config in their workspace" ON public.revenue_model_config FOR ALL TO authenticated USING (workspace_id IN (SELECT id FROM public.workspaces WHERE owner_id = auth.uid()) OR workspace_id IN (SELECT workspace_id FROM public.workspace_members WHERE user_id = auth.uid()));

-- Indexes for performance
CREATE INDEX idx_deal_probability_scores_workspace ON public.deal_probability_scores(workspace_id);
CREATE INDEX idx_deal_probability_scores_opportunity ON public.deal_probability_scores(opportunity_id);
CREATE INDEX idx_deal_risk_signals_workspace ON public.deal_risk_signals(workspace_id);
CREATE INDEX idx_deal_risk_signals_opportunity ON public.deal_risk_signals(opportunity_id);
CREATE INDEX idx_deal_risk_signals_unresolved ON public.deal_risk_signals(workspace_id) WHERE resolved_at IS NULL;
CREATE INDEX idx_revenue_forecast_snapshots_workspace ON public.revenue_forecast_snapshots(workspace_id, created_at DESC);
CREATE INDEX idx_revenue_recommendations_workspace ON public.revenue_recommendations(workspace_id, status);
CREATE INDEX idx_revenue_targets_workspace ON public.revenue_targets(workspace_id, period_start);
