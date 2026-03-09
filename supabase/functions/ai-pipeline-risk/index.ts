import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "@supabase/supabase-js";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { workspace_id } = await req.json();
    if (!workspace_id) throw new Error("workspace_id is required");

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    // Fetch open opportunities with activity info
    const { data: opportunities, error: oppErr } = await supabase
      .from("opportunities")
      .select("id, title, value, status, stage_id, probability, created_at, updated_at, contact_id, company_id")
      .eq("workspace_id", workspace_id)
      .eq("status", "open")
      .order("value", { ascending: false });

    if (oppErr) throw oppErr;

    // Fetch recent activity logs for these deals
    const dealIds = (opportunities || []).map((o: any) => o.id);
    const { data: activities } = await supabase
      .from("activity_logs")
      .select("record_id, created_at")
      .eq("workspace_id", workspace_id)
      .in("record_id", dealIds.length > 0 ? dealIds : ["__none__"])
      .order("created_at", { ascending: false });

    const now = new Date();
    const activityMap = new Map<string, Date>();
    (activities || []).forEach((a: any) => {
      if (!activityMap.has(a.record_id)) {
        activityMap.set(a.record_id, new Date(a.created_at));
      }
    });

    // Classify deals
    const stalledDeals: any[] = [];
    const lowProbDeals: any[] = [];
    const inactiveDeals: any[] = [];

    (opportunities || []).forEach((opp: any) => {
      const lastActivity = activityMap.get(opp.id) || new Date(opp.updated_at);
      const daysSinceActivity = Math.floor((now.getTime() - lastActivity.getTime()) / (1000 * 60 * 60 * 24));
      const prob = opp.probability ?? 50;

      if (daysSinceActivity > 5) {
        stalledDeals.push({ ...opp, days_stalled: daysSinceActivity });
      }
      if (prob < 30) {
        lowProbDeals.push({ ...opp, probability: prob });
      }
      if (daysSinceActivity > 7) {
        inactiveDeals.push({ ...opp, days_inactive: daysSinceActivity });
      }
    });

    const totalPipeline = (opportunities || []).reduce((s: number, o: any) => s + (o.value || 0), 0);
    const atRiskValue = stalledDeals.reduce((s: number, o: any) => s + (o.value || 0), 0);

    // Build context for AI
    const context = {
      total_deals: opportunities?.length || 0,
      total_pipeline: totalPipeline,
      stalled_count: stalledDeals.length,
      stalled_value: atRiskValue,
      low_prob_count: lowProbDeals.length,
      inactive_count: inactiveDeals.length,
      top_stalled: stalledDeals.slice(0, 5).map((d) => ({
        title: d.title,
        value: d.value,
        days: d.days_stalled,
      })),
      top_low_prob: lowProbDeals.slice(0, 5).map((d) => ({
        title: d.title,
        value: d.value,
        probability: d.probability,
      })),
    };

    // Call Lovable AI for risk assessment
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    let aiAssessment = null;

    if (LOVABLE_API_KEY) {
      const aiResponse = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
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
                "You are a CRM pipeline risk analyst. Analyze deal data and provide actionable risk assessments. Be concise and actionable. Respond in Portuguese (PT).",
            },
            {
              role: "user",
              content: `Analyze this pipeline risk data and provide a structured assessment:\n${JSON.stringify(context)}`,
            },
          ],
          tools: [
            {
              type: "function",
              function: {
                name: "pipeline_risk_report",
                description: "Return structured pipeline risk analysis",
                parameters: {
                  type: "object",
                  properties: {
                    risk_level: { type: "string", enum: ["low", "medium", "high", "critical"] },
                    summary: { type: "string" },
                    critical_actions: {
                      type: "array",
                      items: {
                        type: "object",
                        properties: {
                          deal_title: { type: "string" },
                          action: { type: "string" },
                          urgency: { type: "string", enum: ["immediate", "this_week", "monitor"] },
                        },
                        required: ["deal_title", "action", "urgency"],
                      },
                    },
                    patterns: {
                      type: "array",
                      items: { type: "string" },
                    },
                    recommendations: {
                      type: "array",
                      items: { type: "string" },
                    },
                  },
                  required: ["risk_level", "summary", "critical_actions", "patterns", "recommendations"],
                },
              },
            },
          ],
          tool_choice: { type: "function", function: { name: "pipeline_risk_report" } },
        }),
      });

      if (aiResponse.ok) {
        const aiData = await aiResponse.json();
        const toolCall = aiData.choices?.[0]?.message?.tool_calls?.[0];
        if (toolCall?.function?.arguments) {
          try {
            aiAssessment = JSON.parse(toolCall.function.arguments);
          } catch { /* ignore parse errors */ }
        }
      } else if (aiResponse.status === 429) {
        return new Response(JSON.stringify({ error: "Rate limit exceeded. Try again later." }), {
          status: 200,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      } else if (aiResponse.status === 402) {
        return new Response(JSON.stringify({ error: "Credits exhausted." }), {
          status: 200,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
    }

    return new Response(
      JSON.stringify({
        stalled_deals: stalledDeals.slice(0, 10),
        low_prob_deals: lowProbDeals.slice(0, 10),
        inactive_deals: inactiveDeals.slice(0, 10),
        total_pipeline: totalPipeline,
        at_risk_value: atRiskValue,
        ai_assessment: aiAssessment,
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (e) {
    console.error("[AI-PIPELINE-RISK] Error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
