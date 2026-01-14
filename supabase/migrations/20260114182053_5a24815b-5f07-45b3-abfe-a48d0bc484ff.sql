-- Create table for blueprint apply audit logs
CREATE TABLE public.blueprint_apply_logs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  blueprint_id UUID NOT NULL REFERENCES public.crm_blueprints(id) ON DELETE CASCADE,
  applied_by UUID NOT NULL,
  apply_type TEXT NOT NULL DEFAULT 'all',
  changes_applied JSONB NOT NULL DEFAULT '[]',
  duplicates_detected JSONB NOT NULL DEFAULT '[]',
  duplicates_merged JSONB NOT NULL DEFAULT '[]',
  status TEXT NOT NULL DEFAULT 'completed',
  error_message TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.blueprint_apply_logs ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Users can view apply logs in their workspace"
ON public.blueprint_apply_logs
FOR SELECT
USING (is_workspace_member(auth.uid(), workspace_id));

CREATE POLICY "Users can create apply logs in their workspace"
ON public.blueprint_apply_logs
FOR INSERT
WITH CHECK (is_workspace_member(auth.uid(), workspace_id) AND auth.uid() = applied_by);

-- Create index
CREATE INDEX idx_blueprint_apply_logs_workspace ON public.blueprint_apply_logs(workspace_id);
CREATE INDEX idx_blueprint_apply_logs_blueprint ON public.blueprint_apply_logs(blueprint_id);