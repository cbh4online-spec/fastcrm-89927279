
-- ============================================
-- ACTION EXECUTIONS
-- ============================================
CREATE TABLE public.action_executions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  source_type TEXT NOT NULL DEFAULT 'manual',
  source_id TEXT,
  action_type TEXT NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  payload_json JSONB NOT NULL DEFAULT '{}',
  result_json JSONB,
  entity_type TEXT,
  entity_id UUID,
  created_by UUID,
  execution_mode TEXT NOT NULL DEFAULT 'manual',
  status TEXT NOT NULL DEFAULT 'pending',
  executed_at TIMESTAMPTZ,
  failed_at TIMESTAMPTZ,
  cancelled_at TIMESTAMPTZ,
  error_message TEXT,
  correlation_id TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_action_executions_ws_status ON public.action_executions(workspace_id, status);
CREATE INDEX idx_action_executions_correlation ON public.action_executions(correlation_id) WHERE correlation_id IS NOT NULL;
CREATE INDEX idx_action_executions_entity ON public.action_executions(entity_type, entity_id);

ALTER TABLE public.action_executions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Members can view workspace action executions"
  ON public.action_executions FOR SELECT TO authenticated
  USING (workspace_id IN (SELECT wm.workspace_id FROM public.workspace_members wm WHERE wm.user_id = auth.uid()));

CREATE POLICY "Members can insert action executions"
  ON public.action_executions FOR INSERT TO authenticated
  WITH CHECK (workspace_id IN (SELECT wm.workspace_id FROM public.workspace_members wm WHERE wm.user_id = auth.uid()));

CREATE POLICY "Members can update action executions"
  ON public.action_executions FOR UPDATE TO authenticated
  USING (workspace_id IN (SELECT wm.workspace_id FROM public.workspace_members wm WHERE wm.user_id = auth.uid()));

-- ============================================
-- ACTION EXECUTION SETTINGS
-- ============================================
CREATE TABLE public.action_execution_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL UNIQUE REFERENCES public.workspaces(id) ON DELETE CASCADE,
  auto_execution_enabled BOOLEAN NOT NULL DEFAULT false,
  allow_auto_task_creation BOOLEAN NOT NULL DEFAULT false,
  allow_auto_sequence_enrollment BOOLEAN NOT NULL DEFAULT false,
  allow_auto_recovery_trigger BOOLEAN NOT NULL DEFAULT false,
  require_human_approval_for_email BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.action_execution_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Members can view workspace action execution settings"
  ON public.action_execution_settings FOR SELECT TO authenticated
  USING (workspace_id IN (SELECT wm.workspace_id FROM public.workspace_members wm WHERE wm.user_id = auth.uid()));

CREATE POLICY "Members can upsert action execution settings"
  ON public.action_execution_settings FOR INSERT TO authenticated
  WITH CHECK (workspace_id IN (SELECT wm.workspace_id FROM public.workspace_members wm WHERE wm.user_id = auth.uid()));

CREATE POLICY "Members can update action execution settings"
  ON public.action_execution_settings FOR UPDATE TO authenticated
  USING (workspace_id IN (SELECT wm.workspace_id FROM public.workspace_members wm WHERE wm.user_id = auth.uid()));

-- ============================================
-- ACTION APPROVALS
-- ============================================
CREATE TABLE public.action_approvals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  action_execution_id UUID NOT NULL REFERENCES public.action_executions(id) ON DELETE CASCADE,
  approval_status TEXT NOT NULL DEFAULT 'pending',
  requested_by UUID,
  approved_by UUID,
  approved_at TIMESTAMPTZ,
  rejected_at TIMESTAMPTZ,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_action_approvals_ws_status ON public.action_approvals(workspace_id, approval_status);

ALTER TABLE public.action_approvals ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Members can view workspace action approvals"
  ON public.action_approvals FOR SELECT TO authenticated
  USING (workspace_id IN (SELECT wm.workspace_id FROM public.workspace_members wm WHERE wm.user_id = auth.uid()));

CREATE POLICY "Members can insert action approvals"
  ON public.action_approvals FOR INSERT TO authenticated
  WITH CHECK (workspace_id IN (SELECT wm.workspace_id FROM public.workspace_members wm WHERE wm.user_id = auth.uid()));

CREATE POLICY "Members can update action approvals"
  ON public.action_approvals FOR UPDATE TO authenticated
  USING (workspace_id IN (SELECT wm.workspace_id FROM public.workspace_members wm WHERE wm.user_id = auth.uid()));
