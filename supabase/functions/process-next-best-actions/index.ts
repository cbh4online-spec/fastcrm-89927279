import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface Signal {
  entity_type: string;
  entity_id: string;
  entity_name: string;
  action_type: string;
  title: string;
  description: string;
  rationale: string;
  priority_score: number;
  confidence: 'low' | 'medium' | 'high';
  impact_estimate: number;
  urgency: 'low' | 'medium' | 'high' | 'critical';
  due_at: string | null;
  source_signals_json: Record<string, unknown>;
  suggested_payload_json: Record<string, unknown>;
}

function clampScore(v: number): number {
  return Math.max(0, Math.min(100, Math.round(v)));
}

function calcPriority(params: {
  potential_revenue: number;
  urgency_factor: number;
  conversion_prob: number;
  risk: number;
  recency_penalty: number;
}): number {
  const raw =
    params.potential_revenue * 0.3 +
    params.urgency_factor * 0.25 +
    params.conversion_prob * 0.2 +
    params.risk * 0.15 +
    params.recency_penalty * 0.1;
  return clampScore(raw);
}

function daysSince(dateStr: string | null): number {
  if (!dateStr) return 999;
  return Math.floor((Date.now() - new Date(dateStr).getTime()) / 86400000);
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, serviceKey, { auth: { persistSession: false } });

    const body = await req.json().catch(() => ({}));
    const workspaceId = body.workspace_id;

    if (!workspaceId) {
      return new Response(JSON.stringify({ error: 'workspace_id required' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Load settings
    const { data: settings } = await supabase
      .from('next_best_action_settings')
      .select('*')
      .eq('workspace_id', workspaceId)
      .maybeSingle();

    const staleThreshold = settings?.stale_context_threshold ?? 14;
    const minPriority = settings?.min_priority_to_show ?? 20;

    const signals: Signal[] = [];

    // --- SIGNAL 1: Silent leads (no activity in staleThreshold days) ---
    const { data: silentLeads } = await supabase
      .from('leads')
      .select('id, name, email, lead_score, estimated_value, updated_at')
      .eq('workspace_id', workspaceId)
      .eq('status', 'in_progress')
      .lt('updated_at', new Date(Date.now() - staleThreshold * 86400000).toISOString())
      .limit(50);

    for (const lead of silentLeads ?? []) {
      const days = daysSince(lead.updated_at);
      const score = calcPriority({
        potential_revenue: Math.min(100, (lead.estimated_value ?? 0) / 100),
        urgency_factor: Math.min(100, days * 3),
        conversion_prob: lead.lead_score ?? 30,
        risk: Math.min(100, days * 2),
        recency_penalty: Math.min(100, days * 4),
      });
      if (score >= minPriority) {
        signals.push({
          entity_type: 'lead',
          entity_id: lead.id,
          entity_name: lead.name ?? lead.email ?? 'Lead',
          action_type: 're-engage_silent_lead',
          title: `Re-envolver ${lead.name || 'lead silencioso'}`,
          description: `Este lead está sem atividade há ${days} dias. Considere um follow-up personalizado.`,
          rationale: `Sem atividade há ${days} dias. Lead score: ${lead.lead_score ?? 'N/A'}. Valor estimado: €${lead.estimated_value ?? 0}.`,
          priority_score: score,
          confidence: days > 30 ? 'high' : 'medium',
          impact_estimate: lead.estimated_value ?? 0,
          urgency: days > 30 ? 'high' : 'medium',
          due_at: null,
          source_signals_json: { days_silent: days, lead_score: lead.lead_score, estimated_value: lead.estimated_value },
          suggested_payload_json: { action: 'send_followup_email', entity_id: lead.id },
        });
      }
    }

    // --- SIGNAL 2: High-score leads without recent action ---
    const { data: hotLeads } = await supabase
      .from('leads')
      .select('id, name, email, lead_score, estimated_value, updated_at')
      .eq('workspace_id', workspaceId)
      .eq('status', 'new')
      .gte('lead_score', 70)
      .limit(20);

    for (const lead of hotLeads ?? []) {
      const score = calcPriority({
        potential_revenue: Math.min(100, (lead.estimated_value ?? 0) / 100),
        urgency_factor: 80,
        conversion_prob: lead.lead_score ?? 70,
        risk: 40,
        recency_penalty: 20,
      });
      if (score >= minPriority) {
        signals.push({
          entity_type: 'lead',
          entity_id: lead.id,
          entity_name: lead.name ?? 'Lead',
          action_type: 'call_now',
          title: `Contactar ${lead.name || 'lead quente'} imediatamente`,
          description: `Lead com score alto (${lead.lead_score}) ainda sem contacto. Ação imediata recomendada.`,
          rationale: `Lead score ${lead.lead_score} >= 70, status 'new'. Valor estimado: €${lead.estimated_value ?? 0}.`,
          priority_score: score,
          confidence: 'high',
          impact_estimate: lead.estimated_value ?? 0,
          urgency: 'critical',
          due_at: new Date(Date.now() + 86400000).toISOString(),
          source_signals_json: { lead_score: lead.lead_score, estimated_value: lead.estimated_value, status: 'new' },
          suggested_payload_json: { action: 'call_now', entity_id: lead.id },
        });
      }
    }

    // --- SIGNAL 3: Contacts with stale context ---
    const { data: staleContacts } = await supabase
      .from('contacts')
      .select('id, name, email, contact_score, updated_at')
      .eq('workspace_id', workspaceId)
      .lt('updated_at', new Date(Date.now() - staleThreshold * 86400000).toISOString())
      .limit(30);

    for (const contact of staleContacts ?? []) {
      const days = daysSince(contact.updated_at);
      const score = calcPriority({
        potential_revenue: 20,
        urgency_factor: Math.min(100, days * 2),
        conversion_prob: contact.contact_score ?? 20,
        risk: Math.min(80, days),
        recency_penalty: Math.min(100, days * 3),
      });
      if (score >= minPriority) {
        signals.push({
          entity_type: 'contact',
          entity_id: contact.id,
          entity_name: contact.name ?? contact.email ?? 'Contacto',
          action_type: 'refresh_context',
          title: `Atualizar contexto de ${contact.name || 'contacto'}`,
          description: `Informação desatualizada há ${days} dias. Recomendado atualizar dados de contexto.`,
          rationale: `Última atualização há ${days} dias, acima do threshold de ${staleThreshold} dias.`,
          priority_score: score,
          confidence: 'medium',
          impact_estimate: 0,
          urgency: days > 30 ? 'high' : 'low',
          due_at: null,
          source_signals_json: { days_stale: days, contact_score: contact.contact_score },
          suggested_payload_json: { action: 'refresh_context', entity_id: contact.id },
        });
      }
    }

    // --- SIGNAL 4: Opportunities needing escalation ---
    const { data: opportunities } = await supabase
      .from('opportunities')
      .select('id, title, value, stage, probability, expected_close_date, contact_id, updated_at')
      .eq('workspace_id', workspaceId)
      .in('stage', ['proposal', 'negotiation'])
      .limit(30);

    for (const opp of opportunities ?? []) {
      const days = daysSince(opp.updated_at);
      if (days < 5) continue;
      const score = calcPriority({
        potential_revenue: Math.min(100, (opp.value ?? 0) / 100),
        urgency_factor: Math.min(100, days * 5),
        conversion_prob: opp.probability ?? 50,
        risk: Math.min(100, days * 3),
        recency_penalty: Math.min(100, days * 2),
      });
      if (score >= minPriority) {
        const actionType = opp.stage === 'proposal' ? 'follow_after_proposal' : 'escalate_opportunity';
        signals.push({
          entity_type: 'opportunity',
          entity_id: opp.id,
          entity_name: opp.title ?? 'Oportunidade',
          action_type: actionType,
          title: actionType === 'follow_after_proposal'
            ? `Follow-up da proposta "${opp.title}"`
            : `Escalar oportunidade "${opp.title}"`,
          description: `Oportunidade em ${opp.stage} sem atualização há ${days} dias. Valor: €${opp.value ?? 0}.`,
          rationale: `Stage: ${opp.stage}, sem atividade há ${days} dias, valor €${opp.value ?? 0}, probabilidade ${opp.probability ?? 50}%.`,
          priority_score: score,
          confidence: 'high',
          impact_estimate: opp.value ?? 0,
          urgency: days > 14 ? 'critical' : 'high',
          due_at: opp.expected_close_date ?? null,
          source_signals_json: { days_stale: days, stage: opp.stage, value: opp.value, probability: opp.probability },
          suggested_payload_json: { action: actionType, entity_id: opp.id, contact_id: opp.contact_id },
        });
      }
    }

    // --- Insert recommendations (idempotent) ---
    let inserted = 0;
    for (const sig of signals) {
      const { error } = await supabase.from('next_best_actions').upsert(
        {
          workspace_id: workspaceId,
          entity_type: sig.entity_type,
          entity_id: sig.entity_id,
          action_type: sig.action_type,
          title: sig.title,
          description: sig.description,
          rationale: sig.rationale,
          priority_score: sig.priority_score,
          confidence: sig.confidence,
          impact_estimate: sig.impact_estimate,
          urgency: sig.urgency,
          due_at: sig.due_at,
          status: 'open',
          source_signals_json: sig.source_signals_json,
          suggested_payload_json: sig.suggested_payload_json,
          updated_at: new Date().toISOString(),
        },
        { onConflict: 'workspace_id,entity_type,entity_id,action_type', ignoreDuplicates: true }
      );
      if (!error) inserted++;
    }

    // --- Expire old open actions (>7 days) ---
    const expiryDate = new Date(Date.now() - 7 * 86400000).toISOString();
    const { data: expired } = await supabase
      .from('next_best_actions')
      .update({ status: 'expired', updated_at: new Date().toISOString() })
      .eq('workspace_id', workspaceId)
      .eq('status', 'open')
      .lt('created_at', expiryDate)
      .select('id');

    // --- Emit kernel events for new actions ---
    for (const sig of signals.slice(0, 10)) {
      try {
        await supabase.functions.invoke('kernel-ingest-event', {
          body: {
            workspace_id: workspaceId,
            type: 'NBA.CREATED',
            entity_kind: sig.entity_type,
            entity_id: sig.entity_id,
            actor_type: 'system',
            source_module: 'next-best-action',
            payload: {
              action_type: sig.action_type,
              title: sig.title,
              priority_score: sig.priority_score,
              confidence: sig.confidence,
              impact_estimate: sig.impact_estimate,
            },
            schema_version: 1,
            occurred_at: new Date().toISOString(),
          },
        });
      } catch (_) { /* fire-and-forget */ }
    }

    return new Response(
      JSON.stringify({
        ok: true,
        signals_generated: signals.length,
        inserted,
        expired: expired?.length ?? 0,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (err) {
    console.error('process-next-best-actions error:', err);
    return new Response(
      JSON.stringify({ ok: true, error: (err as Error).message, fallback: true, signals_generated: 0 }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
