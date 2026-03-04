
-- 1. Jobs table
CREATE TABLE public.jobs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  type TEXT NOT NULL,
  payload_json JSONB DEFAULT '{}',
  status TEXT NOT NULL DEFAULT 'pending',
  attempts INT NOT NULL DEFAULT 0,
  max_attempts INT NOT NULL DEFAULT 3,
  run_after TIMESTAMPTZ NOT NULL DEFAULT now(),
  last_error TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.jobs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view jobs in their workspace" ON public.jobs
  FOR SELECT TO authenticated
  USING (workspace_id IN (SELECT workspace_id FROM public.workspace_members WHERE user_id = auth.uid()));

CREATE POLICY "Users can insert jobs in their workspace" ON public.jobs
  FOR INSERT TO authenticated
  WITH CHECK (workspace_id IN (SELECT workspace_id FROM public.workspace_members WHERE user_id = auth.uid()));

CREATE POLICY "Users can update jobs in their workspace" ON public.jobs
  FOR UPDATE TO authenticated
  USING (workspace_id IN (SELECT workspace_id FROM public.workspace_members WHERE user_id = auth.uid()));

CREATE INDEX idx_jobs_pending ON public.jobs (status, run_after) WHERE status IN ('pending', 'retry');

-- 2. Alert policy table
CREATE TABLE public.alert_policy (
  workspace_id UUID PRIMARY KEY REFERENCES public.workspaces(id) ON DELETE CASCADE,
  max_warn_per_day INT NOT NULL DEFAULT 5,
  max_risk_per_day INT NOT NULL DEFAULT 3,
  cooldown_hours INT NOT NULL DEFAULT 24,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.alert_policy ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view alert policy" ON public.alert_policy
  FOR SELECT TO authenticated
  USING (workspace_id IN (SELECT workspace_id FROM public.workspace_members WHERE user_id = auth.uid()));

CREATE POLICY "Users can upsert alert policy" ON public.alert_policy
  FOR ALL TO authenticated
  USING (workspace_id IN (SELECT workspace_id FROM public.workspace_members WHERE user_id = auth.uid()))
  WITH CHECK (workspace_id IN (SELECT workspace_id FROM public.workspace_members WHERE user_id = auth.uid()));

-- 3. System metrics daily
CREATE TABLE public.system_metrics_daily (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  metric_date DATE NOT NULL,
  commands_executed INT NOT NULL DEFAULT 0,
  alerts_generated INT NOT NULL DEFAULT 0,
  alerts_resolved INT NOT NULL DEFAULT 0,
  tasks_created_system INT NOT NULL DEFAULT 0,
  tasks_completed INT NOT NULL DEFAULT 0,
  drift_blocks_warn INT NOT NULL DEFAULT 0,
  drift_blocks_risk INT NOT NULL DEFAULT 0,
  drift_blocks_critical INT NOT NULL DEFAULT 0,
  health_score INT NOT NULL DEFAULT 100,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (workspace_id, metric_date)
);

ALTER TABLE public.system_metrics_daily ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view metrics" ON public.system_metrics_daily
  FOR SELECT TO authenticated
  USING (workspace_id IN (SELECT workspace_id FROM public.workspace_members WHERE user_id = auth.uid()));

-- 4. ALTER context_block_versions
ALTER TABLE public.context_block_versions
  ADD COLUMN IF NOT EXISTS change_type TEXT NOT NULL DEFAULT 'minor',
  ADD COLUMN IF NOT EXISTS changed_fields TEXT[];

-- 5. ALTER context_dependencies
ALTER TABLE public.context_dependencies
  ADD COLUMN IF NOT EXISTS auto_detected BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS created_by UUID;

ALTER TABLE public.context_dependencies
  ADD CONSTRAINT chk_no_self_dependency CHECK (source_block_id != target_block_id);

-- 6. ALTER context_alerts
ALTER TABLE public.context_alerts
  ADD COLUMN IF NOT EXISTS snooze_until TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS last_shown_at TIMESTAMPTZ;
