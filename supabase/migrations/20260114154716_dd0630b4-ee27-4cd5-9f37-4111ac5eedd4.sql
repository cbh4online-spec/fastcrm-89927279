-- Create dashboard_layouts table for storing widget configurations
CREATE TABLE public.dashboard_layouts (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  user_id UUID, -- NULL means workspace default, non-NULL means user override
  entity_type TEXT NOT NULL CHECK (entity_type IN ('lead', 'contact')),
  layout JSONB NOT NULL DEFAULT '[]'::jsonb,
  is_default BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  
  -- Ensure only one default per workspace/entity_type
  UNIQUE NULLS NOT DISTINCT (workspace_id, user_id, entity_type)
);

-- Enable RLS
ALTER TABLE public.dashboard_layouts ENABLE ROW LEVEL SECURITY;

-- Policies for dashboard_layouts
CREATE POLICY "Users can view workspace dashboard layouts"
  ON public.dashboard_layouts FOR SELECT
  USING (
    public.is_workspace_member(auth.uid(), workspace_id)
  );

CREATE POLICY "Admins/owners can manage workspace default layouts"
  ON public.dashboard_layouts FOR INSERT
  WITH CHECK (
    public.is_workspace_member(auth.uid(), workspace_id) AND
    (user_id IS NULL AND public.is_workspace_admin_or_owner(auth.uid(), workspace_id) OR user_id = auth.uid())
  );

CREATE POLICY "Admins/owners can update workspace default layouts"
  ON public.dashboard_layouts FOR UPDATE
  USING (
    public.is_workspace_member(auth.uid(), workspace_id) AND
    (user_id IS NULL AND public.is_workspace_admin_or_owner(auth.uid(), workspace_id) OR user_id = auth.uid())
  );

CREATE POLICY "Users can delete their own layouts"
  ON public.dashboard_layouts FOR DELETE
  USING (
    public.is_workspace_member(auth.uid(), workspace_id) AND
    (user_id = auth.uid() OR (user_id IS NULL AND public.is_workspace_admin_or_owner(auth.uid(), workspace_id)))
  );

-- Trigger for updated_at
CREATE TRIGGER update_dashboard_layouts_updated_at
  BEFORE UPDATE ON public.dashboard_layouts
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Create index for faster lookups
CREATE INDEX idx_dashboard_layouts_workspace ON public.dashboard_layouts(workspace_id, entity_type);
CREATE INDEX idx_dashboard_layouts_user ON public.dashboard_layouts(user_id, entity_type) WHERE user_id IS NOT NULL;