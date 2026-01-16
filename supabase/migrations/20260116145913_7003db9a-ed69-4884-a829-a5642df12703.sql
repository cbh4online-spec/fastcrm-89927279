-- Create communication_templates table
CREATE TABLE public.communication_templates (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  channel TEXT NOT NULL CHECK (channel IN ('email', 'whatsapp', 'inbox', 'note')),
  language TEXT NOT NULL DEFAULT 'pt',
  journey_contexts TEXT[] DEFAULT '{}',
  subject TEXT,
  body TEXT NOT NULL,
  body_html TEXT,
  tone TEXT DEFAULT 'professional',
  is_active BOOLEAN DEFAULT true,
  usage_count INTEGER DEFAULT 0,
  response_rate NUMERIC(5,2),
  created_by UUID NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Create template_usage_logs for metrics
CREATE TABLE public.template_usage_logs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  template_id UUID NOT NULL REFERENCES public.communication_templates(id) ON DELETE CASCADE,
  entity_type TEXT NOT NULL CHECK (entity_type IN ('contact', 'company', 'lead')),
  entity_id UUID NOT NULL,
  channel TEXT NOT NULL,
  used_by UUID NOT NULL,
  automation_id UUID REFERENCES public.journey_automations(id) ON DELETE SET NULL,
  response_received BOOLEAN DEFAULT false,
  converted BOOLEAN DEFAULT false,
  used_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Add indexes
CREATE INDEX idx_communication_templates_workspace ON public.communication_templates(workspace_id);
CREATE INDEX idx_communication_templates_channel ON public.communication_templates(workspace_id, channel);
CREATE INDEX idx_communication_templates_active ON public.communication_templates(workspace_id, is_active);
CREATE INDEX idx_template_usage_logs_workspace ON public.template_usage_logs(workspace_id);
CREATE INDEX idx_template_usage_logs_template ON public.template_usage_logs(template_id);

-- Enable RLS
ALTER TABLE public.communication_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.template_usage_logs ENABLE ROW LEVEL SECURITY;

-- RLS policies for communication_templates
CREATE POLICY "Users can view templates in their workspace"
  ON public.communication_templates FOR SELECT
  USING (workspace_id IN (
    SELECT workspace_id FROM public.workspace_members WHERE user_id = auth.uid()
  ));

CREATE POLICY "Admins can create templates"
  ON public.communication_templates FOR INSERT
  WITH CHECK (workspace_id IN (
    SELECT workspace_id FROM public.workspace_members 
    WHERE user_id = auth.uid() AND role IN ('owner', 'admin', 'agency')
  ));

CREATE POLICY "Admins can update templates"
  ON public.communication_templates FOR UPDATE
  USING (workspace_id IN (
    SELECT workspace_id FROM public.workspace_members 
    WHERE user_id = auth.uid() AND role IN ('owner', 'admin', 'agency')
  ));

CREATE POLICY "Admins can delete templates"
  ON public.communication_templates FOR DELETE
  USING (workspace_id IN (
    SELECT workspace_id FROM public.workspace_members 
    WHERE user_id = auth.uid() AND role IN ('owner', 'admin', 'agency')
  ));

-- RLS policies for template_usage_logs
CREATE POLICY "Users can view usage logs in their workspace"
  ON public.template_usage_logs FOR SELECT
  USING (workspace_id IN (
    SELECT workspace_id FROM public.workspace_members WHERE user_id = auth.uid()
  ));

CREATE POLICY "Users can create usage logs"
  ON public.template_usage_logs FOR INSERT
  WITH CHECK (workspace_id IN (
    SELECT workspace_id FROM public.workspace_members WHERE user_id = auth.uid()
  ));

-- Trigger for updated_at
CREATE TRIGGER update_communication_templates_updated_at
  BEFORE UPDATE ON public.communication_templates
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Function to increment template usage count
CREATE OR REPLACE FUNCTION public.increment_template_usage()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE public.communication_templates 
  SET usage_count = usage_count + 1 
  WHERE id = NEW.template_id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_template_usage_increment
  AFTER INSERT ON public.template_usage_logs
  FOR EACH ROW
  EXECUTE FUNCTION public.increment_template_usage();