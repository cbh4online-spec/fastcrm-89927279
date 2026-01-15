-- Create table to store onboarding responses
CREATE TABLE public.workspace_onboarding (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  business_type TEXT,
  custom_business_type TEXT,
  success_definition TEXT,
  process_description TEXT,
  channels TEXT[] DEFAULT '{}',
  completed_at TIMESTAMP WITH TIME ZONE,
  skipped BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(workspace_id)
);

-- Enable RLS
ALTER TABLE public.workspace_onboarding ENABLE ROW LEVEL SECURITY;

-- Policies
CREATE POLICY "Super admins can view all onboarding data"
  ON public.workspace_onboarding FOR SELECT
  USING (public.is_super_admin(auth.uid()));

CREATE POLICY "Workspace members can view their onboarding"
  ON public.workspace_onboarding FOR SELECT
  USING (public.is_workspace_member(auth.uid(), workspace_id));

CREATE POLICY "Workspace admins can insert onboarding"
  ON public.workspace_onboarding FOR INSERT
  WITH CHECK (public.is_workspace_member(auth.uid(), workspace_id));

CREATE POLICY "Workspace admins can update onboarding"
  ON public.workspace_onboarding FOR UPDATE
  USING (public.is_workspace_member(auth.uid(), workspace_id));

-- Add updated_at trigger
CREATE TRIGGER update_workspace_onboarding_updated_at
  BEFORE UPDATE ON public.workspace_onboarding
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Add index
CREATE INDEX idx_workspace_onboarding_workspace_id ON public.workspace_onboarding(workspace_id);