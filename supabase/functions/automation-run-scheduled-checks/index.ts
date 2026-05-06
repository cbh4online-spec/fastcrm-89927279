// Fase 1J — Verificações periódicas que emitem eventos comunicacionais
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
      { auth: { persistSession: false } }
    );

    const stats = { unanswered_conversations: 0, overdue_followups: 0, sla_risk_tickets: 0 };
    const now = new Date();

    // 1) Conversas sem resposta há > 30 min (com última mensagem inbound)
    const since30 = new Date(now.getTime() - 30 * 60000).toISOString();
    const { data: stale } = await supabase
      .from('conversations')
      .select('id, workspace_id, contact_id, last_message_at, status')
      .not('status', 'in', '(closed,resolved,archived)')
      .lt('last_message_at', since30)
      .limit(200);

    for (const c of stale ?? []) {
      const minutes = Math.floor((now.getTime() - new Date(c.last_message_at).getTime()) / 60000);
      await supabase.from('whatsapp_communication_events').insert({
        workspace_id: c.workspace_id,
        event_type: 'communication.conversation.unanswered',
        entity_type: 'conversation',
        entity_id: c.id,
        conversation_id: c.id,
        contact_id: c.contact_id,
        payload: { no_response_minutes: minutes, source: 'scheduled_check' },
      });
      stats.unanswered_conversations++;
    }

    // 2) Follow-ups vencidos
    const { data: overdue } = await supabase
      .from('communication_followups')
      .select('id, workspace_id, conversation_id, contact_id, due_at')
      .eq('status', 'pending')
      .lt('due_at', now.toISOString())
      .limit(200);

    for (const f of overdue ?? []) {
      await supabase.from('whatsapp_communication_events').insert({
        workspace_id: f.workspace_id,
        event_type: 'communication.followup.overdue',
        entity_type: 'followup',
        entity_id: f.id,
        conversation_id: f.conversation_id,
        contact_id: f.contact_id,
        payload: { due_at: f.due_at, source: 'scheduled_check' },
      });
      stats.overdue_followups++;
    }

    // 3) Tickets SLA em risco (vence em < 1h)
    const soon = new Date(now.getTime() + 60 * 60000).toISOString();
    const { data: tickets } = await supabase
      .from('support_tickets')
      .select('id, workspace_id, conversation_id, contact_id, sla_due_at, status, priority')
      .not('status', 'in', '(resolved,closed)')
      .not('sla_due_at', 'is', null)
      .lt('sla_due_at', soon)
      .gt('sla_due_at', now.toISOString())
      .limit(200);

    for (const t of tickets ?? []) {
      await supabase.from('whatsapp_communication_events').insert({
        workspace_id: t.workspace_id,
        event_type: 'support.ticket.sla_risk',
        entity_type: 'ticket',
        entity_id: t.id,
        conversation_id: t.conversation_id,
        contact_id: t.contact_id,
        payload: { sla_due_at: t.sla_due_at, priority: t.priority, source: 'scheduled_check' },
      });
      stats.sla_risk_tickets++;
    }

    return new Response(JSON.stringify({ ok: true, stats, ran_at: now.toISOString() }), {
      status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: (err as Error).message, fallback: true }), {
      status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
