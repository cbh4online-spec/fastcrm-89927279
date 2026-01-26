-- =====================================================
-- Agent Lifecycle & Orchestration Manager Schema
-- =====================================================

-- Create ENUM types for job status and agent triggers
CREATE TYPE job_status AS ENUM ('pending', 'running', 'completed', 'failed', 'cancelled');
CREATE TYPE agent_trigger AS ENUM ('manual', 'entity_created', 'status_changed', 'time_based', 'message_received');

-- =====================================================
-- 1. AI Agent Registry (Agent Registration)
-- =====================================================
CREATE TABLE public.ai_agent_registry (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  agent_type TEXT UNIQUE NOT NULL,
  display_name TEXT NOT NULL,
  description TEXT,
  
  -- Scopes
  entity_types TEXT[] NOT NULL,
  enabled_triggers agent_trigger[] NOT NULL,
  
  -- Limits
  max_reasoning_iterations INTEGER DEFAULT 5,
  max_tool_calls INTEGER DEFAULT 10,
  timeout_ms INTEGER DEFAULT 30000,
  cooldown_ms INTEGER DEFAULT 5000,
  max_executions_per_hour_entity INTEGER DEFAULT 10,
  max_executions_per_hour_workspace INTEGER DEFAULT 100,
  
  -- State
  is_enabled BOOLEAN DEFAULT true,
  priority INTEGER DEFAULT 50,
  
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.ai_agent_registry ENABLE ROW LEVEL SECURITY;

-- Policy: Everyone can read registry
CREATE POLICY "Anyone can view agent registry"
ON public.ai_agent_registry FOR SELECT
USING (true);

-- Policy: Only super admins can modify
CREATE POLICY "Super admins can modify agent registry"
ON public.ai_agent_registry FOR ALL
USING (public.is_super_admin());

-- =====================================================
-- 2. AI Agent Jobs (Job Queue)
-- =====================================================
CREATE TABLE public.ai_agent_jobs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  
  -- Job definition
  agent_type TEXT NOT NULL,
  entity_id UUID NOT NULL,
  entity_type TEXT NOT NULL,
  trigger_type agent_trigger NOT NULL,
  priority INTEGER DEFAULT 50,
  context JSONB DEFAULT '{}',
  
  -- Scheduling
  scheduled_for TIMESTAMPTZ DEFAULT now(),
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  
  -- State
  status job_status NOT NULL DEFAULT 'pending',
  execution_id UUID REFERENCES public.ai_agent_executions(id),
  error_message TEXT,
  attempts INTEGER DEFAULT 0,
  max_attempts INTEGER DEFAULT 3,
  
  -- Metadata
  created_at TIMESTAMPTZ DEFAULT now(),
  created_by UUID REFERENCES auth.users(id)
);

-- Indexes for efficient job processing
CREATE INDEX idx_agent_jobs_pending ON public.ai_agent_jobs(workspace_id, status, priority DESC, scheduled_for)
WHERE status = 'pending';

CREATE INDEX idx_agent_jobs_entity ON public.ai_agent_jobs(workspace_id, entity_id, agent_type);

CREATE INDEX idx_agent_jobs_status ON public.ai_agent_jobs(status, scheduled_for);

-- Partial unique index to prevent duplicate pending/running jobs
CREATE UNIQUE INDEX idx_agent_jobs_no_duplicates 
ON public.ai_agent_jobs(workspace_id, agent_type, entity_id)
WHERE status IN ('pending', 'running');

-- Enable RLS
ALTER TABLE public.ai_agent_jobs ENABLE ROW LEVEL SECURITY;

-- Policy: Users can view jobs in their workspace
CREATE POLICY "Users can view workspace jobs"
ON public.ai_agent_jobs FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.workspace_members wm
    WHERE wm.workspace_id = ai_agent_jobs.workspace_id
    AND wm.user_id = auth.uid()
  )
);

-- Policy: Users can create jobs in their workspace
CREATE POLICY "Users can create workspace jobs"
ON public.ai_agent_jobs FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.workspace_members wm
    WHERE wm.workspace_id = ai_agent_jobs.workspace_id
    AND wm.user_id = auth.uid()
  )
);

-- Policy: System can update jobs (via service role)
CREATE POLICY "Service role can update jobs"
ON public.ai_agent_jobs FOR UPDATE
USING (true);

-- =====================================================
-- 3. AI Agent Locks (Execution Control)
-- =====================================================
CREATE TABLE public.ai_agent_locks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  entity_id UUID NOT NULL,
  agent_type TEXT NOT NULL,
  job_id UUID REFERENCES public.ai_agent_jobs(id) ON DELETE CASCADE,
  
  locked_at TIMESTAMPTZ DEFAULT now(),
  locked_by UUID REFERENCES auth.users(id),
  expires_at TIMESTAMPTZ NOT NULL,
  
  UNIQUE (workspace_id, entity_id, agent_type)
);

-- Index for lock cleanup
CREATE INDEX idx_agent_locks_expires ON public.ai_agent_locks(expires_at);

-- Enable RLS
ALTER TABLE public.ai_agent_locks ENABLE ROW LEVEL SECURITY;

-- Policy: Users can view locks in their workspace
CREATE POLICY "Users can view workspace locks"
ON public.ai_agent_locks FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.workspace_members wm
    WHERE wm.workspace_id = ai_agent_locks.workspace_id
    AND wm.user_id = auth.uid()
  )
);

-- Policy: Service role can manage locks
CREATE POLICY "Service role can manage locks"
ON public.ai_agent_locks FOR ALL
USING (true);

-- =====================================================
-- 4. AI Agent Schedules (Recurring Jobs)
-- =====================================================
CREATE TABLE public.ai_agent_schedules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  
  -- Schedule definition
  name TEXT NOT NULL,
  description TEXT,
  agent_type TEXT NOT NULL,
  entity_filter JSONB DEFAULT '{}',
  
  -- Timing
  cron_expression TEXT NOT NULL,
  timezone TEXT DEFAULT 'Europe/Lisbon',
  last_run_at TIMESTAMPTZ,
  next_run_at TIMESTAMPTZ,
  
  -- Limits
  max_entities_per_run INTEGER DEFAULT 50,
  priority INTEGER DEFAULT 30,
  
  -- State
  is_enabled BOOLEAN DEFAULT true,
  
  created_at TIMESTAMPTZ DEFAULT now(),
  created_by UUID REFERENCES auth.users(id)
);

-- Index for schedule processing
CREATE INDEX idx_agent_schedules_next_run ON public.ai_agent_schedules(next_run_at)
WHERE is_enabled = true;

-- Enable RLS
ALTER TABLE public.ai_agent_schedules ENABLE ROW LEVEL SECURITY;

-- Policy: Users can view schedules in their workspace
CREATE POLICY "Users can view workspace schedules"
ON public.ai_agent_schedules FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.workspace_members wm
    WHERE wm.workspace_id = ai_agent_schedules.workspace_id
    AND wm.user_id = auth.uid()
  )
);

-- Policy: Admins can manage schedules
CREATE POLICY "Admins can manage workspace schedules"
ON public.ai_agent_schedules FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM public.workspace_members wm
    WHERE wm.workspace_id = ai_agent_schedules.workspace_id
    AND wm.user_id = auth.uid()
    AND wm.role IN ('owner', 'admin')
  )
);

-- =====================================================
-- 5. Functions for Lock Management
-- =====================================================

-- Function to acquire a lock
CREATE OR REPLACE FUNCTION public.acquire_agent_lock(
  p_workspace_id UUID,
  p_entity_id UUID,
  p_agent_type TEXT,
  p_job_id UUID DEFAULT NULL,
  p_ttl_seconds INTEGER DEFAULT 60
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_lock_id UUID;
  v_expires_at TIMESTAMPTZ;
BEGIN
  -- First, clean up expired locks
  DELETE FROM public.ai_agent_locks
  WHERE expires_at < now();
  
  -- Try to acquire lock
  v_expires_at := now() + (p_ttl_seconds || ' seconds')::INTERVAL;
  
  INSERT INTO public.ai_agent_locks (
    workspace_id, entity_id, agent_type, job_id, locked_by, expires_at
  ) VALUES (
    p_workspace_id, p_entity_id, p_agent_type, p_job_id, auth.uid(), v_expires_at
  )
  ON CONFLICT (workspace_id, entity_id, agent_type) DO NOTHING
  RETURNING id INTO v_lock_id;
  
  IF v_lock_id IS NULL THEN
    RETURN jsonb_build_object(
      'acquired', false,
      'reason', 'Entity is already locked by another process'
    );
  END IF;
  
  RETURN jsonb_build_object(
    'acquired', true,
    'lock_id', v_lock_id,
    'expires_at', v_expires_at
  );
END;
$$;

-- Function to release a lock
CREATE OR REPLACE FUNCTION public.release_agent_lock(
  p_workspace_id UUID,
  p_entity_id UUID,
  p_agent_type TEXT
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  DELETE FROM public.ai_agent_locks
  WHERE workspace_id = p_workspace_id
    AND entity_id = p_entity_id
    AND agent_type = p_agent_type;
  
  RETURN FOUND;
END;
$$;

-- Function to check rate limits
CREATE OR REPLACE FUNCTION public.check_agent_rate_limit(
  p_workspace_id UUID,
  p_entity_id UUID,
  p_agent_type TEXT
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_registry RECORD;
  v_entity_executions INTEGER;
  v_workspace_executions INTEGER;
  v_last_execution TIMESTAMPTZ;
  v_cooldown_remaining INTEGER;
BEGIN
  -- Get agent configuration
  SELECT * INTO v_registry
  FROM public.ai_agent_registry
  WHERE agent_type = p_agent_type;
  
  IF v_registry IS NULL THEN
    RETURN jsonb_build_object(
      'allowed', false,
      'reason', 'Agent type not registered'
    );
  END IF;
  
  IF NOT v_registry.is_enabled THEN
    RETURN jsonb_build_object(
      'allowed', false,
      'reason', 'Agent is disabled'
    );
  END IF;
  
  -- Check entity rate limit (executions in last hour)
  SELECT COUNT(*), MAX(created_at)
  INTO v_entity_executions, v_last_execution
  FROM public.ai_agent_executions
  WHERE workspace_id = p_workspace_id
    AND entity_id = p_entity_id::TEXT
    AND agent_type = p_agent_type
    AND created_at > now() - INTERVAL '1 hour';
  
  IF v_entity_executions >= v_registry.max_executions_per_hour_entity THEN
    RETURN jsonb_build_object(
      'allowed', false,
      'reason', 'Entity rate limit exceeded',
      'limit', v_registry.max_executions_per_hour_entity,
      'current', v_entity_executions
    );
  END IF;
  
  -- Check cooldown
  IF v_last_execution IS NOT NULL THEN
    v_cooldown_remaining := EXTRACT(EPOCH FROM (v_last_execution + (v_registry.cooldown_ms || ' milliseconds')::INTERVAL - now()))::INTEGER * 1000;
    IF v_cooldown_remaining > 0 THEN
      RETURN jsonb_build_object(
        'allowed', false,
        'reason', 'Cooldown active',
        'wait_ms', v_cooldown_remaining
      );
    END IF;
  END IF;
  
  -- Check workspace rate limit
  SELECT COUNT(*)
  INTO v_workspace_executions
  FROM public.ai_agent_executions
  WHERE workspace_id = p_workspace_id
    AND agent_type = p_agent_type
    AND created_at > now() - INTERVAL '1 hour';
  
  IF v_workspace_executions >= v_registry.max_executions_per_hour_workspace THEN
    RETURN jsonb_build_object(
      'allowed', false,
      'reason', 'Workspace rate limit exceeded',
      'limit', v_registry.max_executions_per_hour_workspace,
      'current', v_workspace_executions
    );
  END IF;
  
  RETURN jsonb_build_object(
    'allowed', true,
    'config', jsonb_build_object(
      'max_reasoning_iterations', v_registry.max_reasoning_iterations,
      'max_tool_calls', v_registry.max_tool_calls,
      'timeout_ms', v_registry.timeout_ms
    )
  );
END;
$$;

-- =====================================================
-- 6. Seed Initial Agent Registry
-- =====================================================
INSERT INTO public.ai_agent_registry (
  agent_type, display_name, description, entity_types, enabled_triggers, priority
) VALUES
  ('lead', 'Lead Agent', 'Analisa leads, classifica e sugere próximos passos', 
   ARRAY['lead'], ARRAY['manual', 'entity_created', 'status_changed', 'message_received']::agent_trigger[], 60),
  
  ('contact', 'Contact Agent', 'Analisa contactos e enriquece perfis', 
   ARRAY['contact'], ARRAY['manual', 'entity_created']::agent_trigger[], 50),
  
  ('opportunity', 'Opportunity Agent', 'Avalia probabilidade de fecho e riscos', 
   ARRAY['opportunity'], ARRAY['manual', 'entity_created', 'status_changed']::agent_trigger[], 70),
  
  ('client', 'Client Agent', 'Analisa saúde de clientes e detecta churn', 
   ARRAY['contact', 'company'], ARRAY['manual', 'time_based']::agent_trigger[], 40)
ON CONFLICT (agent_type) DO NOTHING;

-- =====================================================
-- 7. Updated_at Trigger
-- =====================================================
CREATE TRIGGER update_ai_agent_registry_updated_at
BEFORE UPDATE ON public.ai_agent_registry
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();