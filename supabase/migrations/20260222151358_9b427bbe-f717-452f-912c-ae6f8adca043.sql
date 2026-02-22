
-- Table: workspace_invites
CREATE TABLE public.workspace_invites (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  workspace_id uuid NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  email text NOT NULL,
  role text NOT NULL DEFAULT 'agent',
  invite_token uuid NOT NULL DEFAULT gen_random_uuid(),
  status text NOT NULL DEFAULT 'pending',
  invited_by uuid NOT NULL,
  accepted_at timestamptz,
  expires_at timestamptz NOT NULL DEFAULT (now() + interval '7 days'),
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Unique index: only one pending invite per email per workspace
CREATE UNIQUE INDEX idx_workspace_invites_pending 
  ON public.workspace_invites (workspace_id, email) 
  WHERE status = 'pending';

-- Index for token lookup
CREATE UNIQUE INDEX idx_workspace_invites_token 
  ON public.workspace_invites (invite_token);

-- Enable RLS
ALTER TABLE public.workspace_invites ENABLE ROW LEVEL SECURITY;

-- Policy: workspace members with manage rights can view invites
CREATE POLICY "Workspace managers can view invites"
  ON public.workspace_invites
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.workspace_members wm
      WHERE wm.workspace_id = workspace_invites.workspace_id
        AND wm.user_id = auth.uid()
        AND wm.role IN ('owner', 'admin', 'agency')
    )
    OR public.is_super_admin(auth.uid())
  );

-- Policy: workspace managers can insert invites
CREATE POLICY "Workspace managers can create invites"
  ON public.workspace_invites
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.workspace_members wm
      WHERE wm.workspace_id = workspace_invites.workspace_id
        AND wm.user_id = auth.uid()
        AND wm.role IN ('owner', 'admin', 'agency')
    )
    OR public.is_super_admin(auth.uid())
  );

-- Policy: workspace managers can update invites (revoke, etc.)
CREATE POLICY "Workspace managers can update invites"
  ON public.workspace_invites
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.workspace_members wm
      WHERE wm.workspace_id = workspace_invites.workspace_id
        AND wm.user_id = auth.uid()
        AND wm.role IN ('owner', 'admin', 'agency')
    )
    OR public.is_super_admin(auth.uid())
  );

-- Policy: workspace managers can delete invites
CREATE POLICY "Workspace managers can delete invites"
  ON public.workspace_invites
  FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM public.workspace_members wm
      WHERE wm.workspace_id = workspace_invites.workspace_id
        AND wm.user_id = auth.uid()
        AND wm.role IN ('owner', 'admin', 'agency')
    )
    OR public.is_super_admin(auth.uid())
  );
