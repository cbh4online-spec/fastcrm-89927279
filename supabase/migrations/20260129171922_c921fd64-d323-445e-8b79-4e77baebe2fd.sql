-- User Journey: Simplified Conversation Flow Tracking
-- Tracks progression through the ideal conversation path

-- Journey stage definitions
CREATE TABLE public.journey_stages (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  
  -- Stage definition
  stage_code TEXT NOT NULL, -- initiated, connected, collecting, interested, converting, completed
  stage_name TEXT NOT NULL,
  stage_description TEXT,
  stage_order INTEGER NOT NULL,
  
  -- Visual
  icon TEXT,
  color TEXT DEFAULT '#6366f1',
  
  -- Behavior at this stage
  allowed_actions TEXT[] DEFAULT ARRAY['collect', 'qualify', 'respond'],
  blocked_actions TEXT[] DEFAULT '{}', -- e.g., 'sell', 'push_cta'
  auto_advance_condition JSONB, -- condition to auto-advance
  
  -- Completion
  is_terminal BOOLEAN DEFAULT false, -- true for 'completed', 'dropped'
  triggers_stop BOOLEAN DEFAULT false,
  sync_to_crm BOOLEAN DEFAULT true,
  crm_stage_mapping TEXT, -- maps to CRM pipeline stage
  
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  
  UNIQUE(workspace_id, stage_code)
);

-- Conversation journey tracking
CREATE TABLE public.conversation_journey (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  conversation_id UUID NOT NULL,
  lead_id UUID,
  
  -- Current state
  current_stage_id UUID REFERENCES public.journey_stages(id),
  current_stage_code TEXT NOT NULL DEFAULT 'initiated',
  
  -- Journey progress
  started_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  last_stage_change_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  completed_at TIMESTAMP WITH TIME ZONE,
  
  -- Data collection progress
  data_collected JSONB DEFAULT '{}', -- {name: true, interest: true, phase: false}
  objectives_completed TEXT[] DEFAULT '{}',
  
  -- Quality indicators
  engagement_score INTEGER DEFAULT 0, -- 0-100
  interest_level TEXT, -- low, medium, high
  intent_signals TEXT[] DEFAULT '{}',
  
  -- Outcome
  outcome TEXT, -- converted, dropped, escalated, timeout
  outcome_reason TEXT,
  
  -- CRM sync
  crm_synced BOOLEAN DEFAULT false,
  crm_synced_at TIMESTAMP WITH TIME ZONE,
  crm_lead_stage TEXT,
  
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  
  UNIQUE(conversation_id)
);

-- Journey stage transitions log
CREATE TABLE public.journey_transitions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  journey_id UUID NOT NULL REFERENCES public.conversation_journey(id) ON DELETE CASCADE,
  conversation_id UUID NOT NULL,
  
  -- Transition details
  from_stage TEXT,
  to_stage TEXT NOT NULL,
  
  -- Trigger
  trigger_type TEXT NOT NULL, -- auto, objective_complete, user_action, timeout, manual
  trigger_data JSONB DEFAULT '{}',
  
  -- Context
  message_count_at_transition INTEGER,
  time_in_previous_stage_seconds INTEGER,
  
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.journey_stages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.conversation_journey ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.journey_transitions ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Workspace members can view journey stages"
  ON public.journey_stages FOR SELECT
  USING (
    EXISTS (SELECT 1 FROM workspace_members wm WHERE wm.workspace_id = journey_stages.workspace_id AND wm.user_id = auth.uid())
    OR public.is_super_admin(auth.uid())
  );

CREATE POLICY "Admins can manage journey stages"
  ON public.journey_stages FOR ALL
  USING (
    EXISTS (SELECT 1 FROM workspace_members wm WHERE wm.workspace_id = journey_stages.workspace_id AND wm.user_id = auth.uid() AND wm.role IN ('admin', 'owner'))
    OR public.is_super_admin(auth.uid())
  )
  WITH CHECK (
    EXISTS (SELECT 1 FROM workspace_members wm WHERE wm.workspace_id = journey_stages.workspace_id AND wm.user_id = auth.uid() AND wm.role IN ('admin', 'owner'))
    OR public.is_super_admin(auth.uid())
  );

CREATE POLICY "Workspace members can view journeys"
  ON public.conversation_journey FOR SELECT
  USING (
    EXISTS (SELECT 1 FROM workspace_members wm WHERE wm.workspace_id = conversation_journey.workspace_id AND wm.user_id = auth.uid())
    OR public.is_super_admin(auth.uid())
  );

CREATE POLICY "System can manage journeys"
  ON public.conversation_journey FOR ALL
  USING (true) WITH CHECK (true);

CREATE POLICY "Workspace members can view transitions"
  ON public.journey_transitions FOR SELECT
  USING (
    EXISTS (SELECT 1 FROM workspace_members wm WHERE wm.workspace_id = journey_transitions.workspace_id AND wm.user_id = auth.uid())
    OR public.is_super_admin(auth.uid())
  );

CREATE POLICY "System can insert transitions"
  ON public.journey_transitions FOR INSERT
  WITH CHECK (true);

-- Indexes
CREATE INDEX idx_journey_stages_workspace ON public.journey_stages(workspace_id, stage_order);
CREATE INDEX idx_conversation_journey_conv ON public.conversation_journey(conversation_id);
CREATE INDEX idx_conversation_journey_stage ON public.conversation_journey(current_stage_code, workspace_id);
CREATE INDEX idx_conversation_journey_lead ON public.conversation_journey(lead_id) WHERE lead_id IS NOT NULL;
CREATE INDEX idx_journey_transitions_journey ON public.journey_transitions(journey_id, created_at DESC);

-- Trigger
CREATE TRIGGER update_conversation_journey_updated_at
  BEFORE UPDATE ON public.conversation_journey
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Function to advance journey stage
CREATE OR REPLACE FUNCTION public.advance_journey_stage(
  p_conversation_id UUID,
  p_new_stage_code TEXT,
  p_trigger_type TEXT DEFAULT 'auto',
  p_trigger_data JSONB DEFAULT '{}'
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_journey conversation_journey%ROWTYPE;
  v_new_stage journey_stages%ROWTYPE;
  v_old_stage_code TEXT;
  v_time_in_stage INTEGER;
BEGIN
  -- Get current journey
  SELECT * INTO v_journey FROM conversation_journey WHERE conversation_id = p_conversation_id;
  
  IF v_journey.id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Journey not found');
  END IF;
  
  -- Get new stage
  SELECT * INTO v_new_stage FROM journey_stages 
  WHERE workspace_id = v_journey.workspace_id AND stage_code = p_new_stage_code AND is_active = true;
  
  IF v_new_stage.id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Stage not found');
  END IF;
  
  -- Calculate time in previous stage
  v_old_stage_code := v_journey.current_stage_code;
  v_time_in_stage := EXTRACT(EPOCH FROM (now() - v_journey.last_stage_change_at))::INTEGER;
  
  -- Update journey
  UPDATE conversation_journey SET
    current_stage_id = v_new_stage.id,
    current_stage_code = p_new_stage_code,
    last_stage_change_at = now(),
    completed_at = CASE WHEN v_new_stage.is_terminal THEN now() ELSE NULL END,
    updated_at = now()
  WHERE id = v_journey.id;
  
  -- Log transition
  INSERT INTO journey_transitions (
    workspace_id, journey_id, conversation_id,
    from_stage, to_stage, trigger_type, trigger_data,
    time_in_previous_stage_seconds
  ) VALUES (
    v_journey.workspace_id, v_journey.id, p_conversation_id,
    v_old_stage_code, p_new_stage_code, p_trigger_type, p_trigger_data,
    v_time_in_stage
  );
  
  RETURN jsonb_build_object(
    'success', true,
    'from_stage', v_old_stage_code,
    'to_stage', p_new_stage_code,
    'is_terminal', v_new_stage.is_terminal,
    'triggers_stop', v_new_stage.triggers_stop,
    'sync_to_crm', v_new_stage.sync_to_crm,
    'crm_stage', v_new_stage.crm_stage_mapping
  );
END;
$$;

-- Function to initialize journey for new conversation
CREATE OR REPLACE FUNCTION public.init_conversation_journey(
  p_workspace_id UUID,
  p_conversation_id UUID,
  p_lead_id UUID DEFAULT NULL
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_journey_id UUID;
  v_initial_stage journey_stages%ROWTYPE;
BEGIN
  -- Get initial stage
  SELECT * INTO v_initial_stage FROM journey_stages 
  WHERE workspace_id = p_workspace_id AND stage_order = 1 AND is_active = true
  LIMIT 1;
  
  -- Create journey
  INSERT INTO conversation_journey (
    workspace_id, conversation_id, lead_id,
    current_stage_id, current_stage_code
  ) VALUES (
    p_workspace_id, p_conversation_id, p_lead_id,
    v_initial_stage.id, COALESCE(v_initial_stage.stage_code, 'initiated')
  )
  ON CONFLICT (conversation_id) DO NOTHING
  RETURNING id INTO v_journey_id;
  
  RETURN v_journey_id;
END;
$$;

-- Comments
COMMENT ON TABLE public.journey_stages IS 'Defines the stages of the user conversation journey';
COMMENT ON TABLE public.conversation_journey IS 'Tracks each conversation progress through journey stages';
COMMENT ON COLUMN public.journey_stages.blocked_actions IS 'Actions AI cannot take at this stage (e.g., sell, push_cta)';
COMMENT ON COLUMN public.journey_stages.triggers_stop IS 'If true, reaching this stage triggers conversation STOP';