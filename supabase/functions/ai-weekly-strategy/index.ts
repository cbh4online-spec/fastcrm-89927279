import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "@supabase/supabase-js";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: corsHeaders });
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } }
    );

    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: corsHeaders });
    }

    const { workspace_id } = await req.json();
    if (!workspace_id) {
      return new Response(JSON.stringify({ error: "workspace_id required" }), { status: 400, headers: corsHeaders });
    }

    // Get current week bounds
    const now = new Date();
    const dayOfWeek = now.getDay();
    const monday = new Date(now);
    monday.setDate(now.getDate() - (dayOfWeek === 0 ? 6 : dayOfWeek - 1));
    monday.setHours(0, 0, 0, 0);
    const sunday = new Date(monday);
    sunday.setDate(monday.getDate() + 6);
    sunday.setHours(23, 59, 59, 999);

    const weekStart = monday.toISOString();
    const weekEnd = sunday.toISOString();
    const weekStartDate = monday.toISOString().split("T")[0];

    // Fetch targets
    const { data: targets } = await supabase
      .from("performance_targets")
      .select("*")
      .eq("workspace_id", workspace_id)
      .eq("period_type", "weekly")
      .lte("period_start", weekStartDate)
      .gte("period_end", weekStartDate);

    // Fetch actuals
    const [leadsRes, meetingsRes, proposalsRes, oppsRes] = await Promise.all([
      supabase.from("leads").select("id", { count: "exact", head: true })
        .eq("workspace_id", workspace_id).gte("created_at", weekStart).lte("created_at", weekEnd),
      supabase.from("meetings").select("id", { count: "exact", head: true })
        .eq("workspace_id", workspace_id).gte("created_at", weekStart).lte("created_at", weekEnd),
      supabase.from("proposals").select("id", { count: "exact", head: true })
        .eq("workspace_id", workspace_id).eq("status", "published").gte("created_at", weekStart).lte("created_at", weekEnd),
      supabase.from("opportunities").select("id, value, status")
        .eq("workspace_id", workspace_id).gte("created_at", weekStart).lte("created_at", weekEnd),
    ]);

    const wonDeals = (oppsRes.data || []).filter((o: any) => o.status === "won");
    const revenueWon = wonDeals.reduce((s: number, d: any) => s + (d.value || 0), 0);

    // Pipeline
    const { data: pipeline } = await supabase
      .from("opportunities")
      .select("id, value, status, stage_id")
      .eq("workspace_id", workspace_id)
      .in("status", ["open", "active", "negotiation"]);

    const pipelineValue = (pipeline || []).reduce((s: number, d: any) => s + (d.value || 0), 0);

    // Stalled deals
    const fiveDaysAgo = new Date(now.getTime() - 5 * 24 * 60 * 60 * 1000).toISOString();
    const { data: stalledDeals } = await supabase
      .from("opportunities")
      .select("id, title, value, updated_at")
      .eq("workspace_id", workspace_id)
      .in("status", ["open", "active"])
      .lt("updated_at", fiveDaysAgo)
      .limit(10);

    const targetsMap: Record<string, number> = {};
    (targets || []).forEach((t: any) => { targetsMap[t.metric_type] = t.target_value; });

    const metrics = {
      leads: { actual: leadsRes.count || 0, target: targetsMap.leads || 0 },
      meetings: { actual: meetingsRes.count || 0, target: targetsMap.meetings || 0 },
      proposals: { actual: proposalsRes.count || 0, target: targetsMap.proposals || 0 },
      deals: { actual: wonDeals.length, target: targetsMap.deals || 0 },
      revenue: { actual: revenueWon, target: targetsMap.revenue || 0 },
      pipeline_value: pipelineValue,
      pipeline_coverage: targetsMap.revenue ? pipelineValue / targetsMap.revenue : 0,
      stalled_deals: (stalledDeals || []).map((d: any) => ({ id: d.id, title: d.title, value: d.value })),
      week_progress_pct: Math.round(((dayOfWeek === 0 ? 7 : dayOfWeek) / 7) * 100),
    };

    // Call Lovable AI
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      return new Response(JSON.stringify({ error: "AI not configured" }), { status: 500, headers: corsHeaders });
    }

    const systemPrompt = `You are a Revenue Strategy AI for a CRM system. Analyze weekly performance metrics and provide actionable strategy.
You receive metrics with actual vs target values. The week is ${metrics.week_progress_pct}% complete.
Be concise, data-driven, and actionable. Focus on what matters most to close the gap.
All monetary values are in EUR. Respond in Portuguese (pt-PT).`;

    const userPrompt = `Weekly Performance Data:
${JSON.stringify(metrics, null, 2)}

Analyze and provide strategy using the tool.`;

    const aiResponse = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt },
        ],
        tools: [{
          type: "function",
          function: {
            name: "weekly_strategy",
            description: "Return weekly strategy analysis",
            parameters: {
              type: "object",
              properties: {
                summary: { type: "string", description: "2-3 sentence executive summary" },
                gap_analysis: {
                  type: "array",
                  items: {
                    type: "object",
                    properties: {
                      metric: { type: "string" },
                      actual: { type: "number" },
                      target: { type: "number" },
                      gap_pct: { type: "number" },
                      status: { type: "string", enum: ["on_track", "at_risk", "behind"] },
                      required_action: { type: "string" },
                    },
                    required: ["metric", "actual", "target", "gap_pct", "status", "required_action"],
                  },
                },
                risk_alerts: {
                  type: "array",
                  items: { type: "string" },
                },
                recommendations: {
                  type: "array",
                  items: {
                    type: "object",
                    properties: {
                      priority: { type: "string", enum: ["high", "medium", "low"] },
                      action: { type: "string" },
                      impact: { type: "string" },
                    },
                    required: ["priority", "action", "impact"],
                  },
                },
                quick_wins: {
                  type: "array",
                  items: { type: "string" },
                },
              },
              required: ["summary", "gap_analysis", "risk_alerts", "recommendations", "quick_wins"],
            },
          },
        }],
        tool_choice: { type: "function", function: { name: "weekly_strategy" } },
      }),
    });

    if (!aiResponse.ok) {
      const status = aiResponse.status;
      if (status === 429) {
        return new Response(JSON.stringify({ error: "Rate limit exceeded" }), { status: 429, headers: corsHeaders });
      }
      if (status === 402) {
        return new Response(JSON.stringify({ error: "Credits exhausted" }), { status: 402, headers: corsHeaders });
      }
      console.error("AI error:", status, await aiResponse.text());
      return new Response(JSON.stringify({ error: "AI analysis failed" }), { status: 500, headers: corsHeaders });
    }

    const aiData = await aiResponse.json();
    const toolCall = aiData.choices?.[0]?.message?.tool_calls?.[0];
    let strategy = null;
    if (toolCall?.function?.arguments) {
      try {
        strategy = JSON.parse(toolCall.function.arguments);
      } catch {
        strategy = null;
      }
    }

    return new Response(JSON.stringify({ metrics, strategy }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("ai-weekly-strategy error:", err);
    return new Response(JSON.stringify({ error: (err as Error).message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
