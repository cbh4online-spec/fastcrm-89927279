-- Add column to track which agency manages a workspace
ALTER TABLE public.workspaces 
ADD COLUMN managed_by_workspace_id UUID REFERENCES public.workspaces(id) ON DELETE SET NULL;

-- Add index for better query performance
CREATE INDEX idx_workspaces_managed_by ON public.workspaces(managed_by_workspace_id) WHERE managed_by_workspace_id IS NOT NULL;

-- Comment explaining the column
COMMENT ON COLUMN public.workspaces.managed_by_workspace_id IS 'If set, indicates this workspace is managed by another workspace (agency model)';