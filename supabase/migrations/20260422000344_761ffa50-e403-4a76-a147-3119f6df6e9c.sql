
-- Pitch shares: public shareable links of a presentation snapshot
CREATE TABLE public.pitch_shares (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  token TEXT NOT NULL UNIQUE,
  workspace_id UUID REFERENCES public.workspaces(id) ON DELETE CASCADE,
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  contact_name TEXT,
  company_name TEXT,
  tokens_snapshot JSONB NOT NULL,
  slide_titles JSONB NOT NULL DEFAULT '[]'::jsonb,
  total_slides INTEGER NOT NULL DEFAULT 0,
  expires_at TIMESTAMPTZ,
  revoked_at TIMESTAMPTZ,
  view_count INTEGER NOT NULL DEFAULT 0,
  unique_viewers_count INTEGER NOT NULL DEFAULT 0,
  last_viewed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_pitch_shares_token ON public.pitch_shares(token);
CREATE INDEX idx_pitch_shares_workspace ON public.pitch_shares(workspace_id);
CREATE INDEX idx_pitch_shares_created_by ON public.pitch_shares(created_by);
CREATE INDEX idx_pitch_shares_created_at ON public.pitch_shares(created_at DESC);

CREATE TABLE public.pitch_share_views (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  share_id UUID NOT NULL REFERENCES public.pitch_shares(id) ON DELETE CASCADE,
  viewer_email TEXT NOT NULL,
  viewer_name TEXT,
  ip_address TEXT,
  user_agent TEXT,
  device_type TEXT,
  started_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  last_activity_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  ended_at TIMESTAMPTZ,
  total_seconds INTEGER NOT NULL DEFAULT 0,
  slides_seen JSONB NOT NULL DEFAULT '[]'::jsonb,
  max_slide_index INTEGER NOT NULL DEFAULT 0,
  completed BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_pitch_share_views_share_id ON public.pitch_share_views(share_id);
CREATE INDEX idx_pitch_share_views_viewer_email ON public.pitch_share_views(viewer_email);
CREATE INDEX idx_pitch_share_views_started_at ON public.pitch_share_views(started_at DESC);

CREATE TRIGGER update_pitch_shares_updated_at
BEFORE UPDATE ON public.pitch_shares
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

ALTER TABLE public.pitch_shares ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pitch_share_views ENABLE ROW LEVEL SECURITY;

-- pitch_shares: workspace members + super admins can manage their workspace shares
CREATE POLICY "Workspace members can view pitch shares"
ON public.pitch_shares FOR SELECT
TO authenticated
USING (
  public.is_super_admin(auth.uid())
  OR (workspace_id IS NOT NULL AND public.is_workspace_member(workspace_id, auth.uid()))
);

CREATE POLICY "Workspace members can create pitch shares"
ON public.pitch_shares FOR INSERT
TO authenticated
WITH CHECK (
  public.is_super_admin(auth.uid())
  OR (workspace_id IS NOT NULL AND public.is_workspace_member(workspace_id, auth.uid()))
);

CREATE POLICY "Workspace members can update pitch shares"
ON public.pitch_shares FOR UPDATE
TO authenticated
USING (
  public.is_super_admin(auth.uid())
  OR (workspace_id IS NOT NULL AND public.is_workspace_member(workspace_id, auth.uid()))
);

CREATE POLICY "Workspace members can delete pitch shares"
ON public.pitch_shares FOR DELETE
TO authenticated
USING (
  public.is_super_admin(auth.uid())
  OR (workspace_id IS NOT NULL AND public.is_workspace_member(workspace_id, auth.uid()))
);

-- pitch_share_views: read for workspace members; writes via edge functions (service role)
CREATE POLICY "Workspace members can view share views"
ON public.pitch_share_views FOR SELECT
TO authenticated
USING (
  public.is_super_admin(auth.uid())
  OR EXISTS (
    SELECT 1 FROM public.pitch_shares s
    WHERE s.id = pitch_share_views.share_id
      AND s.workspace_id IS NOT NULL
      AND public.is_workspace_member(s.workspace_id, auth.uid())
  )
);
