import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "@supabase/supabase-js";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

serve(async (req) => {
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

async function generateBriefForWorkspace(supabase: ReturnType<typeof createClient>, workspaceId: string) {
  const now = new Date();
  const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
  const fourteenDaysAgo = new Date(now.getTime() - 14 * 24 * 60 * 60 * 1000);

  const sevenDaysAgoISO = sevenDaysAgo.toISOString();
  const fourteenDaysAgoISO = fourteenDaysAgo.toISOString();
  const nowISO = now.toISOString();

  // --- Leads ---
  const [{ count: leadsThisWeek }, { count: leadsPrevWeek }] = await Promise.all([
    supabase.from("leads").select("*", { count: "exact", head: true })
      .eq("workspace_id", workspaceId).gte("created_at", sevenDaysAgoISO),
    supabase.from("leads").select("*", { count: "exact", head: true })
      .eq("workspace_id", workspaceId)
      .gte("created_at", fourteenDaysAgoISO).lt("created_at", sevenDaysAgoISO),
  ]);

  // --- Tasks ---
  const [{ count: tasksCompleted }, { count: tasksPending }] = await Promise.all([
    supabase.from("tasks").select("*", { count: "exact", head: true })
      .eq("workspace_id", workspaceId).eq("status", "done").gte("updated_at", sevenDaysAgoISO),
    supabase.from("tasks").select("*", { count: "exact", head: true })
      .eq("workspace_id", workspaceId).eq("status", "pending"),
  ]);

  // --- Messages for signal extraction ---
  const { data: conversations } = await supabase
    .from("conversations")
    .select("id")
    .eq("workspace_id", workspaceId);

  const conversationIds = (conversations || []).map((c: { id: string }) => c.id);

  let messages: Array<{ direction: string; content: string; created_at: string }> = [];
  if (conversationIds.length > 0) {
    const { data: msgs } = await supabase
      .from("messages")
      .select("direction, content, created_at")
      .in("conversation_id", conversationIds.slice(0, 100))
      .gte("created_at", sevenDaysAgoISO)
      .order("created_at", { ascending: false })
      .limit(60);
    messages = msgs || [];
  }

  // Build message context
  const messageContext = messages
    .slice(0, 40)
    .reverse()
    .map((m) => `[${m.direction === "inbound" ? "Cliente" : "Agente"}]: ${(m.content || "").substring(0, 200)}`)
    .join("\n");

  // Compute metric changes
  const leadsChange = leadsPrevWeek && leadsPrevWeek > 0
    ? Math.round(((leadsThisWeek || 0) - leadsPrevWeek) / leadsPrevWeek * 100)
    : 0;

  const metricsContext = `
Leads this week: ${leadsThisWeek || 0}
Leads previous week: ${leadsPrevWeek || 0}
Leads change: ${leadsChange}%
Tasks completed (7d): ${tasksCompleted || 0}
Tasks pending: ${tasksPending || 0}
Total messages analyzed: ${messages.length}
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
          content: `És um analista estratégico de negócios sénior. Analisa dados de CRM e conversas para gerar um relatório executivo semanal em Português de Portugal. Sê direto, perspicaz e orientado para ação. Usa linguagem executiva profissional.`,
        },
        {
          role: "user",
          content: `Analisa os seguintes dados do workspace e gera um brief executivo semanal.

MÉTRICAS DA SEMANA:
${metricsContext}

AMOSTRA DE CONVERSAS RECENTES:
${messageContext || "Sem conversas esta semana."}

Gera um brief executivo com insights acionáveis.`,
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
                key_metrics: {
                  type: "object",
                  properties: {
                    leads_change: { type: "number", description: "% change in leads vs prior week" },
                    revenue_change: { type: "number", description: "% change in revenue vs prior week (estimate)" },
                    conversion_change: { type: "number", description: "% change in conversion rate vs prior week" },
                    response_time_change: { type: "number", description: "% change in response time (negative = faster)" },
                    leads_total: { type: "number" },
                    tasks_completed: { type: "number" },
                    tasks_pending: { type: "number" },
                    messages_total: { type: "number" },
                  },
                  required: ["leads_change", "leads_total", "tasks_completed", "tasks_pending", "messages_total"],
                  additionalProperties: false,
                },
              },
              required: ["summary", "opportunity", "risk", "market_signal", "priority_actions", "key_metrics"],
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

  // Fill in concrete metrics
  briefData.key_metrics.leads_total = leadsThisWeek || 0;
  briefData.key_metrics.leads_change = leadsChange;
  briefData.key_metrics.tasks_completed = tasksCompleted || 0;
  briefData.key_metrics.tasks_pending = tasksPending || 0;
  briefData.key_metrics.messages_total = messages.length;

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
      key_metrics: briefData.key_metrics,
    })
    .select()
    .single();

  if (error) throw error;
  return inserted;
}
