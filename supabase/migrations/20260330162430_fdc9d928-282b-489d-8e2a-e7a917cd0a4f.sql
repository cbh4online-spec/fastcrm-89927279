
-- 1. Create agent_teams table
CREATE TABLE public.agent_teams (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  objective_type TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.agent_teams ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Workspace members can view agent_teams"
  ON public.agent_teams FOR SELECT TO authenticated
  USING (workspace_id IN (SELECT wm.workspace_id FROM public.workspace_members wm WHERE wm.user_id = auth.uid()));

CREATE POLICY "Workspace members can insert agent_teams"
  ON public.agent_teams FOR INSERT TO authenticated
  WITH CHECK (workspace_id IN (SELECT wm.workspace_id FROM public.workspace_members wm WHERE wm.user_id = auth.uid()));

CREATE POLICY "Workspace members can update agent_teams"
  ON public.agent_teams FOR UPDATE TO authenticated
  USING (workspace_id IN (SELECT wm.workspace_id FROM public.workspace_members wm WHERE wm.user_id = auth.uid()));

CREATE POLICY "Workspace members can delete agent_teams"
  ON public.agent_teams FOR DELETE TO authenticated
  USING (workspace_id IN (SELECT wm.workspace_id FROM public.workspace_members wm WHERE wm.user_id = auth.uid()));

-- 2. Add new columns to bots
ALTER TABLE public.bots
  ADD COLUMN IF NOT EXISTS role TEXT,
  ADD COLUMN IF NOT EXISTS team_id UUID REFERENCES public.agent_teams(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS specialization TEXT,
  ADD COLUMN IF NOT EXISTS objective_scope TEXT,
  ADD COLUMN IF NOT EXISTS execution_permissions JSONB DEFAULT '{}';

CREATE INDEX IF NOT EXISTS idx_bots_team_id ON public.bots(team_id);

-- 3. Create agent_work_items table
CREATE TABLE public.agent_work_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  bot_id UUID REFERENCES public.bots(id) ON DELETE SET NULL,
  entity_type TEXT NOT NULL,
  entity_id UUID,
  work_type TEXT NOT NULL,
  payload_json JSONB DEFAULT '{}',
  priority INTEGER NOT NULL DEFAULT 5,
  status TEXT NOT NULL DEFAULT 'pending',
  routed_by TEXT,
  assigned_at TIMESTAMPTZ,
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  failed_at TIMESTAMPTZ,
  error_message TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.agent_work_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Workspace members can view agent_work_items"
  ON public.agent_work_items FOR SELECT TO authenticated
  USING (workspace_id IN (SELECT wm.workspace_id FROM public.workspace_members wm WHERE wm.user_id = auth.uid()));

CREATE POLICY "Workspace members can insert agent_work_items"
  ON public.agent_work_items FOR INSERT TO authenticated
  WITH CHECK (workspace_id IN (SELECT wm.workspace_id FROM public.workspace_members wm WHERE wm.user_id = auth.uid()));

CREATE POLICY "Workspace members can update agent_work_items"
  ON public.agent_work_items FOR UPDATE TO authenticated
  USING (workspace_id IN (SELECT wm.workspace_id FROM public.workspace_members wm WHERE wm.user_id = auth.uid()));

CREATE INDEX IF NOT EXISTS idx_agent_work_items_ws_status ON public.agent_work_items(workspace_id, status);
CREATE INDEX IF NOT EXISTS idx_agent_work_items_bot ON public.agent_work_items(bot_id);

-- 4. Create agent_handoffs table
CREATE TABLE public.agent_handoffs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  from_bot_id UUID REFERENCES public.bots(id) ON DELETE SET NULL,
  to_bot_id UUID REFERENCES public.bots(id) ON DELETE SET NULL,
  to_user_id UUID,
  entity_type TEXT NOT NULL,
  entity_id UUID,
  trigger_type TEXT,
  trigger_reason TEXT,
  context_snapshot JSONB DEFAULT '{}',
  status TEXT NOT NULL DEFAULT 'pending',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  completed_at TIMESTAMPTZ
);

ALTER TABLE public.agent_handoffs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Workspace members can view agent_handoffs"
  ON public.agent_handoffs FOR SELECT TO authenticated
  USING (workspace_id IN (SELECT wm.workspace_id FROM public.workspace_members wm WHERE wm.user_id = auth.uid()));

CREATE POLICY "Workspace members can insert agent_handoffs"
  ON public.agent_handoffs FOR INSERT TO authenticated
  WITH CHECK (workspace_id IN (SELECT wm.workspace_id FROM public.workspace_members wm WHERE wm.user_id = auth.uid()));

CREATE POLICY "Workspace members can update agent_handoffs"
  ON public.agent_handoffs FOR UPDATE TO authenticated
  USING (workspace_id IN (SELECT wm.workspace_id FROM public.workspace_members wm WHERE wm.user_id = auth.uid()));

CREATE INDEX IF NOT EXISTS idx_agent_handoffs_ws ON public.agent_handoffs(workspace_id);

-- 5. Create objective_agent_links table
CREATE TABLE public.objective_agent_links (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  objective_id UUID NOT NULL,
  team_id UUID REFERENCES public.agent_teams(id) ON DELETE SET NULL,
  bot_id UUID REFERENCES public.bots(id) ON DELETE SET NULL,
  role_in_objective TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.objective_agent_links ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Workspace members can view objective_agent_links"
  ON public.objective_agent_links FOR SELECT TO authenticated
  USING (workspace_id IN (SELECT wm.workspace_id FROM public.workspace_members wm WHERE wm.user_id = auth.uid()));

CREATE POLICY "Workspace members can manage objective_agent_links"
  ON public.objective_agent_links FOR ALL TO authenticated
  USING (workspace_id IN (SELECT wm.workspace_id FROM public.workspace_members wm WHERE wm.user_id = auth.uid()));

-- 6. Create agent_ops_settings table
CREATE TABLE public.agent_ops_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL UNIQUE REFERENCES public.workspaces(id) ON DELETE CASCADE,
  is_enabled BOOLEAN NOT NULL DEFAULT false,
  auto_routing_enabled BOOLEAN NOT NULL DEFAULT false,
  auto_handoff_enabled BOOLEAN NOT NULL DEFAULT false,
  human_fallback_enabled BOOLEAN NOT NULL DEFAULT true,
  supervisor_enabled BOOLEAN NOT NULL DEFAULT false,
  max_open_items_per_agent INTEGER NOT NULL DEFAULT 10,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.agent_ops_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Workspace members can view agent_ops_settings"
  ON public.agent_ops_settings FOR SELECT TO authenticated
  USING (workspace_id IN (SELECT wm.workspace_id FROM public.workspace_members wm WHERE wm.user_id = auth.uid()));

CREATE POLICY "Workspace members can upsert agent_ops_settings"
  ON public.agent_ops_settings FOR INSERT TO authenticated
  WITH CHECK (workspace_id IN (SELECT wm.workspace_id FROM public.workspace_members wm WHERE wm.user_id = auth.uid()));

CREATE POLICY "Workspace members can update agent_ops_settings"
  ON public.agent_ops_settings FOR UPDATE TO authenticated
  USING (workspace_id IN (SELECT wm.workspace_id FROM public.workspace_members wm WHERE wm.user_id = auth.uid()));
