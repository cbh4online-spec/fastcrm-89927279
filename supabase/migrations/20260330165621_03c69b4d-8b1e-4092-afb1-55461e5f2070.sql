
-- =====================================================
-- Optimization Engine: Tables, Indexes, RLS
-- =====================================================

-- 1. optimization_recommendations
CREATE TABLE public.optimization_recommendations (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  entity_type TEXT NOT NULL,
  entity_id UUID NOT NULL,
  recommendation_type TEXT NOT NULL,
  title TEXT NOT NULL,
  rationale TEXT,
  suggested_action_json JSONB,
  confidence TEXT NOT NULL DEFAULT 'medium',
  impact_estimate NUMERIC(12,2) DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'open',
  auto_applicable BOOLEAN NOT NULL DEFAULT false,
  auto_applied BOOLEAN NOT NULL DEFAULT false,
  applied_at TIMESTAMPTZ,
  dismissed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX idx_optimization_rec_unique_open
  ON public.optimization_recommendations (workspace_id, entity_type, entity_id, recommendation_type)
  WHERE status = 'open';

CREATE INDEX idx_optimization_rec_workspace ON public.optimization_recommendations (workspace_id, status);
CREATE INDEX idx_optimization_rec_entity ON public.optimization_recommendations (entity_type, entity_id);

ALTER TABLE public.optimization_recommendations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Workspace members can view optimization recommendations"
  ON public.optimization_recommendations FOR SELECT
  TO authenticated
  USING (workspace_id IN (SELECT workspace_id FROM public.workspace_members WHERE user_id = auth.uid()));

CREATE POLICY "Service role can manage optimization recommendations"
  ON public.optimization_recommendations FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- 2. optimization_action_logs
CREATE TABLE public.optimization_action_logs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  recommendation_id UUID REFERENCES public.optimization_recommendations(id) ON DELETE SET NULL,
  action_type TEXT NOT NULL,
  target_entity_type TEXT NOT NULL,
  target_entity_id UUID NOT NULL,
  before_json JSONB,
  after_json JSONB,
  applied_by TEXT NOT NULL DEFAULT 'system',
  applied_mode TEXT NOT NULL DEFAULT 'manual',
  reverted_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_optimization_logs_workspace ON public.optimization_action_logs (workspace_id);
CREATE INDEX idx_optimization_logs_rec ON public.optimization_action_logs (recommendation_id);

ALTER TABLE public.optimization_action_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Workspace members can view optimization logs"
  ON public.optimization_action_logs FOR SELECT
  TO authenticated
  USING (workspace_id IN (SELECT workspace_id FROM public.workspace_members WHERE user_id = auth.uid()));

CREATE POLICY "Service role can manage optimization logs"
  ON public.optimization_action_logs FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- 3. optimization_settings
CREATE TABLE public.optimization_settings (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  workspace_id UUID NOT NULL UNIQUE REFERENCES public.workspaces(id) ON DELETE CASCADE,
  is_enabled BOOLEAN NOT NULL DEFAULT false,
  auto_optimize_enabled BOOLEAN NOT NULL DEFAULT false,
  min_samples_threshold INT NOT NULL DEFAULT 50,
  min_score_delta NUMERIC NOT NULL DEFAULT 0.1,
  min_revenue_delta NUMERIC NOT NULL DEFAULT 50,
  optimization_window_days INT NOT NULL DEFAULT 30,
  allow_auto_pause BOOLEAN NOT NULL DEFAULT false,
  allow_auto_promote BOOLEAN NOT NULL DEFAULT false,
  allow_auto_switch_variant BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.optimization_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Workspace members can view optimization settings"
  ON public.optimization_settings FOR SELECT
  TO authenticated
  USING (workspace_id IN (SELECT workspace_id FROM public.workspace_members WHERE user_id = auth.uid()));

CREATE POLICY "Workspace members can upsert optimization settings"
  ON public.optimization_settings FOR INSERT
  TO authenticated
  WITH CHECK (workspace_id IN (SELECT workspace_id FROM public.workspace_members WHERE user_id = auth.uid()));

CREATE POLICY "Workspace members can update optimization settings"
  ON public.optimization_settings FOR UPDATE
  TO authenticated
  USING (workspace_id IN (SELECT workspace_id FROM public.workspace_members WHERE user_id = auth.uid()));

CREATE POLICY "Service role can manage optimization settings"
  ON public.optimization_settings FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- Trigger for updated_at
CREATE TRIGGER update_optimization_recommendations_updated_at
  BEFORE UPDATE ON public.optimization_recommendations
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_optimization_settings_updated_at
  BEFORE UPDATE ON public.optimization_settings
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
