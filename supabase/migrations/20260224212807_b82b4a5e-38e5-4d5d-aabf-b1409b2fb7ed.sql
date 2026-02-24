
-- Create workspace_feature_flags table
CREATE TABLE public.workspace_feature_flags (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  flag_key text NOT NULL,
  enabled boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(workspace_id, flag_key)
);

-- Enable RLS
ALTER TABLE public.workspace_feature_flags ENABLE ROW LEVEL SECURITY;

-- RLS: workspace members can read flags
CREATE POLICY "Workspace members can read feature flags"
  ON public.workspace_feature_flags
  FOR SELECT
  TO authenticated
  USING (
    workspace_id IN (
      SELECT workspace_id FROM public.workspace_members WHERE user_id = auth.uid()
    )
  );

-- RLS: workspace owners can manage flags
CREATE POLICY "Workspace owners can manage feature flags"
  ON public.workspace_feature_flags
  FOR ALL
  TO authenticated
  USING (
    workspace_id IN (
      SELECT workspace_id FROM public.workspace_members WHERE user_id = auth.uid() AND role = 'owner'
    )
  )
  WITH CHECK (
    workspace_id IN (
      SELECT workspace_id FROM public.workspace_members WHERE user_id = auth.uid() AND role = 'owner'
    )
  );
