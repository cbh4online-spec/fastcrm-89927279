-- Student Journey Automations table
CREATE TABLE public.sj_automations (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  trigger_type TEXT NOT NULL,
  trigger_config JSONB DEFAULT '{}'::jsonb,
  conditions JSONB DEFAULT '[]'::jsonb,
  actions JSONB DEFAULT '[]'::jsonb,
  is_active BOOLEAN DEFAULT true,
  is_system BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.sj_automations ENABLE ROW LEVEL SECURITY;

-- RLS policies
CREATE POLICY "Users can view SJ automations in their workspace"
  ON public.sj_automations FOR SELECT
  USING (workspace_id IN (
    SELECT workspace_id FROM public.workspace_members WHERE user_id = auth.uid()
  ));

CREATE POLICY "Users can create SJ automations in their workspace"
  ON public.sj_automations FOR INSERT
  WITH CHECK (workspace_id IN (
    SELECT workspace_id FROM public.workspace_members WHERE user_id = auth.uid()
  ));

CREATE POLICY "Users can update SJ automations in their workspace"
  ON public.sj_automations FOR UPDATE
  USING (workspace_id IN (
    SELECT workspace_id FROM public.workspace_members WHERE user_id = auth.uid()
  ));

CREATE POLICY "Users can delete non-system SJ automations in their workspace"
  ON public.sj_automations FOR DELETE
  USING (
    workspace_id IN (
      SELECT workspace_id FROM public.workspace_members WHERE user_id = auth.uid()
    ) AND is_system = false
  );

-- Create index
CREATE INDEX idx_sj_automations_workspace ON public.sj_automations(workspace_id);
CREATE INDEX idx_sj_automations_trigger ON public.sj_automations(trigger_type);
CREATE INDEX idx_sj_automations_active ON public.sj_automations(is_active) WHERE is_active = true;

-- Student Journey Automation Logs table
CREATE TABLE public.sj_automation_logs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  automation_id UUID REFERENCES public.sj_automations(id) ON DELETE SET NULL,
  automation_name TEXT NOT NULL,
  profile_id UUID REFERENCES public.sj_profiles(id) ON DELETE SET NULL,
  enrollment_id UUID REFERENCES public.sj_enrollments(id) ON DELETE SET NULL,
  trigger_type TEXT NOT NULL,
  trigger_data JSONB DEFAULT '{}'::jsonb,
  actions_executed JSONB DEFAULT '[]'::jsonb,
  status TEXT NOT NULL DEFAULT 'pending',
  executed_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.sj_automation_logs ENABLE ROW LEVEL SECURITY;

-- RLS policies
CREATE POLICY "Users can view SJ automation logs in their workspace"
  ON public.sj_automation_logs FOR SELECT
  USING (workspace_id IN (
    SELECT workspace_id FROM public.workspace_members WHERE user_id = auth.uid()
  ));

CREATE POLICY "Users can create SJ automation logs in their workspace"
  ON public.sj_automation_logs FOR INSERT
  WITH CHECK (workspace_id IN (
    SELECT workspace_id FROM public.workspace_members WHERE user_id = auth.uid()
  ));

-- Create indexes
CREATE INDEX idx_sj_automation_logs_workspace ON public.sj_automation_logs(workspace_id);
CREATE INDEX idx_sj_automation_logs_automation ON public.sj_automation_logs(automation_id);
CREATE INDEX idx_sj_automation_logs_profile ON public.sj_automation_logs(profile_id);
CREATE INDEX idx_sj_automation_logs_executed ON public.sj_automation_logs(executed_at DESC);

-- Student Journey AI Suggestions table
CREATE TABLE public.sj_ai_suggestions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  profile_id UUID REFERENCES public.sj_profiles(id) ON DELETE CASCADE,
  enrollment_id UUID REFERENCES public.sj_enrollments(id) ON DELETE SET NULL,
  suggestion_type TEXT NOT NULL,
  message TEXT NOT NULL,
  priority TEXT DEFAULT 'medium',
  status TEXT DEFAULT 'pending',
  reviewed_by UUID,
  reviewed_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.sj_ai_suggestions ENABLE ROW LEVEL SECURITY;

-- RLS policies
CREATE POLICY "Users can view SJ AI suggestions in their workspace"
  ON public.sj_ai_suggestions FOR SELECT
  USING (workspace_id IN (
    SELECT workspace_id FROM public.workspace_members WHERE user_id = auth.uid()
  ));

CREATE POLICY "Users can manage SJ AI suggestions in their workspace"
  ON public.sj_ai_suggestions FOR ALL
  USING (workspace_id IN (
    SELECT workspace_id FROM public.workspace_members WHERE user_id = auth.uid()
  ));

-- Create indexes
CREATE INDEX idx_sj_ai_suggestions_workspace ON public.sj_ai_suggestions(workspace_id);
CREATE INDEX idx_sj_ai_suggestions_profile ON public.sj_ai_suggestions(profile_id);
CREATE INDEX idx_sj_ai_suggestions_status ON public.sj_ai_suggestions(status) WHERE status = 'pending';

-- Add follow_up_reason column to sj_profiles if not exists
ALTER TABLE public.sj_profiles ADD COLUMN IF NOT EXISTS follow_up_reason TEXT;

-- Trigger for updated_at
CREATE TRIGGER update_sj_automations_updated_at
  BEFORE UPDATE ON public.sj_automations
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();