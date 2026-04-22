-- Tabela de shares
CREATE TABLE IF NOT EXISTS public.pitch_shares (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  token TEXT NOT NULL UNIQUE,
  workspace_id UUID REFERENCES public.workspaces(id) ON DELETE CASCADE,
  created_by UUID,
  contact_name TEXT,
  company_name TEXT,
  tokens_snapshot JSONB NOT NULL DEFAULT '{}'::jsonb,
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

CREATE INDEX IF NOT EXISTS idx_pitch_shares_token ON public.pitch_shares(token);
CREATE INDEX IF NOT EXISTS idx_pitch_shares_workspace ON public.pitch_shares(workspace_id);
CREATE INDEX IF NOT EXISTS idx_pitch_shares_created_by ON public.pitch_shares(created_by);

-- Tabela de visualizações
CREATE TABLE IF NOT EXISTS public.pitch_share_views (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  share_id UUID NOT NULL REFERENCES public.pitch_shares(id) ON DELETE CASCADE,
  viewer_email TEXT NOT NULL,
  viewer_name TEXT,
  device_type TEXT,
  user_agent TEXT,
  ip_hash TEXT,
  started_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  last_activity_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  ended_at TIMESTAMPTZ,
  total_seconds INTEGER NOT NULL DEFAULT 0,
  slides_seen JSONB NOT NULL DEFAULT '[]'::jsonb,
  max_slide_index INTEGER NOT NULL DEFAULT 0,
  completed BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_pitch_share_views_share ON public.pitch_share_views(share_id);
CREATE INDEX IF NOT EXISTS idx_pitch_share_views_email ON public.pitch_share_views(viewer_email);

-- Trigger updated_at
CREATE TRIGGER trg_pitch_shares_updated_at
BEFORE UPDATE ON public.pitch_shares
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- RLS
ALTER TABLE public.pitch_shares ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pitch_share_views ENABLE ROW LEVEL SECURITY;

-- pitch_shares: membros do workspace podem ver/gerir
CREATE POLICY "Workspace members can view pitch_shares"
ON public.pitch_shares FOR SELECT
USING (
  workspace_id IS NULL
  OR EXISTS (
    SELECT 1 FROM public.workspace_members wm
    WHERE wm.workspace_id = pitch_shares.workspace_id
      AND wm.user_id = auth.uid()
  )
  OR created_by = auth.uid()
);

CREATE POLICY "Workspace members can insert pitch_shares"
ON public.pitch_shares FOR INSERT
WITH CHECK (
  created_by = auth.uid()
  AND (
    workspace_id IS NULL
    OR EXISTS (
      SELECT 1 FROM public.workspace_members wm
      WHERE wm.workspace_id = pitch_shares.workspace_id
        AND wm.user_id = auth.uid()
    )
  )
);

CREATE POLICY "Workspace members can update pitch_shares"
ON public.pitch_shares FOR UPDATE
USING (
  created_by = auth.uid()
  OR EXISTS (
    SELECT 1 FROM public.workspace_members wm
    WHERE wm.workspace_id = pitch_shares.workspace_id
      AND wm.user_id = auth.uid()
  )
);

CREATE POLICY "Workspace members can delete pitch_shares"
ON public.pitch_shares FOR DELETE
USING (
  created_by = auth.uid()
  OR EXISTS (
    SELECT 1 FROM public.workspace_members wm
    WHERE wm.workspace_id = pitch_shares.workspace_id
      AND wm.user_id = auth.uid()
  )
);

-- pitch_share_views: membros vêem; escrita só via service_role (edge functions)
CREATE POLICY "Workspace members can view pitch_share_views"
ON public.pitch_share_views FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.pitch_shares ps
    WHERE ps.id = pitch_share_views.share_id
      AND (
        ps.created_by = auth.uid()
        OR (ps.workspace_id IS NOT NULL AND EXISTS (
          SELECT 1 FROM public.workspace_members wm
          WHERE wm.workspace_id = ps.workspace_id
            AND wm.user_id = auth.uid()
        ))
      )
  )
);