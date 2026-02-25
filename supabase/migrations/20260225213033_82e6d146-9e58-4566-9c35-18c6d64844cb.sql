
ALTER TABLE public.leads
  ADD COLUMN IF NOT EXISTS icp_fit_score integer DEFAULT 0,
  ADD COLUMN IF NOT EXISTS engagement_score integer DEFAULT 0,
  ADD COLUMN IF NOT EXISTS pare_score integer DEFAULT 0;

CREATE TABLE IF NOT EXISTS public.leads_audit_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid REFERENCES public.workspaces(id),
  lead_id uuid REFERENCES public.leads(id) ON DELETE CASCADE,
  changed_by uuid,
  changed_at timestamptz DEFAULT now(),
  field_name text NOT NULL,
  old_value jsonb,
  new_value jsonb
);

ALTER TABLE public.leads_audit_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view audit logs for their workspace"
  ON public.leads_audit_log
  FOR SELECT
  USING (
    workspace_id IN (
      SELECT id FROM public.workspaces WHERE owner_id = auth.uid()
      UNION
      SELECT workspace_id FROM public.workspace_members WHERE user_id = auth.uid()
    )
  );
