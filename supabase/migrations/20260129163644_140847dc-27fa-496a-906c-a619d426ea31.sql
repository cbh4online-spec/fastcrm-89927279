-- =====================================================
-- AI CONVERSATIONAL ENGINE - FLOWS & RULES
-- =====================================================

-- Enum for flow step types (only create if not exists)
DO $$ BEGIN
  CREATE TYPE public.flow_step_type AS ENUM (
    'message', 'question', 'condition', 'action', 'goal', 'handoff'
  );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- Enum for flow status
DO $$ BEGIN
  CREATE TYPE public.flow_status AS ENUM ('draft', 'active', 'paused', 'archived');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- Enum for session status
DO $$ BEGIN
  CREATE TYPE public.session_status AS ENUM ('active', 'completed', 'abandoned', 'handed_off');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- Enum for condition operators
DO $$ BEGIN
  CREATE TYPE public.flow_condition_operator AS ENUM (
    'equals', 'not_equals', 'contains', 'not_contains', 
    'greater_than', 'less_than', 'is_empty', 'is_not_empty', 'matches_intent'
  );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- =====================================================
-- CONVERSATIONAL FLOWS
-- =====================================================
CREATE TABLE IF NOT EXISTS public.conversational_flows (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  status flow_status NOT NULL DEFAULT 'draft',
  goal_type TEXT,
  goal_description TEXT,
  success_message TEXT,
  trigger_keywords TEXT[],
  trigger_channels TEXT[],
  trigger_conditions JSONB,
  persona_id UUID REFERENCES public.ai_personas(id) ON DELETE SET NULL,
  knowledge_base_ids UUID[],
  fallback_behavior TEXT DEFAULT 'handoff',
  max_retries INTEGER DEFAULT 2,
  is_default BOOLEAN DEFAULT false,
  priority INTEGER DEFAULT 0,
  timeout_minutes INTEGER DEFAULT 30,
  created_by UUID NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- =====================================================
-- FLOW VARIABLES
-- =====================================================
CREATE TABLE IF NOT EXISTS public.flow_variables (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  flow_id UUID NOT NULL REFERENCES public.conversational_flows(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  display_name TEXT NOT NULL,
  variable_type TEXT NOT NULL DEFAULT 'text',
  is_required BOOLEAN DEFAULT false,
  validation_pattern TEXT,
  validation_message TEXT,
  choices TEXT[],
  map_to_field TEXT,
  default_value TEXT,
  position INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- =====================================================
-- FLOW STEPS
-- =====================================================
CREATE TABLE IF NOT EXISTS public.flow_steps (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  flow_id UUID NOT NULL REFERENCES public.conversational_flows(id) ON DELETE CASCADE,
  step_type flow_step_type NOT NULL,
  name TEXT NOT NULL,
  message_content TEXT,
  message_variants TEXT[],
  variable_id UUID REFERENCES public.flow_variables(id) ON DELETE SET NULL,
  quick_replies TEXT[],
  condition_field TEXT,
  condition_operator flow_condition_operator,
  condition_value TEXT,
  action_type TEXT,
  action_config JSONB,
  goal_name TEXT,
  conversion_value DECIMAL(10,2),
  next_step_id UUID,
  condition_true_step_id UUID,
  condition_false_step_id UUID,
  position_x INTEGER DEFAULT 0,
  position_y INTEGER DEFAULT 0,
  is_entry_point BOOLEAN DEFAULT false,
  position INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Add self-referencing FKs after table creation
ALTER TABLE public.flow_steps 
  ADD CONSTRAINT fk_next_step FOREIGN KEY (next_step_id) REFERENCES public.flow_steps(id) ON DELETE SET NULL,
  ADD CONSTRAINT fk_true_step FOREIGN KEY (condition_true_step_id) REFERENCES public.flow_steps(id) ON DELETE SET NULL,
  ADD CONSTRAINT fk_false_step FOREIGN KEY (condition_false_step_id) REFERENCES public.flow_steps(id) ON DELETE SET NULL;

-- =====================================================
-- CONVERSATION SESSIONS
-- =====================================================
CREATE TABLE IF NOT EXISTS public.conversation_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  flow_id UUID REFERENCES public.conversational_flows(id) ON DELETE SET NULL,
  conversation_id UUID,
  lead_id UUID REFERENCES public.leads(id) ON DELETE SET NULL,
  contact_id UUID REFERENCES public.contacts(id) ON DELETE SET NULL,
  channel TEXT NOT NULL,
  current_step_id UUID REFERENCES public.flow_steps(id) ON DELETE SET NULL,
  status session_status NOT NULL DEFAULT 'active',
  variables JSONB DEFAULT '{}',
  started_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  completed_at TIMESTAMPTZ,
  goal_achieved BOOLEAN DEFAULT false,
  goal_achieved_at TIMESTAMPTZ,
  step_history JSONB DEFAULT '[]',
  handed_off_to UUID,
  handed_off_at TIMESTAMPTZ,
  abandonment_reason TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- =====================================================
-- FLOW ANALYTICS
-- =====================================================
CREATE TABLE IF NOT EXISTS public.flow_analytics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  flow_id UUID NOT NULL REFERENCES public.conversational_flows(id) ON DELETE CASCADE,
  date DATE NOT NULL,
  sessions_started INTEGER DEFAULT 0,
  sessions_completed INTEGER DEFAULT 0,
  sessions_abandoned INTEGER DEFAULT 0,
  sessions_handed_off INTEGER DEFAULT 0,
  goals_achieved INTEGER DEFAULT 0,
  total_conversion_value DECIMAL(12,2) DEFAULT 0,
  avg_duration_seconds INTEGER,
  avg_steps_completed DECIMAL(5,2),
  step_metrics JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(flow_id, date)
);

-- =====================================================
-- INDEXES
-- =====================================================
CREATE INDEX IF NOT EXISTS idx_conversational_flows_workspace ON public.conversational_flows(workspace_id);
CREATE INDEX IF NOT EXISTS idx_conversational_flows_status ON public.conversational_flows(status);
CREATE INDEX IF NOT EXISTS idx_flow_steps_flow ON public.flow_steps(flow_id);
CREATE INDEX IF NOT EXISTS idx_flow_variables_flow ON public.flow_variables(flow_id);
CREATE INDEX IF NOT EXISTS idx_conversation_sessions_workspace ON public.conversation_sessions(workspace_id);
CREATE INDEX IF NOT EXISTS idx_conversation_sessions_flow ON public.conversation_sessions(flow_id);
CREATE INDEX IF NOT EXISTS idx_conversation_sessions_status ON public.conversation_sessions(status);
CREATE INDEX IF NOT EXISTS idx_conversation_sessions_lead ON public.conversation_sessions(lead_id);
CREATE INDEX IF NOT EXISTS idx_flow_analytics_flow_date ON public.flow_analytics(flow_id, date);

-- =====================================================
-- RLS POLICIES (using workspace_members pattern)
-- =====================================================

ALTER TABLE public.conversational_flows ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.flow_variables ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.flow_steps ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.conversation_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.flow_analytics ENABLE ROW LEVEL SECURITY;

-- Conversational Flows
CREATE POLICY "Users can view flows in their workspace"
  ON public.conversational_flows FOR SELECT
  USING (workspace_id IN (SELECT workspace_id FROM workspace_members WHERE user_id = auth.uid()));

CREATE POLICY "Users can create flows in their workspace"
  ON public.conversational_flows FOR INSERT
  WITH CHECK (workspace_id IN (SELECT workspace_id FROM workspace_members WHERE user_id = auth.uid()));

CREATE POLICY "Users can update flows in their workspace"
  ON public.conversational_flows FOR UPDATE
  USING (workspace_id IN (SELECT workspace_id FROM workspace_members WHERE user_id = auth.uid()));

CREATE POLICY "Users can delete flows in their workspace"
  ON public.conversational_flows FOR DELETE
  USING (workspace_id IN (SELECT workspace_id FROM workspace_members WHERE user_id = auth.uid()));

CREATE POLICY "Super admins can manage all flows"
  ON public.conversational_flows FOR ALL
  USING (public.is_super_admin(auth.uid()))
  WITH CHECK (public.is_super_admin(auth.uid()));

-- Flow Variables (via flow join)
CREATE POLICY "Users can view flow variables"
  ON public.flow_variables FOR SELECT
  USING (flow_id IN (
    SELECT id FROM conversational_flows WHERE workspace_id IN (
      SELECT workspace_id FROM workspace_members WHERE user_id = auth.uid()
    )
  ));

CREATE POLICY "Users can manage flow variables"
  ON public.flow_variables FOR ALL
  USING (flow_id IN (
    SELECT id FROM conversational_flows WHERE workspace_id IN (
      SELECT workspace_id FROM workspace_members WHERE user_id = auth.uid()
    )
  ))
  WITH CHECK (flow_id IN (
    SELECT id FROM conversational_flows WHERE workspace_id IN (
      SELECT workspace_id FROM workspace_members WHERE user_id = auth.uid()
    )
  ));

-- Flow Steps (via flow join)
CREATE POLICY "Users can view flow steps"
  ON public.flow_steps FOR SELECT
  USING (flow_id IN (
    SELECT id FROM conversational_flows WHERE workspace_id IN (
      SELECT workspace_id FROM workspace_members WHERE user_id = auth.uid()
    )
  ));

CREATE POLICY "Users can manage flow steps"
  ON public.flow_steps FOR ALL
  USING (flow_id IN (
    SELECT id FROM conversational_flows WHERE workspace_id IN (
      SELECT workspace_id FROM workspace_members WHERE user_id = auth.uid()
    )
  ))
  WITH CHECK (flow_id IN (
    SELECT id FROM conversational_flows WHERE workspace_id IN (
      SELECT workspace_id FROM workspace_members WHERE user_id = auth.uid()
    )
  ));

-- Conversation Sessions
CREATE POLICY "Users can view sessions in their workspace"
  ON public.conversation_sessions FOR SELECT
  USING (workspace_id IN (SELECT workspace_id FROM workspace_members WHERE user_id = auth.uid()));

CREATE POLICY "Users can manage sessions in their workspace"
  ON public.conversation_sessions FOR ALL
  USING (workspace_id IN (SELECT workspace_id FROM workspace_members WHERE user_id = auth.uid()))
  WITH CHECK (workspace_id IN (SELECT workspace_id FROM workspace_members WHERE user_id = auth.uid()));

-- Flow Analytics
CREATE POLICY "Users can view analytics in their workspace"
  ON public.flow_analytics FOR SELECT
  USING (workspace_id IN (SELECT workspace_id FROM workspace_members WHERE user_id = auth.uid()));

CREATE POLICY "Users can manage analytics in their workspace"
  ON public.flow_analytics FOR ALL
  USING (workspace_id IN (SELECT workspace_id FROM workspace_members WHERE user_id = auth.uid()))
  WITH CHECK (workspace_id IN (SELECT workspace_id FROM workspace_members WHERE user_id = auth.uid()));

-- =====================================================
-- TRIGGERS
-- =====================================================
CREATE TRIGGER update_conversational_flows_updated_at
  BEFORE UPDATE ON public.conversational_flows
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_flow_steps_updated_at
  BEFORE UPDATE ON public.flow_steps
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_conversation_sessions_updated_at
  BEFORE UPDATE ON public.conversation_sessions
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();