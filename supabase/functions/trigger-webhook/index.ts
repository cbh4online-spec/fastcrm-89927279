import { corsHeaders } from '../_shared/cors.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

/**
 * Trigger Webhook Edge Function
 * 
 * Receives callbacks from Trigger.dev to update job status and handle results.
 * Also supports manual job processing for immediate execution.
 */

interface WebhookPayload {
  type: 'job.started' | 'job.progress' | 'job.completed' | 'job.failed' | 'job.retrying';
  runId: string;
  jobId: string;
  timestamp: string;
  data?: {
    stepIndex?: number;
    stepName?: string;
    progress?: number;
    message?: string;
    output?: Record<string, unknown>;
    error?: {
      message: string;
      code: string;
      retryable: boolean;
    };
    attempt?: number;
    durationMs?: number;
  };
}

interface ManualProcessRequest {
  action: 'process';
  jobRunId: string;
}

// deno-lint-ignore no-explicit-any
type SupabaseClientAny = any;
// deno-lint-ignore no-explicit-any
type JobRunRecord = any;

Deno.serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Create Supabase client with service role for webhooks
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    
    const supabase: SupabaseClientAny = createClient(supabaseUrl, supabaseServiceKey);

    const body = await req.json();

    // Check if this is a manual process request (with auth)
    if (body.action === 'process') {
      return await handleManualProcess(req, supabase, body as ManualProcessRequest);
    }

    // Handle Trigger.dev webhook callback
    const payload = body as WebhookPayload;
    
    // Validate webhook payload
    if (!payload.runId || !payload.type) {
      return new Response(
        JSON.stringify({ success: false, error: 'Invalid webhook payload' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`[TriggerWebhook] Received ${payload.type} for run: ${payload.runId}`);

    // Find the job run by trigger_run_id
    const { data: jobRun, error: findError } = await supabase
      .from('trigger_job_runs')
      .select('*')
      .eq('trigger_run_id', payload.runId)
      .maybeSingle();

    if (findError || !jobRun) {
      console.error('[TriggerWebhook] Job run not found:', payload.runId);
      return new Response(
        JSON.stringify({ success: false, error: 'Job run not found' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Process based on event type
    switch (payload.type) {
      case 'job.started':
        await handleJobStarted(supabase, jobRun, payload);
        break;

      case 'job.progress':
        await handleJobProgress(supabase, jobRun, payload);
        break;

      case 'job.completed':
        await handleJobCompleted(supabase, jobRun, payload);
        break;

      case 'job.failed':
        await handleJobFailed(supabase, jobRun, payload);
        break;

      case 'job.retrying':
        await handleJobRetrying(supabase, jobRun, payload);
        break;

      default:
        console.warn('[TriggerWebhook] Unknown event type:', payload.type);
    }

    return new Response(
      JSON.stringify({ success: true }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('[TriggerWebhook] Unexpected error:', error);
    return new Response(
      JSON.stringify({ success: false, error: 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

/**
 * Handle manual job processing request
 */
async function handleManualProcess(
  req: Request,
  supabase: SupabaseClientAny,
  body: ManualProcessRequest
) {
  // Validate auth for manual processing
  const authHeader = req.headers.get('Authorization');
  if (!authHeader?.startsWith('Bearer ')) {
    return new Response(
      JSON.stringify({ success: false, error: 'Unauthorized' }),
      { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }

  const token = authHeader.replace('Bearer ', '');
  const { data: userData, error: userError } = await supabase.auth.getUser(token);
  
  if (userError || !userData?.user) {
    return new Response(
      JSON.stringify({ success: false, error: 'Unauthorized' }),
      { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }

  // Get the job run
  const { data: jobRun, error: findError } = await supabase
    .from('trigger_job_runs')
    .select('*')
    .eq('id', body.jobRunId)
    .maybeSingle();

  if (findError || !jobRun) {
    return new Response(
      JSON.stringify({ success: false, error: 'Job run not found' }),
      { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }

  // Verify workspace membership
  const { data: memberCheck } = await supabase
    .from('workspace_members')
    .select('role')
    .eq('workspace_id', jobRun.workspace_id)
    .eq('user_id', userData.user.id)
    .maybeSingle();

  if (!memberCheck) {
    return new Response(
      JSON.stringify({ success: false, error: 'Not authorized for this workspace' }),
      { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }

  // Process the job based on type
  const startTime = Date.now();
  
  try {
    // Update status to running
    await supabase
      .from('trigger_job_runs')
      .update({
        status: 'running',
        started_at: new Date().toISOString(),
        attempts: (jobRun.attempts || 0) + 1,
      })
      .eq('id', jobRun.id);

    // Execute job based on type
    let result: Record<string, unknown> = {};
    
    switch (jobRun.job_type) {
      case 'ai-analysis':
        result = await executeAIAnalysis(supabase, jobRun);
        break;
        
      case 'workflow-execute':
        result = await executeWorkflow(supabase, jobRun);
        break;
        
      default:
        result = { message: 'Job type not yet implemented for manual processing' };
    }

    // Update as completed
    const durationMs = Date.now() - startTime;
    await supabase
      .from('trigger_job_runs')
      .update({
        status: 'completed',
        completed_at: new Date().toISOString(),
        output_data: result,
      })
      .eq('id', jobRun.id);

    return new Response(
      JSON.stringify({ success: true, result, durationMs }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    const durationMs = Date.now() - startTime;
    
    // Update as failed
    await supabase
      .from('trigger_job_runs')
      .update({
        status: 'failed',
        completed_at: new Date().toISOString(),
        error_data: {
          message: error instanceof Error ? error.message : 'Unknown error',
          code: 'EXECUTION_ERROR',
          retryable: true,
        },
      })
      .eq('id', jobRun.id);

    return new Response(
      JSON.stringify({
        success: false,
        error: error instanceof Error ? error.message : 'Execution failed',
        durationMs,
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
}

/**
 * Handle job.started event
 */
async function handleJobStarted(
  supabase: SupabaseClientAny,
  jobRun: JobRunRecord,
  payload: WebhookPayload
) {
  await supabase
    .from('trigger_job_runs')
    .update({
      status: 'running',
      started_at: payload.timestamp,
      attempts: (jobRun.attempts || 0) + 1,
    })
    .eq('id', jobRun.id);

  console.log(`[TriggerWebhook] Job ${jobRun.id} started`);
}

/**
 * Handle job.progress event
 */
async function handleJobProgress(
  supabase: SupabaseClientAny,
  jobRun: JobRunRecord,
  payload: WebhookPayload
) {
  // Store progress in output_data for real-time tracking
  const currentOutput = jobRun.output_data || {};
  
  await supabase
    .from('trigger_job_runs')
    .update({
      output_data: {
        ...currentOutput,
        lastProgress: payload.data,
        lastProgressAt: payload.timestamp,
      },
    })
    .eq('id', jobRun.id);

  console.log(`[TriggerWebhook] Job ${jobRun.id} progress: ${payload.data?.progress}%`);
}

/**
 * Handle job.completed event
 */
async function handleJobCompleted(
  supabase: SupabaseClientAny,
  jobRun: JobRunRecord,
  payload: WebhookPayload
) {
  await supabase
    .from('trigger_job_runs')
    .update({
      status: 'completed',
      completed_at: payload.timestamp,
      output_data: payload.data?.output || {},
    })
    .eq('id', jobRun.id);

  // Emit analytics event
  try {
    await supabase.from('ai_analytics_events').insert({
      workspace_id: jobRun.workspace_id,
      user_id: '00000000-0000-0000-0000-000000000000', // System user
      event_type: 'action_executed',
      entity_type: jobRun.entity_type || null,
      entity_id: jobRun.entity_id || null,
      latency_ms: payload.data?.durationMs,
      properties: {
        action_type: 'trigger_job_completed',
        job_type: jobRun.job_type,
        job_run_id: jobRun.id,
        trigger_run_id: jobRun.trigger_run_id,
      },
    });
  } catch (analyticsError) {
    console.warn('[TriggerWebhook] Failed to emit analytics:', analyticsError);
  }

  console.log(`[TriggerWebhook] Job ${jobRun.id} completed successfully`);
}

/**
 * Handle job.failed event
 */
async function handleJobFailed(
  supabase: SupabaseClientAny,
  jobRun: JobRunRecord,
  payload: WebhookPayload
) {
  await supabase
    .from('trigger_job_runs')
    .update({
      status: 'failed',
      completed_at: payload.timestamp,
      error_data: payload.data?.error || { message: 'Unknown error', code: 'UNKNOWN', retryable: false },
    })
    .eq('id', jobRun.id);

  // Emit failure analytics
  try {
    await supabase.from('ai_analytics_events').insert({
      workspace_id: jobRun.workspace_id,
      user_id: '00000000-0000-0000-0000-000000000000',
      event_type: 'execution_error',
      entity_type: jobRun.entity_type || null,
      entity_id: jobRun.entity_id || null,
      error_type: payload.data?.error?.code,
      error_reason: payload.data?.error?.message,
      properties: {
        job_type: jobRun.job_type,
        job_run_id: jobRun.id,
        attempts: jobRun.attempts,
      },
    });
  } catch (analyticsError) {
    console.warn('[TriggerWebhook] Failed to emit failure analytics:', analyticsError);
  }

  console.log(`[TriggerWebhook] Job ${jobRun.id} failed: ${payload.data?.error?.message}`);
}

/**
 * Handle job.retrying event
 */
async function handleJobRetrying(
  supabase: SupabaseClientAny,
  jobRun: JobRunRecord,
  payload: WebhookPayload
) {
  await supabase
    .from('trigger_job_runs')
    .update({
      status: 'retrying',
      attempts: payload.data?.attempt || ((jobRun.attempts || 0) + 1),
    })
    .eq('id', jobRun.id);

  console.log(`[TriggerWebhook] Job ${jobRun.id} retrying (attempt ${payload.data?.attempt})`);
}

/**
 * Execute AI analysis job
 */
async function executeAIAnalysis(
  _supabase: SupabaseClientAny,
  jobRun: JobRunRecord
): Promise<Record<string, unknown>> {
  const inputData = jobRun.input_data || {};
  
  // Call the AI agent orchestrator
  const response = await fetch(
    `${Deno.env.get('SUPABASE_URL')}/functions/v1/ai-agent-orchestrator`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')}`,
      },
      body: JSON.stringify({
        workspaceId: jobRun.workspace_id,
        entityType: jobRun.entity_type,
        entityId: jobRun.entity_id,
        agentType: inputData.agentType,
        triggerType: inputData.triggerType || 'manual',
        skipCache: inputData.skipCache || false,
      }),
    }
  );

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`AI agent failed: ${errorText}`);
  }

  return await response.json();
}

/**
 * Execute workflow job
 */
async function executeWorkflow(
  _supabase: SupabaseClientAny,
  jobRun: JobRunRecord
): Promise<Record<string, unknown>> {
  const inputData = jobRun.input_data || {};
  
  // Call the workflow processor
  const response = await fetch(
    `${Deno.env.get('SUPABASE_URL')}/functions/v1/workflow-processor`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')}`,
      },
      body: JSON.stringify({
        executionId: inputData.executionId,
        workspaceId: jobRun.workspace_id,
      }),
    }
  );

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Workflow execution failed: ${errorText}`);
  }

  return await response.json();
}
