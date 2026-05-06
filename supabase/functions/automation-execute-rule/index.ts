// Fase 1J — Smart Workflows / Executor de Automações
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

const MAX_DEPTH = 3;

type Condition = {
  field: string;
  operator: string;
  value: unknown;
};

type Action = {
  action_type: string;
  config: Record<string, unknown>;
};

function evaluateCondition(cond: Condition, ctx: Record<string, unknown>): boolean {
  const left = ctx[cond.field];
  const right = cond.value;
  switch (cond.operator) {
    case 'equals': return left === right;
    case 'not_equals': return left !== right;
    case 'contains': return typeof left === 'string' && typeof right === 'string' && left.includes(right);
    case 'not_contains': return !(typeof left === 'string' && typeof right === 'string' && left.includes(right));
    case 'greater_than': return Number(left) > Number(right);
    case 'less_than': return Number(left) < Number(right);
    case 'is_empty': return left == null || left === '' || (Array.isArray(left) && left.length === 0);
    case 'is_not_empty': return !(left == null || left === '' || (Array.isArray(left) && left.length === 0));
    case 'in': return Array.isArray(right) && right.includes(left as never);
    case 'not_in': return Array.isArray(right) && !right.includes(left as never);
    case 'before': return new Date(left as string) < new Date(right as string);
    case 'after': return new Date(left as string) > new Date(right as string);
    default: return false;
  }
}

function evaluateConditions(conditions: Condition[], logic: string, ctx: Record<string, unknown>): { passed: boolean; results: Array<{ field: string; operator: string; passed: boolean }> } {
  if (!conditions || conditions.length === 0) return { passed: true, results: [] };
  const results = conditions.map((c) => ({ field: c.field, operator: c.operator, passed: evaluateCondition(c, ctx) }));
  const passed = logic === 'any' ? results.some((r) => r.passed) : results.every((r) => r.passed);
  return { passed, results };
}

const SENSITIVE_ACTIONS = new Set(['send_whatsapp_message', 'send_whatsapp_template', 'send_followup_message']);

async function executeAction(supabase: ReturnType<typeof createClient>, action: Action, payload: {
  workspace_id: string;
  conversation_id?: string | null;
  contact_id?: string | null;
  entity_type?: string | null;
  entity_id?: string | null;
  payload: Record<string, unknown>;
  rule_id: string;
  context_id: string;
}): Promise<{ ok: boolean; result?: unknown; error?: string }> {
  try {
    switch (action.action_type) {
      case 'add_conversation_tag': {
        if (!payload.conversation_id) return { ok: false, error: 'no conversation_id' };
        const tag = (action.config?.tag as string) ?? 'auto';
        const { data: conv } = await supabase.from('conversations').select('tags').eq('id', payload.conversation_id).maybeSingle();
        const current = (conv?.tags as string[] | null) ?? [];
        if (!current.includes(tag)) {
          await supabase.from('conversations').update({ tags: [...current, tag] }).eq('id', payload.conversation_id);
        }
        return { ok: true, result: { tag } };
      }
      case 'create_operational_alert': {
        const { data, error } = await supabase.from('inbox_smart_alerts').insert({
          workspace_id: payload.workspace_id,
          conversation_id: payload.conversation_id ?? null,
          alert_type: 'automation',
          severity: (action.config?.severity as string) ?? 'medium',
          title: (action.config?.title as string) ?? 'Alerta automático',
          description: (action.config?.message as string) ?? 'Disparado por automação',
          context_data: { source: 'automation', rule_id: payload.rule_id, automation_context_id: payload.context_id },
        }).select().maybeSingle();
        if (error) return { ok: false, error: error.message };
        return { ok: true, result: { alert_id: data?.id } };
      }
      case 'notify_user':
      case 'notify_manager': {
        const { data, error } = await supabase.from('inbox_smart_alerts').insert({
          workspace_id: payload.workspace_id,
          conversation_id: payload.conversation_id ?? null,
          alert_type: action.action_type,
          severity: 'low',
          title: (action.config?.title as string) ?? (action.action_type === 'notify_manager' ? 'Notificação para gestor' : 'Notificação'),
          description: (action.config?.message as string) ?? 'Automação criou esta notificação.',
          context_data: { source: 'automation', rule_id: payload.rule_id, target_role: action.action_type === 'notify_manager' ? 'manager' : 'user' },
        }).select().maybeSingle();
        if (error) return { ok: false, error: error.message };
        return { ok: true, result: { alert_id: data?.id } };
      }
      case 'create_ticket': {
        const { data, error } = await supabase.from('support_tickets').insert({
          workspace_id: payload.workspace_id,
          conversation_id: payload.conversation_id ?? null,
          contact_id: payload.contact_id ?? null,
          subject: (action.config?.subject as string) ?? 'Ticket criado por automação',
          description: (action.config?.description as string) ?? `Criado automaticamente pela regra ${payload.rule_id}`,
          priority: (action.config?.priority as string) ?? 'medium',
          status: 'open',
          source: 'automation',
          metadata: { source: 'automation', rule_id: payload.rule_id },
        }).select().maybeSingle();
        if (error) return { ok: false, error: error.message };
        return { ok: true, result: { ticket_id: data?.id } };
      }
      case 'create_followup': {
        const { data, error } = await supabase.from('communication_followups').insert({
          workspace_id: payload.workspace_id,
          conversation_id: payload.conversation_id ?? null,
          contact_id: payload.contact_id ?? null,
          title: (action.config?.title as string) ?? 'Follow-up automático',
          due_at: (action.config?.due_at as string) ?? new Date(Date.now() + 24 * 3600 * 1000).toISOString(),
          status: 'pending',
          metadata: { source: 'automation', rule_id: payload.rule_id },
        }).select().maybeSingle();
        if (error) return { ok: false, error: error.message };
        return { ok: true, result: { followup_id: data?.id } };
      }
      case 'add_internal_note': {
        if (!payload.conversation_id) return { ok: false, error: 'no conversation_id' };
        const { error } = await supabase.from('messages').insert({
          workspace_id: payload.workspace_id,
          conversation_id: payload.conversation_id,
          direction: 'internal',
          content: (action.config?.note as string) ?? 'Nota interna automática',
          metadata: { source: 'automation', rule_id: payload.rule_id },
        });
        if (error) return { ok: false, error: error.message };
        return { ok: true };
      }
      case 'change_ticket_priority': {
        if (!payload.entity_id || payload.entity_type !== 'ticket') return { ok: false, error: 'entity must be ticket' };
        const { error } = await supabase.from('support_tickets').update({ priority: (action.config?.priority as string) ?? 'high' }).eq('id', payload.entity_id);
        if (error) return { ok: false, error: error.message };
        return { ok: true };
      }
      case 'assign_conversation': {
        if (!payload.conversation_id) return { ok: false, error: 'no conversation_id' };
        const userId = action.config?.user_id as string | undefined;
        if (!userId) return { ok: false, error: 'no user_id in config' };
        const { error } = await supabase.from('conversations').update({ assigned_to: userId }).eq('id', payload.conversation_id);
        if (error) return { ok: false, error: error.message };
        return { ok: true };
      }
      case 'trigger_conversation_analysis': {
        if (!payload.conversation_id) return { ok: false, error: 'no conversation_id' };
        const { error } = await supabase.functions.invoke('inbox-analyze-conversation', {
          body: { conversation_id: payload.conversation_id, workspace_id: payload.workspace_id, source: 'automation' },
        });
        if (error) return { ok: false, error: error.message };
        return { ok: true };
      }
      case 'trigger_audio_transcription': {
        const messageId = payload.payload?.message_id as string | undefined;
        if (!messageId) return { ok: false, error: 'no message_id in payload' };
        const { error } = await supabase.functions.invoke('whatsapp-transcribe-audio', {
          body: { message_id: messageId, workspace_id: payload.workspace_id, source: 'automation' },
        });
        if (error) return { ok: false, error: error.message };
        return { ok: true };
      }
      case 'trigger_quality_review': {
        if (!payload.conversation_id) return { ok: false, error: 'no conversation_id' };
        const { error } = await supabase.functions.invoke('conversation-quality-review', {
          body: { conversation_id: payload.conversation_id, workspace_id: payload.workspace_id, source: 'automation' },
        });
        if (error) return { ok: false, error: error.message };
        return { ok: true };
      }
      case 'send_whatsapp_template':
      case 'send_whatsapp_message':
      case 'send_followup_message':
        // Estas ações deviam ser interceptadas antes — guardrail
        return { ok: false, error: 'sensitive action requires approval' };
      default:
        return { ok: false, error: `unknown action_type: ${action.action_type}` };
    }
  } catch (err) {
    return { ok: false, error: (err as Error).message };
  }
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  try {
    const body = await req.json();
    const {
      workspace_id,
      event_type,
      entity_type = null,
      entity_id = null,
      conversation_id = null,
      contact_id = null,
      payload = {},
      dry_run = false,
      rule_id_override = null, // dry-run pode forçar 1 regra
    } = body ?? {};

    if (!workspace_id || !event_type) {
      return new Response(JSON.stringify({ error: 'workspace_id and event_type required' }), {
        status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const depth = Number(payload?.depth ?? 0);
    if (depth > MAX_DEPTH) {
      return new Response(JSON.stringify({ skipped: true, reason: 'max depth exceeded' }), {
        status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
      { auth: { persistSession: false } }
    );

    // Buscar regras candidatas
    let q = supabase.from('journey_automations')
      .select('id, name, conditions, conditions_logic, actions, cooldown_minutes, max_runs_per_day, max_runs_per_entity_per_day, require_human_approval, last_run_at, run_count')
      .eq('workspace_id', workspace_id)
      .eq('is_active', true)
      .eq('trigger_event', event_type);

    if (rule_id_override) q = q.eq('id', rule_id_override);

    const { data: rules, error: rulesErr } = await q;
    if (rulesErr) {
      return new Response(JSON.stringify({ error: rulesErr.message }), {
        status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const context_id = crypto.randomUUID();
    const evaluationCtx: Record<string, unknown> = {
      ...(payload as Record<string, unknown>),
      conversation_id, contact_id, entity_type, entity_id,
    };

    const results: Array<Record<string, unknown>> = [];

    for (const rule of rules ?? []) {
      const startedAt = new Date();
      // cooldown
      if (rule.cooldown_minutes && rule.last_run_at) {
        const minSince = (Date.now() - new Date(rule.last_run_at).getTime()) / 60000;
        if (minSince < rule.cooldown_minutes) {
          await supabase.from('journey_automation_logs').insert({
            workspace_id, automation_id: rule.id, rule_id: rule.id, automation_name: rule.name,
            entity_type: entity_type ?? 'event', entity_id: entity_id ?? rule.id,
            trigger_type: event_type, trigger_data: payload, status: 'skipped',
            error_message: 'cooldown', conditions_result: {}, actions_executed: [],
            depth, automation_context_id: context_id, dry_run,
          });
          results.push({ rule_id: rule.id, status: 'skipped', reason: 'cooldown' });
          continue;
        }
      }

      // max runs per day
      if (rule.max_runs_per_day) {
        const since = new Date(Date.now() - 24 * 3600 * 1000).toISOString();
        const { count } = await supabase.from('journey_automation_logs')
          .select('id', { count: 'exact', head: true })
          .eq('rule_id', rule.id)
          .gte('executed_at', since)
          .in('status', ['success','completed','partial']);
        if ((count ?? 0) >= rule.max_runs_per_day) {
          results.push({ rule_id: rule.id, status: 'skipped', reason: 'daily_limit' });
          continue;
        }
      }

      // max runs per entity per day
      if (rule.max_runs_per_entity_per_day && entity_id) {
        const since = new Date(Date.now() - 24 * 3600 * 1000).toISOString();
        const { count } = await supabase.from('journey_automation_logs')
          .select('id', { count: 'exact', head: true })
          .eq('rule_id', rule.id)
          .eq('entity_id', entity_id)
          .gte('executed_at', since);
        if ((count ?? 0) >= rule.max_runs_per_entity_per_day) {
          results.push({ rule_id: rule.id, status: 'skipped', reason: 'entity_daily_limit' });
          continue;
        }
      }

      const condEval = evaluateConditions((rule.conditions as Condition[]) ?? [], rule.conditions_logic ?? 'all', evaluationCtx);

      if (!condEval.passed) {
        await supabase.from('journey_automation_logs').insert({
          workspace_id, automation_id: rule.id, rule_id: rule.id, automation_name: rule.name,
          entity_type: entity_type ?? 'event', entity_id: entity_id ?? rule.id,
          trigger_type: event_type, trigger_data: payload, status: 'skipped',
          conditions_result: condEval, actions_executed: [], depth,
          automation_context_id: context_id, dry_run,
        });
        results.push({ rule_id: rule.id, status: 'skipped', reason: 'conditions_failed', conditions: condEval });
        continue;
      }

      // Executar actions (ou criar approvals em caso de ações sensíveis ou require_human_approval)
      const actionResults: Array<Record<string, unknown>> = [];
      let anyFailed = false;
      let allOk = true;
      const ruleNeedsApproval = rule.require_human_approval === true;

      for (const action of (rule.actions as Action[]) ?? []) {
        const isSensitive = SENSITIVE_ACTIONS.has(action.action_type);

        if (dry_run) {
          actionResults.push({ action_type: action.action_type, dry_run: true, would_execute: true, sensitive: isSensitive });
          continue;
        }

        if (isSensitive || ruleNeedsApproval) {
          const { data: approval, error: appErr } = await supabase.from('automation_action_approvals').insert({
            workspace_id, rule_id: rule.id, action_type: action.action_type,
            proposed_payload: { config: action.config, context: { conversation_id, contact_id, entity_type, entity_id, payload } },
            entity_type: entity_type ?? null, entity_id: entity_id ?? null, status: 'pending',
          }).select().maybeSingle();
          if (appErr) {
            actionResults.push({ action_type: action.action_type, ok: false, error: appErr.message });
            anyFailed = true; allOk = false;
          } else {
            actionResults.push({ action_type: action.action_type, ok: true, approval_required: true, approval_id: approval?.id });
          }
          continue;
        }

        const r = await executeAction(supabase, action, {
          workspace_id, conversation_id, contact_id, entity_type, entity_id,
          payload: { ...payload, depth: depth + 1, automation_context_id: context_id, triggered_by_rule_id: rule.id, source: 'automation' },
          rule_id: rule.id, context_id,
        });
        actionResults.push({ action_type: action.action_type, ...r });
        if (!r.ok) { anyFailed = true; allOk = false; }
      }

      const completedAt = new Date();
      const duration = completedAt.getTime() - startedAt.getTime();
      const status = dry_run ? 'completed' : (allOk ? 'success' : (anyFailed && actionResults.some((a) => a.ok) ? 'partial' : 'failed'));

      await supabase.from('journey_automation_logs').insert({
        workspace_id, automation_id: rule.id, rule_id: rule.id, automation_name: rule.name,
        entity_type: entity_type ?? 'event', entity_id: entity_id ?? rule.id,
        trigger_type: event_type, trigger_data: payload, status,
        conditions_result: condEval, actions_executed: actionResults,
        started_at: startedAt.toISOString(), completed_at: completedAt.toISOString(),
        duration_ms: duration, depth, automation_context_id: context_id, dry_run,
      });

      if (!dry_run) {
        await supabase.from('journey_automations').update({
          last_run_at: completedAt.toISOString(),
          run_count: (rule.run_count ?? 0) + 1,
        }).eq('id', rule.id);
      }

      results.push({ rule_id: rule.id, status, actions: actionResults, duration_ms: duration });
    }

    return new Response(JSON.stringify({ ok: true, dry_run, context_id, results }), {
      status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: (err as Error).message, fallback: true }), {
      status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
