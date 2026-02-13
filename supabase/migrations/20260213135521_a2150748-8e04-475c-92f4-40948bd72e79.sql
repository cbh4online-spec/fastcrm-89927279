
-- 1. Add length_profiles to persuasion_structures
ALTER TABLE public.persuasion_structures
ADD COLUMN IF NOT EXISTS length_profiles JSONB DEFAULT '{"email": {"short": 700, "medium": 1200, "long": 1600}, "whatsapp": {"short": 220, "medium": 350, "long": 500}}';

-- 2. Create lead_behavior_signals
CREATE TABLE public.lead_behavior_signals (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  contact_id UUID NULL,
  lead_id UUID NULL,
  channel_preference TEXT NULL,
  response_latency_avg_minutes NUMERIC DEFAULT 0,
  reply_rate_last_30d NUMERIC DEFAULT 0,
  followup_needed_rate NUMERIC DEFAULT 0,
  reading_proxy_score NUMERIC DEFAULT 0,
  engagement_depth_score NUMERIC DEFAULT 0,
  last_seen_at TIMESTAMP WITH TIME ZONE NULL,
  last_updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

CREATE INDEX idx_lead_behavior_signals_workspace ON public.lead_behavior_signals(workspace_id);
CREATE INDEX idx_lead_behavior_signals_contact ON public.lead_behavior_signals(contact_id);
CREATE INDEX idx_lead_behavior_signals_lead ON public.lead_behavior_signals(lead_id);
CREATE UNIQUE INDEX idx_lead_behavior_signals_unique ON public.lead_behavior_signals(workspace_id, COALESCE(contact_id, '00000000-0000-0000-0000-000000000000'::uuid), COALESCE(lead_id, '00000000-0000-0000-0000-000000000000'::uuid));

ALTER TABLE public.lead_behavior_signals ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view signals in their workspace"
ON public.lead_behavior_signals FOR SELECT
USING (workspace_id IN (SELECT workspace_id FROM public.workspace_members WHERE user_id = auth.uid()));

CREATE POLICY "Users can insert signals in their workspace"
ON public.lead_behavior_signals FOR INSERT
WITH CHECK (workspace_id IN (SELECT workspace_id FROM public.workspace_members WHERE user_id = auth.uid()));

CREATE POLICY "Users can update signals in their workspace"
ON public.lead_behavior_signals FOR UPDATE
USING (workspace_id IN (SELECT workspace_id FROM public.workspace_members WHERE user_id = auth.uid()));

CREATE POLICY "Users can delete signals in their workspace"
ON public.lead_behavior_signals FOR DELETE
USING (workspace_id IN (SELECT workspace_id FROM public.workspace_members WHERE user_id = auth.uid()));

-- Service role bypass for edge functions
CREATE POLICY "Service role full access to lead_behavior_signals"
ON public.lead_behavior_signals FOR ALL
USING (true)
WITH CHECK (true);

-- 3. Create message_length_events
CREATE TABLE public.message_length_events (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  conversation_id UUID NULL,
  template_id UUID NULL,
  structure_key TEXT NOT NULL,
  channel TEXT NOT NULL DEFAULT 'email',
  pipeline_stage TEXT NULL,
  intent_label TEXT NULL,
  chosen_length TEXT NOT NULL,
  char_count INT NOT NULL DEFAULT 0,
  event_type TEXT NOT NULL,
  event_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

CREATE INDEX idx_message_length_events_workspace ON public.message_length_events(workspace_id);
CREATE INDEX idx_message_length_events_lookup ON public.message_length_events(workspace_id, structure_key, channel, chosen_length);

ALTER TABLE public.message_length_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view length events in their workspace"
ON public.message_length_events FOR SELECT
USING (workspace_id IN (SELECT workspace_id FROM public.workspace_members WHERE user_id = auth.uid()));

CREATE POLICY "Users can insert length events in their workspace"
ON public.message_length_events FOR INSERT
WITH CHECK (workspace_id IN (SELECT workspace_id FROM public.workspace_members WHERE user_id = auth.uid()));

-- Service role bypass
CREATE POLICY "Service role full access to message_length_events"
ON public.message_length_events FOR ALL
USING (true)
WITH CHECK (true);

-- 4. Add chosen_length to workspace_structure_stats
ALTER TABLE public.workspace_structure_stats
ADD COLUMN IF NOT EXISTS chosen_length TEXT NULL;

-- 5. Seed length_profiles for existing structures
UPDATE public.persuasion_structures SET length_profiles = '{"email": {"short": 700, "medium": 1200, "long": 1600}, "whatsapp": {"short": 220, "medium": 350, "long": 500}}' WHERE key = 'AIDA';
UPDATE public.persuasion_structures SET length_profiles = '{"whatsapp": {"short": 150, "medium": 250, "long": 350}}' WHERE key = 'AIDA_SHORT';
UPDATE public.persuasion_structures SET length_profiles = '{"email": {"short": 600, "medium": 1000, "long": 1400}, "whatsapp": {"short": 220, "medium": 350, "long": 500}}' WHERE key = 'PAS';
UPDATE public.persuasion_structures SET length_profiles = '{"email": {"short": 650, "medium": 1100, "long": 1500}, "whatsapp": {"short": 220, "medium": 350, "long": 500}}' WHERE key = 'BAB';
UPDATE public.persuasion_structures SET length_profiles = '{"email": {"short": 550, "medium": 950, "long": 1300}, "whatsapp": {"short": 220, "medium": 350, "long": 500}}' WHERE key = '4P';
UPDATE public.persuasion_structures SET length_profiles = '{"email": {"short": 500, "medium": 900, "long": 1200}, "whatsapp": {"short": 200, "medium": 300, "long": 450}}' WHERE key = 'REENGAGE';
