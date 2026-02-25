
-- pipeline_stage_benchmarks: per-pipeline, per-stage velocity tuning
CREATE TABLE IF NOT EXISTS public.pipeline_stage_benchmarks (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  pipeline_id uuid NOT NULL,
  stage_id uuid NOT NULL REFERENCES public.pipeline_stages(id) ON DELETE CASCADE,
  workspace_id uuid NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  expected_days integer NOT NULL DEFAULT 14,
  warning_multiplier numeric NOT NULL DEFAULT 1.0,
  risk_multiplier numeric NOT NULL DEFAULT 1.5,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(pipeline_id, stage_id)
);

CREATE INDEX idx_pipeline_stage_benchmarks_workspace ON public.pipeline_stage_benchmarks(workspace_id);

ALTER TABLE public.pipeline_stage_benchmarks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view benchmarks in their workspace"
  ON public.pipeline_stage_benchmarks FOR SELECT
  USING (workspace_id IN (SELECT wm.workspace_id FROM public.workspace_members wm WHERE wm.user_id = auth.uid()));

CREATE POLICY "Users can manage benchmarks in their workspace"
  ON public.pipeline_stage_benchmarks FOR ALL
  USING (workspace_id IN (SELECT wm.workspace_id FROM public.workspace_members wm WHERE wm.user_id = auth.uid()));

-- health_score_history: track score over time
CREATE TABLE IF NOT EXISTS public.health_score_history (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  workspace_id uuid NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  deal_id uuid NOT NULL,
  health_score integer NOT NULL,
  health_label text NOT NULL,
  previous_label text,
  top_reason text,
  recorded_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_health_score_history_deal ON public.health_score_history(workspace_id, deal_id, recorded_at DESC);

ALTER TABLE public.health_score_history ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Service role only for health history"
  ON public.health_score_history FOR SELECT
  USING (workspace_id IN (SELECT wm.workspace_id FROM public.workspace_members wm WHERE wm.user_id = auth.uid()));

-- health_engine_config: workspace-level config for scoring
CREATE TABLE IF NOT EXISTS public.health_engine_config (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  workspace_id uuid NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE UNIQUE,
  label_thresholds jsonb NOT NULL DEFAULT '{"healthy": 80, "watch": 50}',
  value_sensitivity_threshold numeric NOT NULL DEFAULT 50000,
  value_sensitivity_multiplier numeric NOT NULL DEFAULT 1.2,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.health_engine_config ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view health config in their workspace"
  ON public.health_engine_config FOR SELECT
  USING (workspace_id IN (SELECT wm.workspace_id FROM public.workspace_members wm WHERE wm.user_id = auth.uid()));

CREATE POLICY "Users can manage health config in their workspace"
  ON public.health_engine_config FOR ALL
  USING (workspace_id IN (SELECT wm.workspace_id FROM public.workspace_members wm WHERE wm.user_id = auth.uid()));
