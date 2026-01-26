/**
 * Workflow Execution Job Definition
 * 
 * Provides durable, checkpointed execution of workflow steps.
 * Replaces polling-based workflow-processor with push-based execution.
 */

import type {
  WorkflowExecuteJobPayload,
  WorkflowExecuteJobResult,
  TriggerJobProgressEvent,
} from '@/types/trigger';

// Job configuration
export const WORKFLOW_EXECUTE_JOB_CONFIG = {
  id: 'workflow-execute',
  name: 'Workflow Execution',
  version: '1.0.0',
  maxDuration: 300, // 5 minutes max for complex workflows
  retry: {
    maxAttempts: 3,
    factor: 2,
    minTimeout: 1000,
    maxTimeout: 30000,
  },
  concurrency: {
    perEntity: 1,
    perWorkspace: 5,
  },
};

// Workflow step types that can be executed
export type WorkflowStepType =
  | 'update_status'
  | 'send_notification'
  | 'create_task'
  | 'wait'
  | 'condition_check'
  | 'parallel'
  | 'ai_analysis'
  | 'send_message'
  | 'update_field'
  | 'webhook'
  | 'log_activity';

// Step execution status
export type StepExecutionStatus =
  | 'pending'
  | 'running'
  | 'completed'
  | 'failed'
  | 'skipped'
  | 'waiting';

// Individual step result
export interface WorkflowStepResult {
  stepIndex: number;
  stepType: WorkflowStepType;
  status: StepExecutionStatus;
  startedAt: string;
  completedAt?: string;
  durationMs: number;
  output?: Record<string, unknown>;
  error?: string;
  skippedReason?: string;
}

// Checkpoint state for resume capability
export interface WorkflowCheckpoint {
  executionId: string;
  workflowCode: string;
  currentStepIndex: number;
  completedSteps: WorkflowStepResult[];
  context: Record<string, unknown>;
  lastCheckpointAt: string;
}

/**
 * Validate workflow execution payload
 */
export function validateWorkflowExecutePayload(payload: unknown): payload is WorkflowExecuteJobPayload {
  if (!payload || typeof payload !== 'object') return false;
  
  const p = payload as Record<string, unknown>;
  
  if (p.jobType !== 'workflow-execute') return false;
  if (!p.workspaceId || typeof p.workspaceId !== 'string') return false;
  if (!p.inputData || typeof p.inputData !== 'object') return false;
  
  const inputData = p.inputData as Record<string, unknown>;
  if (!inputData.workflowCode || typeof inputData.workflowCode !== 'string') return false;
  if (!inputData.triggerType) return false;
  
  return true;
}

/**
 * Create default workflow execution result structure
 */
export function createDefaultWorkflowResult(): WorkflowExecuteJobResult {
  return {
    success: false,
    output: {
      executionId: '',
      workflowCode: '',
      stepsCompleted: 0,
      totalSteps: 0,
      finalStatus: 'failed',
      stepResults: [],
    },
    stepsExecuted: 0,
    durationMs: 0,
  };
}

/**
 * Create progress event for workflow execution
 */
export function createWorkflowProgressEvent(
  jobId: string,
  runId: string,
  event: TriggerJobProgressEvent['event'],
  stepIndex: number,
  totalSteps: number,
  stepName?: string,
  message?: string
): TriggerJobProgressEvent {
  return {
    jobId,
    runId,
    event,
    timestamp: new Date().toISOString(),
    data: {
      stepIndex,
      stepName,
      progress: Math.round((stepIndex / totalSteps) * 100),
      message,
    },
  };
}

/**
 * Create a checkpoint for workflow resume capability
 */
export function createCheckpoint(
  executionId: string,
  workflowCode: string,
  currentStepIndex: number,
  completedSteps: WorkflowStepResult[],
  context: Record<string, unknown>
): WorkflowCheckpoint {
  return {
    executionId,
    workflowCode,
    currentStepIndex,
    completedSteps,
    context,
    lastCheckpointAt: new Date().toISOString(),
  };
}

/**
 * Determine if a step should be retried based on error type
 */
export function isRetryableStepError(error: Error | string): boolean {
  const errorMessage = typeof error === 'string' ? error : error.message;
  
  // Non-retryable errors
  const nonRetryable = [
    'invalid configuration',
    'missing required field',
    'workflow not found',
    'unauthorized',
    'permission denied',
  ];
  
  const lowerError = errorMessage.toLowerCase();
  return !nonRetryable.some(pattern => lowerError.includes(pattern));
}

/**
 * Calculate wait duration for wait steps
 */
export function calculateWaitDuration(
  waitConfig: { hours?: number; minutes?: number; seconds?: number; until?: string }
): number {
  if (waitConfig.until) {
    const targetTime = new Date(waitConfig.until).getTime();
    const now = Date.now();
    return Math.max(0, targetTime - now);
  }
  
  let durationMs = 0;
  if (waitConfig.hours) durationMs += waitConfig.hours * 60 * 60 * 1000;
  if (waitConfig.minutes) durationMs += waitConfig.minutes * 60 * 1000;
  if (waitConfig.seconds) durationMs += waitConfig.seconds * 1000;
  
  return durationMs;
}

/**
 * Evaluate condition for condition_check steps
 */
export function evaluateCondition(
  condition: {
    field: string;
    operator: 'equals' | 'not_equals' | 'greater_than' | 'less_than' | 'contains' | 'is_empty' | 'is_not_empty';
    value?: unknown;
  },
  context: Record<string, unknown>
): boolean {
  const fieldValue = getNestedValue(context, condition.field);
  
  switch (condition.operator) {
    case 'equals':
      return fieldValue === condition.value;
    case 'not_equals':
      return fieldValue !== condition.value;
    case 'greater_than':
      return typeof fieldValue === 'number' && typeof condition.value === 'number'
        ? fieldValue > condition.value
        : false;
    case 'less_than':
      return typeof fieldValue === 'number' && typeof condition.value === 'number'
        ? fieldValue < condition.value
        : false;
    case 'contains':
      return typeof fieldValue === 'string' && typeof condition.value === 'string'
        ? fieldValue.includes(condition.value)
        : Array.isArray(fieldValue) && condition.value !== undefined
          ? fieldValue.includes(condition.value)
          : false;
    case 'is_empty':
      return fieldValue === null || fieldValue === undefined || fieldValue === '' ||
        (Array.isArray(fieldValue) && fieldValue.length === 0);
    case 'is_not_empty':
      return fieldValue !== null && fieldValue !== undefined && fieldValue !== '' &&
        (!Array.isArray(fieldValue) || fieldValue.length > 0);
    default:
      return false;
  }
}

/**
 * Get nested value from object using dot notation
 */
function getNestedValue(obj: Record<string, unknown>, path: string): unknown {
  return path.split('.').reduce((current, key) => {
    if (current && typeof current === 'object' && key in current) {
      return (current as Record<string, unknown>)[key];
    }
    return undefined;
  }, obj as unknown);
}

/**
 * Merge step output into workflow context
 */
export function mergeStepOutput(
  context: Record<string, unknown>,
  stepIndex: number,
  output: Record<string, unknown>
): Record<string, unknown> {
  return {
    ...context,
    [`step_${stepIndex}_output`]: output,
    lastStepOutput: output,
  };
}
