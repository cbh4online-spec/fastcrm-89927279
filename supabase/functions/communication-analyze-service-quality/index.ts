// Communication: Analyze Service Quality (Coaching IA)
// Analyses a conversation and returns a quality_score (0-100) with coaching notes.
// Uses Lovable AI Gateway (Gemini) and persists result on conversations.quality_*.

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const FALLBACK = {
  quality_score: 0,
  strengths: [] as string[],
  improvements: [] as string[],
  missed_opportunities: [] as string[],
  suggested_next_step: "",
  coaching_note: "Não foi possível analisar — dados insuficientes ou serviço temporariamente indisponível.",
  fallback: true,
};

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const SUPABASE_ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY")!;
    const SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");

    const userClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      global: { headers: { Authorization: authHeader } },
    });
    const admin = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);

    const { data: claims } = await userClient.auth.getClaims(authHeader.replace("Bearer ", ""));
    if (!claims?.claims?.sub) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const body = await req.json().catch(() => ({}));
    const conversationId = body?.conversation_id;
    if (!conversationId) {
      return new Response(JSON.stringify({ error: "conversation_id required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Load conversation + recent messages (best-effort)
    const { data: conv } = await admin
      .from("conversations")
      .select("*")
      .eq("id", conversationId)
      .maybeSingle();

    if (!conv) {
      return new Response(JSON.stringify({ ...FALLBACK, error: "conversation_not_found" }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Load last 30 messages from any messages table available
    let messages: any[] = [];
    for (const tbl of ["whatsapp_messages", "messages", "conversation_messages"]) {
      const { data, error } = await admin
        .from(tbl)
        .select("direction, body, content, text, created_at, sender_type, message_type")
        .eq("conversation_id", conversationId)
        .order("created_at", { ascending: true })
        .limit(30);
      if (!error && data && data.length) {
        messages = data;
        break;
      }
    }

    // ---- Heuristic baseline score (always works, even without LLM) ----
    let baseline = 0;
    const factors: Record<string, number> = {};

    // First response within 15 min
    if (conv.first_response_at && conv.created_at) {
      const diffMin = (new Date(conv.first_response_at).getTime() - new Date(conv.created_at).getTime()) / 60000;
      if (diffMin <= 15) { baseline += 20; factors.first_response_in_sla = 20; }
      else if (diffMin <= 60) { baseline += 10; factors.first_response_in_sla = 10; }
    }
    // Resolved within SLA
    if (conv.resolved_at) {
      baseline += 20;
      factors.resolved = 20;
    }
    // No negative sentiment
    if (conv.ai_sentiment && !["negative", "very_negative", "negativo"].includes(String(conv.ai_sentiment).toLowerCase())) {
      baseline += 20;
      factors.sentiment_ok = 20;
    }
    // Has assigned agent
    if (conv.assigned_to) {
      baseline += 10;
      factors.has_owner = 10;
    }
    // SLA not breached
    if (conv.sla_deadline && new Date(conv.sla_deadline) > new Date()) {
      baseline += 10;
      factors.sla_within_deadline = 10;
    }

    let result: any = {
      quality_score: Math.min(100, baseline),
      strengths: [] as string[],
      improvements: [] as string[],
      missed_opportunities: [] as string[],
      suggested_next_step: "",
      coaching_note: "",
      heuristic_factors: factors,
    };

    // ---- LLM enrichment (best-effort, never blocks) ----
    if (LOVABLE_API_KEY && messages.length > 0) {
      try {
        const transcript = messages
          .map((m) => {
            const dir = m.direction === "outbound" ? "AGENTE" : "CLIENTE";
            const text = m.body || m.content || m.text || "";
            return `${dir}: ${String(text).slice(0, 500)}`;
          })
          .join("\n");

        const aiResp = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
          method: "POST",
          headers: {
            Authorization: `Bearer ${LOVABLE_API_KEY}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            model: "google/gemini-3-flash-preview",
            messages: [
              {
                role: "system",
                content:
                  "És um coach experiente de atendimento ao cliente. Avalia esta conversa e devolve análise objetiva, profissional e construtiva, sem linguagem punitiva ou infantil.",
              },
              {
                role: "user",
                content: `Analisa esta conversa de WhatsApp:\n\n${transcript}\n\nDevolve via tool call.`,
              },
            ],
            tools: [
              {
                type: "function",
                function: {
                  name: "report_quality",
                  description: "Reporta avaliação de qualidade",
                  parameters: {
                    type: "object",
                    properties: {
                      strengths: { type: "array", items: { type: "string" } },
                      improvements: { type: "array", items: { type: "string" } },
                      missed_opportunities: { type: "array", items: { type: "string" } },
                      suggested_next_step: { type: "string" },
                      coaching_note: { type: "string" },
                    },
                    required: [
                      "strengths",
                      "improvements",
                      "missed_opportunities",
                      "suggested_next_step",
                      "coaching_note",
                    ],
                    additionalProperties: false,
                  },
                },
              },
            ],
            tool_choice: { type: "function", function: { name: "report_quality" } },
          }),
        });

        if (aiResp.ok) {
          const ai = await aiResp.json();
          const args = ai?.choices?.[0]?.message?.tool_calls?.[0]?.function?.arguments;
          if (args) {
            const parsed = typeof args === "string" ? JSON.parse(args) : args;
            result = { ...result, ...parsed };
          }
        } else if (aiResp.status === 429) {
          result.coaching_note = "Limite de requisições atingido. Tente novamente em alguns minutos.";
        } else if (aiResp.status === 402) {
          result.coaching_note = "Créditos AI esgotados — adicione créditos em Definições > Workspace > Uso.";
        }
      } catch (err) {
        console.error("AI analysis failed:", err);
      }
    }

    // Persist on conversation
    await admin
      .from("conversations")
      .update({
        quality_score: result.quality_score,
        quality_analysis: result,
        quality_analyzed_at: new Date().toISOString(),
      })
      .eq("id", conversationId);

    // Emit event (best-effort)
    try {
      await admin.from("whatsapp_communication_events").insert({
        workspace_id: conv.workspace_id,
        event_type: "communication.quality.analyzed",
        entity_type: "conversation",
        entity_id: conversationId,
        payload: { quality_score: result.quality_score },
      });
    } catch (_e) {
      // ignore
    }

    return new Response(JSON.stringify(result), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("communication-analyze-service-quality error:", err);
    return new Response(JSON.stringify(FALLBACK), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
