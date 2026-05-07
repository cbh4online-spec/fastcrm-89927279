import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

interface SummaryRequest {
  workspace_id: string;
  period_start: string;
  period_end: string;
  filters?: Record<string, unknown>;
  attribution_model?: string;
  persist?: boolean;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const SERVICE_ROLE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");

    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return jsonOK({ fallback: true, error: "missing_auth" });
    }

    const supabase = createClient(SUPABASE_URL, SERVICE_ROLE, {
      global: { headers: { Authorization: authHeader } },
    });

    const userClient = createClient(SUPABASE_URL, SERVICE_ROLE);
    const token = authHeader.replace("Bearer ", "");
    const { data: userData, error: userErr } = await userClient.auth.getUser(token);
    if (userErr || !userData?.user) {
      return jsonOK({ fallback: true, error: "invalid_token" });
    }

    const body = (await req.json()) as SummaryRequest;
    const { workspace_id, period_start, period_end, attribution_model = "last_touch", persist = true } = body;

    if (!workspace_id || !period_start || !period_end) {
      return jsonOK({ fallback: true, error: "missing_params" });
    }

    // Verify membership
    const { data: member } = await supabase
      .from("workspace_members")
      .select("user_id, role")
      .eq("workspace_id", workspace_id)
      .eq("user_id", userData.user.id)
      .maybeSingle();

    if (!member) {
      return jsonOK({ fallback: true, error: "not_a_member" });
    }

    // Gather metrics in parallel
    const [overviewRes, channelRes, leaksRes, callsRes, sharesRes] = await Promise.all([
      supabase.rpc("executive_overview", {
        p_workspace_id: workspace_id,
        p_from: period_start,
        p_to: period_end,
        p_model: attribution_model,
      }),
      supabase.rpc("executive_revenue_by_channel", {
        p_workspace_id: workspace_id,
        p_from: period_start,
        p_to: period_end,
        p_model: attribution_model,
      }),
      supabase
        .from("revenue_leaks")
        .select("id, leak_type, severity, estimated_value, title, status, created_at")
        .eq("workspace_id", workspace_id)
        .eq("status", "open")
        .order("severity", { ascending: false })
        .limit(20),
      supabase
        .from("voice_call_logs")
        .select("id, status, started_at")
        .eq("workspace_id", workspace_id)
        .gte("started_at", period_start)
        .lte("started_at", period_end)
        .limit(500),
      supabase
        .from("whatsapp_product_shares")
        .select("id, created_at")
        .eq("workspace_id", workspace_id)
        .gte("created_at", period_start)
        .lte("created_at", period_end)
        .limit(500),
    ]);

    const overview = overviewRes.data ?? {};
    const channels = channelRes.data ?? [];
    const leaks = leaksRes.data ?? [];
    const calls = callsRes.data ?? [];
    const shares = sharesRes.data ?? [];

    const missedCalls = calls.filter((c: any) => c.status === "missed" || c.status === "no_answer").length;

    const metricsContext = {
      period: { from: period_start, to: period_end },
      overview,
      channels,
      open_leaks: leaks.length,
      leak_summary: leaks.slice(0, 5).map((l: any) => ({
        type: l.leak_type,
        severity: l.severity,
        value: l.estimated_value,
        title: l.title,
      })),
      total_calls: calls.length,
      missed_calls: missedCalls,
      product_shares: shares.length,
    };

    let aiResult: any = null;

    if (LOVABLE_API_KEY) {
      try {
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
                  "És um analista executivo do FastCRM. Analisa os dados operacionais e devolve JSON válido em português de Portugal. Não inventes números — usa apenas os fornecidos. Tom executivo, direto, acionável.",
              },
              {
                role: "user",
                content: `Dados do período:\n${JSON.stringify(metricsContext, null, 2)}\n\nDevolve JSON com chaves: executive_summary (string), what_happened (array), what_worked (array), what_is_at_risk (array), revenue_leaks (array), recommended_actions (array de objetos {title, priority, expected_impact}), team_notes (array), channel_insights (array), priority_actions_next_24h (array), confidence (número 0-1).`,
              },
            ],
            tools: [
              {
                type: "function",
                function: {
                  name: "executive_summary",
                  description: "Resumo executivo estruturado",
                  parameters: {
                    type: "object",
                    properties: {
                      executive_summary: { type: "string" },
                      what_happened: { type: "array", items: { type: "string" } },
                      what_worked: { type: "array", items: { type: "string" } },
                      what_is_at_risk: { type: "array", items: { type: "string" } },
                      revenue_leaks: { type: "array", items: { type: "string" } },
                      recommended_actions: {
                        type: "array",
                        items: {
                          type: "object",
                          properties: {
                            title: { type: "string" },
                            priority: { type: "string", enum: ["low", "medium", "high", "critical"] },
                            expected_impact: { type: "string" },
                            recommendation_type: { type: "string" },
                          },
                          required: ["title", "priority"],
                        },
                      },
                      team_notes: { type: "array", items: { type: "string" } },
                      channel_insights: { type: "array", items: { type: "string" } },
                      priority_actions_next_24h: { type: "array", items: { type: "string" } },
                      confidence: { type: "number" },
                    },
                    required: ["executive_summary", "recommended_actions", "confidence"],
                  },
                },
              },
            ],
            tool_choice: { type: "function", function: { name: "executive_summary" } },
          }),
        });

        if (aiResp.ok) {
          const aiData = await aiResp.json();
          const toolCall = aiData.choices?.[0]?.message?.tool_calls?.[0];
          if (toolCall?.function?.arguments) {
            aiResult = JSON.parse(toolCall.function.arguments);
          }
        } else if (aiResp.status === 429 || aiResp.status === 402) {
          return jsonOK({ fallback: true, error: aiResp.status === 429 ? "rate_limited" : "credits_exhausted", metrics: metricsContext });
        }
      } catch (e) {
        console.error("AI gateway error:", e);
      }
    }

    if (!aiResult) {
      // Fallback heurístico
      aiResult = {
        executive_summary: `No período analisado registaram-se ${overview.leads ?? 0} leads, ${overview.opportunities ?? 0} oportunidades e ${overview.conversions ?? 0} conversões, com receita atribuída de €${overview.revenue ?? 0}. Existem ${leaks.length} fugas de receita abertas e ${missedCalls} chamadas perdidas.`,
        what_happened: [`${overview.leads ?? 0} leads gerados`, `${shares.length} produtos partilhados`, `${calls.length} chamadas registadas`],
        what_worked: [],
        what_is_at_risk: leaks.slice(0, 3).map((l: any) => l.title),
        revenue_leaks: leaks.slice(0, 5).map((l: any) => l.title),
        recommended_actions: leaks.slice(0, 3).map((l: any) => ({
          title: `Resolver: ${l.title}`,
          priority: l.severity === "high" ? "high" : "medium",
          expected_impact: `€${l.estimated_value ?? 0} potenciais`,
          recommendation_type: "revenue_leak",
        })),
        team_notes: [],
        channel_insights: channels.map((c: any) => `${c.channel_type}: €${c.revenue} (${c.conversions} conversões)`),
        priority_actions_next_24h: missedCalls > 0 ? [`Recuperar ${missedCalls} chamadas perdidas`] : [],
        confidence: 0.5,
      };
    }

    // Persist snapshot + recommendations
    if (persist) {
      try {
        await supabase.from("executive_metric_snapshots").insert({
          workspace_id,
          period_start,
          period_end,
          metric_group: "overall",
          metrics: { ...metricsContext, ai: aiResult },
          generated_by: "ai",
        });

        const recs = (aiResult.recommended_actions ?? []).slice(0, 7).map((r: any) => ({
          workspace_id,
          title: String(r.title ?? "").slice(0, 250),
          description: r.expected_impact ?? null,
          recommendation_type: r.recommendation_type ?? "growth",
          priority: r.priority ?? "medium",
          expected_impact: r.expected_impact ?? null,
          source: "ai",
          confidence: aiResult.confidence ?? 0.5,
        }));

        if (recs.length > 0) {
          await supabase.from("executive_recommendations").insert(recs);
        }
      } catch (e) {
        console.error("persist error:", e);
      }
    }

    return jsonOK({
      ok: true,
      metrics: metricsContext,
      ...aiResult,
    });
  } catch (err) {
    console.error("executive-generate-summary error:", err);
    return jsonOK({ fallback: true, error: "internal_error", message: String(err) });
  }
});

function jsonOK(payload: unknown) {
  return new Response(JSON.stringify(payload), {
    status: 200,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}
