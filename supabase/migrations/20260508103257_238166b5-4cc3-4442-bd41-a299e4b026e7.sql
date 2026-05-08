CREATE TABLE IF NOT EXISTS public.leadchef_audit_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid NOT NULL,
  user_id uuid,
  entity_type text NOT NULL,
  entity_id uuid,
  action text NOT NULL,
  description text,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.leadchef_audit_logs ENABLE ROW LEVEL SECURITY;

CREATE INDEX IF NOT EXISTS idx_leadchef_audit_ws_created
  ON public.leadchef_audit_logs (workspace_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_leadchef_audit_ws_action
  ON public.leadchef_audit_logs (workspace_id, action);
CREATE INDEX IF NOT EXISTS idx_leadchef_audit_ws_user
  ON public.leadchef_audit_logs (workspace_id, user_id);

DROP POLICY IF EXISTS "leadchef_audit_select_members" ON public.leadchef_audit_logs;
CREATE POLICY "leadchef_audit_select_members"
  ON public.leadchef_audit_logs FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.workspace_members wm
      WHERE wm.workspace_id = leadchef_audit_logs.workspace_id
        AND wm.user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "leadchef_audit_insert_members" ON public.leadchef_audit_logs;
CREATE POLICY "leadchef_audit_insert_members"
  ON public.leadchef_audit_logs FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.workspace_members wm
      WHERE wm.workspace_id = leadchef_audit_logs.workspace_id
        AND wm.user_id = auth.uid()
    )
  );