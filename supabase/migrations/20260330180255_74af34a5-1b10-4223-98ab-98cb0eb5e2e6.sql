
-- 1. workspace_operating_state
CREATE TABLE public.workspace_operating_state (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  health_score INT NOT NULL DEFAULT 50,
  revenue_health INT NOT NULL DEFAULT 50,
  pipeline_health INT NOT NULL DEFAULT 50,
  execution_health INT NOT NULL DEFAULT 50,
  response_health INT NOT NULL DEFAULT 50,
  context_health INT NOT NULL DEFAULT 50,
  automation_health INT NOT NULL DEFAULT 50,
  risk_level TEXT NOT NULL DEFAULT 'medium',
  primary_focus TEXT,
  active_missions_count INT NOT NULL DEFAULT 0,
  blockers_count INT NOT NULL DEFAULT 0,
  last_recalculated_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT workspace_operating_state_workspace_unique UNIQUE (workspace_id)
);

ALTER TABLE public.workspace_operating_state ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Members can view workspace state"
  ON public.workspace_operating_state FOR SELECT TO authenticated
  USING (workspace_id IN (SELECT wm.workspace_id FROM public.workspace_members wm WHERE wm.user_id = auth.uid()));

-- 2. workspace_missions
CREATE TABLE public.workspace_missions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  mission_type TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending',
  priority TEXT NOT NULL DEFAULT 'medium',
  impact_estimate NUMERIC(12,2),
  urgency TEXT NOT NULL DEFAULT 'normal',
  owner_type TEXT,
  owner_id UUID,
  source_type TEXT,
  source_id TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ
);

ALTER TABLE public.workspace_missions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Members can view missions"
  ON public.workspace_missions FOR SELECT TO authenticated
  USING (workspace_id IN (SELECT wm.workspace_id FROM public.workspace_members wm WHERE wm.user_id = auth.uid()));

-- 3. mission_links
CREATE TABLE public.mission_links (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  mission_id UUID NOT NULL REFERENCES public.workspace_missions(id) ON DELETE CASCADE,
  linked_type TEXT NOT NULL,
  linked_id UUID NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.mission_links ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Members can view mission links"
  ON public.mission_links FOR SELECT TO authenticated
  USING (workspace_id IN (SELECT wm.workspace_id FROM public.workspace_members wm WHERE wm.user_id = auth.uid()));

-- 4. workspace_alerts
CREATE TABLE public.workspace_alerts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  alert_type TEXT NOT NULL,
  severity TEXT NOT NULL DEFAULT 'medium',
  title TEXT,
  description TEXT,
  status TEXT NOT NULL DEFAULT 'open',
  related_type TEXT,
  related_id UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  resolved_at TIMESTAMPTZ
);

ALTER TABLE public.workspace_alerts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Members can view alerts"
  ON public.workspace_alerts FOR SELECT TO authenticated
  USING (workspace_id IN (SELECT wm.workspace_id FROM public.workspace_members wm WHERE wm.user_id = auth.uid()));

-- 5. workspace_engine_settings
CREATE TABLE public.workspace_engine_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  is_enabled BOOLEAN NOT NULL DEFAULT false,
  auto_mission_generation BOOLEAN NOT NULL DEFAULT false,
  auto_escalation_enabled BOOLEAN NOT NULL DEFAULT true,
  auto_brief_enabled BOOLEAN NOT NULL DEFAULT true,
  refresh_interval_minutes INT NOT NULL DEFAULT 60,
  risk_alert_threshold TEXT NOT NULL DEFAULT 'high',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT workspace_engine_settings_workspace_unique UNIQUE (workspace_id)
);

ALTER TABLE public.workspace_engine_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Members can view engine settings"
  ON public.workspace_engine_settings FOR SELECT TO authenticated
  USING (workspace_id IN (SELECT wm.workspace_id FROM public.workspace_members wm WHERE wm.user_id = auth.uid()));

CREATE POLICY "Members can upsert engine settings"
  ON public.workspace_engine_settings FOR ALL TO authenticated
  USING (workspace_id IN (SELECT wm.workspace_id FROM public.workspace_members wm WHERE wm.user_id = auth.uid()))
  WITH CHECK (workspace_id IN (SELECT wm.workspace_id FROM public.workspace_members wm WHERE wm.user_id = auth.uid()));

-- Enable realtime for missions and alerts
ALTER PUBLICATION supabase_realtime ADD TABLE public.workspace_missions;
ALTER PUBLICATION supabase_realtime ADD TABLE public.workspace_alerts;
ALTER PUBLICATION supabase_realtime ADD TABLE public.workspace_operating_state;
