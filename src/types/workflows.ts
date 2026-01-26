/**
 * Durable Workflow Automation Types
 * 
 * Types for reliable, resumable, observable execution of AI-recommended actions.
 */

// =============================================================================
// WORKFLOW STATUS TYPES
// =============================================================================

export type WorkflowStatus = 
  | 'pending'     // Queued, not started
  | 'running'     // Currently executing
  | 'paused'      // Waiting for external event
  | 'completed'   // Successfully finished
  | 'failed'      // Failed after retries exhausted
  | 'cancelled'   // Manually cancelled
  | 'partial';    // Completed with some step failures

export type WorkflowStepStatus = 
  | 'pending'
  | 'running'
  | 'completed'
  | 'failed'
  | 'skipped'
  | 'retrying';

// =============================================================================
// STEP TYPES (Action executors)
// =============================================================================

export type WorkflowStepType = 
  | 'create_task'
  | 'update_task'
  | 'send_email'
  | 'send_whatsapp'
  | 'send_sms'
  | 'update_stage'
  | 'update_entity'
  | 'create_note'
  | 'create_activity'
  | 'http_call'
  | 'delay'
  | 'condition'
  | 'parallel_group'
  | 'trigger_automation'
  | 'notify_user'
  | 'custom';

export type TriggerType = 
  | 'recommendation_accepted'
  | 'manual'
  | 'scheduled'
  | 'event'
  | 'webhook'
  | 'automation';

export type TriggerSource = 
  | 'agent'
  | 'user'
  | 'scheduler'
  | 'webhook'
  | 'system';

// =============================================================================
// STEP CONFIGURATION
// =============================================================================

export interface WorkflowStepConfig {
  code: string;
  type: WorkflowStepType;
  name: string;
  description?: string;
  
  // Input configuration
  input: Record<string, unknown>;
  
  // Execution settings
  timeout_ms?: number;
  max_retries?: number;
  retry_delay_ms?: number;
  
  // Dependencies (for parallel execution)
  depends_on?: string[];  // Step codes this step depends on
  is_parallel?: boolean;
  parallel_group?: string;
  
  // Conditions
  condition?: {
    field: string;
    operator: 'eq' | 'ne' | 'gt' | 'gte' | 'lt' | 'lte' | 'contains' | 'exists';
    value: unknown;
  };
  
  // Error handling
  on_error?: 'fail' | 'skip' | 'retry' | 'continue';
  fallback_step?: string;
}

// =============================================================================
// WORKFLOW DEFINITION
// =============================================================================

export interface WorkflowDefinition {
  id: string;
  workspace_id: string;
  
  // Metadata
  name: string;
  code: string;
  description?: string;
  version: number;
  is_active: boolean;
  is_system: boolean;
  
  // Trigger configuration
  trigger_type: TriggerType;
  trigger_config: {
    event_type?: string;
    entity_types?: string[];
    schedule?: string;  // Cron expression
    conditions?: Record<string, unknown>;
  };
  
  // Steps
  steps: WorkflowStepConfig[];
  
  // Execution settings
  max_retries: number;
  retry_delay_ms: number;
  timeout_ms: number;
  
  // Timestamps
  created_at: string;
  updated_at: string;
  created_by?: string;
}

// =============================================================================
// WORKFLOW EXECUTION
// =============================================================================

export interface WorkflowExecution {
  id: string;
  workspace_id: string;
  definition_id?: string;
  
  // Execution identity
  workflow_code: string;
  workflow_version: number;
  
  // Trigger context
  trigger_type: TriggerType;
  trigger_source?: TriggerSource;
  recommendation_id?: string;
  
  // Entity context
  entity_type?: string;
  entity_id?: string;
  
  // User context
  initiated_by?: string;
  
  // Execution state
  status: WorkflowStatus;
  current_step_index: number;
  
  // Input/Output
  input_data: Record<string, unknown>;
  output_data: Record<string, unknown>;
  context: Record<string, unknown>;
  
  // Checkpointing
  last_checkpoint_at?: string;
  checkpoint_data: {
    step_index?: number;
    context?: Record<string, unknown>;
    timestamp?: string;
  };
  
  // Error tracking
  error_message?: string;
  error_details?: Record<string, unknown>;
  retry_count: number;
  max_retries: number;
  
  // Timing
  scheduled_for?: string;
  started_at?: string;
  completed_at?: string;
  timeout_at?: string;
  total_duration_ms?: number;
  
  // Timestamps
  created_at: string;
  updated_at: string;
}

// =============================================================================
// WORKFLOW STEP EXECUTION
// =============================================================================

export interface WorkflowStepExecution {
  id: string;
  execution_id: string;
  workspace_id: string;
  
  // Step identity
  step_index: number;
  step_code: string;
  step_type: WorkflowStepType;
  
  // Execution state
  status: WorkflowStepStatus;
  idempotency_key: string;
  
  // Input/Output
  input_data: Record<string, unknown>;
  output_data: Record<string, unknown>;
  
  // Error tracking
  error_message?: string;
  error_details?: Record<string, unknown>;
  retry_count: number;
  max_retries: number;
  
  // Dependencies
  depends_on?: string[];
  is_parallel: boolean;
  parallel_group?: string;
  
  // Timing
  started_at?: string;
  completed_at?: string;
  duration_ms?: number;
  timeout_ms: number;
  
  // Timestamps
  created_at: string;
  updated_at: string;
}

// =============================================================================
// IDEMPOTENCY
// =============================================================================

export interface WorkflowIdempotencyKey {
  id: string;
  workspace_id: string;
  
  idempotency_key: string;
  execution_id?: string;
  step_id?: string;
  
  action_type: string;
  action_target?: string;
  
  executed_at: string;
  result_status?: 'success' | 'failed';
  result_data?: Record<string, unknown>;
  
  expires_at: string;
}

// =============================================================================
// QUEUE ITEM
// =============================================================================

export interface WorkflowQueueItem {
  id: string;
  workspace_id: string;
  execution_id: string;
  
  priority: number;
  scheduled_for: string;
  
  locked_at?: string;
  locked_by?: string;
  lock_expires_at?: string;
  
  attempts: number;
  max_attempts: number;
  last_attempt_at?: string;
  next_attempt_at?: string;
  
  status: 'pending' | 'processing' | 'completed' | 'failed' | 'dead_letter';
  last_error?: string;
  
  created_at: string;
}

// =============================================================================
// STEP EXECUTOR TYPES
// =============================================================================

export interface StepExecutorContext {
  execution: WorkflowExecution;
  step: WorkflowStepExecution;
  stepConfig: WorkflowStepConfig;
  workspaceId: string;
  entityType?: string;
  entityId?: string;
  accumulatedContext: Record<string, unknown>;
}

export interface StepExecutorResult {
  success: boolean;
  output: Record<string, unknown>;
  error?: {
    message: string;
    code?: string;
    details?: Record<string, unknown>;
    retryable: boolean;
  };
  contextUpdates?: Record<string, unknown>;
}

export type StepExecutor = (
  context: StepExecutorContext
) => Promise<StepExecutorResult>;

// =============================================================================
// WORKFLOW ENGINE EVENTS
// =============================================================================

export interface WorkflowEvent {
  type: 
    | 'workflow_started'
    | 'workflow_completed'
    | 'workflow_failed'
    | 'workflow_paused'
    | 'workflow_resumed'
    | 'step_started'
    | 'step_completed'
    | 'step_failed'
    | 'step_retrying'
    | 'checkpoint_saved';
  
  execution_id: string;
  workflow_code: string;
  step_code?: string;
  step_index?: number;
  
  data?: Record<string, unknown>;
  error?: string;
  
  timestamp: string;
}

// =============================================================================
// WORKFLOW TEMPLATES (Pre-built workflows)
// =============================================================================

export interface WorkflowTemplate {
  code: string;
  name: string;
  description: string;
  category: 'lead' | 'opportunity' | 'client' | 'task' | 'communication';
  trigger_type: TriggerType;
  steps: WorkflowStepConfig[];
  recommended_for?: string[];
}

export const WORKFLOW_TEMPLATES: WorkflowTemplate[] = [
  {
    code: 'lead_qualification_followup',
    name: 'Follow-up de Qualificação',
    description: 'Cria tarefa e envia mensagem após lead qualificado',
    category: 'lead',
    trigger_type: 'recommendation_accepted',
    steps: [
      {
        code: 'create_followup_task',
        type: 'create_task',
        name: 'Criar Tarefa de Follow-up',
        input: {
          title: 'Follow-up: {{lead.name}}',
          due_in_hours: 24,
          priority: 'high',
        },
      },
      {
        code: 'send_initial_message',
        type: 'send_whatsapp',
        name: 'Enviar Mensagem Inicial',
        input: {
          template: 'qualification_followup',
        },
        depends_on: ['create_followup_task'],
      },
      {
        code: 'log_activity',
        type: 'create_activity',
        name: 'Registar Atividade',
        input: {
          type: 'workflow_execution',
          description: 'Workflow de qualificação executado',
        },
        depends_on: ['send_initial_message'],
      },
    ],
  },
  {
    code: 'opportunity_stage_progression',
    name: 'Progressão de Fase',
    description: 'Atualiza fase e notifica owner após recomendação aceite',
    category: 'opportunity',
    trigger_type: 'recommendation_accepted',
    steps: [
      {
        code: 'update_stage',
        type: 'update_stage',
        name: 'Atualizar Fase do Pipeline',
        input: {
          stage: '{{recommendation.target_stage}}',
        },
      },
      {
        code: 'notify_owner',
        type: 'notify_user',
        name: 'Notificar Owner',
        input: {
          message: 'Oportunidade {{opportunity.name}} avançou para {{new_stage}}',
        },
        depends_on: ['update_stage'],
      },
    ],
  },
  {
    code: 'urgent_followup',
    name: 'Follow-up Urgente',
    description: 'Cria tarefa prioritária e alerta imediato',
    category: 'opportunity',
    trigger_type: 'recommendation_accepted',
    steps: [
      {
        code: 'create_urgent_task',
        type: 'create_task',
        name: 'Criar Tarefa Urgente',
        input: {
          title: 'URGENTE: Follow-up {{entity.name}}',
          due_in_hours: 2,
          priority: 'urgent',
        },
      },
      {
        code: 'send_alert',
        type: 'notify_user',
        name: 'Enviar Alerta',
        input: {
          type: 'urgent',
          message: 'Ação urgente necessária em {{entity.name}}',
        },
        is_parallel: true,
        parallel_group: 'notifications',
      },
      {
        code: 'send_email_alert',
        type: 'send_email',
        name: 'Enviar Email de Alerta',
        input: {
          template: 'urgent_followup_alert',
        },
        is_parallel: true,
        parallel_group: 'notifications',
      },
    ],
  },
];

// =============================================================================
// HELPERS
// =============================================================================

export function generateIdempotencyKey(
  executionId: string,
  stepCode: string,
  entityId?: string
): string {
  const parts = [executionId, stepCode, entityId || 'no-entity'];
  return btoa(parts.join('-')).replace(/[+/=]/g, '');
}

export function getWorkflowStatusLabel(status: WorkflowStatus): string {
  const labels: Record<WorkflowStatus, string> = {
    pending: 'Pendente',
    running: 'Em execução',
    paused: 'Pausado',
    completed: 'Concluído',
    failed: 'Falhou',
    cancelled: 'Cancelado',
    partial: 'Parcial',
  };
  return labels[status];
}

export function getWorkflowStatusColor(status: WorkflowStatus): string {
  const colors: Record<WorkflowStatus, string> = {
    pending: 'text-muted-foreground',
    running: 'text-blue-600',
    paused: 'text-amber-600',
    completed: 'text-green-600',
    failed: 'text-destructive',
    cancelled: 'text-muted-foreground',
    partial: 'text-amber-600',
  };
  return colors[status];
}

export function getStepTypeLabel(type: WorkflowStepType): string {
  const labels: Record<WorkflowStepType, string> = {
    create_task: 'Criar Tarefa',
    update_task: 'Atualizar Tarefa',
    send_email: 'Enviar Email',
    send_whatsapp: 'Enviar WhatsApp',
    send_sms: 'Enviar SMS',
    update_stage: 'Atualizar Fase',
    update_entity: 'Atualizar Entidade',
    create_note: 'Criar Nota',
    create_activity: 'Registar Atividade',
    http_call: 'Chamada HTTP',
    delay: 'Aguardar',
    condition: 'Condição',
    parallel_group: 'Grupo Paralelo',
    trigger_automation: 'Disparar Automação',
    notify_user: 'Notificar Utilizador',
    custom: 'Personalizado',
  };
  return labels[type];
}
