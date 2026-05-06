// Fase 1I — Gera/atualiza agent_coaching_insights agregando reviews do período.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_ROLE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");

function ok(p: unknown, status = 200) {
  return new Response(JSON.stringify(p), { status, headers: { ...corsHeaders, "Content-Type": "application/json" } });
}

const SYSTEM = `És um coach sénior de equipas comerciais e de suporte.
A partir de várias análises de qualidade de conversa de um agente, identifica padrões
recorrentes (forças e áreas de melhoria), recomenda 2-4 ações de treino concretas
e sugere 2-3 tópicos de formação. Responde em português de Portugal, com tom
construtivo e profissional. Devolve APENAS JSON via tool call.`;

const TOOL = {
  type: "function",
  function: {
    name: "submit_coaching_insights",
    description: "Submete insights agregados de coaching.",
    parameters: {
      type: "object",
      properties: {
        recurring_strengths: {
          type: "array",
          items: { type: "object", properties: { title: { type: "string" }, description: { type: "string" } }, required: ["title","description"] },
        },
        recurring_improvement_areas: {
          type: "array",
          items: { type: "object", properties: { title: { type: "string" }, description: { type: "string" } }, required: ["title","description"] },
        },
        coaching_recommendations: {
          type: "array",
          items: { type: "object", properties: { title: { type: "string" }, action: { type: "string" } }, required: ["title","action"] },
        },
        suggested_training_topics: { type: "array", items: { type: "string" } },
      },
      required: ["recurring_strengths","recurring_improvement_areas","coaching_recommendations","suggested_training_topics"],
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
    const { data: ud } = await userClient.auth.getUser();
    if (!ud?.user) return ok({ ok: false, error: "Não autenticado" }, 401);

    const { workspace_id, agent_id, period_days = 30 } = await req.json();
    if (!workspace_id || !agent_id) return ok({ ok: false, error: "workspace_id e agent_id obrigatórios" }, 400);

    const admin = createClient(SUPABASE_URL, SERVICE_ROLE);

    // Validar manager/admin
    const { data: isMgr } = await admin.rpc("is_workspace_manager_or_admin", {
      _workspace_id: workspace_id,
      _user_id: ud.user.id,
    });
    if (!isMgr) return ok({ ok: false, error: "Apenas managers podem gerar insights" }, 403);

    const periodEnd = new Date();
    const periodStart = new Date(periodEnd.getTime() - period_days * 24 * 3600 * 1000);

    const { data: reviews } = await admin
      .from("conversation_quality_reviews")
      .select("overall_score, clarity_score, empathy_score, commercial_score, resolution_score, followup_score, strengths, improvement_points, improved_reply_example, coaching_note")
      .eq("workspace_id", workspace_id)
      .eq("agent_id", agent_id)
      .gte("created_at", periodStart.toISOString())
      .lte("created_at", periodEnd.toISOString())
      .order("created_at", { ascending: false })
      .limit(100);

    const list = reviews ?? [];
    if (list.length === 0) {
      return ok({ ok: false, error: "Sem reviews neste período para gerar coaching" }, 400);
    }

    const avg = (key: string) => {
      const xs = list.map((r: any) => r[key]).filter((v: any) => typeof v === "number");
      return xs.length ? Math.round(xs.reduce((a: number, b: number) => a + b, 0) / xs.length) : null;
    };

    const aggregated = {
      avg_quality_score: avg("overall_score"),
      avg_clarity_score: avg("clarity_score"),
      avg_empathy_score: avg("empathy_score"),
      avg_commercial_score: avg("commercial_score"),
      avg_resolution_score: avg("resolution_score"),
      avg_followup_score: avg("followup_score"),
    };

    // Resumo para IA
    const summaryForAI = list.slice(0, 30).map((r: any, i: number) => {
      const s = (r.strengths ?? []).slice(0, 2).map((x: any) => x.title).join("; ");
      const ip = (r.improvement_points ?? []).slice(0, 2).map((x: any) => x.title).join("; ");
      return `#${i + 1} score=${r.overall_score ?? "?"} | forças: ${s || "—"} | melhorar: ${ip || "—"}`;
    }).join("\n");

    let ai: any = null;
    let aiErr: string | null = null;
    if (LOVABLE_API_KEY) {
      try {
        const r = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
          method: "POST",
          headers: { Authorization: `Bearer ${LOVABLE_API_KEY}`, "Content-Type": "application/json" },
          body: JSON.stringify({
            model: "google/gemini-3-flash-preview",
            messages: [
              { role: "system", content: SYSTEM },
              { role: "user", content: `Agente: ${agent_id}\nPeríodo: ${period_days} dias\nReviews: ${list.length}\nMédias: ${JSON.stringify(aggregated)}\n\nResumo das reviews:\n${summaryForAI}` },
            ],
            tools: [TOOL],
            tool_choice: { type: "function", function: { name: "submit_coaching_insights" } },
          }),
        });
        if (r.status === 429) return ok({ ok: false, code: "rate_limit", error: "Limite AI atingido" });
        if (r.status === 402) return ok({ ok: false, code: "no_credits", error: "Créditos AI esgotados" });
        if (r.ok) {
          const j = await r.json();
          const c = j?.choices?.[0]?.message?.tool_calls?.[0];
          if (c?.function?.arguments) ai = JSON.parse(c.function.arguments);
        } else aiErr = `AI ${r.status}`;
      } catch (e) {
        aiErr = e instanceof Error ? e.message : "AI error";
      }
    }

    if (!ai) {
      ai = {
        recurring_strengths: [],
        recurring_improvement_areas: [{ title: "Análise IA indisponível", description: aiErr ?? "Tente novamente." }],
        coaching_recommendations: [],
        suggested_training_topics: [],
      };
    }

    // Exemplos de boas/melhores respostas (top 3 e bottom 3)
    const sortedByScore = [...list].sort((a: any, b: any) => (b.overall_score ?? 0) - (a.overall_score ?? 0));
    const goodExamples = sortedByScore.slice(0, 3).map((r: any) => r.improved_reply_example).filter(Boolean).map((t: string) => ({ text: t }));
    const improvedExamples = sortedByScore.slice(-3).map((r: any) => r.improved_reply_example).filter(Boolean).map((t: string) => ({ text: t }));

    const payload = {
      workspace_id,
      agent_id,
      period_start: periodStart.toISOString().slice(0, 10),
      period_end: periodEnd.toISOString().slice(0, 10),
      conversations_analyzed: list.length,
      ...aggregated,
      recurring_strengths: ai.recurring_strengths ?? [],
      recurring_improvement_areas: ai.recurring_improvement_areas ?? [],
      coaching_recommendations: ai.coaching_recommendations ?? [],
      suggested_training_topics: ai.suggested_training_topics ?? [],
      example_good_replies: goodExamples,
      example_improved_replies: improvedExamples,
      generated_at: new Date().toISOString(),
    };

    const { data, error } = await admin
      .from("agent_coaching_insights")
      .upsert(payload, { onConflict: "workspace_id,agent_id,period_start,period_end" })
      .select("*")
      .single();

    if (error) return ok({ ok: false, error: error.message }, 500);
    return ok({ ok: true, insight: data, ai_error: aiErr });
  } catch (e) {
    console.error("coaching insights:", e);
    return ok({ ok: false, error: e instanceof Error ? e.message : "Erro" }, 200);
  }
});
