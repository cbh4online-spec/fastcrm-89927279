
-- =============================================
-- Enterprise Simulation & Forecast Layer
-- =============================================

-- 1. forecast_models
CREATE TABLE public.forecast_models (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  model_type TEXT NOT NULL DEFAULT 'baseline',
  name TEXT NOT NULL,
  description TEXT,
  config_json JSONB DEFAULT '{}',
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_forecast_models_workspace ON public.forecast_models(workspace_id, is_active);

ALTER TABLE public.forecast_models ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Members can view forecast models" ON public.forecast_models
  FOR SELECT USING (
    workspace_id IN (SELECT workspace_id FROM public.workspace_members WHERE user_id = auth.uid())
  );

CREATE POLICY "Service role manages forecast models" ON public.forecast_models
  FOR ALL USING (true) WITH CHECK (true);

-- 2. forecast_runs
CREATE TABLE public.forecast_runs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  model_id UUID REFERENCES public.forecast_models(id) ON DELETE SET NULL,
  scenario_id UUID,
  run_type TEXT DEFAULT 'baseline',
  input_snapshot_json JSONB DEFAULT '{}',
  output_snapshot_json JSONB DEFAULT '{}',
  assumptions_json JSONB DEFAULT '[]',
  confidence NUMERIC(3,2) DEFAULT 0.50,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_forecast_runs_workspace ON public.forecast_runs(workspace_id, run_type, created_at DESC);

ALTER TABLE public.forecast_runs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Members can view forecast runs" ON public.forecast_runs
  FOR SELECT USING (
    workspace_id IN (SELECT workspace_id FROM public.workspace_members WHERE user_id = auth.uid())
  );

CREATE POLICY "Service role manages forecast runs" ON public.forecast_runs
  FOR ALL USING (true) WITH CHECK (true);

-- 3. simulation_scenarios
CREATE TABLE public.simulation_scenarios (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  scenario_type TEXT NOT NULL DEFAULT 'custom',
  status TEXT DEFAULT 'draft',
  inputs_json JSONB DEFAULT '{}',
  outputs_json JSONB DEFAULT '{}',
  delta_json JSONB DEFAULT '{}',
  assumptions JSONB DEFAULT '[]',
  confidence NUMERIC(3,2) DEFAULT 0.50,
  created_by UUID,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_simulation_scenarios_workspace ON public.simulation_scenarios(workspace_id, scenario_type, status);

ALTER TABLE public.simulation_scenarios ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Members can view scenarios" ON public.simulation_scenarios
  FOR SELECT USING (
    workspace_id IN (SELECT workspace_id FROM public.workspace_members WHERE user_id = auth.uid())
  );

CREATE POLICY "Service role manages scenarios" ON public.simulation_scenarios
  FOR ALL USING (true) WITH CHECK (true);

-- 4. forecast_settings
CREATE TABLE public.forecast_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL UNIQUE REFERENCES public.workspaces(id) ON DELETE CASCADE,
  is_enabled BOOLEAN DEFAULT false,
  default_horizon_days INT DEFAULT 30,
  default_model_type TEXT DEFAULT 'baseline',
  confidence_threshold NUMERIC(3,2) DEFAULT 0.30,
  allow_memory_boost BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.forecast_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Members can view forecast settings" ON public.forecast_settings
  FOR SELECT USING (
    workspace_id IN (SELECT workspace_id FROM public.workspace_members WHERE user_id = auth.uid())
  );

CREATE POLICY "Service role manages forecast settings" ON public.forecast_settings
  FOR ALL USING (true) WITH CHECK (true);
