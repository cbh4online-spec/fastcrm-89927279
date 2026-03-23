
-- Add missing enum values to job_status
ALTER TYPE public.job_status ADD VALUE IF NOT EXISTS 'queued';
ALTER TYPE public.job_status ADD VALUE IF NOT EXISTS 'paused';
ALTER TYPE public.job_status ADD VALUE IF NOT EXISTS 'timeout';

-- ============================================================================
-- AI_AGENT_REGISTRY: Add missing columns
-- ============================================================================
ALTER TABLE public.ai_agent_registry
  ADD COLUMN IF NOT EXISTS workspace_id uuid REFERENCES public.workspaces(id) ON DELETE CASCADE,
  ADD COLUMN IF NOT EXISTS capabilities text[] NOT NULL DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS handler_function text NOT NULL DEFAULT 'ai-agent-processor',
  ADD COLUMN IF NOT EXISTS system_prompt text,
  ADD COLUMN IF NOT EXISTS version text NOT NULL DEFAULT '1.0.0',
  ADD COLUMN IF NOT EXISTS default_max_tokens integer NOT NULL DEFAULT 4096,
  ADD COLUMN IF NOT EXISTS default_temperature float NOT NULL DEFAULT 0.3,
  ADD COLUMN IF NOT EXISTS default_max_steps integer NOT NULL DEFAULT 10,
  ADD COLUMN IF NOT EXISTS is_system boolean NOT NULL DEFAULT false;

-- ============================================================================
-- AI_AGENT_JOBS: Add missing columns for orchestration
-- ============================================================================
ALTER TABLE public.ai_agent_jobs
  ADD COLUMN IF NOT EXISTS name text,
  ADD COLUMN IF NOT EXISTS task text,
  ADD COLUMN IF NOT EXISTS input_context jsonb DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS target_entity_type text,
  ADD COLUMN IF NOT EXISTS target_entity_id uuid,
  ADD COLUMN IF NOT EXISTS target_filters jsonb DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS max_steps integer NOT NULL DEFAULT 10,
  ADD COLUMN IF NOT EXISTS timeout_ms integer NOT NULL DEFAULT 120000,
  ADD COLUMN IF NOT EXISTS max_tokens_per_step integer NOT NULL DEFAULT 4096,
  ADD COLUMN IF NOT EXISTS retry_count integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS max_retries integer NOT NULL DEFAULT 2,
  ADD COLUMN IF NOT EXISTS retry_after timestamptz,
  ADD COLUMN IF NOT EXISTS schedule_id uuid,
  ADD COLUMN IF NOT EXISTS last_heartbeat timestamptz,
  ADD COLUMN IF NOT EXISTS result_summary text,
  ADD COLUMN IF NOT EXISTS result_data jsonb,
  ADD COLUMN IF NOT EXISTS error_code text,
  ADD COLUMN IF NOT EXISTS description text;

-- Indexes for queue polling
CREATE INDEX IF NOT EXISTS idx_agent_jobs_queue ON public.ai_agent_jobs (workspace_id, priority DESC, created_at ASC) WHERE status = 'pending';
CREATE INDEX IF NOT EXISTS idx_agent_jobs_running ON public.ai_agent_jobs (last_heartbeat) WHERE status = 'running';

-- ============================================================================
-- AI_AGENT_EXECUTIONS: Add missing columns for step tracking
-- ============================================================================
ALTER TABLE public.ai_agent_executions
  ADD COLUMN IF NOT EXISTS job_id uuid REFERENCES public.ai_agent_jobs(id) ON DELETE CASCADE,
  ADD COLUMN IF NOT EXISTS step_number integer,
  ADD COLUMN IF NOT EXISTS step_type text,
  ADD COLUMN IF NOT EXISTS content text,
  ADD COLUMN IF NOT EXISTS input_data jsonb,
  ADD COLUMN IF NOT EXISTS output_data jsonb,
  ADD COLUMN IF NOT EXISTS tool_name text,
  ADD COLUMN IF NOT EXISTS tool_input jsonb,
  ADD COLUMN IF NOT EXISTS tool_output jsonb,
  ADD COLUMN IF NOT EXISTS tool_error text,
  ADD COLUMN IF NOT EXISTS tokens_input integer,
  ADD COLUMN IF NOT EXISTS tokens_output integer;

CREATE INDEX IF NOT EXISTS idx_agent_executions_job ON public.ai_agent_executions (job_id, step_number ASC);

-- ============================================================================
-- AI_AGENT_MEMORY: Add missing columns for scoped memory
-- ============================================================================
ALTER TABLE public.ai_agent_memory
  ADD COLUMN IF NOT EXISTS agent_type text,
  ADD COLUMN IF NOT EXISTS scope text NOT NULL DEFAULT 'workspace',
  ADD COLUMN IF NOT EXISTS scope_id text,
  ADD COLUMN IF NOT EXISTS memory_key text,
  ADD COLUMN IF NOT EXISTS memory_value jsonb,
  ADD COLUMN IF NOT EXISTS importance float NOT NULL DEFAULT 0.5;

-- ============================================================================
-- AI_AGENT_LOCKS: Add missing columns for distributed locking
-- ============================================================================
ALTER TABLE public.ai_agent_locks
  ADD COLUMN IF NOT EXISTS lock_key text,
  ADD COLUMN IF NOT EXISTS holder_function text,
  ADD COLUMN IF NOT EXISTS lock_type text NOT NULL DEFAULT 'exclusive';

-- Unique exclusive lock per key
CREATE UNIQUE INDEX IF NOT EXISTS idx_agent_locks_exclusive
  ON public.ai_agent_locks (workspace_id, lock_key)
  WHERE lock_type = 'exclusive';

-- ============================================================================
-- AI_AGENT_SCHEDULES: Add missing columns
-- ============================================================================
ALTER TABLE public.ai_agent_schedules
  ADD COLUMN IF NOT EXISTS task text,
  ADD COLUMN IF NOT EXISTS input_context jsonb DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS max_steps integer NOT NULL DEFAULT 10,
  ADD COLUMN IF NOT EXISTS skip_if_running boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS last_job_id uuid,
  ADD COLUMN IF NOT EXISTS total_runs integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS successful_runs integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS is_active boolean NOT NULL DEFAULT true;

-- ============================================================================
-- SQL FUNCTIONS: Distributed locking helpers
-- ============================================================================
CREATE OR REPLACE FUNCTION public.acquire_agent_lock(
  p_workspace_id uuid,
  p_lock_key text,
  p_job_id uuid,
  p_holder text,
  p_ttl_seconds integer DEFAULT 300
) RETURNS boolean LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_acquired boolean;
BEGIN
  DELETE FROM ai_agent_locks
  WHERE workspace_id = p_workspace_id
    AND lock_key = p_lock_key
    AND expires_at < now();

  BEGIN
    INSERT INTO ai_agent_locks (workspace_id, lock_key, job_id, holder_function, expires_at, lock_type, agent_type, entity_id)
    VALUES (
      p_workspace_id, p_lock_key, p_job_id, p_holder,
      now() + (p_ttl_seconds || ' seconds')::interval,
      'exclusive',
      split_part(p_lock_key, ':', 1),
      COALESCE(split_part(p_lock_key, ':', 3), p_lock_key)
    );
    v_acquired := true;
  EXCEPTION WHEN unique_violation THEN
    v_acquired := false;
  END;

  RETURN v_acquired;
END;
$$;

CREATE OR REPLACE FUNCTION public.release_agent_lock(
  p_workspace_id uuid,
  p_lock_key text,
  p_job_id uuid
) RETURNS void LANGUAGE sql SECURITY DEFINER SET search_path = public AS $$
  DELETE FROM ai_agent_locks
  WHERE workspace_id = p_workspace_id
    AND lock_key = p_lock_key
    AND job_id = p_job_id;
$$;

CREATE OR REPLACE FUNCTION public.renew_agent_lock(
  p_workspace_id uuid,
  p_lock_key text,
  p_job_id uuid,
  p_ttl_seconds integer DEFAULT 300
) RETURNS boolean LANGUAGE sql SECURITY DEFINER SET search_path = public AS $$
  UPDATE ai_agent_locks
  SET expires_at = now() + (p_ttl_seconds || ' seconds')::interval
  WHERE workspace_id = p_workspace_id
    AND lock_key = p_lock_key
    AND job_id = p_job_id
  RETURNING true;
$$;

-- Seed built-in agents (if not already present)
INSERT INTO public.ai_agent_registry
  (agent_type, display_name, description, capabilities, handler_function, system_prompt, is_system, enabled_triggers, entity_types, version)
VALUES
  (
    'general',
    'Agente Geral',
    'Agente polivalente para tarefas de CRM genéricas',
    ARRAY['read_contacts','read_leads','read_opportunities','write_tasks','write_notes','send_notification'],
    'ai-agent-processor',
    'És um agente CRM geral. Analisa dados e executa tarefas de forma autónoma. Responde sempre em português de Portugal.',
    true,
    ARRAY['manual']::agent_trigger[],
    ARRAY['contact','lead','opportunity'],
    '1.0.0'
  ),
  (
    'client',
    'Agente de Clientes',
    'Especialista em inteligência de clientes e contactos',
    ARRAY['read_contacts','read_leads','read_conversations','write_tags','write_fields','write_notes','send_notification'],
    'ai-agent-client',
    'És um especialista em gestão de clientes. Analisa padrões de comportamento e histórico de clientes para gerar insights accionáveis.',
    true,
    ARRAY['manual']::agent_trigger[],
    ARRAY['contact','lead'],
    '1.0.0'
  ),
  (
    'opportunity',
    'Agente de Oportunidades',
    'Especialista em análise de pipeline e coaching de vendas',
    ARRAY['read_opportunities','read_contacts','read_leads','write_tasks','write_notes','write_fields','send_notification'],
    'ai-agent-opportunity',
    'És um especialista em vendas B2B. Analisa oportunidades, identifica riscos e sugere acções para fechar negócios.',
    true,
    ARRAY['manual']::agent_trigger[],
    ARRAY['opportunity'],
    '1.0.0'
  )
ON CONFLICT (agent_type) DO UPDATE SET
  capabilities = EXCLUDED.capabilities,
  handler_function = EXCLUDED.handler_function,
  system_prompt = EXCLUDED.system_prompt,
  is_system = EXCLUDED.is_system,
  version = EXCLUDED.version;
