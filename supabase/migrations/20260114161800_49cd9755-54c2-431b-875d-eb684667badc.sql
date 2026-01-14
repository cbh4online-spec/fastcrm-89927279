-- Create enum for CRM entity types
CREATE TYPE public.crm_entity_type AS ENUM ('contacts', 'opportunities');

-- Create enum for CRM view modes
CREATE TYPE public.crm_view_mode AS ENUM ('table', 'board');

-- Create table for saved CRM views
CREATE TABLE public.crm_saved_views (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  user_id UUID, -- NULL means workspace-wide default
  name TEXT NOT NULL,
  entity_type public.crm_entity_type NOT NULL,
  view_mode public.crm_view_mode NOT NULL DEFAULT 'table',
  filters JSONB DEFAULT '{}',
  visible_columns JSONB DEFAULT '[]',
  sort_config JSONB DEFAULT '{}',
  is_default BOOLEAN DEFAULT false,
  for_role public.workspace_role, -- NULL means applies to all roles, otherwise role-specific default
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  CONSTRAINT unique_user_default_per_entity UNIQUE NULLS NOT DISTINCT (workspace_id, user_id, entity_type, is_default) 
    DEFERRABLE INITIALLY DEFERRED
);

-- Create index for faster lookups
CREATE INDEX idx_crm_saved_views_workspace ON public.crm_saved_views(workspace_id);
CREATE INDEX idx_crm_saved_views_user ON public.crm_saved_views(user_id);
CREATE INDEX idx_crm_saved_views_role ON public.crm_saved_views(for_role);

-- Enable RLS
ALTER TABLE public.crm_saved_views ENABLE ROW LEVEL SECURITY;

-- RLS policies
-- Users can view their own views and workspace-wide defaults
CREATE POLICY "Users can view workspace views"
ON public.crm_saved_views
FOR SELECT
USING (
  public.is_workspace_member(auth.uid(), workspace_id)
);

-- Users can create their own views
CREATE POLICY "Users can create their own views"
ON public.crm_saved_views
FOR INSERT
WITH CHECK (
  public.is_workspace_member(auth.uid(), workspace_id)
  AND (user_id = auth.uid() OR (user_id IS NULL AND public.is_workspace_admin_or_owner(auth.uid(), workspace_id)))
);

-- Users can update their own views, admins can update workspace defaults
CREATE POLICY "Users can update their own views"
ON public.crm_saved_views
FOR UPDATE
USING (
  public.is_workspace_member(auth.uid(), workspace_id)
  AND (user_id = auth.uid() OR (user_id IS NULL AND public.is_workspace_admin_or_owner(auth.uid(), workspace_id)))
);

-- Users can delete their own views, admins can delete workspace defaults
CREATE POLICY "Users can delete their own views"
ON public.crm_saved_views
FOR DELETE
USING (
  public.is_workspace_member(auth.uid(), workspace_id)
  AND (user_id = auth.uid() OR (user_id IS NULL AND public.is_workspace_admin_or_owner(auth.uid(), workspace_id)))
);

-- Add trigger for updated_at
CREATE TRIGGER update_crm_saved_views_updated_at
BEFORE UPDATE ON public.crm_saved_views
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();