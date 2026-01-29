-- Auto-Pilot Configuration: Controlled AI Replies
-- Global and per-persona settings for automated responses

-- Main autopilot_config table
CREATE TABLE public.autopilot_config (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  
  -- Scope
  config_scope TEXT NOT NULL DEFAULT 'workspace', -- workspace, persona, channel
  persona_id UUID REFERENCES public.ai_personas(id) ON DELETE CASCADE,
  channel TEXT, -- widget, whatsapp, email, sms
  
  -- Response timing
  response_delay_min INTEGER NOT NULL DEFAULT 8, -- minimum seconds
  response_delay_max INTEGER NOT NULL DEFAULT 12, -- maximum seconds
  typing_indicator BOOLEAN NOT NULL DEFAULT true,
  
  -- Conversation limits
  max_messages_per_conversation INTEGER NOT NULL DEFAULT 25,
  max_messages_per_hour INTEGER DEFAULT 100,
  cooldown_after_limit INTEGER DEFAULT 300, -- seconds to wait after hitting limit
  
  -- Human handoff behavior
  sleep_on_human_reply BOOLEAN NOT NULL DEFAULT true,
  auto_reactivate BOOLEAN NOT NULL DEFAULT true,
  reactivation_hours INTEGER DEFAULT 24, -- hours until auto-reactivation
  reactivation_message TEXT, -- optional message when reactivating
  
  -- Input capabilities
  accept_images BOOLEAN NOT NULL DEFAULT false,
  accept_voice BOOLEAN NOT NULL DEFAULT false,
  accept_files BOOLEAN NOT NULL DEFAULT false,
  voice_transcription_enabled BOOLEAN DEFAULT false,
  image_analysis_enabled BOOLEAN DEFAULT false,
  
  -- Working hours
  respect_working_hours BOOLEAN DEFAULT false,
  working_hours_start TIME DEFAULT '09:00',
  working_hours_end TIME DEFAULT '18:00',
  working_days INTEGER[] DEFAULT ARRAY[1,2,3,4,5], -- 0=Sun, 1=Mon, etc.
  timezone TEXT DEFAULT 'Europe/Lisbon',
  out_of_hours_message TEXT,
  
  -- Safety limits
  max_consecutive_bot_messages INTEGER DEFAULT 3,
  require_human_after_escalation BOOLEAN DEFAULT true,
  
  -- Status
  is_active BOOLEAN NOT NULL DEFAULT true,
  
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  
  -- Ensure one config per scope
  UNIQUE(workspace_id, config_scope, persona_id, channel)
);

-- Conversation autopilot state tracking
CREATE TABLE public.conversation_autopilot_state (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  conversation_id UUID NOT NULL,
  
  -- Current state
  is_active BOOLEAN NOT NULL DEFAULT true,
  state TEXT NOT NULL DEFAULT 'active', -- active, sleeping, paused, limit_reached, escalated
  
  -- Counters
  bot_message_count INTEGER DEFAULT 0,
  total_message_count INTEGER DEFAULT 0,
  consecutive_bot_messages INTEGER DEFAULT 0,
  
  -- Timing
  last_bot_message_at TIMESTAMP WITH TIME ZONE,
  last_human_message_at TIMESTAMP WITH TIME ZONE,
  sleeping_since TIMESTAMP WITH TIME ZONE,
  scheduled_reactivation TIMESTAMP WITH TIME ZONE,
  
  -- Events
  paused_reason TEXT,
  paused_by UUID REFERENCES auth.users(id),
  
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  
  UNIQUE(conversation_id)
);

-- Autopilot event log
CREATE TABLE public.autopilot_events (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  conversation_id UUID NOT NULL,
  
  event_type TEXT NOT NULL, -- activated, deactivated, sleeping, reactivated, limit_reached, human_takeover
  event_data JSONB DEFAULT '{}',
  
  triggered_by TEXT, -- system, human, schedule, limit
  user_id UUID REFERENCES auth.users(id),
  
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.autopilot_config ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.conversation_autopilot_state ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.autopilot_events ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Workspace members can view autopilot config"
  ON public.autopilot_config FOR SELECT
  USING (
    EXISTS (SELECT 1 FROM workspace_members wm WHERE wm.workspace_id = autopilot_config.workspace_id AND wm.user_id = auth.uid())
    OR public.is_super_admin(auth.uid())
  );

CREATE POLICY "Admins can manage autopilot config"
  ON public.autopilot_config FOR ALL
  USING (
    EXISTS (SELECT 1 FROM workspace_members wm WHERE wm.workspace_id = autopilot_config.workspace_id AND wm.user_id = auth.uid() AND wm.role IN ('admin', 'owner'))
    OR public.is_super_admin(auth.uid())
  )
  WITH CHECK (
    EXISTS (SELECT 1 FROM workspace_members wm WHERE wm.workspace_id = autopilot_config.workspace_id AND wm.user_id = auth.uid() AND wm.role IN ('admin', 'owner'))
    OR public.is_super_admin(auth.uid())
  );

CREATE POLICY "Workspace members can view autopilot state"
  ON public.conversation_autopilot_state FOR SELECT
  USING (
    EXISTS (SELECT 1 FROM workspace_members wm WHERE wm.workspace_id = conversation_autopilot_state.workspace_id AND wm.user_id = auth.uid())
    OR public.is_super_admin(auth.uid())
  );

CREATE POLICY "System can manage autopilot state"
  ON public.conversation_autopilot_state FOR ALL
  USING (true) WITH CHECK (true);

CREATE POLICY "Workspace members can view autopilot events"
  ON public.autopilot_events FOR SELECT
  USING (
    EXISTS (SELECT 1 FROM workspace_members wm WHERE wm.workspace_id = autopilot_events.workspace_id AND wm.user_id = auth.uid())
    OR public.is_super_admin(auth.uid())
  );

CREATE POLICY "System can insert autopilot events"
  ON public.autopilot_events FOR INSERT
  WITH CHECK (true);

-- Indexes
CREATE INDEX idx_autopilot_config_workspace ON public.autopilot_config(workspace_id, is_active);
CREATE INDEX idx_autopilot_config_persona ON public.autopilot_config(persona_id) WHERE persona_id IS NOT NULL;
CREATE INDEX idx_autopilot_state_conversation ON public.conversation_autopilot_state(conversation_id);
CREATE INDEX idx_autopilot_state_reactivation ON public.conversation_autopilot_state(scheduled_reactivation) WHERE scheduled_reactivation IS NOT NULL;
CREATE INDEX idx_autopilot_events_conversation ON public.autopilot_events(conversation_id, created_at DESC);

-- Triggers
CREATE TRIGGER update_autopilot_config_updated_at
  BEFORE UPDATE ON public.autopilot_config
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_autopilot_state_updated_at
  BEFORE UPDATE ON public.conversation_autopilot_state
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Function to get effective config for a conversation
CREATE OR REPLACE FUNCTION public.get_autopilot_config(
  p_workspace_id UUID,
  p_persona_id UUID DEFAULT NULL,
  p_channel TEXT DEFAULT NULL
)
RETURNS public.autopilot_config
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_config autopilot_config%ROWTYPE;
BEGIN
  -- Try persona + channel specific
  IF p_persona_id IS NOT NULL AND p_channel IS NOT NULL THEN
    SELECT * INTO v_config FROM autopilot_config
    WHERE workspace_id = p_workspace_id 
      AND persona_id = p_persona_id 
      AND channel = p_channel 
      AND is_active = true
    LIMIT 1;
    IF FOUND THEN RETURN v_config; END IF;
  END IF;
  
  -- Try persona specific
  IF p_persona_id IS NOT NULL THEN
    SELECT * INTO v_config FROM autopilot_config
    WHERE workspace_id = p_workspace_id 
      AND persona_id = p_persona_id 
      AND channel IS NULL 
      AND is_active = true
    LIMIT 1;
    IF FOUND THEN RETURN v_config; END IF;
  END IF;
  
  -- Try channel specific
  IF p_channel IS NOT NULL THEN
    SELECT * INTO v_config FROM autopilot_config
    WHERE workspace_id = p_workspace_id 
      AND persona_id IS NULL 
      AND channel = p_channel 
      AND is_active = true
    LIMIT 1;
    IF FOUND THEN RETURN v_config; END IF;
  END IF;
  
  -- Fall back to workspace default
  SELECT * INTO v_config FROM autopilot_config
  WHERE workspace_id = p_workspace_id 
    AND config_scope = 'workspace' 
    AND persona_id IS NULL 
    AND channel IS NULL 
    AND is_active = true
  LIMIT 1;
  
  RETURN v_config;
END;
$$;

-- Function to check if bot should respond
CREATE OR REPLACE FUNCTION public.should_bot_respond(
  p_conversation_id UUID,
  p_workspace_id UUID
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_state conversation_autopilot_state%ROWTYPE;
  v_config autopilot_config%ROWTYPE;
  v_result JSONB;
BEGIN
  -- Get current state
  SELECT * INTO v_state FROM conversation_autopilot_state WHERE conversation_id = p_conversation_id;
  
  -- Get config
  SELECT * INTO v_config FROM get_autopilot_config(p_workspace_id);
  
  -- No state = first message, allow
  IF v_state.id IS NULL THEN
    RETURN jsonb_build_object('should_respond', true, 'delay_seconds', floor(random() * (v_config.response_delay_max - v_config.response_delay_min + 1) + v_config.response_delay_min));
  END IF;
  
  -- Check state
  IF v_state.state = 'sleeping' THEN
    RETURN jsonb_build_object('should_respond', false, 'reason', 'sleeping', 'reactivates_at', v_state.scheduled_reactivation);
  END IF;
  
  IF v_state.state = 'paused' THEN
    RETURN jsonb_build_object('should_respond', false, 'reason', 'paused');
  END IF;
  
  IF v_state.state = 'escalated' AND v_config.require_human_after_escalation THEN
    RETURN jsonb_build_object('should_respond', false, 'reason', 'escalated');
  END IF;
  
  -- Check limits
  IF v_state.bot_message_count >= v_config.max_messages_per_conversation THEN
    RETURN jsonb_build_object('should_respond', false, 'reason', 'limit_reached', 'limit', v_config.max_messages_per_conversation);
  END IF;
  
  IF v_state.consecutive_bot_messages >= v_config.max_consecutive_bot_messages THEN
    RETURN jsonb_build_object('should_respond', false, 'reason', 'consecutive_limit', 'limit', v_config.max_consecutive_bot_messages);
  END IF;
  
  -- All checks passed
  RETURN jsonb_build_object(
    'should_respond', true, 
    'delay_seconds', floor(random() * (v_config.response_delay_max - v_config.response_delay_min + 1) + v_config.response_delay_min),
    'show_typing', v_config.typing_indicator
  );
END;
$$;

COMMENT ON TABLE public.autopilot_config IS 'Auto-pilot configuration for controlled AI replies';
COMMENT ON COLUMN public.autopilot_config.sleep_on_human_reply IS 'Deactivate bot when a human team member replies';
COMMENT ON COLUMN public.autopilot_config.reactivation_hours IS 'Hours after sleeping before auto-reactivation';