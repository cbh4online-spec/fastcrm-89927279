-- Conversation Rules Engine: Behavior Layer
-- Structured rules system outside of AI prompts

-- Create enum for rule types
CREATE TYPE public.conversation_rule_type AS ENUM ('DO', 'DONT', 'STOP', 'REDIRECT');

-- Create enum for rule scope
CREATE TYPE public.conversation_rule_scope AS ENUM ('workspace', 'ai_persona', 'flow', 'channel');

-- Main conversation_rules table
CREATE TABLE public.conversation_rules (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  
  -- Rule definition
  name TEXT NOT NULL,
  description TEXT,
  rule_type public.conversation_rule_type NOT NULL,
  
  -- Condition matching
  condition_type TEXT NOT NULL DEFAULT 'keyword', -- keyword, intent, regex, context, variable
  condition_value JSONB NOT NULL DEFAULT '{}', -- flexible condition configuration
  condition_description TEXT, -- human-readable description of when this triggers
  
  -- Action to take
  action_type TEXT NOT NULL DEFAULT 'respond', -- respond, defer, redirect, escalate, block, collect
  action_config JSONB NOT NULL DEFAULT '{}', -- action-specific configuration
  action_message TEXT, -- optional canned response
  
  -- Prioritization
  priority INTEGER NOT NULL DEFAULT 50, -- higher = evaluated first
  
  -- Scope
  scope public.conversation_rule_scope NOT NULL DEFAULT 'workspace',
  scope_entity_id UUID, -- optional: specific persona_id, flow_id, etc.
  
  -- Activation
  is_active BOOLEAN NOT NULL DEFAULT true,
  valid_from TIMESTAMP WITH TIME ZONE,
  valid_until TIMESTAMP WITH TIME ZONE,
  
  -- Metadata
  tags TEXT[] DEFAULT '{}',
  created_by UUID NOT NULL REFERENCES auth.users(id),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Rule execution log for analytics
CREATE TABLE public.conversation_rule_executions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  rule_id UUID NOT NULL REFERENCES public.conversation_rules(id) ON DELETE CASCADE,
  conversation_id UUID NOT NULL,
  message_id UUID,
  
  -- Context
  trigger_text TEXT, -- what triggered the rule
  condition_matched JSONB, -- which condition matched
  action_taken TEXT,
  
  -- Result
  was_successful BOOLEAN DEFAULT true,
  override_reason TEXT, -- if manually overridden
  
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.conversation_rules ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.conversation_rule_executions ENABLE ROW LEVEL SECURITY;

-- RLS Policies for conversation_rules
CREATE POLICY "Workspace members can view rules"
  ON public.conversation_rules FOR SELECT
  USING (
    EXISTS (SELECT 1 FROM workspace_members wm WHERE wm.workspace_id = conversation_rules.workspace_id AND wm.user_id = auth.uid())
    OR public.is_super_admin(auth.uid())
  );

CREATE POLICY "Admins can manage rules"
  ON public.conversation_rules FOR ALL
  USING (
    EXISTS (SELECT 1 FROM workspace_members wm WHERE wm.workspace_id = conversation_rules.workspace_id AND wm.user_id = auth.uid() AND wm.role IN ('admin', 'owner'))
    OR public.is_super_admin(auth.uid())
  )
  WITH CHECK (
    EXISTS (SELECT 1 FROM workspace_members wm WHERE wm.workspace_id = conversation_rules.workspace_id AND wm.user_id = auth.uid() AND wm.role IN ('admin', 'owner'))
    OR public.is_super_admin(auth.uid())
  );

-- RLS for executions (read-only for members)
CREATE POLICY "Workspace members can view rule executions"
  ON public.conversation_rule_executions FOR SELECT
  USING (
    EXISTS (SELECT 1 FROM workspace_members wm WHERE wm.workspace_id = conversation_rule_executions.workspace_id AND wm.user_id = auth.uid())
    OR public.is_super_admin(auth.uid())
  );

CREATE POLICY "System can insert rule executions"
  ON public.conversation_rule_executions FOR INSERT
  WITH CHECK (true); -- Executed by edge functions with service role

-- Indexes for performance
CREATE INDEX idx_conversation_rules_workspace_active 
  ON public.conversation_rules(workspace_id, is_active, priority DESC)
  WHERE is_active = true;

CREATE INDEX idx_conversation_rules_scope 
  ON public.conversation_rules(scope, scope_entity_id)
  WHERE is_active = true;

CREATE INDEX idx_rule_executions_conversation 
  ON public.conversation_rule_executions(conversation_id, created_at DESC);

CREATE INDEX idx_rule_executions_rule 
  ON public.conversation_rule_executions(rule_id, created_at DESC);

-- Trigger for updated_at
CREATE TRIGGER update_conversation_rules_updated_at
  BEFORE UPDATE ON public.conversation_rules
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Comments for documentation
COMMENT ON TABLE public.conversation_rules IS 'Structured behavior rules for AI conversations - operates outside of prompts';
COMMENT ON COLUMN public.conversation_rules.rule_type IS 'DO: must do | DONT: must not do | STOP: halt conversation | REDIRECT: change topic/escalate';
COMMENT ON COLUMN public.conversation_rules.condition_type IS 'How to match: keyword, intent, regex, context, variable';
COMMENT ON COLUMN public.conversation_rules.action_type IS 'What to do: respond, defer, redirect, escalate, block, collect';
COMMENT ON COLUMN public.conversation_rules.priority IS 'Higher priority rules are evaluated first (0-100)';

-- Function to get applicable rules for a conversation context
CREATE OR REPLACE FUNCTION public.get_applicable_rules(
  p_workspace_id UUID,
  p_persona_id UUID DEFAULT NULL,
  p_flow_id UUID DEFAULT NULL,
  p_channel TEXT DEFAULT NULL
)
RETURNS SETOF public.conversation_rules
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT cr.*
  FROM public.conversation_rules cr
  WHERE cr.workspace_id = p_workspace_id
    AND cr.is_active = true
    AND (cr.valid_from IS NULL OR cr.valid_from <= now())
    AND (cr.valid_until IS NULL OR cr.valid_until > now())
    AND (
      -- Workspace-wide rules always apply
      cr.scope = 'workspace'
      -- Persona-specific rules
      OR (cr.scope = 'ai_persona' AND cr.scope_entity_id = p_persona_id)
      -- Flow-specific rules
      OR (cr.scope = 'flow' AND cr.scope_entity_id = p_flow_id)
      -- Channel-specific rules
      OR (cr.scope = 'channel' AND cr.scope_entity_id::text = p_channel)
    )
  ORDER BY cr.priority DESC, cr.created_at ASC;
END;
$$;