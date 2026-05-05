// whatsapp-conversation-ai-analyze
// Analisa uma conversa WhatsApp via Lovable AI Gateway e devolve 10 campos:
// summary, intent, sentiment, urgency, lead_temperature, recommended_action,
// suggested_reply, should_create_opportunity, main_objection, suggested_followup
//
// Cache: se ai_analysis_message_count == nº de mensagens atual, devolve cache.
// Auto-trigger: chamado pelo whatsapp-zapi-webhook após cada mensagem inbound.

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.57.4';
import { corsHeaders } from '../_shared/cors.ts';

const GATEWAY_URL = 'https://ai.gateway.lovable.dev/v1/chat/completions';

function jsonRes(body: Record<string, unknown>, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}

const ANALYSIS_TOOL = {
  type: 'function',
  function: {
    name: 'analyze_conversation',
    description: 'Devolve análise estruturada de uma conversa WhatsApp comercial',
    parameters: {
      type: 'object',
      properties: {
        summary: { type: 'string', description: 'Resumo curto (max 2 frases)' },
        intent: {
          type: 'string',
          enum: ['price_request', 'meeting_request', 'support', 'complaint', 'buying_signal', 'objection', 'unknown'],
        },
        sentiment: { type: 'string', enum: ['positive', 'neutral', 'negative'] },
        urgency: { type: 'string', enum: ['low', 'medium', 'high'] },
        lead_temperature: { type: 'string', enum: ['cold', 'warm', 'hot', 'proposal_ready'] },
        recommended_action: { type: 'string', description: 'Próxima melhor ação para o agente' },
        suggested_reply: { type: 'string', description: 'Resposta sugerida em PT-PT, tom profissional e empático' },
        should_create_opportunity: { type: 'boolean' },
        main_objection: { type: 'string', description: 'Principal objeção detetada (vazio se nenhuma)' },
        suggested_followup: { type: 'string', description: 'Follow-up recomendado (ex: ligar amanhã, enviar proposta)' },
      },
      required: [
        'summary', 'intent', 'sentiment', 'urgency', 'lead_temperature',
        'recommended_action', 'suggested_reply', 'should_create_opportunity',
        'main_objection', 'suggested_followup',
      ],
      additionalProperties: false,
    },
  },
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders });

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const admin = createClient(supabaseUrl, serviceKey, { auth: { persistSession: false } });

    const body = await req.json().catch(() => ({}));
    const conversationId: string | undefined = body?.conversationId;
    const force: boolean = body?.force === true;
    if (!conversationId) return jsonRes({ ok: false, error: 'conversationId required' }, 400);

    // Auth opcional: chamadas internas (service role) saltam check
    const internalCall = req.headers.get('x-internal-call') === '1';
    if (!internalCall) {
      const authHeader = req.headers.get('Authorization');
      if (!authHeader?.startsWith('Bearer ')) return jsonRes({ error: 'Unauthorized' }, 401);
      const userClient = createClient(supabaseUrl, Deno.env.get('SUPABASE_ANON_KEY')!, {
        global: { headers: { Authorization: authHeader } },
      });
      const { data: claims } = await userClient.auth.getClaims(authHeader.replace('Bearer ', ''));
      if (!claims?.claims?.sub) return jsonRes({ error: 'Unauthorized' }, 401);
    }

    const { data: conv } = await admin
      .from('conversations')
      .select('id, workspace_id, channel, ai_analysis_json, ai_analysis_message_count')
      .eq('id', conversationId)
      .maybeSingle();
    if (!conv) return jsonRes({ ok: false, error: 'Conversation not found' }, 404);

    const { count: msgCount } = await admin
      .from('messages')
      .select('id', { count: 'exact', head: true })
      .eq('conversation_id', conversationId);

    const currentCount = msgCount ?? 0;

    // Cache hit
    if (!force && conv.ai_analysis_json && conv.ai_analysis_message_count === currentCount) {
      return jsonRes({ ok: true, cached: true, analysis: conv.ai_analysis_json });
    }

    // Buscar últimas 30 mensagens
    const { data: messages } = await admin
      .from('messages')
      .select('direction, content, sent_at, message_type')
      .eq('conversation_id', conversationId)
      .order('sent_at', { ascending: true })
      .limit(30);

    if (!messages || messages.length === 0) {
      return jsonRes({ ok: false, error: 'No messages to analyze' });
    }

    const transcript = messages
      .map((m) => `[${m.direction === 'inbound' ? 'CLIENTE' : 'AGENTE'}] ${m.content || `(${m.message_type})`}`)
      .join('\n');

    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    if (!LOVABLE_API_KEY) return jsonRes({ ok: false, error: 'AI not configured', fallback: true });

    const aiRes = await fetch(GATEWAY_URL, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-3-flash-preview',
        messages: [
          {
            role: 'system',
            content:
              'És um analista comercial sénior em PT-PT. Analisa conversas WhatsApp entre cliente e agente comercial. ' +
              'Sê conciso, factual e orientado à ação. A resposta sugerida deve ser natural, em PT-PT, máximo 3 frases.',
          },
          { role: 'user', content: `Analisa esta conversa:\n\n${transcript}` },
        ],
        tools: [ANALYSIS_TOOL],
        tool_choice: { type: 'function', function: { name: 'analyze_conversation' } },
      }),
    });

    if (!aiRes.ok) {
      if (aiRes.status === 429) return jsonRes({ ok: false, error: 'Rate limit', code: 'rate_limit', fallback: true });
      if (aiRes.status === 402) return jsonRes({ ok: false, error: 'Sem créditos AI', code: 'no_credits', fallback: true });
      const t = await aiRes.text();
      console.error('[ai-analyze] gateway error', aiRes.status, t);
      return jsonRes({ ok: false, error: 'AI gateway error', fallback: true });
    }

    const aiJson = await aiRes.json();
    const toolCall = aiJson?.choices?.[0]?.message?.tool_calls?.[0];
    if (!toolCall?.function?.arguments) {
      return jsonRes({ ok: false, error: 'No tool call response', fallback: true });
    }

    let analysis: Record<string, unknown>;
    try {
      analysis = JSON.parse(toolCall.function.arguments);
    } catch {
      return jsonRes({ ok: false, error: 'Invalid AI JSON', fallback: true });
    }

    await admin
      .from('conversations')
      .update({
        ai_analysis_json: analysis,
        ai_analysis_at: new Date().toISOString(),
        ai_analysis_message_count: currentCount,
      })
      .eq('id', conversationId);

    return jsonRes({ ok: true, cached: false, analysis });
  } catch (err) {
    console.error('[ai-analyze] error', err);
    return jsonRes({ ok: false, error: (err as Error).message, fallback: true });
  }
});
