
-- Strategic State Snapshots
CREATE TABLE public.strategic_state_snapshots (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  strategic_focus TEXT,
  strategic_health_score INT DEFAULT 50,
  growth_mode TEXT DEFAULT 'stabilization',
  bottleneck_type TEXT,
  primary_constraint TEXT,
  main_revenue_driver TEXT,
  main_revenue_risk TEXT,
  execution_alignment_score INT DEFAULT 50,
  context_alignment_score INT DEFAULT 50,
  diagnosis_summary TEXT,
  confidence NUMERIC(3,2) DEFAULT 0.50,
  top_constraints JSONB DEFAULT '[]'::jsonb,
  top_leverage_points JSONB DEFAULT '[]'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_strategic_snapshots_ws_created ON public.strategic_state_snapshots(workspace_id, created_at DESC);
ALTER TABLE public.strategic_state_snapshots ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Members can view strategic snapshots" ON public.strategic_state_snapshots FOR SELECT USING (workspace_id IN (SELECT workspace_id FROM public.workspace_members WHERE user_id = auth.uid()));
CREATE POLICY "Service role inserts strategic snapshots" ON public.strategic_state_snapshots FOR INSERT WITH CHECK (true);
CREATE POLICY "Service role updates strategic snapshots" ON public.strategic_state_snapshots FOR UPDATE USING (true);

-- Strategic Hypotheses
CREATE TABLE public.strategic_hypotheses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  rationale TEXT,
  hypothesis_type TEXT NOT NULL,
  expected_impact TEXT,
  confidence NUMERIC(3,2) DEFAULT 0.50,
  status TEXT DEFAULT 'active',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  validated_at TIMESTAMPTZ
);
ALTER TABLE public.strategic_hypotheses ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Members can view hypotheses" ON public.strategic_hypotheses FOR SELECT USING (workspace_id IN (SELECT workspace_id FROM public.workspace_members WHERE user_id = auth.uid()));
CREATE POLICY "Service role inserts hypotheses" ON public.strategic_hypotheses FOR INSERT WITH CHECK (true);
CREATE POLICY "Service role updates hypotheses" ON public.strategic_hypotheses FOR UPDATE USING (true);

-- Strategic Recommendations
CREATE TABLE public.strategic_recommendations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  rationale TEXT,
  recommendation_type TEXT NOT NULL,
  expected_impact TEXT,
  confidence NUMERIC(3,2) DEFAULT 0.50,
  priority TEXT DEFAULT 'medium',
  status TEXT DEFAULT 'pending',
  linked_hypothesis_id UUID REFERENCES public.strategic_hypotheses(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  acted_at TIMESTAMPTZ
);
ALTER TABLE public.strategic_recommendations ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Members can view recommendations" ON public.strategic_recommendations FOR SELECT USING (workspace_id IN (SELECT workspace_id FROM public.workspace_members WHERE user_id = auth.uid()));
CREATE POLICY "Members can update recommendations" ON public.strategic_recommendations FOR UPDATE USING (workspace_id IN (SELECT workspace_id FROM public.workspace_members WHERE user_id = auth.uid()));
CREATE POLICY "Service role inserts recommendations" ON public.strategic_recommendations FOR INSERT WITH CHECK (true);

-- Strategic Recommendation Links
CREATE TABLE public.strategic_recommendation_links (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  recommendation_id UUID NOT NULL REFERENCES public.strategic_recommendations(id) ON DELETE CASCADE,
  objective_id UUID REFERENCES public.business_objectives(id) ON DELETE SET NULL,
  mission_id UUID REFERENCES public.workspace_missions(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.strategic_recommendation_links ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Members can view recommendation links" ON public.strategic_recommendation_links FOR SELECT USING (workspace_id IN (SELECT workspace_id FROM public.workspace_members WHERE user_id = auth.uid()));
CREATE POLICY "Members can insert recommendation links" ON public.strategic_recommendation_links FOR INSERT WITH CHECK (workspace_id IN (SELECT workspace_id FROM public.workspace_members WHERE user_id = auth.uid()));

-- Strategy Settings
CREATE TABLE public.strategy_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL UNIQUE REFERENCES public.workspaces(id) ON DELETE CASCADE,
  is_enabled BOOLEAN DEFAULT false,
  auto_strategy_refresh BOOLEAN DEFAULT false,
  confidence_threshold NUMERIC(3,2) DEFAULT 0.30,
  allow_auto_objective_creation BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.strategy_settings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Members can view strategy settings" ON public.strategy_settings FOR SELECT USING (workspace_id IN (SELECT workspace_id FROM public.workspace_members WHERE user_id = auth.uid()));
CREATE POLICY "Members can upsert strategy settings" ON public.strategy_settings FOR INSERT WITH CHECK (workspace_id IN (SELECT workspace_id FROM public.workspace_members WHERE user_id = auth.uid()));
CREATE POLICY "Members can update strategy settings" ON public.strategy_settings FOR UPDATE USING (workspace_id IN (SELECT workspace_id FROM public.workspace_members WHERE user_id = auth.uid()));
