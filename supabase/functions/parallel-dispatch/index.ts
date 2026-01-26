import { corsHeaders } from '../_shared/cors.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

/**
 * Parallel Dispatch Edge Function
 * 
 * Server-side batch dispatch with concurrency control.
 * Handles high-volume parallel agent execution.
 */

interface ParallelTask {
  id: string;
  entityType: string;
  entityId: string;
  jobType: string;
  inputData: Record<string, unknown>;
  priority?: number;
  idempotencyKey?: string;
}

interface BatchRequest {
  batchId: string;
  workspaceId: string;
  tasks: ParallelTask[];
  config?: {
    maxConcurrentPerEntity?: number;
    maxConcurrentPerWorkspace?: number;
    lockTimeoutMs?: number;
  };
}

interface TaskResult {
  taskId: string;
  entityId: string;
  entityType: string;
  status: 'success' | 'queued' | 'failed' | 'skipped';
  jobRunId?: string;
  triggerRunId?: string;
  error?: string;
  durationMs?: number;
}

interface BatchResult {
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

const DEFAULT_CONFIG = {
  maxConcurrentPerEntity: 1,
  maxConcurrentPerWorkspace: 5,
  lockTimeoutMs: 120000,
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  const startTime = Date.now();

  try {
    // Auth validation
    const authHeader = req.headers.get('Authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return new Response(
        JSON.stringify({ success: false, error: 'Unauthorized' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

    const supabase = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } }
    });

    // Validate user
    const token = authHeader.replace('Bearer ', '');
    const { data: userData, error: userError } = await supabase.auth.getUser(token);
    
    if (userError || !userData?.user) {
      return new Response(
        JSON.stringify({ success: false, error: 'Unauthorized' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const userId = userData.user.id;
    const body: BatchRequest = await req.json();
    const { batchId, workspaceId, tasks, config: userConfig } = body;

    // Validate request
    if (!workspaceId || !batchId || !tasks || !Array.isArray(tasks)) {
      return new Response(
        JSON.stringify({ success: false, error: 'Missing required fields' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Verify workspace membership
    const { data: memberCheck } = await supabase
      .from('workspace_members')
      .select('role')
      .eq('workspace_id', workspaceId)
      .eq('user_id', userId)
      .maybeSingle();

    if (!memberCheck) {
      return new Response(
        JSON.stringify({ success: false, error: 'Not a member of this workspace' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const config = { ...DEFAULT_CONFIG, ...userConfig };
    const serviceSupabase = createClient(supabaseUrl, supabaseServiceKey);

    console.log(`[ParallelDispatch] Starting batch ${batchId} with ${tasks.length} tasks`);

    // Initialize result
    const result: BatchResult = {
      batchId,
      tasksRequested: tasks.length,
      tasksDispatched: 0,
      tasksQueued: 0,
      tasksFailed: 0,
      tasksSkipped: 0,
      executionTimeMs: 0,
      results: [],
      errors: [],
    };

    if (tasks.length === 0) {
      result.executionTimeMs = Date.now() - startTime;
      return new Response(JSON.stringify(result), {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // Clean expired locks
    await serviceSupabase
      .from('ai_agent_locks')
      .delete()
      .lt('expires_at', new Date().toISOString());

    // Group by entity for independence check
    const entityGroups = new Map<string, ParallelTask[]>();
    for (const task of tasks) {
      const key = `${task.entityType}:${task.entityId}`;
      if (!entityGroups.has(key)) {
        entityGroups.set(key, []);
      }
      entityGroups.get(key)!.push(task);
    }

    // Validate independence: take first task per entity, skip others
    const independentTasks: ParallelTask[] = [];
    for (const [, groupTasks] of entityGroups) {
      const sorted = [...groupTasks].sort((a, b) => (b.priority || 0) - (a.priority || 0));
      independentTasks.push(sorted[0]);
      
      for (const skipped of sorted.slice(1)) {
        result.tasksSkipped++;
        result.results.push({
          taskId: skipped.id,
          entityId: skipped.entityId,
          entityType: skipped.entityType,
          status: 'skipped',
          error: 'Conflicting task for same entity',
        });
      }
    }

    // Check workspace concurrency
    const { count: runningCount } = await serviceSupabase
      .from('trigger_job_runs')
      .select('*', { count: 'exact', head: true })
      .eq('workspace_id', workspaceId)
      .in('status', ['pending', 'queued', 'running']);

    const currentConcurrency = runningCount || 0;
    const availableSlots = Math.max(0, config.maxConcurrentPerWorkspace - currentConcurrency);

    if (availableSlots === 0) {
      // Queue all tasks
      for (const task of independentTasks) {
        result.tasksQueued++;
        result.results.push({
          taskId: task.id,
          entityId: task.entityId,
          entityType: task.entityType,
          status: 'queued',
          error: `Workspace at max concurrency (${currentConcurrency}/${config.maxConcurrentPerWorkspace})`,
        });
      }
      result.executionTimeMs = Date.now() - startTime;
      return new Response(JSON.stringify(result), {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    const tasksToDispatch = independentTasks.slice(0, availableSlots);
    const tasksToQueue = independentTasks.slice(availableSlots);

    // Queue overflow
    for (const task of tasksToQueue) {
      result.tasksQueued++;
      result.results.push({
        taskId: task.id,
        entityId: task.entityId,
        entityType: task.entityType,
        status: 'queued',
        error: 'Concurrency limit reached',
      });
    }

    // Dispatch in parallel
    const dispatchPromises = tasksToDispatch.map(async (task) => {
      const taskStart = Date.now();

      try {
        // Try to acquire lock
        const now = new Date();
        const expiresAt = new Date(now.getTime() + config.lockTimeoutMs);

        const { data: existingLock } = await serviceSupabase
          .from('ai_agent_locks')
          .select('id')
          .eq('workspace_id', workspaceId)
          .eq('entity_id', task.entityId)
          .gt('expires_at', now.toISOString())
          .maybeSingle();

        if (existingLock) {
          return {
            taskId: task.id,
            entityId: task.entityId,
            entityType: task.entityType,
            status: 'queued' as const,
            error: 'Entity locked by another process',
            durationMs: Date.now() - taskStart,
          };
        }

        // Create lock
        const { error: lockError } = await serviceSupabase
          .from('ai_agent_locks')
          .insert({
            workspace_id: workspaceId,
            entity_id: task.entityId,
            agent_type: task.jobType,
            locked_at: now.toISOString(),
            expires_at: expiresAt.toISOString(),
          });

        if (lockError && lockError.code === '23505') {
          return {
            taskId: task.id,
            entityId: task.entityId,
            entityType: task.entityType,
            status: 'queued' as const,
            error: 'Lock conflict',
            durationMs: Date.now() - taskStart,
          };
        }

        // Create job run
        const triggerRunId = `trg_${crypto.randomUUID().replace(/-/g, '')}`;
        const idempotencyKey = task.idempotencyKey || 
          `${task.jobType}:${workspaceId}:${task.entityId}:${new Date().toISOString().split('T')[0]}`;

        // Check for duplicate
        const { data: existingJob } = await serviceSupabase
          .from('trigger_job_runs')
          .select('id, trigger_run_id')
          .eq('idempotency_key', idempotencyKey)
          .in('status', ['pending', 'queued', 'running'])
          .maybeSingle();

        if (existingJob) {
          return {
            taskId: task.id,
            entityId: task.entityId,
            entityType: task.entityType,
            status: 'success' as const,
            jobRunId: existingJob.id,
            triggerRunId: existingJob.trigger_run_id,
            durationMs: Date.now() - taskStart,
          };
        }

        // Insert job run
        const { data: jobRun, error: insertError } = await serviceSupabase
          .from('trigger_job_runs')
          .insert({
            workspace_id: workspaceId,
            trigger_run_id: triggerRunId,
            job_type: task.jobType,
            entity_type: task.entityType,
            entity_id: task.entityId,
            status: 'queued',
            priority: task.priority || 0,
            idempotency_key: idempotencyKey,
            input_data: task.inputData || {},
            attempts: 0,
            max_attempts: 3,
          })
          .select('id')
          .single();

        if (insertError) {
          throw new Error(insertError.message);
        }

        return {
          taskId: task.id,
          entityId: task.entityId,
          entityType: task.entityType,
          status: 'success' as const,
          jobRunId: jobRun.id,
          triggerRunId,
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

    console.log(`[ParallelDispatch] Batch ${batchId} complete: ${result.tasksDispatched} dispatched, ${result.tasksQueued} queued, ${result.tasksFailed} failed`);

    // Emit analytics
    try {
      await serviceSupabase.from('ai_analytics_events').insert({
        workspace_id: workspaceId,
        user_id: userId,
        event_type: 'action_executed',
        properties: {
          action_type: 'parallel_batch_dispatch',
          batch_id: batchId,
          tasks_requested: result.tasksRequested,
          tasks_dispatched: result.tasksDispatched,
          tasks_queued: result.tasksQueued,
          tasks_failed: result.tasksFailed,
          execution_time_ms: result.executionTimeMs,
        },
      });
    } catch (analyticsError) {
      console.warn('[ParallelDispatch] Failed to emit analytics:', analyticsError);
    }

    return new Response(JSON.stringify(result), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('[ParallelDispatch] Error:', error);
    return new Response(
      JSON.stringify({
        success: false,
        error: error instanceof Error ? error.message : 'Internal server error',
        executionTimeMs: Date.now() - startTime,
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
