
-- Fase 2B — Decision Engine

-- 1) Extend rules
ALTER TABLE public.kernel_decision_rules
  ADD COLUMN IF NOT EXISTS auto_execute boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS execution_mode text NOT NULL DEFAULT 'suggest', -- suggest | auto | approval
  ADD COLUMN IF NOT EXISTS last_executed_at timestamptz,
  ADD COLUMN IF NOT EXISTS execution_count integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS success_count integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS failure_count integer NOT NULL DEFAULT 0;

-- Allow super_admin / authenticated members full management
DROP POLICY IF EXISTS "kernel_decision_rules_manage" ON public.kernel_decision_rules;
CREATE POLICY "kernel_decision_rules_manage" ON public.kernel_decision_rules
  FOR ALL TO authenticated
  USING (workspace_id IS NULL OR workspace_id IN (SELECT workspace_id FROM workspace_members WHERE user_id = auth.uid()))
  WITH CHECK (workspace_id IS NULL OR workspace_id IN (SELECT workspace_id FROM workspace_members WHERE user_id = auth.uid()));

-- 2) Helper: emit kernel event from SQL (used by workflow bridge)
CREATE OR REPLACE FUNCTION public.kernel_emit_event_sql(
  p_workspace_id uuid,
  p_event_type text,
  p_entity_kind text,
  p_entity_id uuid,
  p_payload jsonb DEFAULT '{}'::jsonb,
  p_source_module text DEFAULT 'workflow_bridge'
) RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_id uuid;
BEGIN
  INSERT INTO public.kernel_events (
    workspace_id, type, event_name, entity_kind, entity_id, payload, source_module, status, occurred_at
  ) VALUES (
    p_workspace_id, p_event_type, p_event_type, p_entity_kind, p_entity_id, p_payload, p_source_module, 'pending', now()
  ) RETURNING id INTO v_id;
  RETURN v_id;
END;
$$;

-- 3) Index for execution history queries
CREATE INDEX IF NOT EXISTS idx_kernel_action_runs_decision
  ON public.kernel_action_runs (related_decision_id);

CREATE INDEX IF NOT EXISTS idx_kernel_action_runs_status
  ON public.kernel_action_runs (workspace_id, status, created_at DESC);
