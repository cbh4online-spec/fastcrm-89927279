-- AI Personas as Decision Layer
-- Defines how the AI thinks and acts strategically

-- Add decision layer fields to ai_personas
ALTER TABLE public.ai_personas
ADD COLUMN IF NOT EXISTS primary_goal TEXT,
ADD COLUMN IF NOT EXISTS secondary_goal TEXT,
ADD COLUMN IF NOT EXISTS stop_conditions JSONB DEFAULT '[]',
ADD COLUMN IF NOT EXISTS escalation_rules JSONB DEFAULT '[]',
ADD COLUMN IF NOT EXISTS allowed_channels TEXT[] DEFAULT ARRAY['widget', 'whatsapp', 'email', 'sms', 'chat'],
ADD COLUMN IF NOT EXISTS language_code TEXT DEFAULT 'pt-PT',
ADD COLUMN IF NOT EXISTS use_emojis BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS response_style TEXT DEFAULT 'concise', -- concise, detailed, conversational
ADD COLUMN IF NOT EXISTS max_questions_per_turn INTEGER DEFAULT 2,
ADD COLUMN IF NOT EXISTS decision_framework JSONB DEFAULT '{}';

-- Comments for documentation
COMMENT ON COLUMN public.ai_personas.primary_goal IS 'Main objective for this persona (e.g., obter pré-inscrição)';
COMMENT ON COLUMN public.ai_personas.secondary_goal IS 'Secondary objective (e.g., compreender interesse)';
COMMENT ON COLUMN public.ai_personas.stop_conditions IS 'Conditions that halt the conversation flow: [{condition, action, message}]';
COMMENT ON COLUMN public.ai_personas.escalation_rules IS 'When and how to escalate to human: [{trigger, priority, notify_channel}]';
COMMENT ON COLUMN public.ai_personas.allowed_channels IS 'Channels where this persona can operate';
COMMENT ON COLUMN public.ai_personas.language_code IS 'Primary language code (e.g., pt-PT, en-US)';
COMMENT ON COLUMN public.ai_personas.use_emojis IS 'Whether to use emojis in responses';
COMMENT ON COLUMN public.ai_personas.response_style IS 'concise, detailed, or conversational';
COMMENT ON COLUMN public.ai_personas.max_questions_per_turn IS 'Maximum questions to ask per response';
COMMENT ON COLUMN public.ai_personas.decision_framework IS 'Strategic decision rules for the persona';

-- Create persona_goals table for structured goal tracking
CREATE TABLE public.persona_goals (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  persona_id UUID NOT NULL REFERENCES public.ai_personas(id) ON DELETE CASCADE,
  workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  
  -- Goal definition
  goal_type TEXT NOT NULL DEFAULT 'primary', -- primary, secondary, micro
  goal_name TEXT NOT NULL,
  goal_description TEXT,
  
  -- Success criteria
  success_variable TEXT, -- variable name to check
  success_condition TEXT NOT NULL DEFAULT 'exists', -- exists, equals, contains, gt, lt
  success_value TEXT, -- expected value
  
  -- Tracking
  priority INTEGER NOT NULL DEFAULT 50,
  is_active BOOLEAN NOT NULL DEFAULT true,
  
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create persona_stop_conditions for structured stop rules
CREATE TABLE public.persona_stop_conditions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  persona_id UUID NOT NULL REFERENCES public.ai_personas(id) ON DELETE CASCADE,
  workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  
  -- Condition
  condition_name TEXT NOT NULL,
  condition_type TEXT NOT NULL DEFAULT 'variable', -- variable, intent, keyword, time, goal_achieved
  condition_config JSONB NOT NULL DEFAULT '{}',
  
  -- Action when triggered
  stop_action TEXT NOT NULL DEFAULT 'pause', -- pause, end, escalate, redirect
  stop_message TEXT, -- Optional message to send
  
  priority INTEGER NOT NULL DEFAULT 50,
  is_active BOOLEAN NOT NULL DEFAULT true,
  
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create persona_escalation_rules
CREATE TABLE public.persona_escalation_rules (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  persona_id UUID NOT NULL REFERENCES public.ai_personas(id) ON DELETE CASCADE,
  workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  
  -- Trigger
  rule_name TEXT NOT NULL,
  trigger_type TEXT NOT NULL DEFAULT 'keyword', -- keyword, sentiment, intent, timeout, loop_detected, explicit_request
  trigger_config JSONB NOT NULL DEFAULT '{}',
  
  -- Escalation config
  escalation_priority TEXT NOT NULL DEFAULT 'normal', -- low, normal, high, urgent
  notify_channels TEXT[] DEFAULT ARRAY['inbox'],
  assign_to_user_id UUID REFERENCES auth.users(id),
  assign_to_team TEXT,
  
  -- Message
  escalation_message TEXT,
  internal_note TEXT,
  
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.persona_goals ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.persona_stop_conditions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.persona_escalation_rules ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Workspace members can view persona goals"
  ON public.persona_goals FOR SELECT
  USING (
    EXISTS (SELECT 1 FROM workspace_members wm WHERE wm.workspace_id = persona_goals.workspace_id AND wm.user_id = auth.uid())
    OR public.is_super_admin(auth.uid())
  );

CREATE POLICY "Admins can manage persona goals"
  ON public.persona_goals FOR ALL
  USING (
    EXISTS (SELECT 1 FROM workspace_members wm WHERE wm.workspace_id = persona_goals.workspace_id AND wm.user_id = auth.uid() AND wm.role IN ('admin', 'owner'))
    OR public.is_super_admin(auth.uid())
  )
  WITH CHECK (
    EXISTS (SELECT 1 FROM workspace_members wm WHERE wm.workspace_id = persona_goals.workspace_id AND wm.user_id = auth.uid() AND wm.role IN ('admin', 'owner'))
    OR public.is_super_admin(auth.uid())
  );

CREATE POLICY "Workspace members can view stop conditions"
  ON public.persona_stop_conditions FOR SELECT
  USING (
    EXISTS (SELECT 1 FROM workspace_members wm WHERE wm.workspace_id = persona_stop_conditions.workspace_id AND wm.user_id = auth.uid())
    OR public.is_super_admin(auth.uid())
  );

CREATE POLICY "Admins can manage stop conditions"
  ON public.persona_stop_conditions FOR ALL
  USING (
    EXISTS (SELECT 1 FROM workspace_members wm WHERE wm.workspace_id = persona_stop_conditions.workspace_id AND wm.user_id = auth.uid() AND wm.role IN ('admin', 'owner'))
    OR public.is_super_admin(auth.uid())
  )
  WITH CHECK (
    EXISTS (SELECT 1 FROM workspace_members wm WHERE wm.workspace_id = persona_stop_conditions.workspace_id AND wm.user_id = auth.uid() AND wm.role IN ('admin', 'owner'))
    OR public.is_super_admin(auth.uid())
  );

CREATE POLICY "Workspace members can view escalation rules"
  ON public.persona_escalation_rules FOR SELECT
  USING (
    EXISTS (SELECT 1 FROM workspace_members wm WHERE wm.workspace_id = persona_escalation_rules.workspace_id AND wm.user_id = auth.uid())
    OR public.is_super_admin(auth.uid())
  );

CREATE POLICY "Admins can manage escalation rules"
  ON public.persona_escalation_rules FOR ALL
  USING (
    EXISTS (SELECT 1 FROM workspace_members wm WHERE wm.workspace_id = persona_escalation_rules.workspace_id AND wm.user_id = auth.uid() AND wm.role IN ('admin', 'owner'))
    OR public.is_super_admin(auth.uid())
  )
  WITH CHECK (
    EXISTS (SELECT 1 FROM workspace_members wm WHERE wm.workspace_id = persona_escalation_rules.workspace_id AND wm.user_id = auth.uid() AND wm.role IN ('admin', 'owner'))
    OR public.is_super_admin(auth.uid())
  );

-- Indexes
CREATE INDEX idx_persona_goals_persona ON public.persona_goals(persona_id, goal_type, is_active);
CREATE INDEX idx_persona_stop_persona ON public.persona_stop_conditions(persona_id, is_active);
CREATE INDEX idx_persona_escalation_persona ON public.persona_escalation_rules(persona_id, is_active);

-- Function to get full persona decision config
CREATE OR REPLACE FUNCTION public.get_persona_decision_config(p_persona_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_result JSONB;
BEGIN
  SELECT jsonb_build_object(
    'persona', row_to_json(p.*),
    'goals', COALESCE((
      SELECT jsonb_agg(row_to_json(g.*) ORDER BY g.priority DESC)
      FROM persona_goals g WHERE g.persona_id = p_persona_id AND g.is_active = true
    ), '[]'::jsonb),
    'stop_conditions', COALESCE((
      SELECT jsonb_agg(row_to_json(s.*) ORDER BY s.priority DESC)
      FROM persona_stop_conditions s WHERE s.persona_id = p_persona_id AND s.is_active = true
    ), '[]'::jsonb),
    'escalation_rules', COALESCE((
      SELECT jsonb_agg(row_to_json(e.*))
      FROM persona_escalation_rules e WHERE e.persona_id = p_persona_id AND e.is_active = true
    ), '[]'::jsonb)
  ) INTO v_result
  FROM ai_personas p
  WHERE p.id = p_persona_id;
  
  RETURN v_result;
END;
$$;