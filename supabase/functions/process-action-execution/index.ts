import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.49.1';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface ActionRequest {
  workspace_id: string;
  action_execution_id?: string;
  action_type?: string;
  title?: string;
  description?: string;
  payload?: Record<string, unknown>;
  source_type?: string;
  source_id?: string;
  entity_type?: string;
  entity_id?: string;
  execution_mode?: string;
  correlation_id?: string;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, serviceKey);

    // Auth check
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(JSON.stringify({ error: 'Missing authorization' }), {
        status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const anonClient = createClient(supabaseUrl, Deno.env.get('SUPABASE_ANON_KEY')!);
    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authError } = await anonClient.auth.getUser(token);
    if (authError || !user) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const body: ActionRequest = await req.json();
    const { workspace_id } = body;

    if (!workspace_id) {
      return new Response(JSON.stringify({ error: 'workspace_id is required' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Verify workspace membership
    const { data: membership } = await supabase
      .from('workspace_members')
      .select('id')
      .eq('workspace_id', workspace_id)
      .eq('user_id', user.id)
      .maybeSingle();

    if (!membership) {
      return new Response(JSON.stringify({ error: 'Not a workspace member' }), {
        status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    let executionId = body.action_execution_id;
    let actionType = body.action_type;

    // If no existing execution, create one
    if (!executionId) {
      if (!actionType || !body.title) {
        return new Response(JSON.stringify({ error: 'action_type and title are required' }), {
          status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      // Idempotency check
      if (body.correlation_id) {
        const { data: existing } = await supabase
          .from('action_executions')
          .select('id, status')
          .eq('workspace_id', workspace_id)
          .eq('correlation_id', body.correlation_id)
          .in('status', ['completed', 'processing'])
          .maybeSingle();

        if (existing) {
          return new Response(JSON.stringify({
            action_execution_id: existing.id,
            status: existing.status,
            message: 'Action already executed or in progress',
          }), {
            status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          });
        }
      }

      const { data: newExec, error: insertErr } = await supabase
        .from('action_executions')
        .insert({
          workspace_id,
          action_type: actionType,
          title: body.title,
          description: body.description || null,
          payload_json: body.payload || {},
          source_type: body.source_type || 'manual',
          source_id: body.source_id || null,
          entity_type: body.entity_type || null,
          entity_id: body.entity_id || null,
          execution_mode: body.execution_mode || 'manual',
          correlation_id: body.correlation_id || null,
          created_by: user.id,
          status: 'pending',
        })
        .select('id')
        .single();

      if (insertErr) throw insertErr;
      executionId = newExec.id;

      // Emit ACTION.CREATED
      await emitKernelEvent(supabase, workspace_id, 'ACTION.CREATED', 'action_execution', executionId!, user.id, { action_type: actionType });
    }

    // Fetch the execution
    const { data: execution, error: fetchErr } = await supabase
      .from('action_executions')
      .select('*')
      .eq('id', executionId)
      .single();

    if (fetchErr || !execution) {
      return new Response(JSON.stringify({ error: 'Execution not found' }), {
        status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    actionType = execution.action_type;

    // Check if approval is required
    const { data: settings } = await supabase
      .from('action_execution_settings')
      .select('*')
      .eq('workspace_id', workspace_id)
      .maybeSingle();

    const needsApproval = checkApprovalRequired(actionType!, settings);

    if (needsApproval) {
      // Create approval request
      await supabase.from('action_approvals').insert({
        workspace_id,
        action_execution_id: executionId,
        requested_by: user.id,
        approval_status: 'pending',
      });

      await supabase
        .from('action_executions')
        .update({ status: 'pending', updated_at: new Date().toISOString() })
        .eq('id', executionId);

      await emitKernelEvent(supabase, workspace_id, 'ACTION.APPROVAL_REQUESTED', 'action_execution', executionId!, user.id, { action_type: actionType });

      return new Response(JSON.stringify({
        action_execution_id: executionId,
        status: 'pending_approval',
        message: 'Action requires human approval',
      }), {
        status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Mark processing
    await supabase
      .from('action_executions')
      .update({ status: 'processing', updated_at: new Date().toISOString() })
      .eq('id', executionId);

    await emitKernelEvent(supabase, workspace_id, 'ACTION.STARTED', 'action_execution', executionId!, user.id, { action_type: actionType });

    // Execute the action
    try {
      const result = await executeAction(supabase, execution, workspace_id, user.id);

      await supabase
        .from('action_executions')
        .update({
          status: 'completed',
          result_json: result,
          executed_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .eq('id', executionId);

      await emitKernelEvent(supabase, workspace_id, 'ACTION.COMPLETED', 'action_execution', executionId!, user.id, {
        action_type: actionType,
        result_summary: result?.summary || 'completed',
      });

      return new Response(JSON.stringify({
        action_execution_id: executionId,
        status: 'completed',
        result,
      }), {
        status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });

    } catch (execError: any) {
      await supabase
        .from('action_executions')
        .update({
          status: 'failed',
          error_message: execError.message || 'Unknown error',
          failed_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .eq('id', executionId);

      await emitKernelEvent(supabase, workspace_id, 'ACTION.FAILED', 'action_execution', executionId!, user.id, {
        action_type: actionType,
        error: execError.message,
      });

      return new Response(JSON.stringify({
        action_execution_id: executionId,
        status: 'failed',
        error: execError.message,
      }), {
        status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

  } catch (err: any) {
    console.error('[process-action-execution] Error:', err);
    return new Response(JSON.stringify({ error: err.message || 'Internal error' }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});

function checkApprovalRequired(actionType: string, settings: any): boolean {
  if (!settings) return false;
  if (actionType === 'send_email' && settings.require_human_approval_for_email) return true;
  if (actionType === 'schedule_meeting') return true;
  return false;
}

async function executeAction(supabase: any, execution: any, workspaceId: string, userId: string) {
  const payload = execution.payload_json || {};
  const actionType = execution.action_type;

  switch (actionType) {
    case 'create_task': {
      const { data, error } = await supabase.from('tasks').insert({
        workspace_id: workspaceId,
        title: payload.title || execution.title,
        description: payload.description || execution.description || null,
        related_type: payload.related_type || execution.entity_type || null,
        related_id: payload.related_id || execution.entity_id || null,
        due_at: payload.due_at || null,
        status: 'pending',
        created_by: userId,
      }).select('id, title').single();
      if (error) throw error;
      return { summary: `Tarefa criada: ${data.title}`, task_id: data.id };
    }

    case 'create_followup_note': {
      const dueAt = new Date();
      dueAt.setDate(dueAt.getDate() + (payload.days || 3));
      const { data, error } = await supabase.from('tasks').insert({
        workspace_id: workspaceId,
        title: payload.title || `Follow-up: ${execution.title}`,
        description: payload.description || null,
        related_type: payload.related_type || execution.entity_type || null,
        related_id: payload.related_id || execution.entity_id || null,
        due_at: dueAt.toISOString(),
        status: 'pending',
        created_by: userId,
      }).select('id, title').single();
      if (error) throw error;
      return { summary: `Follow-up criado: ${data.title}`, task_id: data.id };
    }

    case 'schedule_meeting': {
      const dueAt = payload.due_at || new Date(Date.now() + 86400000).toISOString();
      const { data, error } = await supabase.from('tasks').insert({
        workspace_id: workspaceId,
        title: payload.title || `Reunião: ${execution.title}`,
        related_type: payload.related_type || execution.entity_type || null,
        related_id: payload.related_id || execution.entity_id || null,
        due_at: dueAt,
        status: 'pending',
        created_by: userId,
      }).select('id, title').single();
      if (error) throw error;
      return { summary: `Reunião agendada: ${data.title}`, task_id: data.id };
    }

    case 'enroll_in_sequence': {
      const { data, error } = await supabase.from('email_sequence_enrollments').insert({
        workspace_id: workspaceId,
        sequence_id: payload.sequence_id,
        contact_id: payload.contact_id || execution.entity_id,
        status: 'active',
      }).select('id').single();
      if (error) throw error;
      return { summary: 'Contacto inscrito na sequência', enrollment_id: data.id };
    }

    case 'pause_sequence': {
      const { error } = await supabase
        .from('email_sequence_enrollments')
        .update({ status: 'paused', updated_at: new Date().toISOString() })
        .eq('id', payload.enrollment_id)
        .eq('workspace_id', workspaceId);
      if (error) throw error;
      return { summary: 'Sequência pausada' };
    }

    case 'mark_recommendation_acted': {
      if (payload.recommendation_type === 'next_best_action') {
        await supabase
          .from('next_best_actions')
          .update({ status: 'acted', acted_at: new Date().toISOString(), updated_at: new Date().toISOString() })
          .eq('id', payload.recommendation_id)
          .eq('workspace_id', workspaceId);
      } else {
        await supabase
          .from('optimization_recommendations')
          .update({ status: 'applied', applied_at: new Date().toISOString(), updated_at: new Date().toISOString() })
          .eq('id', payload.recommendation_id)
          .eq('workspace_id', workspaceId);
      }
      return { summary: 'Recomendação marcada como executada' };
    }

    case 'trigger_abandoned_cart_recovery': {
      // Invoke recovery function
      const { error } = await supabase.functions.invoke('process-store-recovery', {
        body: {
          workspace_id: workspaceId,
          cart_id: payload.cart_id || execution.entity_id,
        },
      });
      if (error) throw error;
      return { summary: 'Recovery de carrinho abandonado acionado' };
    }

    case 'navigate_entity':
    case 'generate_report':
    case 'export_pdf':
      // Client-side actions — mark completed immediately
      return { summary: `Ação client-side: ${actionType}`, client_action: true };

    case 'send_email':
      // Should have been caught by approval check, but handle gracefully
      return { summary: 'Email preparado para envio (requer aprovação)', requires_manual_send: true };

    default:
      return { summary: `Ação ${actionType} registada`, action_type: actionType };
  }
}

async function emitKernelEvent(
  supabase: any,
  workspaceId: string,
  eventType: string,
  entityKind: string,
  entityId: string,
  actorId: string,
  payload: Record<string, unknown>,
) {
  try {
    await supabase.functions.invoke('kernel-ingest-event', {
      body: {
        workspace_id: workspaceId,
        type: eventType,
        entity_kind: entityKind,
        entity_id: entityId,
        actor_type: 'user',
        actor_id: actorId,
        payload,
        source_module: 'action-execution',
        schema_version: 1,
        occurred_at: new Date().toISOString(),
      },
    });
  } catch (err) {
    console.warn('[ActionExecution] Failed to emit kernel event:', err);
  }
}
