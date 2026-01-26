/**
 * Parallel Agent Dispatch & Concurrency Control
 * 
 * Enables the CRM to dispatch multiple AI agent runs in parallel
 * while enforcing strict concurrency controls to avoid conflicts.
 */

import { supabase } from '@/integrations/supabase/client';
import type { EntityType, TriggerJobType } from '@/types/trigger';
import { dispatchJob } from './client';

// ============================================
// Concurrency Configuration
// ============================================

export interface ConcurrencyConfig {
  maxConcurrentPerEntity: number;
  maxConcurrentPerWorkspace: number;
  maxConcurrentGlobal: number;
  lockTimeoutMs: number;
  retryDelayMs: number;
  maxRetries: number;
}

export const DEFAULT_CONCURRENCY_CONFIG: ConcurrencyConfig = {
  maxConcurrentPerEntity: 1,
  maxConcurrentPerWorkspace: 5,
  maxConcurrentGlobal: 50,
  lockTimeoutMs: 120000, // 2 minutes
  retryDelayMs: 2000,
  maxRetries: 3,
};

// ============================================
// Task & Batch Types
// ============================================

export interface ParallelTask {
  id: string;
  workspaceId: string;
  entityType: EntityType;
  entityId: string;
  jobType: TriggerJobType;
  inputData: Record<string, unknown>;
  priority?: number;
  idempotencyKey?: string;
}

export interface BatchDispatchRequest {
  batchId: string;
  workspaceId: string;
  tasks: ParallelTask[];
  config?: Partial<ConcurrencyConfig>;
}

export interface TaskResult {
  taskId: string;
  entityId: string;
  entityType: EntityType;
  status: 'success' | 'partial' | 'failed' | 'queued' | 'skipped';
  jobRunId?: string;
  triggerRunId?: string;
  recommendationId?: string;
  error?: string;
  durationMs?: number;
}

export interface BatchDispatchResult {
  batchId: string;
  tasksRequested: number;
  tasksDispatched: number;
  tasksQueued: number;
  tasksFailed: number;
  tasksSkipped: number;
  executionTimeMs: number;
  results: TaskResult[];
  errors: Array<{ taskId: string; reason: string }>;
}

// ============================================
// Lock Management
// ============================================

interface EntityLock {
  id: string;
  workspaceId: string;
  entityId: string;
  agentType: string;
  jobId: string | null;
  lockedAt: string;
  expiresAt: string;
}

/**
 * Acquire a lock for an entity
 */
export async function acquireEntityLock(
  workspaceId: string,
  entityId: string,
  agentType: string,
  jobId?: string,
  timeoutMs: number = DEFAULT_CONCURRENCY_CONFIG.lockTimeoutMs
): Promise<{ acquired: boolean; lock?: EntityLock; reason?: string }> {
  const now = new Date();
  const expiresAt = new Date(now.getTime() + timeoutMs);

  // Check for existing active lock
  const { data: existingLock } = await supabase
    .from('ai_agent_locks')
    .select('*')
    .eq('workspace_id', workspaceId)
    .eq('entity_id', entityId)
    .gt('expires_at', now.toISOString())
    .maybeSingle();

  if (existingLock) {
    return {
      acquired: false,
      reason: `Entity already locked by ${existingLock.agent_type} until ${existingLock.expires_at}`,
    };
  }

  // Try to acquire lock
  const { data: newLock, error } = await supabase
    .from('ai_agent_locks')
    .insert({
      workspace_id: workspaceId,
      entity_id: entityId,
      agent_type: agentType,
      job_id: jobId || null,
      locked_at: now.toISOString(),
      expires_at: expiresAt.toISOString(),
    })
    .select()
    .single();

  if (error) {
    // Race condition - another lock was acquired
    if (error.code === '23505') {
      return {
        acquired: false,
        reason: 'Lock conflict - another process acquired the lock',
      };
    }
    return { acquired: false, reason: error.message };
  }

  return {
    acquired: true,
    lock: {
      id: newLock.id,
      workspaceId: newLock.workspace_id,
      entityId: newLock.entity_id,
      agentType: newLock.agent_type,
      jobId: newLock.job_id,
      lockedAt: newLock.locked_at,
      expiresAt: newLock.expires_at,
    },
  };
}

/**
 * Release an entity lock
 */
export async function releaseEntityLock(lockId: string): Promise<boolean> {
  const { error } = await supabase
    .from('ai_agent_locks')
    .delete()
    .eq('id', lockId);

  return !error;
}

/**
 * Clean up expired locks
 */
export async function cleanupExpiredLocks(workspaceId?: string): Promise<number> {
  const now = new Date().toISOString();
  
  let query = supabase
    .from('ai_agent_locks')
    .delete()
    .lt('expires_at', now);

  if (workspaceId) {
    query = query.eq('workspace_id', workspaceId);
  }

  const { data } = await query.select('id');
  return data?.length || 0;
}

// ============================================
// Concurrency Checking
// ============================================

/**
 * Check current concurrency levels
 */
export async function checkConcurrencyLevels(
  workspaceId: string,
  config: ConcurrencyConfig = DEFAULT_CONCURRENCY_CONFIG
): Promise<{
  workspaceLevel: number;
  globalLevel: number;
  canDispatch: boolean;
  reason?: string;
}> {
  const now = new Date().toISOString();

  // Check workspace-level concurrency
  const { count: workspaceCount } = await supabase
    .from('trigger_job_runs')
    .select('*', { count: 'exact', head: true })
    .eq('workspace_id', workspaceId)
    .in('status', ['pending', 'queued', 'running']);

  // Check global concurrency
  const { count: globalCount } = await supabase
    .from('trigger_job_runs')
    .select('*', { count: 'exact', head: true })
    .in('status', ['pending', 'queued', 'running']);

  const workspaceLevel = workspaceCount || 0;
  const globalLevel = globalCount || 0;

  if (workspaceLevel >= config.maxConcurrentPerWorkspace) {
    return {
      workspaceLevel,
      globalLevel,
      canDispatch: false,
      reason: `Workspace at max concurrency (${workspaceLevel}/${config.maxConcurrentPerWorkspace})`,
    };
  }

  if (globalLevel >= config.maxConcurrentGlobal) {
    return {
      workspaceLevel,
      globalLevel,
      canDispatch: false,
      reason: `System at max concurrency (${globalLevel}/${config.maxConcurrentGlobal})`,
    };
  }

  return {
    workspaceLevel,
    globalLevel,
    canDispatch: true,
  };
}

// ============================================
// Domain Grouping
// ============================================

interface TaskGroup {
  key: string; // workspace:entityType:entityId
  workspaceId: string;
  entityType: EntityType;
  entityId: string;
  tasks: ParallelTask[];
}

/**
 * Group tasks by domain (workspace + entity) for independence validation
 */
export function groupTasksByDomain(tasks: ParallelTask[]): TaskGroup[] {
  const groups = new Map<string, TaskGroup>();

  for (const task of tasks) {
    const key = `${task.workspaceId}:${task.entityType}:${task.entityId}`;
    
    if (!groups.has(key)) {
      groups.set(key, {
        key,
        workspaceId: task.workspaceId,
        entityType: task.entityType,
        entityId: task.entityId,
        tasks: [],
      });
    }
    
    groups.get(key)!.tasks.push(task);
  }

  return Array.from(groups.values());
}

/**
 * Validate task independence - only one task per entity at a time
 */
export function validateTaskIndependence(
  groups: TaskGroup[]
): { valid: ParallelTask[]; conflicting: ParallelTask[] } {
  const valid: ParallelTask[] = [];
  const conflicting: ParallelTask[] = [];

  for (const group of groups) {
    if (group.tasks.length === 1) {
      valid.push(group.tasks[0]);
    } else {
      // Take the first task (highest priority if sorted), queue the rest
      const sorted = [...group.tasks].sort((a, b) => (b.priority || 0) - (a.priority || 0));
      valid.push(sorted[0]);
      conflicting.push(...sorted.slice(1));
    }
  }

  return { valid, conflicting };
}

// ============================================
// Parallel Dispatch
// ============================================

/**
 * Dispatch a batch of tasks in parallel with concurrency control
 */
export async function dispatchBatch(
  request: BatchDispatchRequest
): Promise<BatchDispatchResult> {
  const startTime = Date.now();
  const config = { ...DEFAULT_CONCURRENCY_CONFIG, ...request.config };

  const result: BatchDispatchResult = {
    batchId: request.batchId,
    tasksRequested: request.tasks.length,
    tasksDispatched: 0,
    tasksQueued: 0,
    tasksFailed: 0,
    tasksSkipped: 0,
    executionTimeMs: 0,
    results: [],
    errors: [],
  };

  if (request.tasks.length === 0) {
    result.executionTimeMs = Date.now() - startTime;
    return result;
  }

  // Clean up expired locks first
  await cleanupExpiredLocks(request.workspaceId);

  // Group and validate independence
  const groups = groupTasksByDomain(request.tasks);
  const { valid: independentTasks, conflicting: conflictingTasks } = validateTaskIndependence(groups);

  // Mark conflicting tasks as skipped
  for (const task of conflictingTasks) {
    result.tasksSkipped++;
    result.results.push({
      taskId: task.id,
      entityId: task.entityId,
      entityType: task.entityType,
      status: 'skipped',
      error: 'Conflicting task for same entity already in batch',
    });
  }

  // Check concurrency levels
  const concurrencyCheck = await checkConcurrencyLevels(request.workspaceId, config);
  
  if (!concurrencyCheck.canDispatch) {
    // Queue all tasks instead of failing
    for (const task of independentTasks) {
      result.tasksQueued++;
      result.results.push({
        taskId: task.id,
        entityId: task.entityId,
        entityType: task.entityType,
        status: 'queued',
        error: concurrencyCheck.reason,
      });
    }
    result.executionTimeMs = Date.now() - startTime;
    return result;
  }

  // Calculate how many we can dispatch
  const availableSlots = Math.min(
    config.maxConcurrentPerWorkspace - concurrencyCheck.workspaceLevel,
    config.maxConcurrentGlobal - concurrencyCheck.globalLevel,
    independentTasks.length
  );

  const tasksToDispatch = independentTasks.slice(0, availableSlots);
  const tasksToQueue = independentTasks.slice(availableSlots);

  // Queue overflow tasks
  for (const task of tasksToQueue) {
    result.tasksQueued++;
    result.results.push({
      taskId: task.id,
      entityId: task.entityId,
      entityType: task.entityType,
      status: 'queued',
      error: 'Concurrency limit reached - queued for later',
    });
  }

  // Dispatch tasks in parallel
  const dispatchPromises = tasksToDispatch.map(async (task) => {
    const taskStart = Date.now();

    try {
      // Try to acquire entity lock
      const lockResult = await acquireEntityLock(
        task.workspaceId,
        task.entityId,
        task.jobType,
        undefined,
        config.lockTimeoutMs
      );

      if (!lockResult.acquired) {
        return {
          taskId: task.id,
          entityId: task.entityId,
          entityType: task.entityType,
          status: 'queued' as const,
          error: lockResult.reason,
          durationMs: Date.now() - taskStart,
        };
      }

      // Dispatch to Trigger.dev
      const dispatchResult = await dispatchJob({
        workspaceId: task.workspaceId,
        jobType: task.jobType,
        entityType: task.entityType,
        entityId: task.entityId,
        inputData: task.inputData,
        idempotencyKey: task.idempotencyKey,
        priority: task.priority,
      });

      if (!dispatchResult.success) {
        // Release lock on failure
        if (lockResult.lock) {
          await releaseEntityLock(lockResult.lock.id);
        }

        return {
          taskId: task.id,
          entityId: task.entityId,
          entityType: task.entityType,
          status: 'failed' as const,
          error: dispatchResult.error,
          durationMs: Date.now() - taskStart,
        };
      }

      return {
        taskId: task.id,
        entityId: task.entityId,
        entityType: task.entityType,
        status: 'success' as const,
        jobRunId: dispatchResult.jobRunId,
        triggerRunId: dispatchResult.triggerRunId,
        durationMs: Date.now() - taskStart,
      };
    } catch (error) {
      return {
        taskId: task.id,
        entityId: task.entityId,
        entityType: task.entityType,
        status: 'failed' as const,
        error: error instanceof Error ? error.message : 'Unknown error',
        durationMs: Date.now() - taskStart,
      };
    }
  });

  // Wait for all dispatches to complete
  const dispatchResults = await Promise.all(dispatchPromises);

  // Aggregate results
  for (const taskResult of dispatchResults) {
    result.results.push(taskResult);

    switch (taskResult.status) {
      case 'success':
        result.tasksDispatched++;
        break;
      case 'failed':
        result.tasksFailed++;
        result.errors.push({
          taskId: taskResult.taskId,
          reason: taskResult.error || 'Unknown error',
        });
        break;
      case 'queued':
        result.tasksQueued++;
        break;
    }
  }

  result.executionTimeMs = Date.now() - startTime;
  return result;
}

// ============================================
// Batch Metrics
// ============================================

export interface BatchMetrics {
  queueDepth: number;
  activeConcurrency: number;
  lockContentionRate: number;
  avgTaskDurationMs: number;
  failureRate: number;
}

/**
 * Get batch metrics for a workspace
 */
export async function getBatchMetrics(
  workspaceId: string,
  since?: Date
): Promise<BatchMetrics> {
  const sinceDate = since || new Date(Date.now() - 24 * 60 * 60 * 1000); // Last 24h

  // Queue depth
  const { count: queueDepth } = await supabase
    .from('trigger_job_runs')
    .select('*', { count: 'exact', head: true })
    .eq('workspace_id', workspaceId)
    .in('status', ['pending', 'queued']);

  // Active concurrency
  const { count: activeConcurrency } = await supabase
    .from('trigger_job_runs')
    .select('*', { count: 'exact', head: true })
    .eq('workspace_id', workspaceId)
    .eq('status', 'running');

  // Get job stats for lock contention and durations
  const { data: jobStats } = await supabase
    .from('trigger_job_runs')
    .select('status, started_at, completed_at, attempts')
    .eq('workspace_id', workspaceId)
    .gte('created_at', sinceDate.toISOString());

  let totalDuration = 0;
  let completedCount = 0;
  let failedCount = 0;
  let retriedCount = 0;

  for (const job of jobStats || []) {
    if (job.status === 'completed' && job.started_at && job.completed_at) {
      totalDuration += new Date(job.completed_at).getTime() - new Date(job.started_at).getTime();
      completedCount++;
    }
    if (job.status === 'failed') {
      failedCount++;
    }
    if ((job.attempts || 0) > 1) {
      retriedCount++;
    }
  }

  const totalJobs = (jobStats || []).length;

  return {
    queueDepth: queueDepth || 0,
    activeConcurrency: activeConcurrency || 0,
    lockContentionRate: totalJobs > 0 ? (retriedCount / totalJobs) * 100 : 0,
    avgTaskDurationMs: completedCount > 0 ? Math.round(totalDuration / completedCount) : 0,
    failureRate: totalJobs > 0 ? (failedCount / totalJobs) * 100 : 0,
  };
}

// ============================================
// Convenience Functions
// ============================================

/**
 * Create a parallel task from entity info
 */
export function createParallelTask(
  workspaceId: string,
  entityType: EntityType,
  entityId: string,
  jobType: TriggerJobType,
  inputData: Record<string, unknown> = {},
  priority: number = 0
): ParallelTask {
  return {
    id: crypto.randomUUID(),
    workspaceId,
    entityType,
    entityId,
    jobType,
    inputData,
    priority,
    idempotencyKey: `${jobType}:${workspaceId}:${entityId}:${new Date().toISOString().split('T')[0]}`,
  };
}

/**
 * Dispatch a batch of entity analyses in parallel
 */
export async function dispatchParallelAnalysis(
  workspaceId: string,
  entities: Array<{ entityType: EntityType; entityId: string; agentType: string }>,
  triggerType: string = 'batch'
): Promise<BatchDispatchResult> {
  const tasks = entities.map((entity) =>
    createParallelTask(workspaceId, entity.entityType, entity.entityId, 'ai-analysis', {
      agentType: entity.agentType,
      triggerType,
    })
  );

  return dispatchBatch({
    batchId: crypto.randomUUID(),
    workspaceId,
    tasks,
  });
}
