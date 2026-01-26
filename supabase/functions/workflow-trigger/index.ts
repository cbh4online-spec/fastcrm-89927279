import { corsHeaders } from '../_shared/cors.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

/**
 * Workflow Trigger Edge Function
 * 
 * Creates workflow executions and adds them to the processing queue.
 * Validates workflow definitions and applies idempotency checks.
 */

interface TriggerRequest {
  workspaceId: string;
  workflowCode: string;
  triggerType: 'manual' | 'recommendation_accepted' | 'scheduled' | 'event' | 'api';
  triggerSource?: string;
  recommendationId?: string;
  entityType?: string;
  entityId?: string;
  initiatedBy?: string;
  inputData?: Record<string, unknown>;
  scheduledFor?: string;
  priority?: number;
}

interface WorkflowExecution {
  id: string;
  workspace_id: string;
  workflow_code: string;
  workflow_version: number;
  status: string;
  trigger_type: string;
  trigger_source?: string;
  recommendation_id?: string;
  entity_type?: string;
  entity_id?: string;
  initiated_by?: string;
  input_data: Record<string, unknown>;
  created_at: string;
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
        JSON.stringify({ error: 'Unauthorized' }),
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
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const userId = userData.user.id;

    // Parse request
    const body: TriggerRequest = await req.json();
    const {
      workspaceId,
      workflowCode,
      triggerType,
      triggerSource,
      recommendationId,
      entityType,
      entityId,
      initiatedBy,
      inputData,
      scheduledFor,
      priority,
    } = body;

    // Validate required fields
    if (!workspaceId || !workflowCode || !triggerType) {
      return new Response(
        JSON.stringify({ error: 'Missing required fields: workspaceId, workflowCode, triggerType' }),
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
        JSON.stringify({ error: 'Not a member of this workspace' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`[WorkflowTrigger] Creating execution for workflow: ${workflowCode}, trigger: ${triggerType}`);

    // Check for existing pending/running execution for same workflow + entity (idempotency)
    if (entityId) {
      const { data: existingExecution } = await supabase
        .from('workflow_executions')
        .select('id, status')
        .eq('workspace_id', workspaceId)
        .eq('workflow_code', workflowCode)
        .eq('entity_id', entityId)
        .in('status', ['pending', 'running', 'queued'])
        .maybeSingle();

      if (existingExecution) {
        console.log(`[WorkflowTrigger] Found existing execution ${existingExecution.id} with status ${existingExecution.status}`);
        return new Response(
          JSON.stringify({
            success: true,
            execution: existingExecution,
            message: 'Existing execution found',
            deduplicated: true,
          }),
          { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
    }

    // Fetch workflow definition if it exists
    const { data: workflowDef } = await supabase
      .from('workflow_definitions')
      .select('id, version, is_active, steps')
      .eq('workspace_id', workspaceId)
      .eq('code', workflowCode)
      .eq('is_active', true)
      .order('version', { ascending: false })
      .limit(1)
      .maybeSingle();

    const workflowVersion = workflowDef?.version || 1;

    // Create execution record
    const { data: execution, error: insertError } = await supabase
      .from('workflow_executions')
      .insert({
        workspace_id: workspaceId,
        workflow_code: workflowCode,
        workflow_version: workflowVersion,
        status: 'pending',
        trigger_type: triggerType,
        trigger_source: triggerSource || 'user',
        recommendation_id: recommendationId,
        entity_type: entityType,
        entity_id: entityId,
        initiated_by: initiatedBy || userId,
        input_data: inputData || {},
        scheduled_for: scheduledFor,
        context: {},
        current_step_index: 0,
      })
      .select()
      .single();

    if (insertError) {
      console.error('[WorkflowTrigger] Failed to create execution:', insertError);
      return new Response(
        JSON.stringify({ error: 'Failed to create workflow execution', details: insertError.message }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`[WorkflowTrigger] Created execution ${execution.id}`);

    // Add to processing queue
    const { error: queueError } = await supabase
      .from('workflow_queue')
      .insert({
        workspace_id: workspaceId,
        execution_id: execution.id,
        priority: priority || 0,
        scheduled_for: scheduledFor || new Date().toISOString(),
        status: 'pending',
      });

    if (queueError) {
      console.error('[WorkflowTrigger] Failed to add to queue:', queueError);
      // Update execution status to failed
      await supabase
        .from('workflow_executions')
        .update({ status: 'failed', error_message: 'Failed to queue execution' })
        .eq('id', execution.id);

      return new Response(
        JSON.stringify({ error: 'Failed to queue workflow execution', details: queueError.message }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Update execution status to queued
    await supabase
      .from('workflow_executions')
      .update({ status: 'queued' })
      .eq('id', execution.id);

    console.log(`[WorkflowTrigger] Execution ${execution.id} queued successfully`);

    // Return execution data
    return new Response(
      JSON.stringify({
        success: true,
        execution: {
          ...execution,
          status: 'queued',
        },
        message: 'Workflow execution queued successfully',
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('[WorkflowTrigger] Unexpected error:', error);
    return new Response(
      JSON.stringify({ error: 'Internal server error', details: error instanceof Error ? error.message : 'Unknown error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
