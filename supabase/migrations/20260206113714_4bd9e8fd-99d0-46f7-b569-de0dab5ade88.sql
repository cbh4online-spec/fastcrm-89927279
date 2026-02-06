
-- Create workspace video conference configuration table
CREATE TABLE public.workspace_video_config (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  zoom_account_id TEXT,
  zoom_client_id TEXT,
  zoom_client_secret_encrypted TEXT,
  zoom_enabled BOOLEAN NOT NULL DEFAULT false,
  google_service_account_json TEXT,
  google_calendar_email TEXT,
  google_meet_enabled BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  CONSTRAINT workspace_video_config_workspace_unique UNIQUE (workspace_id)
);

-- Enable RLS
ALTER TABLE public.workspace_video_config ENABLE ROW LEVEL SECURITY;

-- Only workspace owners/admins can view video config
CREATE POLICY "Workspace owners can view video config"
  ON public.workspace_video_config
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.workspace_members wm
      WHERE wm.workspace_id = workspace_video_config.workspace_id
      AND wm.user_id = auth.uid()
      AND wm.role IN ('owner', 'admin')
    )
  );

-- Only workspace owners/admins can insert video config
CREATE POLICY "Workspace owners can insert video config"
  ON public.workspace_video_config
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.workspace_members wm
      WHERE wm.workspace_id = workspace_video_config.workspace_id
      AND wm.user_id = auth.uid()
      AND wm.role IN ('owner', 'admin')
    )
  );

-- Only workspace owners/admins can update video config
CREATE POLICY "Workspace owners can update video config"
  ON public.workspace_video_config
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.workspace_members wm
      WHERE wm.workspace_id = workspace_video_config.workspace_id
      AND wm.user_id = auth.uid()
      AND wm.role IN ('owner', 'admin')
    )
  );

-- Only workspace owners/admins can delete video config
CREATE POLICY "Workspace owners can delete video config"
  ON public.workspace_video_config
  FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM public.workspace_members wm
      WHERE wm.workspace_id = workspace_video_config.workspace_id
      AND wm.user_id = auth.uid()
      AND wm.role IN ('owner', 'admin')
    )
  );

-- Trigger for updated_at
CREATE TRIGGER update_workspace_video_config_updated_at
  BEFORE UPDATE ON public.workspace_video_config
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();
