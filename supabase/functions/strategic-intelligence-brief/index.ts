import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
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

    // On-demand call includes workspace_id; cron call does not
    if (req.method === "POST") {
      try {
        const body = await req.json();
        workspaceId = body?.workspace_id ?? null;
      } catch {
        // no body
      }
    }

    // Collect workspace IDs to process
    let workspaceIds: string[] = [];

    if (workspaceId) {
      workspaceIds = [workspaceId];
    } else {
      // Cron mode: process all workspaces
      const { data: workspaces } = await supabase
        .from("workspaces")
        .select("id");
      workspaceIds = (workspaces || []).map((w: { id: string }) => w.id);
    }

    let lastBrief = null;

    for (const wsId of workspaceIds) {
      try {
        const brief = await generateBriefForWorkspace(supabase, wsId);
        if (wsId === workspaceId) lastBrief = brief;
      } catch (err) {
        console.error(`Error generating brief for workspace ${wsId}:`, err);
      }
    }

    return new Response(JSON.stringify({ success: true, brief: lastBrief }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("strategic-intelligence-brief error:", err);
    return new Response(
      JSON.stringify({ error: err instanceof Error ? err.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});

// Helper: percentage change rounded to 1 decimal
function pctChange(current: number, previous: number): number {
  if (previous === 0) return 0;
  return Math.round(((current - previous) / previous) * 100 * 10) / 10;
}

// Helper: average response time in hours from conversations array
function avgResponseHours(convs: Array<{ created_at: string; last_message_at: string | null }>): number {
  const valid = convs.filter((c) => c.last_message_at);
  if (valid.length === 0) return 0;
  const totalMs = valid.reduce((sum, c) => {
    return sum + (new Date(c.last_message_at!).getTime() - new Date(c.created_at).getTime());
  }, 0);
  return Math.round((totalMs / valid.length / 3600000) * 10) / 10;
}

async function generateBriefForWorkspace(supabase: ReturnType<typeof createClient>, workspaceId: string) {
  const now = new Date();
  const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
  const fourteenDaysAgo = new Date(now.getTime() - 14 * 24 * 60 * 60 * 1000);

  const d7 = sevenDaysAgo.toISOString();
  const d14 = fourteenDaysAgo.toISOString();

  // --- Run all 15 queries in parallel ---
  const [
    { count: leadsThisWeek },
    { count: leadsPrevWeek },
    { count: inactiveLeads },
    wonThisWeekRes,
    wonPrevWeekRes,
    { count: lostThisWeek },
    { count: lostPrevWeek },
    { count: openDeals },
    { count: messagesThisWeek },
    { count: messagesPrevWeek },
    { data: messageSamples },
    { count: tasksCompleted },
    { count: tasksPending },
    { data: convsThisWeek },
    { data: convsPrevWeek },
  ] = await Promise.all([
    // 1. Leads this week
    supabase.from("leads").select("*", { count: "exact", head: true })
      .eq("workspace_id", workspaceId).gte("created_at", d7),

    // 2. Leads previous week
    supabase.from("leads").select("*", { count: "exact", head: true })
      .eq("workspace_id", workspaceId).gte("created_at", d14).lt("created_at", d7),

    // 3. Inactive leads (no contact in > 7 days, not won/lost)
    supabase.from("leads").select("*", { count: "exact", head: true })
      .eq("workspace_id", workspaceId)
      .not("status", "in", '("won","lost")')
      .or(`last_contact_at.lt.${d7},last_contact_at.is.null`),

    // 4. Won deals this week (count + sum value)
    supabase.from("opportunities").select("value")
      .eq("workspace_id", workspaceId).eq("status", "won").gte("updated_at", d7),

    // 5. Won deals previous week (count + sum value)
    supabase.from("opportunities").select("value")
      .eq("workspace_id", workspaceId).eq("status", "won").gte("updated_at", d14).lt("updated_at", d7),

    // 6. Lost deals this week
    supabase.from("opportunities").select("*", { count: "exact", head: true })
      .eq("workspace_id", workspaceId).eq("status", "lost").gte("updated_at", d7),

    // 7. Lost deals previous week
    supabase.from("opportunities").select("*", { count: "exact", head: true })
      .eq("workspace_id", workspaceId).eq("status", "lost").gte("updated_at", d14).lt("updated_at", d7),

    // 8. Open deals (current snapshot)
    supabase.from("opportunities").select("*", { count: "exact", head: true })
      .eq("workspace_id", workspaceId).eq("status", "open"),

    // 9. Messages this week (direct workspace_id column)
    supabase.from("messages").select("*", { count: "exact", head: true })
      .eq("workspace_id", workspaceId).gte("sent_at", d7),

    // 10. Messages previous week
    supabase.from("messages").select("*", { count: "exact", head: true })
      .eq("workspace_id", workspaceId).gte("sent_at", d14).lt("sent_at", d7),

    // 11. Message samples for AI context
    supabase.from("messages").select("direction, content, sent_at")
      .eq("workspace_id", workspaceId).gte("sent_at", d7)
      .order("sent_at", { ascending: false }).limit(60),

    // 12. Tasks completed this week
    supabase.from("tasks").select("*", { count: "exact", head: true })
      .eq("workspace_id", workspaceId).eq("status", "done").gte("updated_at", d7),

    // 13. Tasks pending
    supabase.from("tasks").select("*", { count: "exact", head: true })
      .eq("workspace_id", workspaceId).in("status", ["pending", "todo"]),

    // 14. Conversations this week (for response time)
    supabase.from("conversations").select("created_at, last_message_at")
      .eq("workspace_id", workspaceId).gte("created_at", d7).not("last_message_at", "is", null),

    // 15. Conversations previous week (for response time comparison)
    supabase.from("conversations").select("created_at, last_message_at")
      .eq("workspace_id", workspaceId).gte("created_at", d14).lt("created_at", d7).not("last_message_at", "is", null),
  ]);

  // --- Derive counts and sums ---
  const wonThisWeekData = wonThisWeekRes.data || [];
  const wonPrevWeekData = wonPrevWeekRes.data || [];

  const wonThisWeekCount = wonThisWeekData.length;
  const wonPrevWeekCount = wonPrevWeekData.length;
  const revenueThisWeek = wonThisWeekData.reduce((s: number, r: { value: number | null }) => s + (r.value || 0), 0);
  const revenuePrevWeek = wonPrevWeekData.reduce((s: number, r: { value: number | null }) => s + (r.value || 0), 0);

  const lostThisWeekCount = lostThisWeek || 0;
  const lostPrevWeekCount = lostPrevWeek || 0;

  // --- Delta calculations ---
  const leadsChange = pctChange(leadsThisWeek || 0, leadsPrevWeek || 0);
  const revenueChange = pctChange(revenueThisWeek, revenuePrevWeek);
  const messagesChange = pctChange(messagesThisWeek || 0, messagesPrevWeek || 0);

  const totalThisWeek = wonThisWeekCount + lostThisWeekCount;
  const totalPrevWeek = wonPrevWeekCount + lostPrevWeekCount;
  const convThisWeek = totalThisWeek > 0 ? wonThisWeekCount / totalThisWeek : 0;
  const convPrevWeek = totalPrevWeek > 0 ? wonPrevWeekCount / totalPrevWeek : 0;
  const conversionChange = pctChange(convThisWeek * 100, convPrevWeek * 100);

  const avgRespThis = avgResponseHours(convsThisWeek || []);
  const avgRespPrev = avgResponseHours(convsPrevWeek || []);
  const responseTimeChange = pctChange(avgRespThis, avgRespPrev);

  // --- Build message context for AI ---
  const messages = messageSamples || [];
  const messageContext = messages
    .slice(0, 40)
    .reverse()
    .map((m: { direction: string; content: string }) =>
      `[${m.direction === "inbound" ? "Cliente" : "Agente"}]: ${(m.content || "").substring(0, 200)}`)
    .join("\n");

  // --- Build rich metrics context for AI ---
  const convThisPct = Math.round(convThisWeek * 100);
  const convPrevPct = Math.round(convPrevWeek * 100);

  const metricsContext = `
SEMANA ATUAL (últimos 7 dias):
- Leads criados: ${leadsThisWeek || 0}
- Negócios ganhos: ${wonThisWeekCount} (€${revenueThisWeek.toLocaleString("pt-PT")})
- Negócios perdidos: ${lostThisWeekCount}
- Negócios em aberto: ${openDeals || 0}
- Mensagens trocadas: ${messagesThisWeek || 0}
- Tarefas concluídas: ${tasksCompleted || 0} | Pendentes: ${tasksPending || 0}
- Leads inativos (>7 dias sem contacto): ${inactiveLeads || 0}

SEMANA ANTERIOR (7-14 dias):
- Leads criados: ${leadsPrevWeek || 0}
- Negócios ganhos: ${wonPrevWeekCount} (€${revenuePrevWeek.toLocaleString("pt-PT")})
- Negócios perdidos: ${lostPrevWeekCount}
- Mensagens trocadas: ${messagesPrevWeek || 0}

VARIAÇÕES CALCULADAS:
- Leads: ${leadsChange >= 0 ? "+" : ""}${leadsChange}%
- Receita: ${revenueChange >= 0 ? "+" : ""}${revenueChange}%
- Taxa de conversão: ${conversionChange >= 0 ? "+" : ""}${conversionChange}% (${convPrevPct}% → ${convThisPct}%)
- Tempo de resposta: ${responseTimeChange >= 0 ? "+" : ""}${responseTimeChange}% (${responseTimeChange < 0 ? "mais rápido" : "mais lento"})
- Mensagens: ${messagesChange >= 0 ? "+" : ""}${messagesChange}%

TEMPO MÉDIO DE RESPOSTA:
- Esta semana: ${avgRespThis}h
- Semana anterior: ${avgRespPrev}h
  `.trim();

  // Call Lovable AI
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
          content: `És um analista estratégico de negócios sénior. Analisa dados reais de CRM e conversas para gerar um relatório executivo semanal em Português de Portugal. Sê direto, perspicaz e orientado para ação. Usa linguagem executiva profissional. Os dados métricos são reais — interpreta-os com rigor.`,
        },
        {
          role: "user",
          content: `Analisa os seguintes dados reais do workspace e gera um brief executivo semanal.

DADOS REAIS DO WORKSPACE:
${metricsContext}

AMOSTRA DE CONVERSAS RECENTES:
${messageContext || "Sem conversas esta semana."}

Gera um brief executivo com insights acionáveis baseados nos dados reais acima.`,
        },
      ],
      tools: [
        {
          type: "function",
          function: {
            name: "generate_weekly_brief",
            description: "Generate a structured weekly executive brief",
            parameters: {
              type: "object",
              properties: {
                summary: {
                  type: "string",
                  description: "2-3 sentence executive summary of the week's performance",
                },
                opportunity: {
                  type: "string",
                  description: "Biggest opportunity detected this week",
                },
                risk: {
                  type: "string",
                  description: "Biggest risk or concern identified this week",
                },
                market_signal: {
                  type: "string",
                  description: "Key market signal or trend detected from conversations",
                },
                priority_actions: {
                  type: "array",
                  items: { type: "string" },
                  description: "5 priority actions for the upcoming week",
                },
              },
              required: ["summary", "opportunity", "risk", "market_signal", "priority_actions"],
              additionalProperties: false,
            },
          },
        },
      ],
      tool_choice: { type: "function", function: { name: "generate_weekly_brief" } },
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

  // Override key_metrics with real computed values (never trust AI for numbers)
  const realMetrics = {
    leads_change: leadsChange,
    revenue_change: revenueChange,
    conversion_change: conversionChange,
    response_time_change: responseTimeChange,
    leads_total: leadsThisWeek || 0,
    won_deals: wonThisWeekCount,
    lost_deals: lostThisWeekCount,
    messages_total: messagesThisWeek || 0,
    tasks_completed: tasksCompleted || 0,
    tasks_pending: tasksPending || 0,
    inactive_leads: inactiveLeads || 0,
    open_deals: openDeals || 0,
    revenue_this_week: revenueThisWeek,
    avg_response_hours_this_week: avgRespThis,
  };

  // Insert into weekly_briefs
  const { data: inserted, error } = await supabase
    .from("weekly_briefs")
    .insert({
      workspace_id: workspaceId,
      summary: briefData.summary,
      opportunity: briefData.opportunity,
      risk: briefData.risk,
      market_signal: briefData.market_signal,
      priority_actions: briefData.priority_actions,
      key_metrics: realMetrics,
    })
    .select()
    .single();

  if (error) throw error;
  return inserted;
}
