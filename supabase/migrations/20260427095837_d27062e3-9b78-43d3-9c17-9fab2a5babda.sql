-- Builder blocks library
CREATE TABLE IF NOT EXISTS public.builder_blocks (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  workspace_id UUID NULL,
  scope TEXT NOT NULL DEFAULT 'workspace' CHECK (scope IN ('workspace', 'global')),
  name TEXT NOT NULL,
  description TEXT,
  category TEXT NOT NULL DEFAULT 'custom',
  asset_type TEXT NOT NULL DEFAULT 'any',
  html TEXT NOT NULL,
  thumbnail_url TEXT,
  tags TEXT[] DEFAULT '{}',
  created_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT builder_blocks_scope_workspace CHECK (
    (scope = 'global' AND workspace_id IS NULL) OR
    (scope = 'workspace' AND workspace_id IS NOT NULL)
  )
);

CREATE INDEX IF NOT EXISTS idx_builder_blocks_workspace ON public.builder_blocks(workspace_id);
CREATE INDEX IF NOT EXISTS idx_builder_blocks_scope ON public.builder_blocks(scope);
CREATE INDEX IF NOT EXISTS idx_builder_blocks_category ON public.builder_blocks(category);

ALTER TABLE public.builder_blocks ENABLE ROW LEVEL SECURITY;

-- View: globals visible to any authenticated user
CREATE POLICY "Auth users can view global blocks"
ON public.builder_blocks FOR SELECT
TO authenticated
USING (scope = 'global');

-- View: workspace members can view their blocks
CREATE POLICY "Workspace members view workspace blocks"
ON public.builder_blocks FOR SELECT
TO authenticated
USING (
  scope = 'workspace'
  AND workspace_id IS NOT NULL
  AND EXISTS (
    SELECT 1 FROM public.workspace_members wm
    WHERE wm.workspace_id = builder_blocks.workspace_id
      AND wm.user_id = auth.uid()
  )
);

-- Insert workspace blocks
CREATE POLICY "Workspace members create workspace blocks"
ON public.builder_blocks FOR INSERT
TO authenticated
WITH CHECK (
  scope = 'workspace'
  AND workspace_id IS NOT NULL
  AND EXISTS (
    SELECT 1 FROM public.workspace_members wm
    WHERE wm.workspace_id = builder_blocks.workspace_id
      AND wm.user_id = auth.uid()
  )
);

-- Update workspace blocks
CREATE POLICY "Workspace members update workspace blocks"
ON public.builder_blocks FOR UPDATE
TO authenticated
USING (
  scope = 'workspace'
  AND EXISTS (
    SELECT 1 FROM public.workspace_members wm
    WHERE wm.workspace_id = builder_blocks.workspace_id
      AND wm.user_id = auth.uid()
  )
);

-- Delete workspace blocks
CREATE POLICY "Workspace members delete workspace blocks"
ON public.builder_blocks FOR DELETE
TO authenticated
USING (
  scope = 'workspace'
  AND EXISTS (
    SELECT 1 FROM public.workspace_members wm
    WHERE wm.workspace_id = builder_blocks.workspace_id
      AND wm.user_id = auth.uid()
  )
);

-- Super admin: manage globals
CREATE POLICY "Super admins insert global blocks"
ON public.builder_blocks FOR INSERT
TO authenticated
WITH CHECK (
  scope = 'global' AND public.is_super_admin(auth.uid())
);

CREATE POLICY "Super admins update global blocks"
ON public.builder_blocks FOR UPDATE
TO authenticated
USING (
  scope = 'global' AND public.is_super_admin(auth.uid())
);

CREATE POLICY "Super admins delete global blocks"
ON public.builder_blocks FOR DELETE
TO authenticated
USING (
  scope = 'global' AND public.is_super_admin(auth.uid())
);

-- updated_at trigger
CREATE TRIGGER builder_blocks_set_updated_at
BEFORE UPDATE ON public.builder_blocks
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();