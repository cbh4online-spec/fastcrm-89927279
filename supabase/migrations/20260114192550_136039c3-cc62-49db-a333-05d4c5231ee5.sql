-- Create template_activity_logs table to store rendered messages for auditing
CREATE TABLE public.template_activity_logs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  template_id UUID NOT NULL REFERENCES public.templates(id) ON DELETE CASCADE,
  entity_type TEXT NOT NULL,
  entity_id UUID NOT NULL,
  rendered_content TEXT NOT NULL,
  rendered_subject TEXT,
  variables_used JSONB DEFAULT '{}',
  missing_variables TEXT[] DEFAULT '{}',
  user_id UUID NOT NULL,
  channel TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.template_activity_logs ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Users can view activity logs in their workspace"
ON public.template_activity_logs
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.workspace_members
    WHERE workspace_members.workspace_id = template_activity_logs.workspace_id
    AND workspace_members.user_id = auth.uid()
  )
);

CREATE POLICY "Users can create activity logs in their workspace"
ON public.template_activity_logs
FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.workspace_members
    WHERE workspace_members.workspace_id = template_activity_logs.workspace_id
    AND workspace_members.user_id = auth.uid()
  )
);

-- Create index for fast lookups
CREATE INDEX idx_template_activity_logs_entity ON public.template_activity_logs(entity_type, entity_id);
CREATE INDEX idx_template_activity_logs_template ON public.template_activity_logs(template_id);
CREATE INDEX idx_template_activity_logs_workspace ON public.template_activity_logs(workspace_id);