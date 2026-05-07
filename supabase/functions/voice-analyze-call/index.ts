// Fase 1Q.2 — Voice Intelligence Analyzer
// Lê transcription_text + compliance keywords e gera resumo, sentimento, tópicos, objeções,
// keywords detetadas, próximas ações, score de qualidade e flags de compliance.

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { corsHeaders } from "../_shared/cors.ts";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");

const ANALYZE_MODEL = "google/gemini-2.5-flash";

async function analyzeWithAI(args: {
  transcript: string;
  forbidden: string[];
  required: string[];
  consent: string[];
}) {
  const systemPrompt = `És um analista de chamadas de vendas/suporte em português de Portugal.
Analisa a transcrição abaixo e devolve EXCLUSIVAMENTE através da function call "return_call_analysis".
- Resumo curto (máx 3 frases)
- Sentimento global: positive | neutral | negative
- Tópicos principais (até 5), objeções do cliente (até 5), keywords (até 8)
- Próximas ações concretas (até 5)
- Score de qualidade 0-100 com breakdown: tone, active_listening, clarity, objection_handling, closing
- Compliance: detetar se o agente referiu consentimento de gravação; listar palavras proibidas e exigidas detetadas

Listas de referência da workspace:
- consent_phrases: ${JSON.stringify(args.consent)}
- forbidden_phrases: ${JSON.stringify(args.forbidden)}
- required_phrases: ${JSON.stringify(args.required)}`;

  const body = {
    model: ANALYZE_MODEL,
    messages: [
      { role: "system", content: systemPrompt },
      { role: "user", content: args.transcript.slice(0, 24000) },
    ],
    tools: [
      {
        type: "function",
        function: {
          name: "return_call_analysis",
          description: "Devolve análise estruturada da chamada",
          parameters: {
            type: "object",
            properties: {
              summary: { type: "string" },
              sentiment: { type: "string", enum: ["positive", "neutral", "negative"] },
              intent: { type: "string" },
              topics: { type: "array", items: { type: "string" } },
              objections: { type: "array", items: { type: "string" } },
              keywords: { type: "array", items: { type: "string" } },
              next_actions: {
                type: "array",
                items: {
                  type: "object",
                  properties: {
                    action: { type: "string" },
                    priority: { type: "string", enum: ["low", "medium", "high"] },
                    due_in_days: { type: "number" },
                  },
                  required: ["action"],
                },
              },
              quality_score: { type: "number" },
              quality_breakdown: {
                type: "object",
                properties: {
                  tone: { type: "number" },
                  active_listening: { type: "number" },
                  clarity: { type: "number" },
                  objection_handling: { type: "number" },
                  closing: { type: "number" },
                },
              },
              compliance: {
                type: "object",
                properties: {
                  consent_detected: { type: "boolean" },
                  forbidden_hits: { type: "array", items: { type: "string" } },
                  required_missing: { type: "array", items: { type: "string" } },
                  review_required: { type: "boolean" },
                },
                required: ["consent_detected", "forbidden_hits", "required_missing", "review_required"],
              },
            },
            required: ["summary", "sentiment", "topics", "objections", "keywords", "next_actions", "quality_score", "compliance"],
          },
        },
      },
    ],
    tool_choice: { type: "function", function: { name: "return_call_analysis" } },
  };

  const res = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${LOVABLE_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const txt = await res.text();
    throw new Error(`ai_gateway_${res.status}: ${txt.slice(0, 300)}`);
  }
  const data = await res.json();
  const toolCall = data.choices?.[0]?.message?.tool_calls?.[0];
  if (!toolCall) throw new Error("ai_no_tool_call");
  return JSON.parse(toolCall.function.arguments);
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

  try {
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY_missing");
    const { call_log_id } = await req.json();
    if (!call_log_id) throw new Error("call_log_id_required");

    const { data: call, error: callErr } = await supabase
      .from("voice_call_logs")
      .select("id, workspace_id, transcription_text")
      .eq("id", call_log_id)
      .maybeSingle();

    if (callErr || !call) throw new Error("call_not_found");
    if (!call.transcription_text || call.transcription_text.length < 20) {
      throw new Error("transcript_too_short");
    }

    const { data: kws } = await supabase
      .from("voice_compliance_keywords")
      .select("kind, phrase")
      .eq("workspace_id", call.workspace_id)
      .eq("active", true);

    const forbidden = (kws || []).filter((k: any) => k.kind === "forbidden").map((k: any) => k.phrase);
    const required = (kws || []).filter((k: any) => k.kind === "required").map((k: any) => k.phrase);
    const consent = (kws || []).filter((k: any) => k.kind === "consent").map((k: any) => k.phrase);

    const analysis = await analyzeWithAI({
      transcript: call.transcription_text,
      forbidden,
      required,
      consent,
    });

    const compliance = analysis.compliance || {};
    const reviewRequired = !!compliance.review_required
      || (Array.isArray(compliance.forbidden_hits) && compliance.forbidden_hits.length > 0)
      || (consent.length > 0 && compliance.consent_detected === false);

    await supabase
      .from("voice_call_logs")
      .update({
        ai_summary: analysis.summary,
        ai_sentiment: analysis.sentiment,
        ai_intent: analysis.intent ?? null,
        ai_next_action: Array.isArray(analysis.next_actions) && analysis.next_actions[0]
          ? (typeof analysis.next_actions[0] === "string"
              ? analysis.next_actions[0]
              : analysis.next_actions[0].action)
          : null,
        topics: analysis.topics ?? [],
        objections: analysis.objections ?? [],
        keywords: analysis.keywords ?? [],
        next_actions: analysis.next_actions ?? [],
        quality_score: typeof analysis.quality_score === "number"
          ? Math.max(0, Math.min(100, Math.round(analysis.quality_score)))
          : null,
        quality_breakdown: analysis.quality_breakdown ?? {},
        compliance_consent_detected: compliance.consent_detected ?? null,
        compliance_forbidden_hits: compliance.forbidden_hits ?? [],
        compliance_required_missing: compliance.required_missing ?? [],
        compliance_review_required: reviewRequired,
        intelligence_model: ANALYZE_MODEL,
        intelligence_completed_at: new Date().toISOString(),
        intelligence_error: null,
      })
      .eq("id", call_log_id);

    return new Response(
      JSON.stringify({ success: true, quality_score: analysis.quality_score, review_required: reviewRequired }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (err) {
    const msg = err instanceof Error ? err.message : "unknown";
    console.error("voice-analyze-call error:", msg);
    try {
      const body = await req.clone().json().catch(() => ({}));
      if (body?.call_log_id) {
        await supabase
          .from("voice_call_logs")
          .update({ intelligence_error: msg })
          .eq("id", body.call_log_id);
      }
    } catch (_) { /* ignore */ }
    return new Response(
      JSON.stringify({ success: false, fallback: true, error: msg }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});
