
-- ============================================================
-- NEXT BEST ACTION ENGINE — Tables, Indexes, RLS
-- ============================================================

-- 1. next_best_actions
CREATE TABLE public.next_best_actions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  entity_type TEXT NOT NULL,
  entity_id UUID NOT NULL,
  action_type TEXT NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  rationale TEXT,
  priority_score INT NOT NULL DEFAULT 0 CHECK (priority_score >= 0 AND priority_score <= 100),
  confidence TEXT NOT NULL DEFAULT 'medium',
  impact_estimate NUMERIC(12,2) DEFAULT 0,
  urgency TEXT NOT NULL DEFAULT 'medium',
  due_at TIMESTAMPTZ,
  status TEXT NOT NULL DEFAULT 'open',
  source_signals_json JSONB DEFAULT '{}'::jsonb,
  suggested_payload_json JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  acted_at TIMESTAMPTZ,
  dismissed_at TIMESTAMPTZ
);

-- Partial unique to prevent duplicate open recommendations
CREATE UNIQUE INDEX uq_nba_open_per_entity
  ON public.next_best_actions (workspace_id, entity_type, entity_id, action_type)
  WHERE status = 'open';

CREATE INDEX idx_nba_workspace_status ON public.next_best_actions (workspace_id, status);
CREATE INDEX idx_nba_entity ON public.next_best_actions (entity_type, entity_id);
CREATE INDEX idx_nba_priority ON public.next_best_actions (priority_score DESC);

ALTER TABLE public.next_best_actions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Workspace members can read NBAs"
  ON public.next_best_actions FOR SELECT TO authenticated
  USING (workspace_id IN (SELECT wm.workspace_id FROM public.workspace_members wm WHERE wm.user_id = auth.uid()));

CREATE POLICY "Workspace members can update NBAs"
  ON public.next_best_actions FOR UPDATE TO authenticated
  USING (workspace_id IN (SELECT wm.workspace_id FROM public.workspace_members wm WHERE wm.user_id = auth.uid()));

CREATE POLICY "Service role can manage NBAs"
  ON public.next_best_actions FOR ALL TO service_role
  USING (true) WITH CHECK (true);

-- 2. next_best_action_settings
CREATE TABLE public.next_best_action_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL UNIQUE REFERENCES public.workspaces(id) ON DELETE CASCADE,
  is_enabled BOOLEAN NOT NULL DEFAULT false,
  refresh_interval_minutes INT NOT NULL DEFAULT 60,
  stale_context_threshold INT NOT NULL DEFAULT 14,
  min_priority_to_show INT NOT NULL DEFAULT 20,
  enable_auto_generation BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.next_best_action_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Workspace members can read NBA settings"
  ON public.next_best_action_settings FOR SELECT TO authenticated
  USING (workspace_id IN (SELECT wm.workspace_id FROM public.workspace_members wm WHERE wm.user_id = auth.uid()));

CREATE POLICY "Workspace members can manage NBA settings"
  ON public.next_best_action_settings FOR ALL TO authenticated
  USING (workspace_id IN (SELECT wm.workspace_id FROM public.workspace_members wm WHERE wm.user_id = auth.uid()))
  WITH CHECK (workspace_id IN (SELECT wm.workspace_id FROM public.workspace_members wm WHERE wm.user_id = auth.uid()));

CREATE POLICY "Service role can manage NBA settings"
  ON public.next_best_action_settings FOR ALL TO service_role
  USING (true) WITH CHECK (true);

-- 3. next_best_action_logs
CREATE TABLE public.next_best_action_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  action_id UUID NOT NULL REFERENCES public.next_best_actions(id) ON DELETE CASCADE,
  event_type TEXT NOT NULL,
  before_json JSONB DEFAULT '{}'::jsonb,
  after_json JSONB DEFAULT '{}'::jsonb,
  actor_type TEXT NOT NULL DEFAULT 'user',
  actor_id TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_nba_logs_action ON public.next_best_action_logs (action_id);
CREATE INDEX idx_nba_logs_workspace ON public.next_best_action_logs (workspace_id, created_at DESC);

ALTER TABLE public.next_best_action_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Workspace members can read NBA logs"
  ON public.next_best_action_logs FOR SELECT TO authenticated
  USING (workspace_id IN (SELECT wm.workspace_id FROM public.workspace_members wm WHERE wm.user_id = auth.uid()));

CREATE POLICY "Service role can manage NBA logs"
  ON public.next_best_action_logs FOR ALL TO service_role
  USING (true) WITH CHECK (true);
