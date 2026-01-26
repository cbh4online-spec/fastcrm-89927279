-- AI Agent Executions - Audit Trail
CREATE TABLE public.ai_agent_executions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  agent_type TEXT NOT NULL CHECK (agent_type IN ('lead', 'contact', 'opportunity', 'client')),
  entity_id UUID NOT NULL,
  entity_type TEXT NOT NULL,
  trigger_type TEXT NOT NULL CHECK (trigger_type IN ('manual', 'entity_created', 'status_changed', 'time_based', 'message_received')),
  
  -- Execution details
  input_summary JSONB NOT NULL DEFAULT '{}',
  reasoning_trace JSONB NOT NULL DEFAULT '[]',
  output JSONB NOT NULL DEFAULT '{}',
  
  -- Output contract fields
  executive_summary TEXT NOT NULL,
  status_assessment TEXT,
  key_signals TEXT[] DEFAULT '{}',
  risk_indicators TEXT[] DEFAULT '{}',
  recommended_action TEXT,
  recommended_action_type TEXT,
  confidence_level TEXT CHECK (confidence_level IN ('low', 'medium', 'high')),
  
  -- Performance
  duration_ms INTEGER,
  tokens_used INTEGER,
  error_message TEXT,
  
  created_at TIMESTAMPTZ DEFAULT now()
);

-- AI Agent Memory - Selective Memory
CREATE TABLE public.ai_agent_memory (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  entity_id UUID NOT NULL,
  entity_type TEXT NOT NULL,
  
  memory_type TEXT NOT NULL CHECK (memory_type IN ('conclusion', 'user_feedback', 'important_signal')),
  content TEXT NOT NULL,
  relevance_score NUMERIC(3,2) DEFAULT 1.0,
  expires_at TIMESTAMPTZ,
  
  created_at TIMESTAMPTZ DEFAULT now(),
  created_by UUID REFERENCES auth.users(id)
);

-- AI Agent Feedback - Evaluation Loop
CREATE TABLE public.ai_agent_feedback (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  execution_id UUID REFERENCES public.ai_agent_executions(id) ON DELETE CASCADE,
  workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  
  feedback_type TEXT NOT NULL CHECK (feedback_type IN ('useful', 'not_useful', 'action_taken', 'action_ignored')),
  feedback_notes TEXT,
  outcome TEXT,
  
  created_at TIMESTAMPTZ DEFAULT now(),
  created_by UUID REFERENCES auth.users(id)
);

-- Indexes for performance
CREATE INDEX idx_agent_executions_entity ON public.ai_agent_executions(entity_type, entity_id);
CREATE INDEX idx_agent_executions_workspace ON public.ai_agent_executions(workspace_id, created_at DESC);
CREATE INDEX idx_agent_executions_agent_type ON public.ai_agent_executions(agent_type, created_at DESC);

CREATE INDEX idx_agent_memory_entity ON public.ai_agent_memory(entity_type, entity_id);
CREATE INDEX idx_agent_memory_workspace ON public.ai_agent_memory(workspace_id, created_at DESC);
CREATE INDEX idx_agent_memory_expires ON public.ai_agent_memory(expires_at) WHERE expires_at IS NOT NULL;

CREATE INDEX idx_agent_feedback_execution ON public.ai_agent_feedback(execution_id);
CREATE INDEX idx_agent_feedback_workspace ON public.ai_agent_feedback(workspace_id, created_at DESC);

-- Enable RLS
ALTER TABLE public.ai_agent_executions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ai_agent_memory ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ai_agent_feedback ENABLE ROW LEVEL SECURITY;

-- RLS Policies for ai_agent_executions
CREATE POLICY "Users can view agent executions in their workspaces"
ON public.ai_agent_executions FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.workspace_members wm
    WHERE wm.workspace_id = ai_agent_executions.workspace_id
    AND wm.user_id = auth.uid()
  )
);

CREATE POLICY "Users can insert agent executions in their workspaces"
ON public.ai_agent_executions FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.workspace_members wm
    WHERE wm.workspace_id = ai_agent_executions.workspace_id
    AND wm.user_id = auth.uid()
  )
);

-- RLS Policies for ai_agent_memory
CREATE POLICY "Users can view agent memory in their workspaces"
ON public.ai_agent_memory FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.workspace_members wm
    WHERE wm.workspace_id = ai_agent_memory.workspace_id
    AND wm.user_id = auth.uid()
  )
);

CREATE POLICY "Users can manage agent memory in their workspaces"
ON public.ai_agent_memory FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM public.workspace_members wm
    WHERE wm.workspace_id = ai_agent_memory.workspace_id
    AND wm.user_id = auth.uid()
  )
);

-- RLS Policies for ai_agent_feedback
CREATE POLICY "Users can view agent feedback in their workspaces"
ON public.ai_agent_feedback FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.workspace_members wm
    WHERE wm.workspace_id = ai_agent_feedback.workspace_id
    AND wm.user_id = auth.uid()
  )
);

CREATE POLICY "Users can submit agent feedback in their workspaces"
ON public.ai_agent_feedback FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.workspace_members wm
    WHERE wm.workspace_id = ai_agent_feedback.workspace_id
    AND wm.user_id = auth.uid()
  )
  AND created_by = auth.uid()
);

-- Function to clean expired memory entries
CREATE OR REPLACE FUNCTION public.cleanup_expired_agent_memory()
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  deleted_count INTEGER;
BEGIN
  DELETE FROM public.ai_agent_memory
  WHERE expires_at IS NOT NULL AND expires_at < now();
  
  GET DIAGNOSTICS deleted_count = ROW_COUNT;
  RETURN deleted_count;
END;
$$;