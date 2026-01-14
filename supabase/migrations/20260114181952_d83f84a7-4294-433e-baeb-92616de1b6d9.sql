-- Create table for storing CRM blueprints
CREATE TABLE public.crm_blueprints (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  version INTEGER NOT NULL DEFAULT 1,
  entity_type TEXT NOT NULL DEFAULT 'lead',
  schema JSONB NOT NULL DEFAULT '{}',
  status TEXT NOT NULL DEFAULT 'draft',
  created_by UUID,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.crm_blueprints ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Users can view blueprints in their workspace"
ON public.crm_blueprints
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM workspace_members
    WHERE workspace_members.workspace_id = crm_blueprints.workspace_id
    AND workspace_members.user_id = auth.uid()
  )
);

CREATE POLICY "Users can create blueprints in their workspace"
ON public.crm_blueprints
FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM workspace_members
    WHERE workspace_members.workspace_id = crm_blueprints.workspace_id
    AND workspace_members.user_id = auth.uid()
  )
);

CREATE POLICY "Users can update blueprints in their workspace"
ON public.crm_blueprints
FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM workspace_members
    WHERE workspace_members.workspace_id = crm_blueprints.workspace_id
    AND workspace_members.user_id = auth.uid()
  )
);

CREATE POLICY "Users can delete blueprints in their workspace"
ON public.crm_blueprints
FOR DELETE
USING (
  EXISTS (
    SELECT 1 FROM workspace_members
    WHERE workspace_members.workspace_id = crm_blueprints.workspace_id
    AND workspace_members.user_id = auth.uid()
  )
);

-- Create index for faster workspace queries
CREATE INDEX idx_crm_blueprints_workspace ON public.crm_blueprints(workspace_id);

-- Create trigger for automatic timestamp updates
CREATE TRIGGER update_crm_blueprints_updated_at
BEFORE UPDATE ON public.crm_blueprints
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();