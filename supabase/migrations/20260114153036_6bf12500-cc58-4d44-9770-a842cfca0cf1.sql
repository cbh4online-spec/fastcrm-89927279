-- Create table for AI automation suggestions
CREATE TABLE public.automation_suggestions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  trigger_type TEXT NOT NULL,
  trigger_config JSONB NOT NULL DEFAULT '{}',
  conditions JSONB NOT NULL DEFAULT '[]',
  actions JSONB NOT NULL DEFAULT '[]',
  confidence NUMERIC NOT NULL CHECK (confidence >= 0 AND confidence <= 1),
  explanation TEXT NOT NULL,
  pattern_data JSONB,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'dismissed', 'expired')),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  reviewed_at TIMESTAMP WITH TIME ZONE,
  reviewed_by UUID,
  created_automation_id UUID REFERENCES public.automation_rules(id) ON DELETE SET NULL
);

-- Enable RLS
ALTER TABLE public.automation_suggestions ENABLE ROW LEVEL SECURITY;

-- RLS policies
CREATE POLICY "Members can view automation suggestions"
  ON public.automation_suggestions
  FOR SELECT
  USING (is_workspace_member(auth.uid(), workspace_id));

CREATE POLICY "Admins can create automation suggestions"
  ON public.automation_suggestions
  FOR INSERT
  WITH CHECK (is_workspace_admin_or_owner(auth.uid(), workspace_id));

CREATE POLICY "Admins can update automation suggestions"
  ON public.automation_suggestions
  FOR UPDATE
  USING (is_workspace_admin_or_owner(auth.uid(), workspace_id));

CREATE POLICY "Admins can delete automation suggestions"
  ON public.automation_suggestions
  FOR DELETE
  USING (is_workspace_admin_or_owner(auth.uid(), workspace_id));

-- Index for faster queries
CREATE INDEX idx_automation_suggestions_workspace_status 
  ON public.automation_suggestions(workspace_id, status);

CREATE INDEX idx_automation_suggestions_confidence 
  ON public.automation_suggestions(confidence DESC) 
  WHERE status = 'pending';