import { corsHeaders } from '../_shared/cors.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

/**
 * Workflow Processor Edge Function
 * 
 * Processes queued workflow executions with durable execution semantics.
 * Supports sequential and parallel step execution with retry logic.
 */

interface WorkflowStep {
  code: string;
  type: string;
  name: string;
  input?: Record<string, unknown>;
  timeout_ms?: number;
  max_retries?: number;
  on_error?: 'continue' | 'fail' | 'skip';
  is_parallel?: boolean;
  parallel_group?: string;
  condition?: string;
}

interface ProcessRequest {
  executionId?: string;
  maxExecutions?: number;
  workspaceId?: string;
}

interface StepContext {
  supabase: any;
  step: any;
  execution: any;
  workspaceId: string;
  accumulatedContext: Record<string, unknown>;
}

interface StepResult {
  success: boolean;
  output: Record<string, unknown>;
  error?: string;
  contextUpdates?: Record<string, unknown>;
}

// Step executors
const stepExecutors: Record<string, (ctx: StepContext) => Promise<StepResult>> = {
  create_task: async (ctx) => {
    const { supabase, step, execution, workspaceId } = ctx;
    const input = step.input_data as Record<string, unknown>;
    
    const { data, error } = await supabase
      .from('tasks')
      .insert({
        workspace_id: workspaceId,
        title: input.title as string || 'Workflow Task',
        description: input.description as string,
        assigned_to: input.assignedTo as string || execution.initiated_by,
        due_at: input.dueDate as string,
        priority: input.priority as string || 'medium',
        status: 'pending',
        related_type: execution.entity_type || null,
        related_id: execution.entity_id || null,
      })
      .select('id')
      .single();

    if (error) throw new Error(`Failed to create task: ${error.message}`);
    
    return { success: true, output: { taskId: data?.id } };
  },

  update_stage: async (ctx) => {
    const { supabase, step, execution, workspaceId } = ctx;
    const input = step.input_data as Record<string, unknown>;
    const newStage = input.stage as string;
    
    if (!execution.entity_type || !execution.entity_id) {
      throw new Error('Entity type and ID required for stage update');
    }

    const tableName = execution.entity_type === 'lead' ? 'leads' 
      : execution.entity_type === 'opportunity' ? 'opportunities' 
      : null;
    
    if (!tableName) {
      throw new Error(`Unsupported entity type for stage update: ${execution.entity_type}`);
    }

    const { error } = await supabase
      .from(tableName)
      .update({ 
        stage: newStage,
        updated_at: new Date().toISOString(),
      })
      .eq('id', execution.entity_id)
      .eq('workspace_id', workspaceId);

    if (error) throw new Error(`Failed to update stage: ${error.message}`);
    
    return { success: true, output: { newStage } };
  },

  send_notification: async (ctx) => {
    const { supabase, step, execution, workspaceId } = ctx;
    const input = step.input_data as Record<string, unknown>;
    
    const { error } = await supabase
      .from('notifications')
      .insert({
        workspace_id: workspaceId,
        user_id: input.userId as string || execution.initiated_by,
        type: input.type as string || 'workflow',
        title: input.title as string,
        message: input.message as string,
        link: input.link as string,
        entity_type: execution.entity_type,
        entity_id: execution.entity_id,
      });

    if (error) throw new Error(`Failed to send notification: ${error.message}`);
    
    return { success: true, output: { sent: true } };
  },

  log_activity: async (ctx) => {
    const { supabase, step, execution, workspaceId } = ctx;
    const input = step.input_data as Record<string, unknown>;
    
    const { error } = await supabase
      .from('entity_activities')
      .insert({
        workspace_id: workspaceId,
        entity_type: execution.entity_type || 'workflow',
        entity_id: execution.entity_id || execution.id,
        activity_type: input.activityType as string || 'workflow_step',
        title: input.title as string,
        description: input.description as string,
        created_by: execution.initiated_by,
        metadata: {
          workflow_code: execution.workflow_code,
          step_code: step.step_code,
          ...(input.metadata as Record<string, unknown> || {}),
        },
      });

    if (error) {
      console.warn(`[WorkflowProcessor] Failed to log activity: ${error.message}`);
    }
    
    return { success: true, output: { logged: true } };
  },

  wait: async (ctx) => {
    const { step } = ctx;
    const input = step.input_data as Record<string, unknown>;
    const durationMs = (input.duration as number) || 1000;
    
    await new Promise(resolve => setTimeout(resolve, Math.min(durationMs, 5000)));
    
    return { success: true, output: { waited: durationMs } };
  },

  condition_check: async (ctx) => {
    const { supabase, step, execution, workspaceId } = ctx;
    const input = step.input_data as Record<string, unknown>;
    
    const field = input.field as string;
    const operator = input.operator as string;
    const value = input.value as any;
    
    if (!execution.entity_type || !execution.entity_id) {
      return { success: true, output: { conditionMet: false, reason: 'No entity' } };
    }

    const tableName = execution.entity_type === 'lead' ? 'leads'
      : execution.entity_type === 'opportunity' ? 'opportunities'
      : execution.entity_type === 'contact' ? 'contacts'
      : execution.entity_type === 'company' ? 'companies'
      : null;

    if (!tableName) {
      return { success: true, output: { conditionMet: false, reason: 'Unknown entity type' } };
    }

    const { data: entityData, error } = await supabase
      .from(tableName)
      .select(field)
      .eq('id', execution.entity_id)
      .eq('workspace_id', workspaceId)
      .single();

    if (error || !entityData) {
      return { success: true, output: { conditionMet: false, reason: 'Entity not found' } };
    }

    const actualValue = (entityData as any)[field];
    let conditionMet = false;

    switch (operator) {
      case 'equals': conditionMet = actualValue === value; break;
      case 'not_equals': conditionMet = actualValue !== value; break;
      case 'contains': conditionMet = String(actualValue).includes(String(value)); break;
      case 'gt': conditionMet = actualValue > value; break;
      case 'lt': conditionMet = actualValue < value; break;
      case 'is_null': conditionMet = actualValue == null; break;
      case 'is_not_null': conditionMet = actualValue != null; break;
      default: conditionMet = false;
    }

    return { 
      success: true, 
      output: { conditionMet, actualValue, expectedValue: value },
      contextUpdates: { [`condition_${step.step_code}`]: conditionMet },
    };
  },

  webhook: async (ctx) => {
    const { step } = ctx;
    const input = step.input_data as Record<string, unknown>;
    const url = input.url as string;
    
    if (!url) {
      throw new Error('Webhook URL is required');
    }

    const response = await fetch(url, {
      method: (input.method as string) || 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(input.headers as Record<string, string> || {}),
      },
      body: JSON.stringify(input.body || {}),
    });

    if (!response.ok) {
      throw new Error(`Webhook failed: ${response.status} ${response.statusText}`);
    }

    const responseData = await response.text();
    
    return { success: true, output: { status: response.status, response: responseData } };
  },
};

function generateIdempotencyKey(executionId: string, stepCode: string, entityId?: string): string {
  return `${executionId}:${stepCode}:${entityId || 'no-entity'}`;
}

async function checkIdempotency(
  supabase: any,
  workspaceId: string,
  idempotencyKey: string
): Promise<{ alreadyExecuted: boolean; result?: any }> {
  const { data } = await supabase
    .from('workflow_idempotency_keys')
    .select('result_status, result_data')
    .eq('workspace_id', workspaceId)
    .eq('idempotency_key', idempotencyKey)
    .maybeSingle();

  if (data) {
    return { alreadyExecuted: true, result: data };
  }
  return { alreadyExecuted: false };
}

async function recordIdempotencyKey(
  supabase: any,
  workspaceId: string,
  idempotencyKey: string,
  executionId: string,
  stepId: string,
  actionType: string,
  resultStatus: string,
  resultData: Record<string, unknown>
): Promise<void> {
  await supabase
    .from('workflow_idempotency_keys')
    .insert({
      workspace_id: workspaceId,
      idempotency_key: idempotencyKey,
      execution_id: executionId,
      step_id: stepId,
      action_type: actionType,
      result_status: resultStatus,
      result_data: resultData,
    });
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  const startTime = Date.now();

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    let body: ProcessRequest = {};
    try {
      body = await req.json();
    } catch {
      // Empty body ok for cron
    }

    const { executionId, maxExecutions = 5, workspaceId } = body;

    console.log(`[WorkflowProcessor] Starting, executionId: ${executionId || 'batch'}, max: ${maxExecutions}`);

    // Build query
    let query = supabase
      .from('workflow_queue')
      .select(`
        id,
        execution_id,
        priority,
        scheduled_for,
        attempts,
        workflow_executions!inner (
          id,
          workspace_id,
          workflow_code,
          workflow_version,
          status,
          trigger_type,
          trigger_source,
          recommendation_id,
          entity_type,
          entity_id,
          initiated_by,
          input_data,
          context,
          current_step_index
        )
      `)
      .eq('status', 'pending')
      .lte('scheduled_for', new Date().toISOString())
      .order('priority', { ascending: false })
      .order('scheduled_for', { ascending: true })
      .limit(maxExecutions);

    if (executionId) {
      query = query.eq('execution_id', executionId);
    }

    if (workspaceId) {
      query = query.eq('workflow_executions.workspace_id', workspaceId);
    }

    const { data: queueItems, error: queueError } = await query;

    if (queueError) {
      console.error('[WorkflowProcessor] Failed to fetch queue:', queueError);
      return new Response(
        JSON.stringify({ error: 'Failed to fetch workflow queue' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (!queueItems || queueItems.length === 0) {
      console.log('[WorkflowProcessor] No pending executions');
      return new Response(
        JSON.stringify({ success: true, processed: 0, message: 'No pending executions' }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`[WorkflowProcessor] Found ${queueItems.length} executions`);

    const results: any[] = [];

    for (const queueItem of queueItems) {
      const execution = (queueItem as any).workflow_executions;
      const wsId = execution.workspace_id;
      
      console.log(`[WorkflowProcessor] Processing ${execution.id} for ${execution.workflow_code}`);

      await supabase
        .from('workflow_queue')
        .update({ status: 'processing', started_at: new Date().toISOString() })
        .eq('id', queueItem.id);

      await supabase
        .from('workflow_executions')
        .update({ status: 'running', started_at: new Date().toISOString() })
        .eq('id', execution.id);

      try {
        const { data: steps } = await supabase
          .from('workflow_steps')
          .select('*')
          .eq('execution_id', execution.id)
          .order('step_index', { ascending: true });

        let stepsToExecute = steps || [];
        
        if (stepsToExecute.length === 0) {
          const { data: workflowDef } = await supabase
            .from('workflow_definitions')
            .select('steps')
            .eq('workspace_id', wsId)
            .eq('code', execution.workflow_code)
            .eq('is_active', true)
            .maybeSingle();

          if (workflowDef?.steps) {
            const stepConfigs = workflowDef.steps as WorkflowStep[];
            
            for (let i = 0; i < stepConfigs.length; i++) {
              const stepConfig = stepConfigs[i];
              const idempotencyKey = generateIdempotencyKey(execution.id, stepConfig.code, execution.entity_id);
              
              const { data: newStep } = await supabase
                .from('workflow_steps')
                .insert({
                  execution_id: execution.id,
                  workspace_id: wsId,
                  step_index: i,
                  step_code: stepConfig.code,
                  step_type: stepConfig.type,
                  idempotency_key: idempotencyKey,
                  input_data: stepConfig.input || {},
                  max_retries: stepConfig.max_retries || 3,
                  timeout_ms: stepConfig.timeout_ms || 30000,
                  is_parallel: stepConfig.is_parallel || false,
                  parallel_group: stepConfig.parallel_group,
                })
                .select()
                .single();

              if (newStep) {
                stepsToExecute.push(newStep);
              }
            }
          }
        }

        let accumulatedContext: Record<string, unknown> = {
          ...(execution.input_data || {}),
          ...(execution.context || {}),
        };
        let stepsExecuted = 0;
        let stepsFailed = 0;
        let currentStepIndex = execution.current_step_index || 0;

        for (let i = currentStepIndex; i < stepsToExecute.length; i++) {
          const step = stepsToExecute[i];
          
          console.log(`[WorkflowProcessor] Step ${step.step_code} (${step.step_type})`);

          const idempCheck = await checkIdempotency(supabase, wsId, step.idempotency_key);
          
          if (idempCheck.alreadyExecuted) {
            console.log(`[WorkflowProcessor] Step ${step.step_code} already executed`);
            stepsExecuted++;
            continue;
          }

          await supabase
            .from('workflow_steps')
            .update({ status: 'running', started_at: new Date().toISOString() })
            .eq('id', step.id);

          const executor = stepExecutors[step.step_type];
          
          if (!executor) {
            console.warn(`[WorkflowProcessor] No executor for: ${step.step_type}`);
            await supabase
              .from('workflow_steps')
              .update({ 
                status: 'skipped',
                error_message: `No executor for type: ${step.step_type}`,
                completed_at: new Date().toISOString(),
              })
              .eq('id', step.id);
            continue;
          }

          let result: StepResult | null = null;
          let attempt = 0;
          const maxRetries = step.max_retries || 3;

          while (attempt <= maxRetries) {
            try {
              result = await executor({
                supabase,
                step,
                execution,
                workspaceId: wsId,
                accumulatedContext,
              });
              break;
            } catch (err) {
              attempt++;
              console.error(`[WorkflowProcessor] Step ${step.step_code} attempt ${attempt} failed:`, err);
              
              if (attempt <= maxRetries) {
                const delay = Math.min(1000 * Math.pow(2, attempt), 5000);
                await new Promise(resolve => setTimeout(resolve, delay));
              } else {
                result = {
                  success: false,
                  output: {},
                  error: err instanceof Error ? err.message : 'Unknown error',
                };
              }
            }
          }

          stepsExecuted++;

          if (result?.success) {
            await recordIdempotencyKey(
              supabase, wsId, step.idempotency_key,
              execution.id, step.id, step.step_type,
              'success', result.output
            );

            await supabase
              .from('workflow_steps')
              .update({
                status: 'completed',
                output_data: result.output,
                retry_count: attempt,
                completed_at: new Date().toISOString(),
              })
              .eq('id', step.id);

            if (result.contextUpdates) {
              accumulatedContext = { ...accumulatedContext, ...result.contextUpdates };
            }
          } else {
            stepsFailed++;

            await recordIdempotencyKey(
              supabase, wsId, step.idempotency_key,
              execution.id, step.id, step.step_type,
              'failed', { error: result?.error }
            );

            await supabase
              .from('workflow_steps')
              .update({
                status: 'failed',
                error_message: result?.error,
                retry_count: attempt,
                completed_at: new Date().toISOString(),
              })
              .eq('id', step.id);
          }

          await supabase
            .from('workflow_executions')
            .update({
              current_step_index: i + 1,
              context: accumulatedContext,
              last_checkpoint_at: new Date().toISOString(),
            })
            .eq('id', execution.id);
        }

        const finalStatus = stepsFailed > 0 ? 'partial' : 'completed';
        
        await supabase
          .from('workflow_executions')
          .update({
            status: finalStatus,
            output_data: accumulatedContext,
            completed_at: new Date().toISOString(),
            total_duration_ms: Date.now() - startTime,
          })
          .eq('id', execution.id);

        await supabase
          .from('workflow_queue')
          .delete()
          .eq('id', queueItem.id);

        results.push({
          executionId: execution.id,
          status: finalStatus,
          stepsExecuted,
          stepsFailed,
        });

        console.log(`[WorkflowProcessor] ${execution.id} completed: ${finalStatus}`);

      } catch (execError) {
        console.error(`[WorkflowProcessor] ${execution.id} failed:`, execError);

        await supabase
          .from('workflow_executions')
          .update({
            status: 'failed',
            error_message: execError instanceof Error ? execError.message : 'Unknown error',
            completed_at: new Date().toISOString(),
          })
          .eq('id', execution.id);

        const newAttempts = ((queueItem as any).attempts || 0) + 1;
        if (newAttempts < 3) {
          await supabase
            .from('workflow_queue')
            .update({
              status: 'pending',
              attempts: newAttempts,
              scheduled_for: new Date(Date.now() + 60000 * newAttempts).toISOString(),
            })
            .eq('id', queueItem.id);
        } else {
          await supabase
            .from('workflow_queue')
            .update({ status: 'failed' })
            .eq('id', queueItem.id);
        }

        results.push({
          executionId: execution.id,
          status: 'failed',
          error: execError instanceof Error ? execError.message : 'Unknown error',
        });
      }
    }

    const totalDuration = Date.now() - startTime;
    console.log(`[WorkflowProcessor] Processed ${results.length} in ${totalDuration}ms`);

    return new Response(
      JSON.stringify({
        success: true,
        processed: results.length,
        results,
        durationMs: totalDuration,
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('[WorkflowProcessor] Unexpected error:', error);
    return new Response(
      JSON.stringify({ error: 'Internal server error', details: error instanceof Error ? error.message : 'Unknown error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
