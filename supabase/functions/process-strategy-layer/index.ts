import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { workspace_id } = await req.json();
    if (!workspace_id) {
      return new Response(JSON.stringify({ error: "workspace_id required" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const sb = createClient(supabaseUrl, serviceKey);

    // 1. Collect signals
    const [ctxRes, opsRes, forecastRes, objRes, memRes, missionsRes] = await Promise.all([
      sb.from("business_context").select("*").eq("workspace_id", workspace_id).maybeSingle(),
      sb.from("workspace_operating_state").select("*").eq("workspace_id", workspace_id).maybeSingle(),
      sb.from("forecast_runs").select("*").eq("workspace_id", workspace_id).eq("run_type", "baseline").order("created_at", { ascending: false }).limit(1).maybeSingle(),
      sb.from("business_objectives").select("id, title, status, progress, target_value, current_value").eq("workspace_id", workspace_id).in("status", ["active", "at_risk"]).limit(20),
      sb.from("workspace_memories").select("memory_type, title, impact_score, content").eq("workspace_id", workspace_id).order("impact_score", { ascending: false }).limit(10),
      sb.from("workspace_missions").select("id, title, status, priority").eq("workspace_id", workspace_id).in("status", ["active", "pending"]).limit(10),
    ]);

    const ctx = ctxRes.data;
    const ops = opsRes.data;
    const forecast = forecastRes.data;
    const objectives = objRes.data ?? [];
    const memories = memRes.data ?? [];
    const missions = missionsRes.data ?? [];

    // 2. Build prompt
    const signalsSummary = JSON.stringify({
      business_context: ctx ? {
        monthly_revenue_target: ctx.monthly_revenue_target,
        quarterly_revenue_target: ctx.quarterly_revenue_target,
        annual_revenue_target: ctx.annual_revenue_target,
        deals_target_monthly: ctx.deals_target_monthly,
        average_ticket: ctx.average_ticket,
        sales_cycle_days: ctx.sales_cycle_days,
        follow_up_sla_hours: ctx.follow_up_sla_hours,
        business_model: ctx.business_model,
        active_strategies: ctx.active_strategies,
      } : null,
      operating_state: ops ? {
        overall_health: ops.overall_health_score,
        pipeline_health: ops.pipeline_health_score,
        execution_health: ops.execution_health_score,
        context_health: ops.context_health_score,
        revenue_health: ops.revenue_health_score,
      } : null,
      latest_forecast: forecast?.output_snapshot_json ?? null,
      objectives_summary: objectives.map((o: any) => ({ title: o.title, status: o.status, progress: o.progress })),
      top_memories: memories.map((m: any) => ({ type: m.memory_type, title: m.title, impact: m.impact_score })),
      active_missions: missions.length,
    }, null, 2);

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      return new Response(JSON.stringify({ error: "LOVABLE_API_KEY not configured" }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const aiResponse = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: { Authorization: `Bearer ${LOVABLE_API_KEY}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [
          {
            role: "system",
            content: `You are a strategic business analyst. Analyze workspace signals and produce a strategic diagnosis. Return ONLY valid JSON with this structure:
{
  "strategic_focus": "string - one sentence describing what the workspace should focus on",
  "strategic_health_score": number 0-100,
  "growth_mode": "acquisition|conversion|retention|recovery|stabilization",
  "bottleneck_type": "lead_generation|follow_up|conversion|delivery|context_gap|execution_overload|retention_risk",
  "primary_constraint": "string - main thing blocking growth",
  "main_revenue_driver": "string - biggest revenue lever",
  "main_revenue_risk": "string - biggest revenue threat",
  "execution_alignment_score": number 0-100,
  "context_alignment_score": number 0-100,
  "diagnosis_summary": "string - 2-3 sentence executive summary",
  "confidence": number 0.0-1.0,
  "top_constraints": ["string", "string", "string"],
  "top_leverage_points": ["string", "string", "string"],
  "hypotheses": [
    {
      "title": "string",
      "description": "string",
      "rationale": "string",
      "hypothesis_type": "increase_follow_up_intensity|shorten_sales_cycle|focus_high_ticket_offers|improve_recovery_engine|rebalance_agent_capacity|improve_context_quality|shift_channel_mix|reduce_execution_noise|strengthen_retention_motion",
      "expected_impact": "string",
      "confidence": number 0.0-1.0
    }
  ],
  "recommendations": [
    {
      "title": "string",
      "description": "string",
      "rationale": "string",
      "recommendation_type": "string",
      "expected_impact": "string",
      "confidence": number 0.0-1.0,
      "priority": "high|medium|low"
    }
  ]
}
Be pragmatic and data-driven. If data is sparse, lower confidence. Always explain reasoning.`
          },
          { role: "user", content: `Analyze this workspace:\n${signalsSummary}` }
        ],
        tools: [{
          type: "function",
          function: {
            name: "strategic_diagnosis",
            description: "Return strategic diagnosis for the workspace",
            parameters: {
              type: "object",
              properties: {
                strategic_focus: { type: "string" },
                strategic_health_score: { type: "number" },
                growth_mode: { type: "string", enum: ["acquisition", "conversion", "retention", "recovery", "stabilization"] },
                bottleneck_type: { type: "string", enum: ["lead_generation", "follow_up", "conversion", "delivery", "context_gap", "execution_overload", "retention_risk"] },
                primary_constraint: { type: "string" },
                main_revenue_driver: { type: "string" },
                main_revenue_risk: { type: "string" },
                execution_alignment_score: { type: "number" },
                context_alignment_score: { type: "number" },
                diagnosis_summary: { type: "string" },
                confidence: { type: "number" },
                top_constraints: { type: "array", items: { type: "string" } },
                top_leverage_points: { type: "array", items: { type: "string" } },
                hypotheses: {
                  type: "array",
                  items: {
                    type: "object",
                    properties: {
                      title: { type: "string" },
                      description: { type: "string" },
                      rationale: { type: "string" },
                      hypothesis_type: { type: "string" },
                      expected_impact: { type: "string" },
                      confidence: { type: "number" }
                    },
                    required: ["title", "hypothesis_type", "confidence"]
                  }
                },
                recommendations: {
                  type: "array",
                  items: {
                    type: "object",
                    properties: {
                      title: { type: "string" },
                      description: { type: "string" },
                      rationale: { type: "string" },
                      recommendation_type: { type: "string" },
                      expected_impact: { type: "string" },
                      confidence: { type: "number" },
                      priority: { type: "string", enum: ["high", "medium", "low"] }
                    },
                    required: ["title", "recommendation_type", "priority"]
                  }
                }
              },
              required: ["strategic_focus", "growth_mode", "bottleneck_type", "diagnosis_summary", "confidence"]
            }
          }
        }],
        tool_choice: { type: "function", function: { name: "strategic_diagnosis" } }
      }),
    });

    if (!aiResponse.ok) {
      const status = aiResponse.status;
      const txt = await aiResponse.text();
      if (status === 429) return new Response(JSON.stringify({ error: "Rate limit exceeded" }), { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      if (status === 402) return new Response(JSON.stringify({ error: "Credits exhausted" }), { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      console.error("AI error:", status, txt);
      return new Response(JSON.stringify({ error: "AI gateway error" }), { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const aiData = await aiResponse.json();
    const toolCall = aiData.choices?.[0]?.message?.tool_calls?.[0];
    if (!toolCall) {
      return new Response(JSON.stringify({ error: "No AI response" }), { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const diagnosis = JSON.parse(toolCall.function.arguments);

    // 3. Insert snapshot
    const { data: snapshot } = await sb.from("strategic_state_snapshots").insert({
      workspace_id,
      strategic_focus: diagnosis.strategic_focus,
      strategic_health_score: diagnosis.strategic_health_score ?? 50,
      growth_mode: diagnosis.growth_mode,
      bottleneck_type: diagnosis.bottleneck_type,
      primary_constraint: diagnosis.primary_constraint,
      main_revenue_driver: diagnosis.main_revenue_driver,
      main_revenue_risk: diagnosis.main_revenue_risk,
      execution_alignment_score: diagnosis.execution_alignment_score ?? 50,
      context_alignment_score: diagnosis.context_alignment_score ?? 50,
      diagnosis_summary: diagnosis.diagnosis_summary,
      confidence: Math.min(diagnosis.confidence ?? 0.5, 0.99),
      top_constraints: diagnosis.top_constraints ?? [],
      top_leverage_points: diagnosis.top_leverage_points ?? [],
    }).select("id").single();

    // 4. Insert hypotheses
    const hypotheses = diagnosis.hypotheses ?? [];
    for (const h of hypotheses) {
      await sb.from("strategic_hypotheses").insert({
        workspace_id,
        title: h.title,
        description: h.description,
        rationale: h.rationale,
        hypothesis_type: h.hypothesis_type,
        expected_impact: h.expected_impact,
        confidence: Math.min(h.confidence ?? 0.5, 0.99),
        status: "active",
      });
    }

    // 5. Expire old pending recommendations (>14 days)
    await sb.from("strategic_recommendations")
      .update({ status: "expired", updated_at: new Date().toISOString() })
      .eq("workspace_id", workspace_id)
      .eq("status", "pending")
      .lt("created_at", new Date(Date.now() - 14 * 86400000).toISOString());

    // 6. Insert new recommendations
    const recommendations = diagnosis.recommendations ?? [];
    for (const r of recommendations) {
      await sb.from("strategic_recommendations").insert({
        workspace_id,
        title: r.title,
        description: r.description,
        rationale: r.rationale,
        recommendation_type: r.recommendation_type,
        expected_impact: r.expected_impact,
        confidence: Math.min(r.confidence ?? 0.5, 0.99),
        priority: r.priority ?? "medium",
        status: "pending",
      });
    }

    // 7. Emit kernel events
    try {
      await sb.from("kernel_events").insert({
        workspace_id,
        event_type: "STRATEGY.SNAPSHOT_CREATED",
        entity_kind: "strategic_state_snapshot",
        entity_id: snapshot?.id ?? workspace_id,
        source_module: "strategy-layer",
        payload: { growth_mode: diagnosis.growth_mode, bottleneck: diagnosis.bottleneck_type },
        schema_version: 1,
      });
    } catch (_) { /* fire and forget */ }

    return new Response(JSON.stringify({
      snapshot: { id: snapshot?.id, ...diagnosis },
      hypotheses_count: hypotheses.length,
      recommendations_count: recommendations.length,
    }), { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (err) {
    console.error("Strategy layer error:", err);
    return new Response(JSON.stringify({ error: err.message }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});
