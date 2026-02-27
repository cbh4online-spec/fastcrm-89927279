
import { createClient } from "@supabase/supabase-js";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    let workspaceId: string | null = null;
    if (req.method === "POST") {
      try {
        const body = await req.json();
        workspaceId = body?.workspace_id ?? null;
      } catch { /* no body */ }
    }

    let workspaceIds: string[] = [];
    if (workspaceId) {
      workspaceIds = [workspaceId];
    } else {
      const { data: workspaces } = await supabase.from("workspaces").select("id");
      workspaceIds = (workspaces || []).map((w: { id: string }) => w.id);
    }

    let lastBrief = null;
    for (const wsId of workspaceIds) {
      try {
        const brief = await generateDailyBrief(supabase, wsId);
        if (wsId === workspaceId) lastBrief = brief;
      } catch (err) {
        console.error(`Error generating daily brief for ${wsId}:`, err);
      }
    }

    return new Response(JSON.stringify({ success: true, brief: lastBrief }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("daily-revenue-brief error:", err);
    return new Response(
      JSON.stringify({ error: err instanceof Error ? err.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});

async function generateDailyBrief(supabase: ReturnType<typeof createClient>, workspaceId: string) {
  const now = new Date();
  const oneDayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);
  const fiveDaysAgo = new Date(now.getTime() - 5 * 24 * 60 * 60 * 1000);
  const d1 = oneDayAgo.toISOString();
  const d5 = fiveDaysAgo.toISOString();

  const [
    { count: leadsToday },
    { count: newOpportunities },
    wonTodayRes,
    { count: lostToday },
    stalledDealsRes,
    { count: tasksCompleted },
    { count: tasksPending },
    { count: messagesToday },
    { data: hotLeadsData },
    { data: messageSamples },
  ] = await Promise.all([
    // 1. Leads created today
    supabase.from("leads").select("*", { count: "exact", head: true })
      .eq("workspace_id", workspaceId).gte("created_at", d1),

    // 2. New opportunities today
    supabase.from("opportunities").select("*", { count: "exact", head: true })
      .eq("workspace_id", workspaceId).eq("status", "open").gte("created_at", d1),

    // 3. Won deals today (count + sum)
    supabase.from("opportunities").select("value")
      .eq("workspace_id", workspaceId).eq("status", "won").gte("updated_at", d1),

    // 4. Lost deals today
    supabase.from("opportunities").select("*", { count: "exact", head: true })
      .eq("workspace_id", workspaceId).eq("status", "lost").gte("updated_at", d1),

    // 5. Stalled deals (open, no activity >5 days)
    supabase.from("opportunities").select("id, title, value, updated_at")
      .eq("workspace_id", workspaceId).eq("status", "open").lt("updated_at", d5)
      .order("value", { ascending: false }).limit(10),

    // 6. Tasks completed today
    supabase.from("tasks").select("*", { count: "exact", head: true })
      .eq("workspace_id", workspaceId).eq("status", "done").gte("updated_at", d1),

    // 7. Tasks pending
    supabase.from("tasks").select("*", { count: "exact", head: true })
      .eq("workspace_id", workspaceId).in("status", ["pending", "todo"]),

    // 8. Messages today
    supabase.from("messages").select("*", { count: "exact", head: true })
      .eq("workspace_id", workspaceId).gte("sent_at", d1),

    // 9. Hot leads (recent with high scores)
    supabase.from("leads").select("id, first_name, last_name, company_name, engagement_score, icp_fit_score, created_at")
      .eq("workspace_id", workspaceId).gte("created_at", d1)
      .order("engagement_score", { ascending: false }).limit(5),

    // 10. Message samples for AI context
    supabase.from("messages").select("direction, content, sent_at")
      .eq("workspace_id", workspaceId).gte("sent_at", d1)
      .order("sent_at", { ascending: false }).limit(30),
  ]);

  const wonData = wonTodayRes.data || [];
  const wonCount = wonData.length;
  const revenueToday = wonData.reduce((s: number, r: { value: number | null }) => s + (r.value || 0), 0);
  const stalledDeals = stalledDealsRes.data || [];
  const stalledCount = stalledDeals.length;
  const hotLeads = hotLeadsData || [];

  const messageContext = (messageSamples || [])
    .slice(0, 20)
    .reverse()
    .map((m: { direction: string; content: string }) =>
      `[${m.direction === "inbound" ? "Cliente" : "Agente"}]: ${(m.content || "").substring(0, 150)}`)
    .join("\n");

  const stalledContext = stalledDeals
    .map((d: { title: string; value: number | null; updated_at: string }) => {
      const daysStalled = Math.round((now.getTime() - new Date(d.updated_at).getTime()) / 86400000);
      return `- ${d.title} (€${(d.value || 0).toLocaleString("pt-PT")}) — ${daysStalled} dias sem atividade`;
    }).join("\n");

  const hotLeadsContext = hotLeads
    .map((l: { first_name: string | null; last_name: string | null; company_name: string | null; engagement_score: number | null }) =>
      `- ${l.first_name || ""} ${l.last_name || ""} (${l.company_name || "Sem empresa"}) — Engagement: ${l.engagement_score || 0}`)
    .join("\n");

  const metricsContext = `
ÚLTIMAS 24 HORAS:
- Leads criados: ${leadsToday || 0}
- Novas oportunidades: ${newOpportunities || 0}
- Negócios ganhos: ${wonCount} (€${revenueToday.toLocaleString("pt-PT")})
- Negócios perdidos: ${lostToday || 0}
- Deals travados (>5 dias sem atividade): ${stalledCount}
- Mensagens trocadas: ${messagesToday || 0}
- Tarefas concluídas: ${tasksCompleted || 0} | Pendentes: ${tasksPending || 0}

LEADS QUENTES (hoje):
${hotLeadsContext || "Nenhum lead novo hoje."}

DEALS TRAVADOS:
${stalledContext || "Nenhum deal travado."}
  `.trim();

  const aiResponse = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${LOVABLE_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: "google/gemini-2.5-flash",
      messages: [
        {
          role: "system",
          content: `És um analista operacional de negócios. Geras um resumo executivo diário (últimas 24h) em Português de Portugal. Sê direto, prático e orientado para ação imediata. Foca-te no que precisa de atenção hoje.`,
        },
        {
          role: "user",
          content: `Analisa os dados das últimas 24h e gera o brief diário de revenue.

DADOS REAIS:
${metricsContext}

CONVERSAS RECENTES:
${messageContext || "Sem conversas hoje."}

Gera o brief diário focado em ações imediatas.`,
        },
      ],
      tools: [
        {
          type: "function",
          function: {
            name: "generate_daily_brief",
            description: "Generate a structured daily revenue brief",
            parameters: {
              type: "object",
              properties: {
                summary: {
                  type: "string",
                  description: "2-3 sentence executive summary of the last 24h",
                },
                hot_leads: {
                  type: "string",
                  description: "Analysis of hot leads and recommended immediate actions",
                },
                stuck_deals: {
                  type: "string",
                  description: "Analysis of stalled deals and recommendations to unblock",
                },
                revenue_highlight: {
                  type: "string",
                  description: "Key revenue insight or highlight of the day",
                },
                action_suggestions: {
                  type: "array",
                  items: { type: "string" },
                  description: "5 priority actions for today",
                },
              },
              required: ["summary", "hot_leads", "stuck_deals", "revenue_highlight", "action_suggestions"],
              additionalProperties: false,
            },
          },
        },
      ],
      tool_choice: { type: "function", function: { name: "generate_daily_brief" } },
    }),
  });

  if (!aiResponse.ok) {
    const errText = await aiResponse.text();
    if (aiResponse.status === 429) throw new Error("Rate limit exceeded");
    if (aiResponse.status === 402) throw new Error("Credits exhausted");
    throw new Error(`AI error: ${errText}`);
  }

  const aiData = await aiResponse.json();
  const toolCall = aiData.choices?.[0]?.message?.tool_calls?.[0];
  if (!toolCall) throw new Error("No tool call in AI response");

  const briefData = JSON.parse(toolCall.function.arguments);

  const realMetrics = {
    leads_today: leadsToday || 0,
    revenue_today: revenueToday,
    new_opportunities: newOpportunities || 0,
    deals_won: wonCount,
    deals_lost: lostToday || 0,
    deals_stalled: stalledCount,
    tasks_completed: tasksCompleted || 0,
    tasks_pending: tasksPending || 0,
    messages_today: messagesToday || 0,
  };

  const { data: inserted, error } = await supabase
    .from("daily_briefs")
    .insert({
      workspace_id: workspaceId,
      summary: briefData.summary,
      hot_leads: briefData.hot_leads,
      stuck_deals: briefData.stuck_deals,
      revenue_highlight: briefData.revenue_highlight,
      action_suggestions: briefData.action_suggestions,
      key_metrics: realMetrics,
    })
    .select()
    .single();

  if (error) throw error;
  return inserted;
}
