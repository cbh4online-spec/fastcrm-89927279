-- Create table for workspace layout configuration
CREATE TABLE public.workspace_layout_config (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  entity_type TEXT NOT NULL CHECK (entity_type IN ('lead', 'contact', 'company')),
  visible_sections TEXT[] NOT NULL DEFAULT ARRAY['overview', 'insights', 'timeline', 'notes', 'messages', 'tasks', 'opportunities', 'proposals', 'payments', 'details', 'custom-fields', 'history', 'contacts'],
  section_order TEXT[] DEFAULT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(workspace_id, entity_type)
);

-- Enable RLS
ALTER TABLE public.workspace_layout_config ENABLE ROW LEVEL SECURITY;

-- RLS policies - workspace members can view
CREATE POLICY "Workspace members can view layout config"
ON public.workspace_layout_config
FOR SELECT
USING (
  workspace_id IN (
    SELECT workspace_id FROM workspace_members WHERE user_id = auth.uid()
  )
);

-- RLS policies - admins and owners can update
CREATE POLICY "Workspace admins can manage layout config"
ON public.workspace_layout_config
FOR ALL
USING (
  workspace_id IN (
    SELECT workspace_id FROM workspace_members 
    WHERE user_id = auth.uid() AND role IN ('owner', 'admin')
  )
)
WITH CHECK (
  workspace_id IN (
    SELECT workspace_id FROM workspace_members 
    WHERE user_id = auth.uid() AND role IN ('owner', 'admin')
  )
);

-- Create trigger for updated_at
CREATE TRIGGER update_workspace_layout_config_updated_at
BEFORE UPDATE ON public.workspace_layout_config
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();