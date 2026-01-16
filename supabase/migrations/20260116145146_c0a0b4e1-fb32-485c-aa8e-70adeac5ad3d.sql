-- Create journey_automations table
CREATE TABLE public.journey_automations (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  trigger_type TEXT NOT NULL,
  trigger_config JSONB DEFAULT '{}'::jsonb,
  conditions JSONB DEFAULT '[]'::jsonb,
  actions JSONB DEFAULT '[]'::jsonb,
  is_active BOOLEAN DEFAULT false,
  affected_clients_count INTEGER DEFAULT 0,
  created_by UUID NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Create journey_automation_logs table
CREATE TABLE public.journey_automation_logs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  automation_id UUID NOT NULL REFERENCES public.journey_automations(id) ON DELETE CASCADE,
  automation_name TEXT NOT NULL,
  entity_type TEXT NOT NULL CHECK (entity_type IN ('contact', 'company')),
  entity_id UUID NOT NULL,
  entity_name TEXT NOT NULL,
  trigger_type TEXT NOT NULL,
  trigger_data JSONB DEFAULT '{}'::jsonb,
  actions_executed JSONB DEFAULT '[]'::jsonb,
  status TEXT NOT NULL DEFAULT 'success' CHECK (status IN ('success', 'failed', 'partial')),
  error_message TEXT,
  executed_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Create journey_ai_suggestions table for storing AI-generated suggestions
CREATE TABLE public.journey_ai_suggestions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  entity_type TEXT NOT NULL CHECK (entity_type IN ('contact', 'company')),
  entity_id UUID NOT NULL,
  suggestion_type TEXT NOT NULL,
  priority TEXT NOT NULL DEFAULT 'medium' CHECK (priority IN ('high', 'medium', 'low')),
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  reasoning TEXT,
  suggested_action TEXT,
  action_type TEXT,
  metadata JSONB DEFAULT '{}'::jsonb,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'dismissed', 'executed')),
  automation_id UUID REFERENCES public.journey_automations(id) ON DELETE SET NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  reviewed_at TIMESTAMP WITH TIME ZONE,
  reviewed_by UUID
);

-- Add indexes
CREATE INDEX idx_journey_automations_workspace ON public.journey_automations(workspace_id);
CREATE INDEX idx_journey_automations_active ON public.journey_automations(workspace_id, is_active);
CREATE INDEX idx_journey_automation_logs_workspace ON public.journey_automation_logs(workspace_id);
CREATE INDEX idx_journey_automation_logs_automation ON public.journey_automation_logs(automation_id);
CREATE INDEX idx_journey_automation_logs_entity ON public.journey_automation_logs(entity_type, entity_id);
CREATE INDEX idx_journey_ai_suggestions_workspace ON public.journey_ai_suggestions(workspace_id);
CREATE INDEX idx_journey_ai_suggestions_entity ON public.journey_ai_suggestions(entity_type, entity_id);
CREATE INDEX idx_journey_ai_suggestions_status ON public.journey_ai_suggestions(status);

-- Enable RLS
ALTER TABLE public.journey_automations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.journey_automation_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.journey_ai_suggestions ENABLE ROW LEVEL SECURITY;

-- RLS policies for journey_automations
CREATE POLICY "Users can view automations in their workspace"
  ON public.journey_automations FOR SELECT
  USING (workspace_id IN (
    SELECT workspace_id FROM public.workspace_members WHERE user_id = auth.uid()
  ));

CREATE POLICY "Admins can create automations"
  ON public.journey_automations FOR INSERT
  WITH CHECK (workspace_id IN (
    SELECT workspace_id FROM public.workspace_members 
    WHERE user_id = auth.uid() AND role IN ('owner', 'admin')
  ));

CREATE POLICY "Admins can update automations"
  ON public.journey_automations FOR UPDATE
  USING (workspace_id IN (
    SELECT workspace_id FROM public.workspace_members 
    WHERE user_id = auth.uid() AND role IN ('owner', 'admin')
  ));

CREATE POLICY "Admins can delete automations"
  ON public.journey_automations FOR DELETE
  USING (workspace_id IN (
    SELECT workspace_id FROM public.workspace_members 
    WHERE user_id = auth.uid() AND role IN ('owner', 'admin')
  ));

-- RLS policies for journey_automation_logs
CREATE POLICY "Users can view automation logs in their workspace"
  ON public.journey_automation_logs FOR SELECT
  USING (workspace_id IN (
    SELECT workspace_id FROM public.workspace_members WHERE user_id = auth.uid()
  ));

CREATE POLICY "System can create automation logs"
  ON public.journey_automation_logs FOR INSERT
  WITH CHECK (workspace_id IN (
    SELECT workspace_id FROM public.workspace_members WHERE user_id = auth.uid()
  ));

-- RLS policies for journey_ai_suggestions
CREATE POLICY "Users can view AI suggestions in their workspace"
  ON public.journey_ai_suggestions FOR SELECT
  USING (workspace_id IN (
    SELECT workspace_id FROM public.workspace_members WHERE user_id = auth.uid()
  ));

CREATE POLICY "System can create AI suggestions"
  ON public.journey_ai_suggestions FOR INSERT
  WITH CHECK (workspace_id IN (
    SELECT workspace_id FROM public.workspace_members WHERE user_id = auth.uid()
  ));

CREATE POLICY "Users can update AI suggestions"
  ON public.journey_ai_suggestions FOR UPDATE
  USING (workspace_id IN (
    SELECT workspace_id FROM public.workspace_members WHERE user_id = auth.uid()
  ));

-- Trigger for updated_at
CREATE TRIGGER update_journey_automations_updated_at
  BEFORE UPDATE ON public.journey_automations
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();