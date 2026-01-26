/**
 * Durable Workflow Engine
 * 
 * Executes workflows with checkpointing, idempotency, and observability.
 * Supports sequential and parallel step execution with retry logic.
 * 
 * Note: This module uses dynamic table access for workflow tables.
 * TypeScript errors will resolve after Supabase types are regenerated.
 */

import { supabase } from '@/integrations/supabase/client';
import type {
  WorkflowExecution,
  WorkflowStepExecution,
  WorkflowStepConfig,
  WorkflowStatus,
  StepExecutorContext,
  StepExecutorResult,
  StepExecutor,
  WorkflowEvent,
  WorkflowStepType,
} from '@/types/workflows';
import { generateIdempotencyKey } from '@/types/workflows';

// @ts-nocheck - Workflow tables not yet in generated types

// =============================================================================
// STEP EXECUTORS REGISTRY
// =============================================================================

const stepExecutors: Map<WorkflowStepType, StepExecutor> = new Map();

export function registerStepExecutor(type: WorkflowStepType, executor: StepExecutor) {
  stepExecutors.set(type, executor);
}

function getStepExecutor(type: WorkflowStepType): StepExecutor | undefined {
  return stepExecutors.get(type);
}

// =============================================================================
// IDEMPOTENCY CHECKING
// =============================================================================

interface IdempotencyCheckResult {
  alreadyExecuted: boolean;
  executedAt?: string;
  resultStatus?: string;
  resultData?: Record<string, unknown>;
}

async function checkIdempotency(
  workspaceId: string,
  idempotencyKey: string
): Promise<IdempotencyCheckResult> {
  // Direct query to check if key exists
  const { data, error } = await (supabase
    .from('workflow_idempotency_keys' as 'product_usage_stats')
    .select('executed_at, result_status, result_data')
    .eq('workspace_id', workspaceId)
    .eq('idempotency_key', idempotencyKey)
    .maybeSingle() as unknown as Promise<{ data: { executed_at: string; result_status: string; result_data: DbJson } | null; error: unknown }>);

  if (error || !data) {
    return { alreadyExecuted: false };
  }

  return {
    alreadyExecuted: true,
    executedAt: data.executed_at,
    resultStatus: data.result_status,
    resultData: data.result_data as Record<string, unknown>,
  };
}

async function recordIdempotencyKey(
  workspaceId: string,
  idempotencyKey: string,
  executionId: string,
  stepId: string,
  actionType: string,
  resultStatus: string,
  resultData: Record<string, unknown>
): Promise<void> {
  await (supabase
    .from('workflow_idempotency_keys' as 'product_usage_stats')
    .insert({
      workspace_id: workspaceId,
      idempotency_key: idempotencyKey,
      execution_id: executionId,
      step_id: stepId,
      action_type: actionType,
      result_status: resultStatus,
      result_data: resultData as DbJson,
    } as never) as Promise<unknown>);
}

// =============================================================================
// CHECKPOINTING
// =============================================================================

async function saveCheckpoint(
  executionId: string,
  stepIndex: number,
  context: Record<string, unknown>
): Promise<void> {
  await (supabase
    .from('workflow_executions' as 'product_usage_stats')
    .update({
      current_step_index: stepIndex,
      context: context as DbJson,
      last_checkpoint_at: new Date().toISOString(),
      checkpoint_data: {
        step_index: stepIndex,
        timestamp: new Date().toISOString(),
      } as DbJson,
      updated_at: new Date().toISOString(),
    } as never)
    .eq('id', executionId) as Promise<unknown>);
}

// =============================================================================
// EVENT EMISSION
// =============================================================================

type WorkflowEventHandler = (event: WorkflowEvent) => void;
const eventHandlers: WorkflowEventHandler[] = [];

export function onWorkflowEvent(handler: WorkflowEventHandler) {
  eventHandlers.push(handler);
  return () => {
    const index = eventHandlers.indexOf(handler);
    if (index > -1) eventHandlers.splice(index, 1);
  };
}

function emitEvent(event: Omit<WorkflowEvent, 'timestamp'>) {
  const fullEvent: WorkflowEvent = {
    ...event,
    timestamp: new Date().toISOString(),
  };
  
  eventHandlers.forEach(handler => {
    try {
      handler(fullEvent);
    } catch (err) {
      console.error('[WorkflowEngine] Event handler error:', err);
    }
  });
}

// =============================================================================
// STEP EXECUTION
// =============================================================================

async function executeStep(
  context: StepExecutorContext
): Promise<StepExecutorResult> {
  const { step, stepConfig, execution } = context;
  
  // 1. Check idempotency first
  const idempotencyCheck = await checkIdempotency(
    context.workspaceId,
    step.idempotency_key
  );
  
  if (idempotencyCheck.alreadyExecuted) {
    console.log(`[WorkflowEngine] Step ${step.step_code} already executed, skipping`);
    return {
      success: idempotencyCheck.resultStatus === 'success',
      output: idempotencyCheck.resultData || {},
    };
  }
  
  // 2. Get executor
  const executor = getStepExecutor(stepConfig.type);
  if (!executor) {
    return {
      success: false,
      output: {},
      error: {
        message: `No executor registered for step type: ${stepConfig.type}`,
        code: 'EXECUTOR_NOT_FOUND',
        retryable: false,
      },
    };
  }
  
  // 3. Execute with timeout
  const timeoutMs = stepConfig.timeout_ms || 30000;
  
  try {
    const result = await Promise.race([
      executor(context),
      new Promise<StepExecutorResult>((_, reject) => {
        setTimeout(() => {
          reject(new Error(`Step timeout after ${timeoutMs}ms`));
        }, timeoutMs);
      }),
    ]);
    
    // 4. Record idempotency key
    await recordIdempotencyKey(
      context.workspaceId,
      step.idempotency_key,
      execution.id,
      step.id,
      stepConfig.type,
      result.success ? 'success' : 'failed',
      result.output
    );
    
    return result;
  } catch (err) {
    const error = err instanceof Error ? err : new Error(String(err));
    
    return {
      success: false,
      output: {},
      error: {
        message: error.message,
        code: 'EXECUTION_ERROR',
        retryable: true,
      },
    };
  }
}

// =============================================================================
// RETRY LOGIC
// =============================================================================

function calculateRetryDelay(attempt: number, baseDelayMs: number): number {
  const exponentialDelay = baseDelayMs * Math.pow(2, attempt);
  const jitter = Math.random() * 0.3 * exponentialDelay;
  return Math.min(exponentialDelay + jitter, 60000);
}

async function executeStepWithRetry(
  context: StepExecutorContext,
  maxRetries: number,
  baseDelayMs: number
): Promise<StepExecutorResult> {
  let lastResult: StepExecutorResult | null = null;
  
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    if (attempt > 0) {
      const delay = calculateRetryDelay(attempt, baseDelayMs);
      console.log(`[WorkflowEngine] Retrying step ${context.step.step_code} in ${delay}ms (attempt ${attempt + 1})`);
      
      emitEvent({
        type: 'step_retrying',
        execution_id: context.execution.id,
        workflow_code: context.execution.workflow_code,
        step_code: context.step.step_code,
        step_index: context.step.step_index,
        data: { attempt, delay },
      });
      
      await new Promise(resolve => setTimeout(resolve, delay));
    }
    
    lastResult = await executeStep(context);
    
    if (lastResult.success || !lastResult.error?.retryable) {
      break;
    }
  }
  
  return lastResult || {
    success: false,
    output: {},
    error: { message: 'No result', code: 'NO_RESULT', retryable: false },
  };
}

// =============================================================================
// PARALLEL STEP EXECUTION
// =============================================================================

async function executeParallelSteps(
  contexts: StepExecutorContext[],
  maxRetries: number,
  baseDelayMs: number
): Promise<Map<string, StepExecutorResult>> {
  const results = new Map<string, StepExecutorResult>();
  
  const promises = contexts.map(async (ctx) => {
    emitEvent({
      type: 'step_started',
      execution_id: ctx.execution.id,
      workflow_code: ctx.execution.workflow_code,
      step_code: ctx.step.step_code,
      step_index: ctx.step.step_index,
    });
    
    const result = await executeStepWithRetry(ctx, maxRetries, baseDelayMs);
    results.set(ctx.step.step_code, result);
    
    emitEvent({
      type: result.success ? 'step_completed' : 'step_failed',
      execution_id: ctx.execution.id,
      workflow_code: ctx.execution.workflow_code,
      step_code: ctx.step.step_code,
      step_index: ctx.step.step_index,
      data: result.output,
      error: result.error?.message,
    });
    
    return result;
  });
  
  await Promise.all(promises);
  
  return results;
}

// =============================================================================
// MAIN WORKFLOW EXECUTOR
// =============================================================================

export interface WorkflowExecutionOptions {
  maxRetries?: number;
  retryDelayMs?: number;
  timeoutMs?: number;
  resumeFromCheckpoint?: boolean;
}

export interface WorkflowExecutionResult {
  success: boolean;
  status: WorkflowStatus;
  output: Record<string, unknown>;
  stepsExecuted: number;
  stepsFailed: number;
  durationMs: number;
  error?: string;
}

export async function executeWorkflow(
  execution: WorkflowExecution,
  stepConfigs: WorkflowStepConfig[],
  options: WorkflowExecutionOptions = {}
): Promise<WorkflowExecutionResult> {
  const startTime = Date.now();
  const {
    maxRetries = 3,
    retryDelayMs = 1000,
    resumeFromCheckpoint = true,
  } = options;
  
  let currentStepIndex = resumeFromCheckpoint 
    ? execution.current_step_index 
    : 0;
  
  let accumulatedContext: Record<string, unknown> = {
    ...execution.input_data,
    ...execution.context,
  };
  
  let stepsExecuted = 0;
  let stepsFailed = 0;
  
  // Emit workflow started
  emitEvent({
    type: 'workflow_started',
    execution_id: execution.id,
    workflow_code: execution.workflow_code,
    data: { starting_step: currentStepIndex },
  });
  
  // Update execution status to running
  await (supabase
    .from('workflow_executions' as 'product_usage_stats')
    .update({
      status: 'running',
      started_at: new Date().toISOString(),
    } as never)
    .eq('id', execution.id) as Promise<unknown>);
  
  try {
    // Group steps by parallel groups
    const stepGroups: WorkflowStepConfig[][] = [];
    let currentGroup: WorkflowStepConfig[] = [];
    let currentParallelGroup: string | null = null;
    
    for (const stepConfig of stepConfigs.slice(currentStepIndex)) {
      if (stepConfig.is_parallel && stepConfig.parallel_group) {
        if (currentParallelGroup === stepConfig.parallel_group) {
          currentGroup.push(stepConfig);
        } else {
          if (currentGroup.length > 0) {
            stepGroups.push(currentGroup);
          }
          currentGroup = [stepConfig];
          currentParallelGroup = stepConfig.parallel_group;
        }
      } else {
        if (currentGroup.length > 0) {
          stepGroups.push(currentGroup);
          currentGroup = [];
          currentParallelGroup = null;
        }
        stepGroups.push([stepConfig]);
      }
    }
    if (currentGroup.length > 0) {
      stepGroups.push(currentGroup);
    }
    
    // Execute step groups
    for (const group of stepGroups) {
      const stepExecutions: WorkflowStepExecution[] = [];
      
      for (const stepConfig of group) {
        const stepIndex = stepConfigs.indexOf(stepConfig);
        const idempotencyKey = generateIdempotencyKey(
          execution.id,
          stepConfig.code,
          execution.entity_id
        );
        
        // Check if step already exists
        const { data: existingStep } = await (supabase
          .from('workflow_steps' as 'product_usage_stats')
          .select('*')
          .eq('execution_id', execution.id)
          .eq('step_index', stepIndex)
          .maybeSingle() as unknown as Promise<{ data: WorkflowStepExecution | null }>);
        
        if (existingStep) {
          stepExecutions.push(existingStep);
        } else {
          const { data: newStep } = await (supabase
            .from('workflow_steps' as 'product_usage_stats')
            .insert({
              execution_id: execution.id,
              workspace_id: execution.workspace_id,
              step_index: stepIndex,
              step_code: stepConfig.code,
              step_type: stepConfig.type,
              idempotency_key: idempotencyKey,
              input_data: stepConfig.input as DbJson,
              max_retries: stepConfig.max_retries || maxRetries,
              timeout_ms: stepConfig.timeout_ms || 30000,
              is_parallel: stepConfig.is_parallel || false,
              parallel_group: stepConfig.parallel_group,
            } as never)
            .select()
            .single() as unknown as Promise<{ data: WorkflowStepExecution }>);
          
          if (newStep) {
            stepExecutions.push(newStep);
          }
        }
      }
      
      // Build contexts
      const contexts: StepExecutorContext[] = stepExecutions.map((step, idx) => ({
        execution,
        step,
        stepConfig: group[idx],
        workspaceId: execution.workspace_id,
        entityType: execution.entity_type,
        entityId: execution.entity_id,
        accumulatedContext,
      }));
      
      // Execute (parallel or sequential)
      let results: Map<string, StepExecutorResult>;
      
      if (group.length > 1) {
        results = await executeParallelSteps(contexts, maxRetries, retryDelayMs);
      } else {
        const ctx = contexts[0];
        
        emitEvent({
          type: 'step_started',
          execution_id: execution.id,
          workflow_code: execution.workflow_code,
          step_code: ctx.step.step_code,
          step_index: ctx.step.step_index,
        });
        
        const result = await executeStepWithRetry(ctx, maxRetries, retryDelayMs);
        results = new Map([[ctx.step.step_code, result]]);
        
        emitEvent({
          type: result.success ? 'step_completed' : 'step_failed',
          execution_id: execution.id,
          workflow_code: execution.workflow_code,
          step_code: ctx.step.step_code,
          step_index: ctx.step.step_index,
          data: result.output,
          error: result.error?.message,
        });
      }
      
      // Process results
      for (const [stepCode, result] of results) {
        const step = stepExecutions.find(s => s.step_code === stepCode);
        if (!step) continue;
        
        stepsExecuted++;
        
        if (result.success) {
          await (supabase
            .from('workflow_steps' as 'product_usage_stats')
            .update({
              status: 'completed',
              output_data: result.output as DbJson,
              completed_at: new Date().toISOString(),
              duration_ms: Date.now() - startTime,
            } as never)
            .eq('id', step.id) as Promise<unknown>);
          
          if (result.contextUpdates) {
            accumulatedContext = {
              ...accumulatedContext,
              ...result.contextUpdates,
            };
          }
        } else {
          stepsFailed++;
          
          await (supabase
            .from('workflow_steps' as 'product_usage_stats')
            .update({
              status: 'failed',
              error_message: result.error?.message,
              error_details: result.error as DbJson,
              completed_at: new Date().toISOString(),
              duration_ms: Date.now() - startTime,
            } as never)
            .eq('id', step.id) as Promise<unknown>);
          
          const stepConfig = group.find(c => c.code === stepCode);
          if (stepConfig?.on_error === 'fail' || !result.error?.retryable) {
            throw new Error(`Step ${stepCode} failed: ${result.error?.message}`);
          }
        }
      }
      
      // Update checkpoint after each group
      currentStepIndex = stepConfigs.indexOf(group[group.length - 1]) + 1;
      await saveCheckpoint(execution.id, currentStepIndex, accumulatedContext);
      
      emitEvent({
        type: 'checkpoint_saved',
        execution_id: execution.id,
        workflow_code: execution.workflow_code,
        data: { step_index: currentStepIndex },
      });
    }
    
    // Workflow completed successfully
    const durationMs = Date.now() - startTime;
    const finalStatus: WorkflowStatus = stepsFailed > 0 ? 'partial' : 'completed';
    
    await (supabase
      .from('workflow_executions' as 'product_usage_stats')
      .update({
        status: finalStatus,
        output_data: accumulatedContext as DbJson,
        completed_at: new Date().toISOString(),
        total_duration_ms: durationMs,
      } as never)
      .eq('id', execution.id) as Promise<unknown>);
    
    emitEvent({
      type: 'workflow_completed',
      execution_id: execution.id,
      workflow_code: execution.workflow_code,
      data: { steps_executed: stepsExecuted, steps_failed: stepsFailed },
    });
    
    return {
      success: stepsFailed === 0,
      status: finalStatus,
      output: accumulatedContext,
      stepsExecuted,
      stepsFailed,
      durationMs,
    };
    
  } catch (err) {
    const error = err instanceof Error ? err : new Error(String(err));
    const durationMs = Date.now() - startTime;
    
    await (supabase
      .from('workflow_executions' as 'product_usage_stats')
      .update({
        status: 'failed',
        error_message: error.message,
        error_details: { stack: error.stack } as DbJson,
        completed_at: new Date().toISOString(),
        total_duration_ms: durationMs,
      } as never)
      .eq('id', execution.id) as Promise<unknown>);
    
    emitEvent({
      type: 'workflow_failed',
      execution_id: execution.id,
      workflow_code: execution.workflow_code,
      error: error.message,
    });
    
    return {
      success: false,
      status: 'failed',
      output: accumulatedContext,
      stepsExecuted,
      stepsFailed,
      durationMs,
      error: error.message,
    };
  }
}

// =============================================================================
// WORKFLOW CREATION
// =============================================================================

export async function createWorkflowExecution(
  workspaceId: string,
  workflowCode: string,
  options: {
    triggerType: string;
    triggerSource?: string;
    recommendationId?: string;
    entityType?: string;
    entityId?: string;
    initiatedBy?: string;
    inputData?: Record<string, unknown>;
    scheduledFor?: string;
    priority?: number;
  }
): Promise<WorkflowExecution | null> {
  const { data: execution } = await (supabase
    .from('workflow_executions' as 'product_usage_stats')
    .insert({
      workspace_id: workspaceId,
      workflow_code: workflowCode,
      workflow_version: 1,
      trigger_type: options.triggerType,
      trigger_source: options.triggerSource || 'user',
      recommendation_id: options.recommendationId,
      entity_type: options.entityType,
      entity_id: options.entityId,
      initiated_by: options.initiatedBy,
      input_data: (options.inputData || {}) as DbJson,
      scheduled_for: options.scheduledFor,
    } as never)
    .select()
    .single() as unknown as Promise<{ data: WorkflowExecution }>);
  
  if (!execution) {
    return null;
  }
  
  // Add to queue
  await (supabase
    .from('workflow_queue' as 'product_usage_stats')
    .insert({
      workspace_id: workspaceId,
      execution_id: execution.id,
      priority: options.priority || 0,
      scheduled_for: options.scheduledFor || new Date().toISOString(),
    } as never) as Promise<unknown>);
  
  return execution;
}
