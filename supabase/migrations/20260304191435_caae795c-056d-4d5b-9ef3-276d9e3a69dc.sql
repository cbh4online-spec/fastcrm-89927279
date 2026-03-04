
-- Phase 4: Command Center Vivo tables

-- 1. ALTER context_blocks: add new columns
ALTER TABLE public.context_blocks 
  ADD COLUMN IF NOT EXISTS last_verified_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS last_changed_at TIMESTAMPTZ DEFAULT now(),
  ADD COLUMN IF NOT EXISTS owner_user_id UUID,
  ADD COLUMN IF NOT EXISTS slug TEXT,
  ADD COLUMN IF NOT EXISTS content_json JSONB NOT NULL DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS metadata_json JSONB NOT NULL DEFAULT '{}'::jsonb;

-- 2. context_dependencies
CREATE TABLE public.context_dependencies (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  source_block_id UUID NOT NULL REFERENCES public.context_blocks(id) ON DELETE CASCADE,
  target_block_id UUID NOT NULL REFERENCES public.context_blocks(id) ON DELETE CASCADE,
  relation TEXT NOT NULL,
  strength INT NOT NULL DEFAULT 50,
  rule_json JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.context_dependencies ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Members can view workspace dependencies"
  ON public.context_dependencies FOR SELECT
  TO authenticated
  USING (workspace_id IN (SELECT w.id FROM public.workspaces w INNER JOIN public.workspace_members wm ON w.id = wm.workspace_id WHERE wm.user_id = auth.uid()));

CREATE POLICY "Members can insert workspace dependencies"
  ON public.context_dependencies FOR INSERT
  TO authenticated
  WITH CHECK (workspace_id IN (SELECT w.id FROM public.workspaces w INNER JOIN public.workspace_members wm ON w.id = wm.workspace_id WHERE wm.user_id = auth.uid()));

CREATE POLICY "Members can update workspace dependencies"
  ON public.context_dependencies FOR UPDATE
  TO authenticated
  USING (workspace_id IN (SELECT w.id FROM public.workspaces w INNER JOIN public.workspace_members wm ON w.id = wm.workspace_id WHERE wm.user_id = auth.uid()));

CREATE POLICY "Members can delete workspace dependencies"
  ON public.context_dependencies FOR DELETE
  TO authenticated
  USING (workspace_id IN (SELECT w.id FROM public.workspaces w INNER JOIN public.workspace_members wm ON w.id = wm.workspace_id WHERE wm.user_id = auth.uid()));

CREATE INDEX idx_context_dependencies_workspace_source ON public.context_dependencies(workspace_id, source_block_id);
CREATE INDEX idx_context_dependencies_workspace_target ON public.context_dependencies(workspace_id, target_block_id);

-- 3. context_drift
CREATE TABLE public.context_drift (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  block_id UUID NOT NULL REFERENCES public.context_blocks(id) ON DELETE CASCADE UNIQUE,
  drift_score INT NOT NULL DEFAULT 0,
  severity TEXT NOT NULL DEFAULT 'ok' CHECK (severity IN ('ok','warn','risk','critical')),
  stale_days INT NOT NULL DEFAULT 0,
  dependency_impact INT NOT NULL DEFAULT 0,
  confidence INT NOT NULL DEFAULT 70,
  reasons_json JSONB NOT NULL DEFAULT '[]'::jsonb,
  last_computed_at TIMESTAMPTZ DEFAULT now(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.context_drift ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Members can view workspace drift"
  ON public.context_drift FOR SELECT
  TO authenticated
  USING (workspace_id IN (SELECT w.id FROM public.workspaces w INNER JOIN public.workspace_members wm ON w.id = wm.workspace_id WHERE wm.user_id = auth.uid()));

CREATE POLICY "Members can manage workspace drift"
  ON public.context_drift FOR ALL
  TO authenticated
  USING (workspace_id IN (SELECT w.id FROM public.workspaces w INNER JOIN public.workspace_members wm ON w.id = wm.workspace_id WHERE wm.user_id = auth.uid()));

CREATE INDEX idx_context_drift_workspace_score ON public.context_drift(workspace_id, drift_score DESC);

-- 4. context_alerts
CREATE TABLE public.context_alerts (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  type TEXT NOT NULL,
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  severity TEXT NOT NULL DEFAULT 'info' CHECK (severity IN ('info','warn','risk','critical')),
  status TEXT NOT NULL DEFAULT 'unread' CHECK (status IN ('unread','read','resolved')),
  related_block_id UUID REFERENCES public.context_blocks(id) ON DELETE SET NULL,
  action_suggestion_json JSONB NOT NULL DEFAULT '{}'::jsonb,
  source_event_id UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.context_alerts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Members can view workspace alerts"
  ON public.context_alerts FOR SELECT
  TO authenticated
  USING (workspace_id IN (SELECT w.id FROM public.workspaces w INNER JOIN public.workspace_members wm ON w.id = wm.workspace_id WHERE wm.user_id = auth.uid()));

CREATE POLICY "Members can manage workspace alerts"
  ON public.context_alerts FOR ALL
  TO authenticated
  USING (workspace_id IN (SELECT w.id FROM public.workspaces w INNER JOIN public.workspace_members wm ON w.id = wm.workspace_id WHERE wm.user_id = auth.uid()));

CREATE INDEX idx_context_alerts_workspace_status ON public.context_alerts(workspace_id, status, severity);

-- 5. context_event_log
CREATE TABLE public.context_event_log (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  type TEXT NOT NULL,
  actor_user_id UUID,
  entity_type TEXT,
  entity_id UUID,
  payload_json JSONB NOT NULL DEFAULT '{}'::jsonb,
  correlation_id UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.context_event_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Members can view workspace event log"
  ON public.context_event_log FOR SELECT
  TO authenticated
  USING (workspace_id IN (SELECT w.id FROM public.workspaces w INNER JOIN public.workspace_members wm ON w.id = wm.workspace_id WHERE wm.user_id = auth.uid()));

CREATE POLICY "Members can insert workspace events"
  ON public.context_event_log FOR INSERT
  TO authenticated
  WITH CHECK (workspace_id IN (SELECT w.id FROM public.workspaces w INNER JOIN public.workspace_members wm ON w.id = wm.workspace_id WHERE wm.user_id = auth.uid()));

CREATE INDEX idx_context_event_log_workspace_type ON public.context_event_log(workspace_id, type, created_at DESC);

-- 6. Update tasks table to support context_block related_type
ALTER TABLE public.tasks DROP CONSTRAINT IF EXISTS tasks_related_type_check;
ALTER TABLE public.tasks ADD CONSTRAINT tasks_related_type_check CHECK (related_type IN ('lead', 'opportunity', 'context_block'));
