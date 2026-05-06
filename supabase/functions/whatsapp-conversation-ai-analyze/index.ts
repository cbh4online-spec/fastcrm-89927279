// whatsapp-conversation-ai-analyze
// Fase 1E — Inbox Intelligence:
// Analisa uma conversa WhatsApp via Lovable AI Gateway e devolve insight rico:
// summary, intent, sentiment, urgency, conversation_stage, objections[],
// suggested_reply, suggested_next_action, suggested_products[], suggested_task,
// suggested_ticket, suggested_deal, suggested_tags[], confidence.
//
// Persistência:
//  - whatsapp_conversation_insights (uma linha por conversa, upsert)
//  - whatsapp_conversation_insight_runs (histórico)
//  - conversations.ai_analysis_json (cache legacy + retrocompatibilidade)
//
// Cache: se ai_analysis_message_count == nº de mensagens atual e !force, devolve cache.

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
  type: 'function' as const,
  function: {
    name: 'analyze_conversation',
    description:
      'Devolve análise estruturada de uma conversa WhatsApp comercial em PT-PT, com sugestões prontas para CRM.',
    parameters: {
      type: 'object',
      properties: {
        summary: { type: 'string', description: 'Resumo objectivo da conversa, máx. 3 frases.' },

        intent: {
          type: 'string',
          enum: [
            'sales_interest',
            'product_question',
            'price_question',
            'support_request',
            'complaint',
            'appointment_request',
            'follow_up_needed',
            'payment_question',
            'delivery_question',
            'cancellation_risk',
            'reactivation',
            'partnership',
            'spam',
            'other',
          ],
        },

        sentiment: { type: 'string', enum: ['positive', 'neutral', 'negative', 'urgent'] },
        urgency: { type: 'string', enum: ['low', 'medium', 'high', 'critical'] },

        conversation_stage: {
          type: 'string',
          enum: [
            'new_lead',
            'qualification',
            'proposal',
            'negotiation',
            'support',
            'post_sale',
            'inactive',
            'resolved',
          ],
        },

        objections: {
          type: 'array',
          description: 'Objecções detetadas no cliente. Lista vazia se nenhuma.',
          items: {
            type: 'object',
            properties: {
              objection_type: {
                type: 'string',
                enum: [
                  'price',
                  'trust',
                  'timing',
                  'need',
                  'comparison',
                  'authority',
                  'complexity',
                  'risk',
                  'other',
                ],
              },
              description: { type: 'string' },
              suggested_response: { type: 'string', description: 'Resposta empática em PT-PT.' },
            },
            required: ['objection_type', 'description', 'suggested_response'],
            additionalProperties: false,
          },
        },

        suggested_reply: {
          type: 'string',
          description:
            'Resposta sugerida em PT-PT, profissional e empática, máx. 4 frases, sem inventar dados.',
        },
        suggested_next_action: {
          type: 'string',
          description: 'Próxima melhor acção concreta para o operador.',
        },

        suggested_products: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              product_name: { type: 'string' },
              reason: { type: 'string' },
              confidence: { type: 'number', minimum: 0, maximum: 1 },
            },
            required: ['product_name', 'reason', 'confidence'],
            additionalProperties: false,
          },
        },

        suggested_task: {
          type: 'object',
          properties: {
            title: { type: 'string' },
            description: { type: 'string' },
            priority: { type: 'string', enum: ['low', 'medium', 'high'] },
          },
          required: ['title', 'description', 'priority'],
          additionalProperties: false,
        },

        suggested_ticket: {
          type: 'object',
          properties: {
            title: { type: 'string' },
            description: { type: 'string' },
            priority: { type: 'string', enum: ['low', 'medium', 'high'] },
          },
          required: ['title', 'description', 'priority'],
          additionalProperties: false,
        },

        suggested_deal: {
          type: 'object',
          properties: {
            title: { type: 'string' },
            stage: { type: 'string' },
            value_estimate: { type: 'number', nullable: true },
            reason: { type: 'string' },
          },
          required: ['title', 'stage', 'reason'],
          additionalProperties: false,
        },

        suggested_tags: {
          type: 'array',
          items: {
            type: 'string',
            enum: [
              'quente',
              'urgente',
              'suporte',
              'proposta',
              'preco',
              'produto',
              'reclamacao',
              'follow_up',
              'agendamento',
              'reativacao',
            ],
          },
        },

        confidence: {
          type: 'number',
          minimum: 0,
          maximum: 1,
          description: 'Confiança global da análise (0–1).',
        },
      },
      required: [
        'summary',
        'intent',
        'sentiment',
        'urgency',
        'conversation_stage',
        'objections',
        'suggested_reply',
        'suggested_next_action',
        'suggested_products',
        'suggested_tags',
        'confidence',
      ],
      additionalProperties: false,
    },
  },
};

async function logRun(
  admin: any,
  workspaceId: string,
  conversationId: string,
  triggerType: string,
  inputCount: number,
  output: unknown,
  success: boolean,
  durationMs: number,
  error: string | null,
  triggeredBy: string | null,
) {
  try {
    await admin.from('whatsapp_conversation_insight_runs').insert({
      workspace_id: workspaceId,
      conversation_id: conversationId,
      triggered_by: triggeredBy,
      trigger_type: triggerType,
      input_message_count: inputCount,
      output: output as any,
      success,
      duration_ms: durationMs,
      error,
    });
  } catch (e) {
    console.error('[ai-analyze] failed to insert run log', e);
  }
}

async function logAiProcessing(
  admin: any,
  workspaceId: string,
  conversationId: string,
  operation: string,
  request: unknown,
  response: unknown,
  success: boolean,
  durationMs: number,
  error: string | null,
) {
  try {
    await admin.from('ai_processing_logs').insert({
      workspace_id: workspaceId,
      source_type: 'whatsapp_conversation',
      source_id: conversationId,
      provider: 'lovable_ai_gateway',
      operation,
      request_payload: request as any,
      response_payload: response as any,
      success,
      error,
      duration_ms: durationMs,
    });
  } catch (e) {
    // tabela pode não existir ainda em todos os ambientes — fallback silencioso
    console.warn('[ai-analyze] ai_processing_logs insert skipped', (e as Error).message);
  }
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders });

  const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
  const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
  const admin = createClient(supabaseUrl, serviceKey, { auth: { persistSession: false } });

  let conversationId: string | undefined;
  let workspaceIdForLog: string | null = null;
  let triggerType = 'manual';
  let triggeredBy: string | null = null;
  const startedAt = Date.now();

  try {
    const body = await req.json().catch(() => ({}));
    conversationId = body?.conversationId || body?.conversation_id;
    const force: boolean = body?.force === true || body?.force_refresh === true;
    triggerType = body?.trigger_type || 'manual';
    if (!conversationId) return jsonRes({ ok: false, error: 'conversationId required' }, 400);

    const internalCall = req.headers.get('x-internal-call') === '1';
    if (!internalCall) {
      const authHeader = req.headers.get('Authorization');
      if (!authHeader?.startsWith('Bearer ')) return jsonRes({ error: 'Unauthorized' }, 401);
      const userClient = createClient(supabaseUrl, Deno.env.get('SUPABASE_ANON_KEY')!, {
        global: { headers: { Authorization: authHeader } },
      });
      const { data: claims } = await userClient.auth.getClaims(authHeader.replace('Bearer ', ''));
      if (!claims?.claims?.sub) return jsonRes({ error: 'Unauthorized' }, 401);
      triggeredBy = claims.claims.sub as string;
    }

    const { data: conv } = await admin
      .from('conversations')
      .select(
        'id, workspace_id, channel, contact_id, lead_id, ai_analysis_json, ai_analysis_message_count',
      )
      .eq('id', conversationId)
      .maybeSingle();
    if (!conv) return jsonRes({ ok: false, error: 'Conversation not found' }, 404);
    workspaceIdForLog = conv.workspace_id;

    const { count: msgCount } = await admin
      .from('messages')
      .select('id', { count: 'exact', head: true })
      .eq('conversation_id', conversationId);
    const currentCount = msgCount ?? 0;

    // Cache hit (mantém comportamento legacy)
    if (!force && conv.ai_analysis_json && conv.ai_analysis_message_count === currentCount) {
      const { data: existingInsight } = await admin
        .from('whatsapp_conversation_insights')
        .select('*')
        .eq('conversation_id', conversationId)
        .maybeSingle();
      return jsonRes({
        ok: true,
        cached: true,
        analysis: conv.ai_analysis_json,
        insight: existingInsight,
      });
    }

    // Buscar últimas 30 mensagens, incluindo transcrições de áudio
    const { data: messages } = await admin
      .from('messages')
      .select('id, direction, content, sent_at, message_type, metadata')
      .eq('conversation_id', conversationId)
      .order('sent_at', { ascending: true })
      .limit(30);

    if (!messages || messages.length === 0) {
      await logRun(
        admin,
        conv.workspace_id,
        conversationId,
        triggerType,
        0,
        null,
        false,
        Date.now() - startedAt,
        'No messages',
        triggeredBy,
      );
      return jsonRes({ ok: false, error: 'No messages to analyze' });
    }

    // Tentar enriquecer com transcrições da Fase 1D
    const audioMsgIds = messages
      .filter((m: any) => m.message_type === 'audio')
      .map((m: any) => m.id);
    let transcriptionsByMsg: Record<string, string> = {};
    if (audioMsgIds.length) {
      const { data: insights } = await admin
        .from('whatsapp_audio_insights')
        .select('message_id, transcription_text')
        .in('message_id', audioMsgIds);
      transcriptionsByMsg = (insights || []).reduce((acc: any, r: any) => {
        if (r.transcription_text) acc[r.message_id] = r.transcription_text;
        return acc;
      }, {});
    }

    const transcript = messages
      .map((m: any) => {
        const who = m.direction === 'inbound' ? 'CLIENTE' : 'AGENTE';
        if (m.message_type === 'audio') {
          const t = transcriptionsByMsg[m.id];
          return `[${who}] (áudio) ${t ? '«' + t + '»' : '(sem transcrição)'}`;
        }
        if (m.message_type === 'product') {
          const name = m?.metadata?.product?.name || m?.metadata?.product_name || 'produto';
          return `[${who}] (partilhou produto: ${name})`;
        }
        return `[${who}] ${m.content || `(${m.message_type})`}`;
      })
      .join('\n');

    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    if (!LOVABLE_API_KEY) {
      await logRun(
        admin,
        conv.workspace_id,
        conversationId,
        triggerType,
        messages.length,
        null,
        false,
        Date.now() - startedAt,
        'AI not configured',
        triggeredBy,
      );
      return jsonRes({ ok: false, error: 'AI not configured', fallback: true });
    }

    const aiStartedAt = Date.now();
    const requestBody = {
      model: 'google/gemini-3-flash-preview',
      messages: [
        {
          role: 'system',
          content:
            'És um analista comercial sénior de CRM em PT-PT. Analisa conversas WhatsApp de forma objectiva. ' +
            'Não inventes dados. Se não houver contexto suficiente, baixa a confiança. ' +
            'Tom profissional, claro e respeitoso. Não prometas resultados. ' +
            'A resposta sugerida deve ser natural, em PT-PT, máximo 4 frases.',
        },
        { role: 'user', content: `Analisa esta conversa WhatsApp:\n\n${transcript}` },
      ],
      tools: [ANALYSIS_TOOL],
      tool_choice: { type: 'function', function: { name: 'analyze_conversation' } },
    };

    const aiRes = await fetch(GATEWAY_URL, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(requestBody),
    });

    if (!aiRes.ok) {
      const aiDuration = Date.now() - aiStartedAt;
      const text = await aiRes.text();
      await logAiProcessing(
        admin,
        conv.workspace_id,
        conversationId,
        'conversation_analysis',
        requestBody,
        { status: aiRes.status, body: text },
        false,
        aiDuration,
        `gateway_${aiRes.status}`,
      );
      await logRun(
        admin,
        conv.workspace_id,
        conversationId,
        triggerType,
        messages.length,
        null,
        false,
        Date.now() - startedAt,
        `gateway_${aiRes.status}`,
        triggeredBy,
      );
      if (aiRes.status === 429)
        return jsonRes({ ok: false, error: 'Rate limit', code: 'rate_limit', fallback: true });
      if (aiRes.status === 402)
        return jsonRes({ ok: false, error: 'Sem créditos AI', code: 'no_credits', fallback: true });
      console.error('[ai-analyze] gateway error', aiRes.status, text);
      return jsonRes({ ok: false, error: 'AI gateway error', fallback: true });
    }

    const aiJson = await aiRes.json();
    const aiDuration = Date.now() - aiStartedAt;
    const toolCall = aiJson?.choices?.[0]?.message?.tool_calls?.[0];

    if (!toolCall?.function?.arguments) {
      await logAiProcessing(
        admin,
        conv.workspace_id,
        conversationId,
        'conversation_analysis',
        requestBody,
        aiJson,
        false,
        aiDuration,
        'no_tool_call',
      );
      await logRun(
        admin,
        conv.workspace_id,
        conversationId,
        triggerType,
        messages.length,
        null,
        false,
        Date.now() - startedAt,
        'no_tool_call',
        triggeredBy,
      );
      return jsonRes({ ok: false, error: 'No tool call response', fallback: true });
    }

    let analysis: Record<string, any>;
    try {
      analysis = JSON.parse(toolCall.function.arguments);
    } catch {
      await logAiProcessing(
        admin,
        conv.workspace_id,
        conversationId,
        'conversation_analysis',
        requestBody,
        aiJson,
        false,
        aiDuration,
        'invalid_json',
      );
      return jsonRes({ ok: false, error: 'Invalid AI JSON', fallback: true });
    }

    await logAiProcessing(
      admin,
      conv.workspace_id,
      conversationId,
      'conversation_analysis',
      requestBody,
      aiJson,
      true,
      aiDuration,
      null,
    );

    const lastMessage = messages[messages.length - 1] as any;
    const analyzedAt = new Date().toISOString();

    // Upsert insight (uma linha por conversation_id)
    await admin.from('whatsapp_conversation_insights').upsert(
      {
        workspace_id: conv.workspace_id,
        conversation_id: conversationId,
        contact_id: conv.contact_id ?? null,
        lead_id: conv.lead_id ?? null,
        summary: analysis.summary ?? null,
        intent: analysis.intent ?? null,
        sentiment: analysis.sentiment ?? null,
        urgency: analysis.urgency ?? null,
        conversation_stage: analysis.conversation_stage ?? null,
        objections: analysis.objections ?? [],
        suggested_reply: analysis.suggested_reply ?? null,
        suggested_next_action: analysis.suggested_next_action ?? null,
        suggested_products: analysis.suggested_products ?? [],
        suggested_task: analysis.suggested_task ?? null,
        suggested_ticket: analysis.suggested_ticket ?? null,
        suggested_deal: analysis.suggested_deal ?? null,
        suggested_tags: analysis.suggested_tags ?? [],
        confidence: typeof analysis.confidence === 'number' ? analysis.confidence : null,
        analyzed_message_count: currentCount,
        last_message_id: lastMessage?.id ?? null,
        raw_ai_response: analysis,
        analyzed_at: analyzedAt,
      },
      { onConflict: 'conversation_id' },
    );

    // Cache legacy
    await admin
      .from('conversations')
      .update({
        ai_analysis_json: analysis,
        ai_analysis_at: analyzedAt,
        ai_analysis_message_count: currentCount,
      })
      .eq('id', conversationId);

    await logRun(
      admin,
      conv.workspace_id,
      conversationId,
      triggerType,
      messages.length,
      analysis,
      true,
      Date.now() - startedAt,
      null,
      triggeredBy,
    );

    return jsonRes({ ok: true, cached: false, analysis });
  } catch (err) {
    console.error('[ai-analyze] error', err);
    if (workspaceIdForLog && conversationId) {
      await logRun(
        admin,
        workspaceIdForLog,
        conversationId,
        triggerType,
        0,
        null,
        false,
        Date.now() - startedAt,
        (err as Error).message,
        triggeredBy,
      );
    }
    return jsonRes({ ok: false, error: (err as Error).message, fallback: true });
  }
});
