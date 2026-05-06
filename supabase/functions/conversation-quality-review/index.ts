// Fase 1I — Conversation Quality & Coaching AI
// Analisa qualidade de uma conversa ou ticket e guarda em conversation_quality_reviews.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_ROLE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");

interface ReqBody {
  workspace_id: string;
  conversation_id?: string | null;
  ticket_id?: string | null;
  review_type?: "conversation" | "ticket" | "agent_reply";
  agent_id?: string | null;
  force_refresh?: boolean;
}

function ok(payload: unknown, status = 200) {
  return new Response(JSON.stringify(payload), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

function clamp(n: unknown): number | null {
  const v = typeof n === "number" ? n : Number(n);
  if (!Number.isFinite(v)) return null;
  return Math.max(0, Math.min(100, Math.round(v)));
}

const SYSTEM_PROMPT = `És um analista sénior de qualidade de atendimento e vendas.
Analisa conversas no contexto de CRM, vendas, suporte e atendimento profissional.
Avalia clareza, empatia, profissionalismo, resolução, oportunidade comercial,
tratamento de objeções, follow-up, próximo passo e riscos.

REGRAS:
- Responde em português de Portugal.
- Tom objetivo, construtivo, profissional. NUNCA punitivo.
- Não inventes dados. Se contexto for insuficiente, baixa confidence.
- Não faças diagnósticos clínicos nem afirmes incumprimentos legais.
- Identifica riscos apenas como "sinais de atenção".
- Devolve APENAS JSON válido, sem markdown.`;

const TOOL = {
  type: "function",
  function: {
    name: "submit_quality_review",
    description: "Submete análise estruturada de qualidade da conversa.",
    parameters: {
      type: "object",
      properties: {
        overall_score: { type: "number", minimum: 0, maximum: 100 },
        subscores: {
          type: "object",
          properties: {
            clarity_score: { type: "number" },
            empathy_score: { type: "number" },
            commercial_score: { type: "number" },
            resolution_score: { type: "number" },
            followup_score: { type: "number" },
            objection_handling_score: { type: "number" },
            professionalism_score: { type: "number" },
            speed_context_score: { type: "number" },
            compliance_risk_score: { type: "number" },
          },
          required: [
            "clarity_score","empathy_score","commercial_score","resolution_score",
            "followup_score","objection_handling_score","professionalism_score",
            "speed_context_score","compliance_risk_score",
          ],
        },
        strengths: {
          type: "array",
          items: {
            type: "object",
            properties: { title: { type: "string" }, description: { type: "string" } },
            required: ["title","description"],
          },
        },
        improvement_points: {
          type: "array",
          items: {
            type: "object",
            properties: {
              title: { type: "string" },
              description: { type: "string" },
              suggestion: { type: "string" },
            },
            required: ["title","description","suggestion"],
          },
        },
        missed_opportunities: {
          type: "array",
          items: {
            type: "object",
            properties: {
              type: { type: "string" },
              description: { type: "string" },
              recommended_action: { type: "string" },
            },
            required: ["type","description","recommended_action"],
          },
        },
        objections_detected: {
          type: "array",
          items: {
            type: "object",
            properties: {
              objection_type: { type: "string" },
              customer_signal: { type: "string" },
              was_handled: { type: "boolean" },
              better_response: { type: "string" },
            },
            required: ["objection_type","customer_signal","was_handled","better_response"],
          },
        },
        recommended_next_action: { type: "string" },
        improved_reply_example: { type: "string" },
        coaching_note: { type: "string" },
        risk_flags: {
          type: "array",
          items: {
            type: "object",
            properties: {
              risk_type: { type: "string" },
              description: { type: "string" },
              severity: { type: "string", enum: ["low","medium","high"] },
            },
            required: ["risk_type","description","severity"],
          },
        },
        confidence: { type: "number", minimum: 0, maximum: 1 },
      },
      required: [
        "overall_score","subscores","strengths","improvement_points",
        "missed_opportunities","objections_detected","recommended_next_action",
        "improved_reply_example","coaching_note","risk_flags","confidence",
      ],
    },
  },
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const authHeader = req.headers.get("Authorization") ?? "";
    const userClient = createClient(SUPABASE_URL, Deno.env.get("SUPABASE_ANON_KEY")!, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: userData } = await userClient.auth.getUser();
    if (!userData?.user) return ok({ ok: false, error: "Não autenticado" }, 401);

    const body = (await req.json()) as ReqBody;
    if (!body?.workspace_id) return ok({ ok: false, error: "workspace_id em falta" }, 400);
    if (!body.conversation_id && !body.ticket_id) {
      return ok({ ok: false, error: "Indique conversation_id ou ticket_id" }, 400);
    }

    const admin = createClient(SUPABASE_URL, SERVICE_ROLE);

    // Verificar pertença ao workspace
    const { data: member } = await admin
      .from("workspace_members")
      .select("user_id")
      .eq("workspace_id", body.workspace_id)
      .eq("user_id", userData.user.id)
      .maybeSingle();
    if (!member) return ok({ ok: false, error: "Sem acesso ao workspace" }, 403);

    // Buscar contexto
    let contextText = "";
    let conversationRow: any = null;
    let ticketRow: any = null;
    let messageCount = 0;
    let agentId: string | null = body.agent_id ?? null;
    let contactId: string | null = null;

    if (body.conversation_id) {
      const { data: conv } = await admin
        .from("conversations")
        .select("id, contact_id, assigned_to, ai_summary, channel, status, created_at")
        .eq("id", body.conversation_id)
        .eq("workspace_id", body.workspace_id)
        .maybeSingle();
      conversationRow = conv;
      agentId = agentId ?? conv?.assigned_to ?? null;
      contactId = conv?.contact_id ?? null;

      const { data: msgs } = await admin
        .from("whatsapp_messages")
        .select("direction, message_type, body, transcription, created_at")
        .eq("conversation_id", body.conversation_id)
        .order("created_at", { ascending: true })
        .limit(80);
      messageCount = msgs?.length ?? 0;

      contextText =
        `CONVERSA (${conv?.channel ?? "whatsapp"}, estado: ${conv?.status ?? "?"})\n` +
        `Resumo IA prévio: ${conv?.ai_summary ?? "n/a"}\n\n` +
        `MENSAGENS (${messageCount}):\n` +
        (msgs ?? [])
          .map((m: any) => {
            const who = m.direction === "inbound" ? "Cliente" : "Agente";
            const txt = m.body ?? m.transcription ?? `[${m.message_type}]`;
            return `[${who}] ${String(txt).slice(0, 500)}`;
          })
          .join("\n");
    }

    if (body.ticket_id) {
      const { data: tk } = await admin
        .from("client_tickets")
        .select("id, subject, description, status, priority, contact_id, assigned_to, ai_summary, first_response_at, created_at")
        .eq("id", body.ticket_id)
        .eq("workspace_id", body.workspace_id)
        .maybeSingle();
      ticketRow = tk;
      agentId = agentId ?? tk?.assigned_to ?? null;
      contactId = contactId ?? tk?.contact_id ?? null;

      contextText +=
        `\n\nTICKET\n` +
        `Assunto: ${tk?.subject ?? "?"}\n` +
        `Descrição: ${tk?.description ?? "?"}\n` +
        `Estado: ${tk?.status ?? "?"} | Prioridade: ${tk?.priority ?? "?"}\n` +
        `Resumo IA: ${tk?.ai_summary ?? "n/a"}\n` +
        `Primeira resposta: ${tk?.first_response_at ?? "ainda sem resposta"}`;
    }

    if (!contextText.trim()) {
      return ok({ ok: false, error: "Sem mensagens/dados para analisar" }, 400);
    }

    // Truncar
    if (contextText.length > 14000) contextText = contextText.slice(0, 14000) + "\n…[truncado]";

    const reviewType = body.review_type ?? (body.ticket_id ? "ticket" : "conversation");

    let aiData: any = null;
    let modelUsed = "google/gemini-3-flash-preview";
    let provider = "lovable_ai";
    let aiError: string | null = null;

    if (LOVABLE_API_KEY) {
      try {
        const aiResp = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
          method: "POST",
          headers: {
            Authorization: `Bearer ${LOVABLE_API_KEY}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            model: modelUsed,
            messages: [
              { role: "system", content: SYSTEM_PROMPT },
              { role: "user", content: `Analisa a qualidade desta interação (review_type=${reviewType}):\n\n${contextText}` },
            ],
            tools: [TOOL],
            tool_choice: { type: "function", function: { name: "submit_quality_review" } },
          }),
        });

        if (aiResp.status === 429) {
          return ok({ ok: false, code: "rate_limit", error: "Limite de pedidos AI atingido. Tente novamente em instantes." });
        }
        if (aiResp.status === 402) {
          return ok({ ok: false, code: "no_credits", error: "Créditos AI esgotados. Adicione créditos para continuar." });
        }
        if (!aiResp.ok) {
          aiError = `AI gateway ${aiResp.status}`;
        } else {
          const json = await aiResp.json();
          const call = json?.choices?.[0]?.message?.tool_calls?.[0];
          if (call?.function?.arguments) {
            aiData = JSON.parse(call.function.arguments);
          } else {
            aiError = "Resposta AI sem tool call";
          }
        }
      } catch (e) {
        aiError = e instanceof Error ? e.message : "Erro AI";
      }
    } else {
      aiError = "LOVABLE_API_KEY não configurada";
    }

    // Fallback heurístico se AI falhar
    if (!aiData) {
      const baseline = Math.min(70, 40 + messageCount * 2);
      aiData = {
        overall_score: baseline,
        subscores: {
          clarity_score: baseline,
          empathy_score: baseline,
          commercial_score: baseline,
          resolution_score: baseline,
          followup_score: baseline - 10,
          objection_handling_score: baseline - 10,
          professionalism_score: baseline,
          speed_context_score: baseline,
          compliance_risk_score: 15,
        },
        strengths: [],
        improvement_points: [
          {
            title: "Análise IA indisponível",
            description: aiError ?? "Não foi possível gerar análise IA detalhada.",
            suggestion: "Tente novamente em instantes ou contacte o administrador.",
          },
        ],
        missed_opportunities: [],
        objections_detected: [],
        recommended_next_action: "Realizar nova análise quando o serviço de IA estiver disponível.",
        improved_reply_example: "",
        coaching_note: "Análise gerada em modo fallback heurístico.",
        risk_flags: [],
        confidence: 0.2,
      };
      provider = "fallback";
    }

    const sub = aiData.subscores ?? {};
    const insertPayload = {
      workspace_id: body.workspace_id,
      conversation_id: body.conversation_id ?? null,
      ticket_id: body.ticket_id ?? null,
      contact_id: contactId,
      agent_id: agentId,
      reviewed_by: userData.user.id,
      review_type: reviewType,
      source: "manual",
      status: "completed",
      overall_score: clamp(aiData.overall_score),
      clarity_score: clamp(sub.clarity_score),
      empathy_score: clamp(sub.empathy_score),
      commercial_score: clamp(sub.commercial_score),
      resolution_score: clamp(sub.resolution_score),
      followup_score: clamp(sub.followup_score),
      objection_handling_score: clamp(sub.objection_handling_score),
      professionalism_score: clamp(sub.professionalism_score),
      speed_context_score: clamp(sub.speed_context_score),
      compliance_risk_score: clamp(sub.compliance_risk_score),
      strengths: aiData.strengths ?? [],
      improvement_points: aiData.improvement_points ?? [],
      missed_opportunities: aiData.missed_opportunities ?? [],
      objections_detected: aiData.objections_detected ?? [],
      recommended_next_action: aiData.recommended_next_action ?? null,
      improved_reply_example: aiData.improved_reply_example ?? null,
      coaching_note: aiData.coaching_note ?? null,
      risk_flags: aiData.risk_flags ?? [],
      raw_ai_response: aiData,
      model_provider: provider,
      model_name: modelUsed,
      confidence: typeof aiData.confidence === "number" ? aiData.confidence : null,
      analyzed_message_count: messageCount,
      completed_at: new Date().toISOString(),
    };

    const { data: review, error: insErr } = await admin
      .from("conversation_quality_reviews")
      .insert(insertPayload)
      .select("*")
      .single();

    if (insErr) {
      console.error("Insert review error:", insErr);
      return ok({ ok: false, error: "Falha ao guardar análise" }, 500);
    }

    return ok({ ok: true, review, ai_error: aiError });
  } catch (e) {
    console.error("conversation-quality-review fatal:", e);
    return ok({ ok: false, error: e instanceof Error ? e.message : "Erro" }, 200);
  }
});
