import { corsHeaders } from '../_shared/cors.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

/**
 * Trigger Dispatch Edge Function
 * 
 * Dispatches jobs to Trigger.dev and creates tracking records.
 * Acts as the bridge between the CRM and Trigger.dev execution engine.
 */

interface DispatchRequest {
  workspaceId: string;
  jobType: string;
  entityType?: string;
  entityId?: string;
  recommendationId?: string;
  inputData: Record<string, unknown>;
  idempotencyKey?: string;
  priority?: number;
  scheduledFor?: string;
}

interface DispatchResponse {
  success: boolean;
  jobRunId?: string;
  triggerRunId?: string;
  deduplicated?: boolean;
  error?: string;
}

Deno.serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Validate auth
    const authHeader = req.headers.get('Authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return new Response(
        JSON.stringify({ success: false, error: 'Unauthorized' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Create Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY')!;
    
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

    // Parse request
    const body: DispatchRequest = await req.json();
    const {
      workspaceId,
      jobType,
      entityType,
      entityId,
      recommendationId,
      inputData,
      idempotencyKey,
      priority,
      scheduledFor,
    } = body;

    // Validate required fields
    if (!workspaceId || !jobType) {
      return new Response(
        JSON.stringify({ success: false, error: 'Missing required fields: workspaceId, jobType' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Verify workspace membership
    const { data: memberCheck, error: memberError } = await supabase
      .from('workspace_members')
      .select('role')
      .eq('workspace_id', workspaceId)
      .eq('user_id', userId)
      .maybeSingle();

    if (memberError || !memberCheck) {
      return new Response(
        JSON.stringify({ success: false, error: 'Not a member of this workspace' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`[TriggerDispatch] Dispatching job: ${jobType} for workspace: ${workspaceId}`);

    // Generate idempotency key if not provided
    const finalIdempotencyKey = idempotencyKey || generateIdempotencyKey(
      jobType,
      workspaceId,
      entityId,
      recommendationId
    );

    // Check for existing job with same idempotency key (deduplication)
    if (finalIdempotencyKey) {
      const { data: existingJob } = await supabase
        .from('trigger_job_runs')
        .select('id, status, trigger_run_id')
        .eq('idempotency_key', finalIdempotencyKey)
        .in('status', ['pending', 'queued', 'running'])
        .maybeSingle();

      if (existingJob) {
        console.log(`[TriggerDispatch] Found existing job with idempotency key: ${finalIdempotencyKey}`);
        return new Response(
          JSON.stringify({
            success: true,
            jobRunId: existingJob.id,
            triggerRunId: existingJob.trigger_run_id,
            deduplicated: true,
          } as DispatchResponse),
          { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
    }

    // Generate unique trigger run ID
    const triggerRunId = `trg_${crypto.randomUUID().replace(/-/g, '')}`;

    // Create job run record
    const { data: jobRun, error: insertError } = await supabase
      .from('trigger_job_runs')
      .insert({
        workspace_id: workspaceId,
        trigger_run_id: triggerRunId,
        job_type: jobType,
        entity_type: entityType,
        entity_id: entityId,
        recommendation_id: recommendationId,
        status: 'pending',
        priority: priority || 0,
        idempotency_key: finalIdempotencyKey,
        input_data: inputData || {},
        scheduled_for: scheduledFor,
        attempts: 0,
        max_attempts: getMaxAttempts(jobType),
      })
      .select()
      .single();

    if (insertError) {
      console.error('[TriggerDispatch] Failed to create job run:', insertError);
      return new Response(
        JSON.stringify({ success: false, error: 'Failed to create job run', details: insertError.message }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`[TriggerDispatch] Created job run: ${jobRun.id} with trigger_run_id: ${triggerRunId}`);

    // Update status to queued
    await supabase
      .from('trigger_job_runs')
      .update({ status: 'queued' })
      .eq('id', jobRun.id);

    // In a full implementation, this is where we would call Trigger.dev API
    // For now, we store the job and it can be processed by a scheduler
    // or picked up by the trigger-webhook when Trigger.dev calls back

    // Emit job created event for analytics
    try {
      await supabase.from('ai_analytics_events').insert({
        workspace_id: workspaceId,
        user_id: userId,
        event_type: 'action_executed',
        entity_type: entityType,
        entity_id: entityId,
        properties: {
          action_type: 'trigger_job_dispatched',
          job_type: jobType,
          job_run_id: jobRun.id,
          trigger_run_id: triggerRunId,
        },
      });
    } catch (analyticsError) {
      console.warn('[TriggerDispatch] Failed to emit analytics event:', analyticsError);
    }

    return new Response(
      JSON.stringify({
        success: true,
        jobRunId: jobRun.id,
        triggerRunId: triggerRunId,
        deduplicated: false,
      } as DispatchResponse),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('[TriggerDispatch] Unexpected error:', error);
    return new Response(
      JSON.stringify({ success: false, error: 'Internal server error', details: error instanceof Error ? error.message : 'Unknown error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

/**
 * Generate idempotency key for job deduplication
 */
function generateIdempotencyKey(
  jobType: string,
  workspaceId: string,
  entityId?: string,
  recommendationId?: string
): string {
  const parts = [jobType, workspaceId];
  if (entityId) parts.push(entityId);
  if (recommendationId) parts.push(recommendationId);
  // Add date for daily uniqueness on scheduled jobs
  parts.push(new Date().toISOString().split('T')[0]);
  return parts.join(':');
}

/**
 * Get max attempts based on job type
 */
function getMaxAttempts(jobType: string): number {
  const maxAttempts: Record<string, number> = {
    'ai-analysis': 3,
    'workflow-execute': 3,
    'batch-process': 2,
    'integration-sync': 5,
    'rag-indexing': 3,
    'knowledge-document': 2,
  };
  return maxAttempts[jobType] || 3;
}
