import { createClient } from "@supabase/supabase-js";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

interface Body {
  message_id: string;
  transcription_text?: string;
}

const ANALYSIS_TOOL = {
  type: "function",
  function: {
    name: "audio_intelligence",
    description: "Estrutura a análise da transcrição de áudio WhatsApp.",
    parameters: {
      type: "object",
      properties: {
        summary: { type: "string" },
        intent: {
          type: "string",
          enum: ["sales_interest", "support_request", "complaint", "appointment", "price_question", "product_question", "follow_up", "other"],
        },
        sentiment: { type: "string", enum: ["positive", "neutral", "negative", "urgent"] },
        urgency: { type: "string", enum: ["low", "medium", "high"] },
        next_action: { type: "string" },
        suggested_reply: { type: "string" },
        suggested_task_title: { type: "string" },
        suggested_task_description: { type: "string" },
        suggested_ticket_title: { type: "string" },
        suggested_ticket_priority: { type: "string", enum: ["low", "medium", "high"] },
        suggested_deal_action: { type: "string" },
        confidence: { type: "number" },
      },
      required: ["summary", "intent", "sentiment", "urgency", "next_action", "suggested_reply", "confidence"],
      additionalProperties: false,
    },
  },
};

const SYSTEM_PROMPT = `Analisa transcrições de mensagens de voz recebidas via WhatsApp num contexto de CRM, vendas, suporte e atendimento. Responde sempre em português de Portugal, com tom profissional e tratamento na terceira pessoa quando possível ("a sua empresa", "o seu pedido"). Não inventes dados. Se a transcrição for muito curta ou ambígua, marca confidence baixo (<0.4) e propõe próxima ação cautelosa. Não faças promessas comerciais nem diagnósticos clínicos. Devolve apenas via tool call.`;

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  const startedAt = Date.now();

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) return jsonResp({ error: "missing_authorization" }, 401);

    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const SUPABASE_ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY")!;
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");

    const userClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: { user }, error: authErr } = await userClient.auth.getUser(
      authHeader.replace("Bearer ", ""),
    );
    if (authErr || !user) return jsonResp({ error: "invalid_auth" }, 401);

    const body = (await req.json()) as Body;
    if (!body.message_id) return jsonResp({ error: "message_id_required" }, 400);

    const admin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    const { data: insight, error: insErr } = await admin
      .from("whatsapp_audio_insights")
      .select("*")
      .eq("message_id", body.message_id)
      .maybeSingle();
    if (insErr || !insight) return jsonResp({ error: "insight_not_found" }, 404);

    const workspaceId = insight.workspace_id as string;
    const { data: membership } = await userClient
      .from("workspace_members")
      .select("id")
      .eq("workspace_id", workspaceId)
      .eq("user_id", user.id)
      .maybeSingle();
    if (!membership) return jsonResp({ error: "access_denied" }, 403);

    const transcript = body.transcription_text || (insight.transcription_text as string | null);
    if (!transcript || transcript.trim().length < 2) {
      return jsonResp({ error: "no_transcription_available" }, 400);
    }

    if (!LOVABLE_API_KEY) return jsonResp({ error: "lovable_ai_not_configured" }, 500);

    await emitEvent(admin, workspaceId, insight.conversation_id, "whatsapp.audio.ai_analysis.started", {
      message_id: body.message_id, insight_id: insight.id,
    });

    const aiResp = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          { role: "system", content: SYSTEM_PROMPT },
          { role: "user", content: `Transcrição:\n"""\n${transcript}\n"""` },
        ],
        tools: [ANALYSIS_TOOL],
        tool_choice: { type: "function", function: { name: "audio_intelligence" } },
      }),
    });

    if (!aiResp.ok) {
      const txt = await aiResp.text();
      const code = aiResp.status === 429 ? "rate_limited" : aiResp.status === 402 ? "payment_required" : "ai_error";
      await logProcessing(admin, workspaceId, body.message_id, "lovable-ai", "analysis", { transcript_length: transcript.length }, { status: aiResp.status, body: txt.slice(0, 500) }, false, txt.slice(0, 500), Date.now() - startedAt);
      return jsonResp({ error: code, details: txt.slice(0, 200) }, aiResp.status);
    }

    const aiJson = await aiResp.json();
    const toolCall = aiJson.choices?.[0]?.message?.tool_calls?.[0];
    if (!toolCall?.function?.arguments) {
      await logProcessing(admin, workspaceId, body.message_id, "lovable-ai", "analysis", { transcript_length: transcript.length }, aiJson, false, "no_tool_call", Date.now() - startedAt);
      return jsonResp({ error: "no_structured_output" }, 500);
    }

    let parsed: Record<string, unknown>;
    try {
      parsed = JSON.parse(toolCall.function.arguments);
    } catch {
      return jsonResp({ error: "invalid_ai_json" }, 500);
    }

    const nowIso = new Date().toISOString();
    await admin.from("whatsapp_audio_insights").update({
      summary: parsed.summary ?? null,
      intent: parsed.intent ?? null,
      sentiment: parsed.sentiment ?? null,
      urgency: parsed.urgency ?? null,
      next_action: parsed.next_action ?? null,
      suggested_reply: parsed.suggested_reply ?? null,
      suggested_task_title: parsed.suggested_task_title ?? null,
      suggested_task_description: parsed.suggested_task_description ?? null,
      suggested_ticket_title: parsed.suggested_ticket_title ?? null,
      suggested_ticket_priority: parsed.suggested_ticket_priority ?? null,
      suggested_deal_action: parsed.suggested_deal_action ?? null,
      confidence: parsed.confidence ?? null,
      raw_ai_response: parsed,
      ai_analysis_completed_at: nowIso,
      provider_model: "google/gemini-2.5-flash",
      completed_at: nowIso,
    }).eq("id", insight.id);

    await logProcessing(admin, workspaceId, body.message_id, "lovable-ai", "analysis", { transcript_length: transcript.length }, parsed, true, null, Date.now() - startedAt);
    await emitEvent(admin, workspaceId, insight.conversation_id, "whatsapp.audio.ai_analyzed", {
      message_id: body.message_id, insight_id: insight.id, intent: parsed.intent, urgency: parsed.urgency,
    });

    return jsonResp({ ok: true, insight_id: insight.id, analysis: parsed });
  } catch (e) {
    console.error("[whatsapp-analyze-audio-transcript] error", e);
    return jsonResp({ error: e instanceof Error ? e.message : "unknown_error" }, 500);
  }
});

function jsonResp(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

async function emitEvent(admin: ReturnType<typeof createClient>, workspaceId: string, conversationId: string | null, eventType: string, payload: Record<string, unknown>) {
  try {
    await admin.from("whatsapp_communication_events").insert({
      workspace_id: workspaceId,
      event_type: eventType,
      entity_type: "message",
      entity_id: payload.message_id ?? null,
      conversation_id: conversationId,
      payload,
    });
  } catch (e) {
    console.error("[emitEvent] error", e);
  }
}

async function logProcessing(
  admin: ReturnType<typeof createClient>,
  workspaceId: string,
  sourceId: string,
  provider: string,
  operation: string,
  request: unknown,
  response: unknown,
  success: boolean,
  error: string | null,
  durationMs: number,
) {
  try {
    await admin.from("ai_processing_logs").insert({
      workspace_id: workspaceId,
      source_type: "whatsapp_audio",
      source_id: sourceId,
      provider,
      operation,
      request_payload: request as never,
      response_payload: response as never,
      success,
      error,
      duration_ms: durationMs,
    });
  } catch (e) {
    console.error("[logProcessing] error", e);
  }
}
