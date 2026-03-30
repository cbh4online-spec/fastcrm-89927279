import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { workspace_id, snapshot_type = "board" } = await req.json();
    if (!workspace_id) {
      return new Response(JSON.stringify({ error: "workspace_id required" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const lovableKey = Deno.env.get("LOVABLE_API_KEY");
    const sb = createClient(supabaseUrl, serviceKey);

    // ── Collect signals ──
    const [
      { data: bizCtx },
      { data: opsState },
      { data: stratSnap },
      { data: objectives },
      { data: recommendations },
      { data: forecastRun },
    ] = await Promise.all([
      sb.from("business_context").select("*").eq("workspace_id", workspace_id).maybeSingle(),
      sb.from("workspace_operating_state").select("*").eq("workspace_id", workspace_id).maybeSingle(),
      sb.from("strategic_state_snapshots").select("*").eq("workspace_id", workspace_id).order("created_at", { ascending: false }).limit(1).maybeSingle(),
      sb.from("business_objectives").select("id, title, status, progress, target_value, current_value").eq("workspace_id", workspace_id).limit(20),
      sb.from("strategic_recommendations").select("id, title, rationale, priority, status").eq("workspace_id", workspace_id).eq("status", "pending").limit(10),
      sb.from("forecast_runs").select("id, forecast_type, result_json, confidence").eq("workspace_id", workspace_id).order("created_at", { ascending: false }).limit(1).maybeSingle(),
    ]);

    const objectivesOnTrack = (objectives || []).filter((o: any) => o.status === "on_track").length;
    const objectivesAtRisk = (objectives || []).filter((o: any) => o.status === "at_risk" || o.status === "behind").length;

    const signalsSummary = {
      revenue_target: bizCtx?.monthly_revenue_target || bizCtx?.revenue_target || null,
      average_ticket: bizCtx?.average_ticket || null,
      sla_days: bizCtx?.sla_response_days || null,
      execution_health: opsState?.execution_health ?? 50,
      revenue_health: opsState?.revenue_health ?? 50,
      pipeline_health: opsState?.pipeline_health ?? 50,
      context_health: opsState?.context_health ?? 50,
      response_health: opsState?.response_health ?? 50,
      automation_health: opsState?.automation_health ?? 50,
      growth_mode: stratSnap?.growth_mode || "stabilization",
      bottleneck: stratSnap?.bottleneck_type || "unknown",
      strategic_focus: stratSnap?.strategic_focus || null,
      strategic_health: stratSnap?.strategic_health_score ?? 50,
      objectives_on_track: objectivesOnTrack,
      objectives_at_risk: objectivesAtRisk,
      pending_recommendations: (recommendations || []).length,
      forecast_confidence: forecastRun?.confidence ?? null,
      forecast_result: forecastRun?.result_json ?? null,
    };

    // ── AI diagnosis ──
    if (!lovableKey) {
      // Fallback: create snapshot from raw signals without AI
      const snapshot = {
        workspace_id,
        snapshot_type,
        title: `Executive Brief — ${new Date().toLocaleDateString("pt-PT")}`,
        summary: `Health: exec ${signalsSummary.execution_health}, strat ${signalsSummary.strategic_health}, ctx ${signalsSummary.context_health}. Objectives on track: ${objectivesOnTrack}, at risk: ${objectivesAtRisk}. Growth mode: ${signalsSummary.growth_mode}. Bottleneck: ${signalsSummary.bottleneck}.`,
        execution_health: signalsSummary.execution_health,
        strategic_health: signalsSummary.strategic_health,
        context_health: signalsSummary.context_health,
        risk_level: objectivesAtRisk > 2 ? "high" : objectivesAtRisk > 0 ? "medium" : "low",
        narrative_type: signalsSummary.growth_mode,
        confidence: 0.4,
        wins_json: [],
        risks_json: [],
        priorities_json: [],
        key_decisions_json: [],
      };
      const { data: inserted } = await sb.from("executive_snapshots").insert(snapshot).select("id").single();
      return new Response(JSON.stringify({ snapshot_id: inserted?.id, fallback: true }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const aiResponse = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: { Authorization: `Bearer ${lovableKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [
          {
            role: "system",
            content: `You are a senior business analyst. Given workspace signals, produce an executive board brief. Be concise, data-driven, and actionable. Always respond in Portuguese (Portugal). The snapshot_type is "${snapshot_type}". If investor mode, emphasize growth, efficiency, predictability and scale readiness. If board mode, emphasize execution, risk, priorities and decisions.`,
          },
          {
            role: "user",
            content: `Workspace signals:\n${JSON.stringify(signalsSummary, null, 2)}\n\nObjectives:\n${JSON.stringify((objectives || []).slice(0, 10), null, 2)}\n\nPending recommendations:\n${JSON.stringify((recommendations || []).slice(0, 5), null, 2)}`,
          },
        ],
        tools: [
          {
            type: "function",
            function: {
              name: "generate_executive_brief",
              description: "Generate a structured executive brief for the workspace.",
              parameters: {
                type: "object",
                properties: {
                  summary: { type: "string", description: "Executive summary in 2-3 sentences" },
                  narrative_type: { type: "string", enum: ["growth", "stabilization", "recovery", "restructuring", "scale_preparation"] },
                  risk_level: { type: "string", enum: ["low", "medium", "high", "critical"] },
                  focus_priority: { type: "string", description: "Top priority focus area" },
                  wins: { type: "array", items: { type: "string" }, description: "3 key wins" },
                  risks: { type: "array", items: { type: "string" }, description: "3 key risks" },
                  priorities: { type: "array", items: { type: "string" }, description: "3 priorities for next period" },
                  key_decisions: {
                    type: "array",
                    items: {
                      type: "object",
                      properties: {
                        title: { type: "string" },
                        decision_type: { type: "string", enum: ["increase_followup", "focus_high_ticket", "reinforce_recovery", "rebalance_agents", "reduce_backlog", "update_context", "change_channel_mix"] },
                        rationale: { type: "string" },
                        recommended_option: { type: "string" },
                        expected_impact: { type: "string" },
                      },
                      required: ["title", "decision_type", "rationale"],
                    },
                    description: "Key decisions needed",
                  },
                  outlook_30d: { type: "string", description: "30-day outlook" },
                  outlook_90d: { type: "string", description: "90-day outlook" },
                  confidence: { type: "number", description: "Confidence 0-1" },
                },
                required: ["summary", "narrative_type", "risk_level", "wins", "risks", "priorities", "key_decisions", "outlook_30d", "outlook_90d", "confidence"],
              },
            },
          },
        ],
        tool_choice: { type: "function", function: { name: "generate_executive_brief" } },
      }),
    });

    if (!aiResponse.ok) {
      const status = aiResponse.status;
      const errText = await aiResponse.text();
      console.error("AI gateway error:", status, errText);
      if (status === 429 || status === 402) {
        return new Response(JSON.stringify({ error: status === 429 ? "Rate limit exceeded" : "Payment required" }), {
          status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      return new Response(JSON.stringify({ error: "AI gateway error" }), {
        status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const aiData = await aiResponse.json();
    const toolCall = aiData.choices?.[0]?.message?.tool_calls?.[0];
    let brief: any;
    try {
      brief = JSON.parse(toolCall.function.arguments);
    } catch {
      return new Response(JSON.stringify({ error: "Failed to parse AI response" }), {
        status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // ── Insert snapshot ──
    const snapshot = {
      workspace_id,
      snapshot_type,
      title: `Executive Brief — ${new Date().toLocaleDateString("pt-PT")}`,
      summary: brief.summary,
      execution_health: signalsSummary.execution_health,
      strategic_health: signalsSummary.strategic_health,
      context_health: signalsSummary.context_health,
      risk_level: brief.risk_level,
      focus_priority: brief.focus_priority || null,
      narrative_type: brief.narrative_type,
      confidence: brief.confidence,
      wins_json: brief.wins || [],
      risks_json: brief.risks || [],
      priorities_json: brief.priorities || [],
      key_decisions_json: brief.key_decisions || [],
      outlook_30d: brief.outlook_30d,
      outlook_90d: brief.outlook_90d,
      revenue_target: signalsSummary.revenue_target,
    };

    const { data: inserted, error: insertErr } = await sb.from("executive_snapshots").insert(snapshot).select("id").single();
    if (insertErr) {
      console.error("Insert snapshot error:", insertErr);
      return new Response(JSON.stringify({ error: "Failed to save snapshot" }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // ── Insert decision packs ──
    const decisions = brief.key_decisions || [];
    if (decisions.length > 0) {
      const packs = decisions.map((d: any) => ({
        workspace_id,
        title: d.title,
        decision_type: d.decision_type,
        rationale: d.rationale,
        recommended_option: d.recommended_option || null,
        expected_impact: d.expected_impact || null,
        confidence: brief.confidence,
      }));
      await sb.from("executive_decision_packs").insert(packs);
    }

    // ── Expire old pending packs ──
    const fourteenDaysAgo = new Date(Date.now() - 14 * 86400000).toISOString();
    await sb.from("executive_decision_packs")
      .update({ status: "expired", updated_at: new Date().toISOString() })
      .eq("workspace_id", workspace_id)
      .eq("status", "pending")
      .lt("created_at", fourteenDaysAgo);

    // ── Emit events ──
    try {
      await sb.from("kernel_events").insert([
        { workspace_id, type: "EXECUTIVE.SNAPSHOT_CREATED", entity_kind: "executive_snapshot", entity_id: inserted.id, actor_type: "system", source_module: "executive-brief" },
        { workspace_id, type: "EXECUTIVE.BRIEF_GENERATED", entity_kind: "executive_snapshot", entity_id: inserted.id, actor_type: "system", source_module: "executive-brief" },
      ]);
      if (decisions.length > 0) {
        await sb.from("kernel_events").insert({
          workspace_id, type: "EXECUTIVE.DECISION_PACK_CREATED", entity_kind: "executive_decision_pack", entity_id: inserted.id, actor_type: "system", source_module: "executive-brief",
          payload: { count: decisions.length },
        });
      }
    } catch (e) { console.warn("Event emit failed:", e); }

    return new Response(JSON.stringify({ snapshot_id: inserted.id, brief }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("Executive brief error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
