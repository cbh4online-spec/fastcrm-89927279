
-- Phase A: Kernel V2 tables + ALTER + seed

-- 1. kernel_event_state (consumer watermarks)
CREATE TABLE IF NOT EXISTS public.kernel_event_state (
  workspace_id uuid NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  consumer_id text NOT NULL DEFAULT 'default',
  last_event_id uuid,
  last_processed_at timestamptz,
  updated_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (workspace_id, consumer_id)
);
ALTER TABLE public.kernel_event_state ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Workspace members can read kernel_event_state"
  ON public.kernel_event_state FOR SELECT TO authenticated
  USING (workspace_id IN (SELECT id FROM workspaces WHERE owner_id = auth.uid())
    OR workspace_id IN (SELECT workspace_id FROM workspace_members WHERE user_id = auth.uid()));

-- 2. kernel_event_deadletter
CREATE TABLE IF NOT EXISTS public.kernel_event_deadletter (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  consumer_key text,
  original_event jsonb,
  error text,
  error_stack text,
  retry_count int NOT NULL DEFAULT 0,
  last_attempt_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.kernel_event_deadletter ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Workspace members can read kernel_event_deadletter"
  ON public.kernel_event_deadletter FOR SELECT TO authenticated
  USING (workspace_id IN (SELECT id FROM workspaces WHERE owner_id = auth.uid())
    OR workspace_id IN (SELECT workspace_id FROM workspace_members WHERE user_id = auth.uid()));

-- 3. kernel_outcomes (attribution)
CREATE TABLE IF NOT EXISTS public.kernel_outcomes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  decision_id uuid REFERENCES public.kernel_decisions(id) ON DELETE SET NULL,
  action_run_id uuid REFERENCES public.kernel_action_runs(id) ON DELETE SET NULL,
  outcome_type text NOT NULL,
  outcome_value jsonb DEFAULT '{}',
  occurred_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.kernel_outcomes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Workspace members can read kernel_outcomes"
  ON public.kernel_outcomes FOR SELECT TO authenticated
  USING (workspace_id IN (SELECT id FROM workspaces WHERE owner_id = auth.uid())
    OR workspace_id IN (SELECT workspace_id FROM workspace_members WHERE user_id = auth.uid()));

-- 4. kernel_policies (governance)
CREATE TABLE IF NOT EXISTS public.kernel_policies (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  decision_type text NOT NULL,
  default_mode text NOT NULL DEFAULT 'suggest' CHECK (default_mode IN ('auto', 'approve', 'suggest')),
  approver_role text,
  risk_thresholds jsonb DEFAULT '{}',
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (workspace_id, decision_type)
);
ALTER TABLE public.kernel_policies ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Workspace members can read kernel_policies"
  ON public.kernel_policies FOR SELECT TO authenticated
  USING (workspace_id IN (SELECT id FROM workspaces WHERE owner_id = auth.uid())
    OR workspace_id IN (SELECT workspace_id FROM workspace_members WHERE user_id = auth.uid()));
CREATE POLICY "Workspace members can manage kernel_policies"
  ON public.kernel_policies FOR ALL TO authenticated
  USING (workspace_id IN (SELECT id FROM workspaces WHERE owner_id = auth.uid())
    OR workspace_id IN (SELECT workspace_id FROM workspace_members WHERE user_id = auth.uid()));

-- 5. ALTER kernel_events — add V2 columns
ALTER TABLE public.kernel_events 
  ADD COLUMN IF NOT EXISTS occurred_at timestamptz,
  ADD COLUMN IF NOT EXISTS ingested_at timestamptz DEFAULT now(),
  ADD COLUMN IF NOT EXISTS schema_version int DEFAULT 1;

-- 6. ALTER kernel_action_runs — add correlation_id
ALTER TABLE public.kernel_action_runs 
  ADD COLUMN IF NOT EXISTS correlation_id text;

-- 7. ALTER kernel_decision_evidence — add ref_kind
ALTER TABLE public.kernel_decision_evidence 
  ADD COLUMN IF NOT EXISTS ref_kind text;

-- 8. Seed V2 action registry entries
INSERT INTO public.kernel_actions_registry (key, description, input_schema, executor, requires_approval, enabled) VALUES
  ('SEND_EMAIL', 'Enviar email via sistema', '{"to":"string","subject":"string","body":"string"}', 'kernel-run-actions', false, true),
  ('SEND_INBOX_REPLY', 'Enviar resposta na inbox', '{"conversation_id":"string","message":"string"}', 'kernel-run-actions', false, true),
  ('UPDATE_ASSET', 'Marcar asset como atualizado', '{"asset_kind":"string","asset_id":"string"}', 'kernel-run-actions', false, true),
  ('PAUSE_CAMPAIGN', 'Pausar campanha', '{"campaign_id":"string"}', 'kernel-run-actions', true, true),
  ('PUBLISH_ASSET', 'Publicar asset', '{"asset_kind":"string","asset_id":"string"}', 'kernel-run-actions', true, true)
ON CONFLICT (key) DO NOTHING;
