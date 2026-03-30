
-- Portfolio Entities
CREATE TABLE public.portfolio_entities (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL,
  entity_type TEXT NOT NULL,
  entity_id TEXT NOT NULL,
  name TEXT NOT NULL,
  category TEXT,
  status TEXT NOT NULL DEFAULT 'active',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (workspace_id, entity_type, entity_id)
);

ALTER TABLE public.portfolio_entities ENABLE ROW LEVEL SECURITY;

CREATE POLICY "workspace members can view portfolio_entities"
  ON public.portfolio_entities FOR SELECT TO authenticated
  USING (workspace_id IN (SELECT wm.workspace_id FROM public.workspace_members wm WHERE wm.user_id = auth.uid()));

-- Portfolio Metrics
CREATE TABLE public.portfolio_metrics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL,
  portfolio_entity_id UUID NOT NULL REFERENCES public.portfolio_entities(id) ON DELETE CASCADE,
  revenue_actual NUMERIC DEFAULT 0,
  revenue_forecast NUMERIC DEFAULT 0,
  contribution_margin_estimate NUMERIC DEFAULT 0,
  conversion_rate NUMERIC(5,4) DEFAULT 0,
  ltv_estimate NUMERIC DEFAULT 0,
  workload_cost_estimate NUMERIC DEFAULT 0,
  automation_leverage_score INT DEFAULT 50,
  risk_score INT DEFAULT 50,
  strategic_fit_score INT DEFAULT 50,
  capital_efficiency_score INT DEFAULT 50,
  allocation_recommendation TEXT DEFAULT 'maintain',
  confidence NUMERIC(3,2) DEFAULT 0.50,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.portfolio_metrics ENABLE ROW LEVEL SECURITY;

CREATE POLICY "workspace members can view portfolio_metrics"
  ON public.portfolio_metrics FOR SELECT TO authenticated
  USING (workspace_id IN (SELECT wm.workspace_id FROM public.workspace_members wm WHERE wm.user_id = auth.uid()));

-- Portfolio Recommendations
CREATE TABLE public.portfolio_recommendations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL,
  portfolio_entity_id UUID REFERENCES public.portfolio_entities(id) ON DELETE SET NULL,
  recommendation_type TEXT NOT NULL,
  title TEXT NOT NULL,
  rationale TEXT,
  expected_impact TEXT,
  confidence NUMERIC(3,2) DEFAULT 0.50,
  priority TEXT DEFAULT 'medium',
  status TEXT NOT NULL DEFAULT 'pending',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  acted_at TIMESTAMPTZ
);

ALTER TABLE public.portfolio_recommendations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "workspace members can view portfolio_recommendations"
  ON public.portfolio_recommendations FOR SELECT TO authenticated
  USING (workspace_id IN (SELECT wm.workspace_id FROM public.workspace_members wm WHERE wm.user_id = auth.uid()));

CREATE POLICY "workspace members can update portfolio_recommendations"
  ON public.portfolio_recommendations FOR UPDATE TO authenticated
  USING (workspace_id IN (SELECT wm.workspace_id FROM public.workspace_members wm WHERE wm.user_id = auth.uid()))
  WITH CHECK (workspace_id IN (SELECT wm.workspace_id FROM public.workspace_members wm WHERE wm.user_id = auth.uid()));

-- Portfolio Settings
CREATE TABLE public.portfolio_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL UNIQUE,
  is_enabled BOOLEAN DEFAULT false,
  risk_weight NUMERIC(3,2) DEFAULT 0.15,
  revenue_weight NUMERIC(3,2) DEFAULT 0.35,
  effort_weight NUMERIC(3,2) DEFAULT 0.20,
  automation_weight NUMERIC(3,2) DEFAULT 0.10,
  strategy_weight NUMERIC(3,2) DEFAULT 0.20,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.portfolio_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "workspace members can view portfolio_settings"
  ON public.portfolio_settings FOR SELECT TO authenticated
  USING (workspace_id IN (SELECT wm.workspace_id FROM public.workspace_members wm WHERE wm.user_id = auth.uid()));

CREATE POLICY "workspace members can upsert portfolio_settings"
  ON public.portfolio_settings FOR UPDATE TO authenticated
  USING (workspace_id IN (SELECT wm.workspace_id FROM public.workspace_members wm WHERE wm.user_id = auth.uid()))
  WITH CHECK (workspace_id IN (SELECT wm.workspace_id FROM public.workspace_members wm WHERE wm.user_id = auth.uid()));

CREATE POLICY "workspace members can insert portfolio_settings"
  ON public.portfolio_settings FOR INSERT TO authenticated
  WITH CHECK (workspace_id IN (SELECT wm.workspace_id FROM public.workspace_members wm WHERE wm.user_id = auth.uid()));

-- Index for portfolio_entities
CREATE INDEX idx_portfolio_entities_workspace_type ON public.portfolio_entities(workspace_id, entity_type);

-- Index for portfolio_metrics
CREATE INDEX idx_portfolio_metrics_entity ON public.portfolio_metrics(portfolio_entity_id);
CREATE INDEX idx_portfolio_metrics_efficiency ON public.portfolio_metrics(workspace_id, capital_efficiency_score DESC);

-- Index for portfolio_recommendations
CREATE INDEX idx_portfolio_recommendations_workspace ON public.portfolio_recommendations(workspace_id, status, priority);
