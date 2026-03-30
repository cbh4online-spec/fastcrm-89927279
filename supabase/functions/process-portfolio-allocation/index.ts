import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { workspace_id } = await req.json();
    if (!workspace_id) {
      return new Response(JSON.stringify({ error: "workspace_id required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const sb = createClient(supabaseUrl, serviceKey);

    // Collect signals in parallel
    const [contextRes, healthRes, strategyRes, forecastRes, recommendationsRes] = await Promise.all([
      sb.from("business_context").select("*").eq("workspace_id", workspace_id).maybeSingle(),
      sb.from("workspace_operating_state").select("*").eq("workspace_id", workspace_id).maybeSingle(),
      sb.from("strategic_state_snapshots").select("*").eq("workspace_id", workspace_id).order("created_at", { ascending: false }).limit(1).maybeSingle(),
      sb.from("forecast_runs").select("*").eq("workspace_id", workspace_id).eq("scenario_type", "baseline").order("created_at", { ascending: false }).limit(1).maybeSingle(),
      sb.from("strategic_recommendations").select("*").eq("workspace_id", workspace_id).eq("status", "pending").limit(10),
    ]);

    const context = contextRes.data;
    const health = healthRes.data;
    const strategy = strategyRes.data;
    const forecast = forecastRes.data;
    const recommendations = recommendationsRes.data || [];

    // Load portfolio settings
    const { data: settings } = await sb
      .from("portfolio_settings")
      .select("*")
      .eq("workspace_id", workspace_id)
      .maybeSingle();

    const weights = {
      revenue: settings?.revenue_weight ?? 0.35,
      risk: settings?.risk_weight ?? 0.15,
      effort: settings?.effort_weight ?? 0.20,
      automation: settings?.automation_weight ?? 0.10,
      strategy: settings?.strategy_weight ?? 0.20,
    };

    // Build prompt for AI
    const offers = Array.isArray(context?.offers) ? context.offers : [];
    const signalsSummary = {
      offers: offers.map((o: any) => ({ name: o.name, price: o.price, type: o.type })),
      average_ticket: context?.average_ticket,
      monthly_revenue_target: context?.monthly_revenue_target,
      quarterly_revenue_target: context?.quarterly_revenue_target,
      execution_health: health?.execution_health_score,
      strategic_health: health?.strategic_health_score,
      context_health: health?.context_health_score,
      growth_mode: strategy?.growth_mode,
      bottleneck: strategy?.bottleneck,
      revenue_forecast: forecast?.revenue_forecast,
      pending_recommendations: recommendations.map((r: any) => r.title).slice(0, 5),
      weights,
    };

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      return new Response(JSON.stringify({ error: "LOVABLE_API_KEY not configured" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const aiResponse = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          {
            role: "system",
            content: `You are a Capital Allocation Engine for a CRM workspace. Analyze business signals and generate portfolio entities with capital efficiency scores and allocation recommendations. Consider these weights: revenue=${weights.revenue}, risk=${weights.risk}, effort=${weights.effort}, automation=${weights.automation}, strategy=${weights.strategy}. Always respond using the provided tool.`,
          },
          {
            role: "user",
            content: `Analyze this workspace and generate portfolio allocation:\n${JSON.stringify(signalsSummary, null, 2)}`,
          },
        ],
        tools: [
          {
            type: "function",
            function: {
              name: "generate_portfolio_allocation",
              description: "Generate portfolio entities with efficiency scores and recommendations",
              parameters: {
                type: "object",
                properties: {
                  entities: {
                    type: "array",
                    items: {
                      type: "object",
                      properties: {
                        entity_type: { type: "string", enum: ["offer", "product", "channel", "sequence", "agent", "mission", "objective"] },
                        entity_id: { type: "string" },
                        name: { type: "string" },
                        category: { type: "string" },
                        revenue_actual: { type: "number" },
                        revenue_forecast: { type: "number" },
                        contribution_margin_estimate: { type: "number" },
                        conversion_rate: { type: "number" },
                        ltv_estimate: { type: "number" },
                        workload_cost_estimate: { type: "number" },
                        automation_leverage_score: { type: "integer", minimum: 0, maximum: 100 },
                        risk_score: { type: "integer", minimum: 0, maximum: 100 },
                        strategic_fit_score: { type: "integer", minimum: 0, maximum: 100 },
                        capital_efficiency_score: { type: "integer", minimum: 0, maximum: 100 },
                        allocation_recommendation: { type: "string", enum: ["invest_more", "maintain", "optimize", "deprioritize", "pause", "scale"] },
                        confidence: { type: "number", minimum: 0, maximum: 1 },
                      },
                      required: ["entity_type", "entity_id", "name", "capital_efficiency_score", "allocation_recommendation", "confidence"],
                      additionalProperties: false,
                    },
                  },
                  recommendations: {
                    type: "array",
                    items: {
                      type: "object",
                      properties: {
                        recommendation_type: { type: "string", enum: ["increase_attention", "increase_automation", "shift_channel_mix", "reduce_effort", "pause_investment", "reinforce_offer", "promote_bundle", "reassign_agent_capacity", "simplify_sequence", "focus_high_ltv_segment"] },
                        entity_id: { type: "string" },
                        title: { type: "string" },
                        rationale: { type: "string" },
                        expected_impact: { type: "string" },
                        confidence: { type: "number", minimum: 0, maximum: 1 },
                        priority: { type: "string", enum: ["low", "medium", "high", "critical"] },
                      },
                      required: ["recommendation_type", "title", "rationale", "confidence", "priority"],
                      additionalProperties: false,
                    },
                  },
                },
                required: ["entities", "recommendations"],
                additionalProperties: false,
              },
            },
          },
        ],
        tool_choice: { type: "function", function: { name: "generate_portfolio_allocation" } },
      }),
    });

    if (!aiResponse.ok) {
      const status = aiResponse.status;
      if (status === 429 || status === 402) {
        return new Response(JSON.stringify({ error: status === 429 ? "Rate limit exceeded" : "Payment required" }), {
          status: 200,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      console.error("AI error:", await aiResponse.text());
      return new Response(JSON.stringify({ error: "AI gateway error" }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const aiData = await aiResponse.json();
    const toolCall = aiData.choices?.[0]?.message?.tool_calls?.[0];
    if (!toolCall) {
      return new Response(JSON.stringify({ error: "No tool call in AI response" }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const result = JSON.parse(toolCall.function.arguments);
    const entities = result.entities || [];
    const recs = result.recommendations || [];

    // Upsert entities and metrics
    for (const e of entities) {
      const { data: entityRow } = await sb
        .from("portfolio_entities")
        .upsert(
          {
            workspace_id,
            entity_type: e.entity_type,
            entity_id: e.entity_id,
            name: e.name,
            category: e.category || null,
            status: "active",
            updated_at: new Date().toISOString(),
          },
          { onConflict: "workspace_id,entity_type,entity_id" }
        )
        .select("id")
        .single();

      if (entityRow) {
        // Check existing metric
        const { data: existingMetric } = await sb
          .from("portfolio_metrics")
          .select("id")
          .eq("portfolio_entity_id", entityRow.id)
          .maybeSingle();

        const metricData = {
          workspace_id,
          portfolio_entity_id: entityRow.id,
          revenue_actual: e.revenue_actual ?? 0,
          revenue_forecast: e.revenue_forecast ?? 0,
          contribution_margin_estimate: e.contribution_margin_estimate ?? 0,
          conversion_rate: e.conversion_rate ?? 0,
          ltv_estimate: e.ltv_estimate ?? 0,
          workload_cost_estimate: e.workload_cost_estimate ?? 0,
          automation_leverage_score: e.automation_leverage_score ?? 50,
          risk_score: e.risk_score ?? 50,
          strategic_fit_score: e.strategic_fit_score ?? 50,
          capital_efficiency_score: e.capital_efficiency_score,
          allocation_recommendation: e.allocation_recommendation,
          confidence: e.confidence,
          updated_at: new Date().toISOString(),
        };

        if (existingMetric) {
          await sb.from("portfolio_metrics").update(metricData).eq("id", existingMetric.id);
        } else {
          await sb.from("portfolio_metrics").insert(metricData);
        }

        // Link recommendations to entity
        for (const r of recs) {
          if (r.entity_id === e.entity_id) {
            r._portfolio_entity_id = entityRow.id;
          }
        }
      }
    }

    // Expire old pending recommendations
    await sb
      .from("portfolio_recommendations")
      .update({ status: "expired", updated_at: new Date().toISOString() })
      .eq("workspace_id", workspace_id)
      .eq("status", "pending")
      .lt("created_at", new Date(Date.now() - 14 * 24 * 60 * 60 * 1000).toISOString());

    // Insert new recommendations
    for (const r of recs) {
      await sb.from("portfolio_recommendations").insert({
        workspace_id,
        portfolio_entity_id: r._portfolio_entity_id || null,
        recommendation_type: r.recommendation_type,
        title: r.title,
        rationale: r.rationale || null,
        expected_impact: r.expected_impact || null,
        confidence: r.confidence,
        priority: r.priority,
        status: "pending",
      });
    }

    // Emit kernel events
    const eventBase = {
      workspace_id,
      actor_type: "system",
      actor_id: "portfolio-engine",
      source_module: "portfolio",
    };

    await sb.from("kernel_events").insert({
      ...eventBase,
      type: "PORTFOLIO.SNAPSHOT_UPDATED",
      entity_kind: "portfolio",
      entity_id: workspace_id,
      payload: { entities_count: entities.length },
    });

    if (recs.length > 0) {
      await sb.from("kernel_events").insert({
        ...eventBase,
        type: "PORTFOLIO.RECOMMENDATION_CREATED",
        entity_kind: "portfolio_recommendation",
        entity_id: workspace_id,
        payload: { recommendations_count: recs.length },
      });
    }

    return new Response(
      JSON.stringify({
        success: true,
        entities_count: entities.length,
        recommendations_count: recs.length,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    console.error("process-portfolio-allocation error:", err);
    return new Response(
      JSON.stringify({ error: err instanceof Error ? err.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
