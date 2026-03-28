export type AgentJobStatus =
  | 'pending' | 'queued' | 'running' | 'paused'
  | 'completed' | 'failed' | 'cancelled' | 'timeout'

export type AgentStepType =
  | 'plan' | 'tool_call' | 'tool_result' | 'reasoning' | 'output' | 'error'

export type AgentMemoryScope = 'workspace' | 'entity' | 'job'
export type AgentMemoryType = 'fact' | 'preference' | 'summary' | 'context' | 'cache'

export interface AgentRegistryEntry {
  id: string
  workspace_id?: string
  agent_type: string
  display_name: string
  description?: string
  version: string
  capabilities: string[]
  handler_function: string
  system_prompt?: string
  default_max_tokens: number
  default_temperature: number
  default_max_steps: number
  timeout_ms?: number
  is_enabled: boolean
  is_system: boolean
}

export interface AIAgentJob {
  id: string
  workspace_id: string
  agent_type: string
  entity_id?: string
  entity_type?: string
  agent?: AgentRegistryEntry
  name?: string
  description?: string
  task?: string
  input_context?: Record<string, unknown>
  target_entity_type?: string
  target_entity_id?: string
  target_filters?: Record<string, unknown>
  max_steps: number
  timeout_ms: number
  max_tokens_per_step: number
  priority: number
  status: AgentJobStatus
  retry_count: number
  max_retries: number
  retry_after?: string
  schedule_id?: string
  scheduled_for?: string
  started_at?: string
  completed_at?: string
  last_heartbeat?: string
  result_summary?: string
  result_data?: Record<string, unknown>
  error_message?: string
  error_code?: string
  created_by?: string
  created_at: string
  updated_at?: string
  // Computed
  step_count?: number
  duration_ms?: number
  total_tokens?: number
}

export interface AIAgentExecution {
  id: string
  workspace_id: string
  job_id?: string
  step_number?: number
  step_type?: AgentStepType
  content?: string
  input_data?: Record<string, unknown>
  output_data?: Record<string, unknown>
  tool_name?: string
  tool_input?: Record<string, unknown>
  tool_output?: Record<string, unknown>
  tool_error?: string
  tokens_input?: number
  tokens_output?: number
  duration_ms?: number
  created_at: string
}

export interface AIAgentMemory {
  id: string
  workspace_id: string
  agent_type?: string
  scope: AgentMemoryScope
  scope_id?: string
  memory_key?: string
  memory_value?: Record<string, unknown>
  memory_type: string
  importance: number
  expires_at?: string
  access_count: number
  last_accessed_at?: string
  created_at: string
}

export interface AIAgentSchedule {
  id: string
  workspace_id: string
  name: string
  description?: string
  agent_type: string
  task?: string
  input_context?: Record<string, unknown>
  priority: number
  max_steps: number
  cron_expression: string
  timezone?: string
  last_run_at?: string
  next_run_at?: string
  last_job_id?: string
  skip_if_running: boolean
  total_runs: number
  successful_runs: number
  is_active: boolean
  is_enabled?: boolean
  created_by?: string
  created_at: string
}

export interface AgentSystemStats {
  pending_jobs: number
  running_jobs: number
  completed_today: number
  failed_today: number
  active_schedules: number
  total_memory_entries: number
  total_tokens_today: number
  success_rate_7d: number
}

export interface CreateAgentJobRequest {
  agent_type: string
  name: string
  task: string
  description?: string
  input_context?: Record<string, unknown>
  target_entity_type?: string
  target_entity_id?: string
  priority?: number
  scheduled_for?: string
  max_steps?: number
}
