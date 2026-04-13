
CREATE TABLE public.workspace_ghl_social_channels (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  channel_type text NOT NULL,
  ghl_account_id text NOT NULL,
  account_name text,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (workspace_id, channel_type, ghl_account_id)
);

ALTER TABLE public.workspace_ghl_social_channels ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Members can view workspace social channels"
  ON public.workspace_ghl_social_channels
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.workspace_members wm
      WHERE wm.workspace_id = workspace_ghl_social_channels.workspace_id
        AND wm.user_id = auth.uid()
    )
  );

CREATE POLICY "Members can insert workspace social channels"
  ON public.workspace_ghl_social_channels
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.workspace_members wm
      WHERE wm.workspace_id = workspace_ghl_social_channels.workspace_id
        AND wm.user_id = auth.uid()
    )
  );

CREATE POLICY "Members can update workspace social channels"
  ON public.workspace_ghl_social_channels
  FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.workspace_members wm
      WHERE wm.workspace_id = workspace_ghl_social_channels.workspace_id
        AND wm.user_id = auth.uid()
    )
  );

CREATE POLICY "Members can delete workspace social channels"
  ON public.workspace_ghl_social_channels
  FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.workspace_members wm
      WHERE wm.workspace_id = workspace_ghl_social_channels.workspace_id
        AND wm.user_id = auth.uid()
    )
  );
