/**
 * Trigger.dev Client Initialization
 * 
 * Provides the Trigger.dev client for dispatching and managing jobs.
 * This client is used by both frontend (for triggering) and edge functions.
 */

import { supabase } from '@/integrations/supabase/client';
import type {
  TriggerJobPayload,
  TriggerJobRun,
  TriggerJobStatus,
  TriggerJobType,
  EntityType,
  generateIdempotencyKey,
  getDailyDateKey,
} from '@/types/trigger';

// Re-export utilities
export { generateIdempotencyKey, getDailyDateKey, getHourlyDateKey } from '@/types/trigger';

// ============================================
// Job Dispatch Interface
// ============================================

interface DispatchJobOptions {
  workspaceId: string;
  jobType: TriggerJobType;
  entityType?: EntityType;
  entityId?: string;
  recommendationId?: string;
  inputData: Record<string, unknown>;
  idempotencyKey?: string;
  priority?: number;
  scheduledFor?: Date;
}

interface DispatchResult {
  success: boolean;
  jobRunId?: string;
  triggerRunId?: string;
  error?: string;
  deduplicated?: boolean;
}

/**
 * Dispatch a job to Trigger.dev via the trigger-dispatch edge function
 */
export async function dispatchJob(options: DispatchJobOptions): Promise<DispatchResult> {
  try {
    const { data, error } = await supabase.functions.invoke('trigger-dispatch', {
      body: {
        workspaceId: options.workspaceId,
        jobType: options.jobType,
        entityType: options.entityType,
        entityId: options.entityId,
        recommendationId: options.recommendationId,
        inputData: options.inputData,
        idempotencyKey: options.idempotencyKey,
        priority: options.priority,
        scheduledFor: options.scheduledFor?.toISOString(),
      },
    });

    if (error) {
      console.error('[TriggerClient] Dispatch error:', error);
      return { success: false, error: error.message };
    }

    return {
      success: true,
      jobRunId: data.jobRunId,
      triggerRunId: data.triggerRunId,
      deduplicated: data.deduplicated,
    };
  } catch (err) {
    console.error('[TriggerClient] Unexpected error:', err);
    return {
      success: false,
      error: err instanceof Error ? err.message : 'Unknown error',
    };
  }
}

// ============================================
// Job Query Functions
// ============================================

interface QueryJobsOptions {
  workspaceId: string;
  status?: TriggerJobStatus[];
  jobType?: TriggerJobType;
  entityType?: EntityType;
  entityId?: string;
  limit?: number;
  offset?: number;
}

/**
 * Query job runs from the database
 */
export async function queryJobRuns(options: QueryJobsOptions): Promise<TriggerJobRun[]> {
  let query = supabase
    .from('trigger_job_runs')
    .select('*')
    .eq('workspace_id', options.workspaceId)
    .order('created_at', { ascending: false });

  if (options.status && options.status.length > 0) {
    query = query.in('status', options.status);
  }

  if (options.jobType) {
    query = query.eq('job_type', options.jobType);
  }

  if (options.entityType) {
    query = query.eq('entity_type', options.entityType);
  }

  if (options.entityId) {
    query = query.eq('entity_id', options.entityId);
  }

  if (options.limit) {
    query = query.limit(options.limit);
  }

  if (options.offset) {
    query = query.range(options.offset, options.offset + (options.limit || 50) - 1);
  }

  const { data, error } = await query;

  if (error) {
    console.error('[TriggerClient] Query error:', error);
    return [];
  }

  return (data || []) as TriggerJobRun[];
}

/**
 * Get a single job run by ID
 */
export async function getJobRun(jobRunId: string): Promise<TriggerJobRun | null> {
  const { data, error } = await supabase
    .from('trigger_job_runs')
    .select('*')
    .eq('id', jobRunId)
    .maybeSingle();

  if (error) {
    console.error('[TriggerClient] Get job error:', error);
    return null;
  }

  return data as TriggerJobRun | null;
}

/**
 * Get job runs for a specific entity
 */
export async function getEntityJobRuns(
  workspaceId: string,
  entityType: EntityType,
  entityId: string,
  limit = 10
): Promise<TriggerJobRun[]> {
  return queryJobRuns({
    workspaceId,
    entityType,
    entityId,
    limit,
  });
}

// ============================================
// Job Metrics
// ============================================

interface JobMetrics {
  total: number;
  pending: number;
  running: number;
  completed: number;
  failed: number;
  avgDurationMs: number;
  successRate: number;
}

/**
 * Get job metrics for a workspace
 */
export async function getJobMetrics(
  workspaceId: string,
  since?: Date
): Promise<JobMetrics> {
  let query = supabase
    .from('trigger_job_runs')
    .select('status, started_at, completed_at')
    .eq('workspace_id', workspaceId);

  if (since) {
    query = query.gte('created_at', since.toISOString());
  }

  const { data, error } = await query;

  if (error || !data) {
    return {
      total: 0,
      pending: 0,
      running: 0,
      completed: 0,
      failed: 0,
      avgDurationMs: 0,
      successRate: 0,
    };
  }

  const metrics: JobMetrics = {
    total: data.length,
    pending: 0,
    running: 0,
    completed: 0,
    failed: 0,
    avgDurationMs: 0,
    successRate: 0,
  };

  let totalDuration = 0;
  let completedWithDuration = 0;

  for (const job of data) {
    switch (job.status) {
      case 'pending':
      case 'queued':
        metrics.pending++;
        break;
      case 'running':
        metrics.running++;
        break;
      case 'completed':
        metrics.completed++;
        if (job.started_at && job.completed_at) {
          totalDuration +=
            new Date(job.completed_at).getTime() - new Date(job.started_at).getTime();
          completedWithDuration++;
        }
        break;
      case 'failed':
      case 'cancelled':
        metrics.failed++;
        break;
    }
  }

  if (completedWithDuration > 0) {
    metrics.avgDurationMs = Math.round(totalDuration / completedWithDuration);
  }

  const finishedJobs = metrics.completed + metrics.failed;
  if (finishedJobs > 0) {
    metrics.successRate = Math.round((metrics.completed / finishedJobs) * 100);
  }

  return metrics;
}

// ============================================
// Job Control Actions
// ============================================

/**
 * Cancel a pending or running job
 */
export async function cancelJob(jobRunId: string): Promise<boolean> {
  const { error } = await supabase
    .from('trigger_job_runs')
    .update({
      status: 'cancelled',
      completed_at: new Date().toISOString(),
    })
    .eq('id', jobRunId)
    .in('status', ['pending', 'queued', 'running']);

  if (error) {
    console.error('[TriggerClient] Cancel job error:', error);
    return false;
  }

  return true;
}

/**
 * Retry a failed job
 */
export async function retryJob(jobRunId: string): Promise<DispatchResult> {
  const jobRun = await getJobRun(jobRunId);
  
  if (!jobRun) {
    return { success: false, error: 'Job not found' };
  }

  if (jobRun.status !== 'failed' && jobRun.status !== 'cancelled') {
    return { success: false, error: 'Can only retry failed or cancelled jobs' };
  }

  // Dispatch a new job with the same parameters
  return dispatchJob({
    workspaceId: jobRun.workspace_id,
    jobType: jobRun.job_type as TriggerJobType,
    entityType: jobRun.entity_type as EntityType | undefined,
    entityId: jobRun.entity_id,
    recommendationId: jobRun.recommendation_id,
    inputData: jobRun.input_data,
    priority: jobRun.priority,
  });
}
