
-- ============================================================
-- CONTROL TOWER STATE
-- ============================================================
CREATE TABLE public.control_tower_state (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  overall_status TEXT NOT NULL DEFAULT 'stable',
  focus_priority TEXT,
  revenue_risk INT NOT NULL DEFAULT 0,
  execution_risk INT NOT NULL DEFAULT 0,
  context_risk INT NOT NULL DEFAULT 0,
  forecast_risk INT NOT NULL DEFAULT 0,
  open_critical_items INT NOT NULL DEFAULT 0,
  open_interventions INT NOT NULL DEFAULT 0,
  active_missions INT NOT NULL DEFAULT 0,
  active_agents INT NOT NULL DEFAULT 0,
  overdue_tasks INT NOT NULL DEFAULT 0,
  interventions_json JSONB NOT NULL DEFAULT '[]'::jsonb,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT uq_control_tower_state_workspace UNIQUE (workspace_id)
);

ALTER TABLE public.control_tower_state ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Workspace members can view control tower state"
  ON public.control_tower_state FOR SELECT TO authenticated
  USING (workspace_id IN (SELECT wm.workspace_id FROM public.workspace_members wm WHERE wm.user_id = auth.uid()));

CREATE POLICY "Service role manages control tower state"
  ON public.control_tower_state FOR ALL TO service_role
  USING (true) WITH CHECK (true);

-- ============================================================
-- CONTROL TOWER SETTINGS
-- ============================================================
CREATE TABLE public.control_tower_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  is_enabled BOOLEAN NOT NULL DEFAULT false,
  default_mode TEXT NOT NULL DEFAULT 'executive',
  auto_refresh_seconds INT NOT NULL DEFAULT 60,
  show_executive_first BOOLEAN NOT NULL DEFAULT true,
  enable_intervention_queue BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT uq_control_tower_settings_workspace UNIQUE (workspace_id)
);

ALTER TABLE public.control_tower_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Workspace members can view control tower settings"
  ON public.control_tower_settings FOR SELECT TO authenticated
  USING (workspace_id IN (SELECT wm.workspace_id FROM public.workspace_members wm WHERE wm.user_id = auth.uid()));

CREATE POLICY "Workspace members can upsert control tower settings"
  ON public.control_tower_settings FOR INSERT TO authenticated
  WITH CHECK (workspace_id IN (SELECT wm.workspace_id FROM public.workspace_members wm WHERE wm.user_id = auth.uid()));

CREATE POLICY "Workspace members can update control tower settings"
  ON public.control_tower_settings FOR UPDATE TO authenticated
  USING (workspace_id IN (SELECT wm.workspace_id FROM public.workspace_members wm WHERE wm.user_id = auth.uid()))
  WITH CHECK (workspace_id IN (SELECT wm.workspace_id FROM public.workspace_members wm WHERE wm.user_id = auth.uid()));

CREATE POLICY "Service role manages control tower settings"
  ON public.control_tower_settings FOR ALL TO service_role
  USING (true) WITH CHECK (true);
