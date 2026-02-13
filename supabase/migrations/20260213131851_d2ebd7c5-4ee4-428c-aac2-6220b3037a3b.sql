
-- Add new columns to communication_templates
ALTER TABLE public.communication_templates 
  ADD COLUMN IF NOT EXISTS dynamic_schema JSONB DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS allowed_channels TEXT[] DEFAULT ARRAY['email','whatsapp','inbox'],
  ADD COLUMN IF NOT EXISTS default_tone TEXT DEFAULT 'consultative',
  ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'active';

-- Template Variants table
CREATE TABLE public.communication_template_variants (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  template_id UUID NOT NULL REFERENCES public.communication_templates(id) ON DELETE CASCADE,
  variant_key TEXT NOT NULL,
  channel TEXT NOT NULL DEFAULT 'email',
  subject TEXT,
  body TEXT NOT NULL,
  cta TEXT,
  tone TEXT DEFAULT 'consultative',
  created_by UUID,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

ALTER TABLE public.communication_template_variants ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view workspace variants"
  ON public.communication_template_variants FOR SELECT
  USING (workspace_id IN (
    SELECT workspace_id FROM public.workspace_members WHERE user_id = auth.uid()
  ));

CREATE POLICY "Users can insert workspace variants"
  ON public.communication_template_variants FOR INSERT
  WITH CHECK (workspace_id IN (
    SELECT workspace_id FROM public.workspace_members WHERE user_id = auth.uid()
  ));

CREATE POLICY "Users can update workspace variants"
  ON public.communication_template_variants FOR UPDATE
  USING (workspace_id IN (
    SELECT workspace_id FROM public.workspace_members WHERE user_id = auth.uid()
  ));

CREATE POLICY "Users can delete workspace variants"
  ON public.communication_template_variants FOR DELETE
  USING (workspace_id IN (
    SELECT workspace_id FROM public.workspace_members WHERE user_id = auth.uid()
  ));

-- Template Usage Events table (telemetry)
CREATE TABLE public.template_usage_events (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  template_id UUID NOT NULL REFERENCES public.communication_templates(id) ON DELETE CASCADE,
  variant_id UUID REFERENCES public.communication_template_variants(id) ON DELETE SET NULL,
  conversation_id UUID,
  message_id UUID,
  channel TEXT NOT NULL DEFAULT 'email',
  pipeline_stage TEXT,
  lead_id UUID,
  contact_id UUID,
  company_id UUID,
  intent_label TEXT,
  sentiment_label TEXT,
  lead_score INTEGER,
  potential_value NUMERIC,
  event_type TEXT NOT NULL CHECK (event_type IN (
    'inserted','sent','delivered','opened','clicked','replied','opportunity_created','deal_won'
  )),
  event_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

ALTER TABLE public.template_usage_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view workspace events"
  ON public.template_usage_events FOR SELECT
  USING (workspace_id IN (
    SELECT workspace_id FROM public.workspace_members WHERE user_id = auth.uid()
  ));

CREATE POLICY "Users can insert workspace events"
  ON public.template_usage_events FOR INSERT
  WITH CHECK (workspace_id IN (
    SELECT workspace_id FROM public.workspace_members WHERE user_id = auth.uid()
  ));

-- Workspace Learning Stats table (aggregates)
CREATE TABLE public.workspace_template_stats (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  template_id UUID NOT NULL REFERENCES public.communication_templates(id) ON DELETE CASCADE,
  variant_id UUID REFERENCES public.communication_template_variants(id) ON DELETE SET NULL,
  channel TEXT NOT NULL DEFAULT 'email',
  pipeline_stage TEXT,
  industry TEXT,
  tone TEXT,
  samples INTEGER DEFAULT 0,
  reply_rate NUMERIC DEFAULT 0,
  opportunity_rate NUMERIC DEFAULT 0,
  win_rate NUMERIC DEFAULT 0,
  avg_time_to_reply_minutes NUMERIC DEFAULT 0,
  score NUMERIC DEFAULT 0,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

ALTER TABLE public.workspace_template_stats ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view workspace stats"
  ON public.workspace_template_stats FOR SELECT
  USING (workspace_id IN (
    SELECT workspace_id FROM public.workspace_members WHERE user_id = auth.uid()
  ));

CREATE POLICY "Users can manage workspace stats"
  ON public.workspace_template_stats FOR ALL
  USING (workspace_id IN (
    SELECT workspace_id FROM public.workspace_members WHERE user_id = auth.uid()
  ));

-- Indexes for performance
CREATE INDEX idx_template_variants_template ON public.communication_template_variants(template_id);
CREATE INDEX idx_template_variants_workspace ON public.communication_template_variants(workspace_id);
CREATE INDEX idx_usage_events_template ON public.template_usage_events(template_id);
CREATE INDEX idx_usage_events_workspace ON public.template_usage_events(workspace_id);
CREATE INDEX idx_usage_events_conversation ON public.template_usage_events(conversation_id);
CREATE INDEX idx_usage_events_event_type ON public.template_usage_events(event_type);
CREATE INDEX idx_template_stats_workspace ON public.workspace_template_stats(workspace_id);
CREATE INDEX idx_template_stats_template ON public.workspace_template_stats(template_id, variant_id);

-- Enable realtime for usage events (for live dashboards)
ALTER PUBLICATION supabase_realtime ADD TABLE public.workspace_template_stats;
