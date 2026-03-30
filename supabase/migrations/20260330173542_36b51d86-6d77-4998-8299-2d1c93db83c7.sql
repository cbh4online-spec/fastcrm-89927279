
-- Business Objectives
CREATE TABLE public.business_objectives (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  objective_type TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'draft',
  target_value NUMERIC(12,2),
  current_value NUMERIC(12,2) DEFAULT 0,
  unit TEXT DEFAULT '€',
  period_start DATE,
  period_end DATE,
  owner_user_id UUID,
  priority TEXT DEFAULT 'medium',
  auto_plan_enabled BOOLEAN DEFAULT false,
  auto_execute_enabled BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  completed_at TIMESTAMPTZ
);

CREATE INDEX idx_business_objectives_ws_status ON public.business_objectives(workspace_id, status);

ALTER TABLE public.business_objectives ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Workspace members can view objectives"
  ON public.business_objectives FOR SELECT TO authenticated
  USING (workspace_id IN (SELECT workspace_id FROM public.workspace_members WHERE user_id = auth.uid()));

CREATE POLICY "Workspace members can insert objectives"
  ON public.business_objectives FOR INSERT TO authenticated
  WITH CHECK (workspace_id IN (SELECT workspace_id FROM public.workspace_members WHERE user_id = auth.uid()));

CREATE POLICY "Workspace members can update objectives"
  ON public.business_objectives FOR UPDATE TO authenticated
  USING (workspace_id IN (SELECT workspace_id FROM public.workspace_members WHERE user_id = auth.uid()));

-- Objective Metrics
CREATE TABLE public.objective_metrics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  objective_id UUID NOT NULL REFERENCES public.business_objectives(id) ON DELETE CASCADE,
  metric_key TEXT NOT NULL,
  metric_label TEXT,
  current_value NUMERIC(12,2) DEFAULT 0,
  target_value NUMERIC(12,2),
  unit TEXT,
  progress_percent INT DEFAULT 0,
  last_calculated_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.objective_metrics ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Workspace members can view objective_metrics"
  ON public.objective_metrics FOR SELECT TO authenticated
  USING (workspace_id IN (SELECT workspace_id FROM public.workspace_members WHERE user_id = auth.uid()));

CREATE POLICY "Workspace members can manage objective_metrics"
  ON public.objective_metrics FOR ALL TO authenticated
  USING (workspace_id IN (SELECT workspace_id FROM public.workspace_members WHERE user_id = auth.uid()));

-- Objective Plans
CREATE TABLE public.objective_plans (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  objective_id UUID NOT NULL REFERENCES public.business_objectives(id) ON DELETE CASCADE,
  title TEXT,
  plan_json JSONB DEFAULT '{}',
  status TEXT DEFAULT 'draft',
  generated_by TEXT DEFAULT 'ai',
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.objective_plans ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Workspace members can view objective_plans"
  ON public.objective_plans FOR SELECT TO authenticated
  USING (workspace_id IN (SELECT workspace_id FROM public.workspace_members WHERE user_id = auth.uid()));

CREATE POLICY "Workspace members can manage objective_plans"
  ON public.objective_plans FOR ALL TO authenticated
  USING (workspace_id IN (SELECT workspace_id FROM public.workspace_members WHERE user_id = auth.uid()));

-- Objective Action Links
CREATE TABLE public.objective_action_links (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  objective_id UUID NOT NULL REFERENCES public.business_objectives(id) ON DELETE CASCADE,
  action_execution_id UUID,
  task_id UUID,
  next_best_action_id UUID,
  sequence_enrollment_id UUID,
  attributed_value NUMERIC(12,2) DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.objective_action_links ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Workspace members can view objective_action_links"
  ON public.objective_action_links FOR SELECT TO authenticated
  USING (workspace_id IN (SELECT workspace_id FROM public.workspace_members WHERE user_id = auth.uid()));

CREATE POLICY "Workspace members can manage objective_action_links"
  ON public.objective_action_links FOR ALL TO authenticated
  USING (workspace_id IN (SELECT workspace_id FROM public.workspace_members WHERE user_id = auth.uid()));

-- Objective Settings
CREATE TABLE public.objective_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL UNIQUE REFERENCES public.workspaces(id) ON DELETE CASCADE,
  is_enabled BOOLEAN DEFAULT false,
  max_daily_actions_per_objective INT DEFAULT 10,
  auto_plan_enabled BOOLEAN DEFAULT false,
  auto_replan_enabled BOOLEAN DEFAULT false,
  auto_execute_enabled BOOLEAN DEFAULT false,
  alert_when_at_risk BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.objective_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Workspace members can view objective_settings"
  ON public.objective_settings FOR SELECT TO authenticated
  USING (workspace_id IN (SELECT workspace_id FROM public.workspace_members WHERE user_id = auth.uid()));

CREATE POLICY "Workspace members can manage objective_settings"
  ON public.objective_settings FOR ALL TO authenticated
  USING (workspace_id IN (SELECT workspace_id FROM public.workspace_members WHERE user_id = auth.uid()));
