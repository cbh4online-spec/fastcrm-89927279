-- Create blueprint versions table to store version history
CREATE TABLE public.blueprint_versions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  blueprint_id UUID NOT NULL REFERENCES public.crm_blueprints(id) ON DELETE CASCADE,
  version INTEGER NOT NULL,
  schema JSONB NOT NULL DEFAULT '{}'::jsonb,
  change_summary TEXT,
  created_by UUID,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create index for faster lookups
CREATE INDEX idx_blueprint_versions_blueprint_id ON public.blueprint_versions(blueprint_id);
CREATE INDEX idx_blueprint_versions_version ON public.blueprint_versions(blueprint_id, version DESC);

-- Enable RLS
ALTER TABLE public.blueprint_versions ENABLE ROW LEVEL SECURITY;

-- RLS policies - users can view versions for blueprints in their workspace
CREATE POLICY "Users can view blueprint versions in their workspace"
ON public.blueprint_versions
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM crm_blueprints b
    JOIN workspace_members wm ON wm.workspace_id = b.workspace_id
    WHERE b.id = blueprint_versions.blueprint_id
    AND wm.user_id = auth.uid()
  )
);

-- Users can create versions for blueprints in their workspace
CREATE POLICY "Users can create blueprint versions in their workspace"
ON public.blueprint_versions
FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM crm_blueprints b
    JOIN workspace_members wm ON wm.workspace_id = b.workspace_id
    WHERE b.id = blueprint_versions.blueprint_id
    AND wm.user_id = auth.uid()
  )
);

-- Users can delete versions for blueprints in their workspace (admin/owner only)
CREATE POLICY "Admins can delete blueprint versions"
ON public.blueprint_versions
FOR DELETE
USING (
  EXISTS (
    SELECT 1 FROM crm_blueprints b
    WHERE b.id = blueprint_versions.blueprint_id
    AND is_workspace_admin_or_owner(auth.uid(), b.workspace_id)
  )
);