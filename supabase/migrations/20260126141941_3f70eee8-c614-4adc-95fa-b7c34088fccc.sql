-- ============================================================================
-- DURABLE WORKFLOW AUTOMATION LAYER
-- Reliable, resumable, observable execution of AI-recommended actions
-- ============================================================================

-- Workflow definitions (templates)
CREATE TABLE public.workflow_definitions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  
  name TEXT NOT NULL,
  code TEXT NOT NULL,
  description TEXT,
  version INTEGER NOT NULL DEFAULT 1,
  is_active BOOLEAN DEFAULT true,
  is_system BOOLEAN DEFAULT false,
  
  trigger_type TEXT NOT NULL,
  trigger_config JSONB DEFAULT '{}'::jsonb,
  steps JSONB NOT NULL DEFAULT '[]'::jsonb,
  
  max_retries INTEGER DEFAULT 3,
  retry_delay_ms INTEGER DEFAULT 1000,
  timeout_ms INTEGER DEFAULT 300000,
  
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  created_by UUID,
  
  UNIQUE(workspace_id, code, version)
);

-- Workflow executions (runtime instances)
CREATE TABLE public.workflow_executions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  definition_id UUID REFERENCES public.workflow_definitions(id) ON DELETE SET NULL,
  
  workflow_code TEXT NOT NULL,
  workflow_version INTEGER NOT NULL DEFAULT 1,
  
  trigger_type TEXT NOT NULL,
  trigger_source TEXT,
  recommendation_id TEXT,
  
  entity_type TEXT,
  entity_id UUID,
  initiated_by UUID,
  
  status TEXT NOT NULL DEFAULT 'pending',
  current_step_index INTEGER DEFAULT 0,
  
  input_data JSONB DEFAULT '{}'::jsonb,
  output_data JSONB DEFAULT '{}'::jsonb,
  context JSONB DEFAULT '{}'::jsonb,
  
  last_checkpoint_at TIMESTAMPTZ,
  checkpoint_data JSONB DEFAULT '{}'::jsonb,
  
  error_message TEXT,
  error_details JSONB,
  retry_count INTEGER DEFAULT 0,
  max_retries INTEGER DEFAULT 3,
  
  scheduled_for TIMESTAMPTZ,
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  timeout_at TIMESTAMPTZ,
  total_duration_ms INTEGER,
  
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Workflow steps (individual step executions)
CREATE TABLE public.workflow_steps (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  execution_id UUID NOT NULL REFERENCES public.workflow_executions(id) ON DELETE CASCADE,
  workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  
  step_index INTEGER NOT NULL,
  step_code TEXT NOT NULL,
  step_type TEXT NOT NULL,
  
  status TEXT NOT NULL DEFAULT 'pending',
  idempotency_key TEXT NOT NULL,
  
  input_data JSONB DEFAULT '{}'::jsonb,
  output_data JSONB DEFAULT '{}'::jsonb,
  
  error_message TEXT,
  error_details JSONB,
  retry_count INTEGER DEFAULT 0,
  max_retries INTEGER DEFAULT 3,
  
  depends_on UUID[],
  is_parallel BOOLEAN DEFAULT false,
  parallel_group TEXT,
  
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  duration_ms INTEGER,
  timeout_ms INTEGER DEFAULT 30000,
  
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  
  UNIQUE(execution_id, step_index)
);

-- Idempotency keys (prevent duplicate side effects)
CREATE TABLE public.workflow_idempotency_keys (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  
  idempotency_key TEXT NOT NULL,
  execution_id UUID REFERENCES public.workflow_executions(id) ON DELETE SET NULL,
  step_id UUID REFERENCES public.workflow_steps(id) ON DELETE SET NULL,
  
  action_type TEXT NOT NULL,
  action_target TEXT,
  
  executed_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  result_status TEXT,
  result_data JSONB,
  
  expires_at TIMESTAMPTZ DEFAULT (now() + interval '30 days'),
  
  UNIQUE(workspace_id, idempotency_key)
);

-- Workflow queue (for background processing)
CREATE TABLE public.workflow_queue (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  execution_id UUID NOT NULL REFERENCES public.workflow_executions(id) ON DELETE CASCADE,
  
  priority INTEGER DEFAULT 0,
  scheduled_for TIMESTAMPTZ DEFAULT now(),
  
  locked_at TIMESTAMPTZ,
  locked_by TEXT,
  lock_expires_at TIMESTAMPTZ,
  
  attempts INTEGER DEFAULT 0,
  max_attempts INTEGER DEFAULT 5,
  last_attempt_at TIMESTAMPTZ,
  next_attempt_at TIMESTAMPTZ,
  
  status TEXT DEFAULT 'pending',
  last_error TEXT,
  
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Indexes
CREATE INDEX idx_workflow_definitions_workspace ON public.workflow_definitions(workspace_id);
CREATE INDEX idx_workflow_definitions_code ON public.workflow_definitions(workspace_id, code);
CREATE INDEX idx_workflow_executions_workspace ON public.workflow_executions(workspace_id);
CREATE INDEX idx_workflow_executions_status ON public.workflow_executions(status);
CREATE INDEX idx_workflow_executions_entity ON public.workflow_executions(entity_type, entity_id);
CREATE INDEX idx_workflow_executions_recommendation ON public.workflow_executions(recommendation_id);
CREATE INDEX idx_workflow_steps_execution ON public.workflow_steps(execution_id);
CREATE INDEX idx_workflow_steps_idempotency ON public.workflow_steps(idempotency_key);
CREATE INDEX idx_workflow_idempotency_key ON public.workflow_idempotency_keys(idempotency_key);
CREATE INDEX idx_workflow_queue_pending ON public.workflow_queue(scheduled_for) WHERE status = 'pending';
CREATE INDEX idx_workflow_queue_workspace ON public.workflow_queue(workspace_id);

-- RLS
ALTER TABLE public.workflow_definitions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.workflow_executions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.workflow_steps ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.workflow_idempotency_keys ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.workflow_queue ENABLE ROW LEVEL SECURITY;

-- Policies using workspace_members
CREATE POLICY "Users can view workflow definitions in their workspace"
ON public.workflow_definitions FOR SELECT
USING (workspace_id IN (SELECT workspace_id FROM public.workspace_members WHERE user_id = auth.uid()));

CREATE POLICY "Admins can manage workflow definitions"
ON public.workflow_definitions FOR ALL
USING (workspace_id IN (SELECT workspace_id FROM public.workspace_members WHERE user_id = auth.uid() AND role IN ('owner', 'admin')));

CREATE POLICY "Users can view workflow executions in their workspace"
ON public.workflow_executions FOR SELECT
USING (workspace_id IN (SELECT workspace_id FROM public.workspace_members WHERE user_id = auth.uid()));

CREATE POLICY "Users can create workflow executions in their workspace"
ON public.workflow_executions FOR INSERT
WITH CHECK (workspace_id IN (SELECT workspace_id FROM public.workspace_members WHERE user_id = auth.uid()));

CREATE POLICY "Users can view workflow steps in their workspace"
ON public.workflow_steps FOR SELECT
USING (workspace_id IN (SELECT workspace_id FROM public.workspace_members WHERE user_id = auth.uid()));

CREATE POLICY "Users can view idempotency keys in their workspace"
ON public.workflow_idempotency_keys FOR SELECT
USING (workspace_id IN (SELECT workspace_id FROM public.workspace_members WHERE user_id = auth.uid()));

CREATE POLICY "Users can view queue items in their workspace"
ON public.workflow_queue FOR SELECT
USING (workspace_id IN (SELECT workspace_id FROM public.workspace_members WHERE user_id = auth.uid()));

-- Helper function: Generate idempotency key
CREATE OR REPLACE FUNCTION public.generate_workflow_idempotency_key(
  p_execution_id UUID,
  p_step_code TEXT,
  p_entity_id UUID
)
RETURNS TEXT
LANGUAGE sql
STABLE
AS $$
  SELECT md5(concat(p_execution_id::text, '-', p_step_code, '-', p_entity_id::text))
$$;

-- Helper function: Check idempotency
CREATE OR REPLACE FUNCTION public.check_workflow_idempotency(
  p_workspace_id UUID,
  p_idempotency_key TEXT
)
RETURNS TABLE(already_executed BOOLEAN, executed_at TIMESTAMPTZ, result_status TEXT, result_data JSONB)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT true, wik.executed_at, wik.result_status, wik.result_data
  FROM public.workflow_idempotency_keys wik
  WHERE wik.workspace_id = p_workspace_id
    AND wik.idempotency_key = p_idempotency_key
    AND wik.expires_at > now()
  LIMIT 1;
  
  IF NOT FOUND THEN
    RETURN QUERY SELECT false, NULL::TIMESTAMPTZ, NULL::TEXT, NULL::JSONB;
  END IF;
END;
$$;

-- Helper function: Checkpoint workflow
CREATE OR REPLACE FUNCTION public.checkpoint_workflow_execution(
  p_execution_id UUID,
  p_step_index INTEGER,
  p_context JSONB
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE public.workflow_executions
  SET 
    current_step_index = p_step_index,
    context = p_context,
    last_checkpoint_at = now(),
    checkpoint_data = jsonb_build_object('step_index', p_step_index, 'context', p_context, 'timestamp', now()),
    updated_at = now()
  WHERE id = p_execution_id;
END;
$$;