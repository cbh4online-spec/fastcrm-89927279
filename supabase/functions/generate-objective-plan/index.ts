import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS")
    return new Response(null, { headers: corsHeaders });

  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const { workspace_id, objective_id } = await req.json();
    if (!workspace_id || !objective_id) {
      return new Response(
        JSON.stringify({ error: "workspace_id and objective_id required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Load objective
    const { data: objective, error: objErr } = await supabase
      .from("business_objectives")
      .select("*")
      .eq("id", objective_id)
      .eq("workspace_id", workspace_id)
      .maybeSingle();

    if (objErr || !objective) {
      return new Response(
        JSON.stringify({ error: "Objective not found" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Load current metrics
    const { data: metrics } = await supabase
      .from("objective_metrics")
      .select("*")
      .eq("objective_id", objective_id)
      .eq("workspace_id", workspace_id);

    // Load open NBAs
    const { data: nbas } = await supabase
      .from("next_best_actions")
      .select("id, action_type, title, description, priority, entity_type, entity_id, payload_json")
      .eq("workspace_id", workspace_id)
      .eq("status", "pending")
      .limit(20);

    // Load business context
    const { data: bizCtx } = await supabase
      .from("business_context")
      .select("*")
      .eq("workspace_id", workspace_id)
      .maybeSingle();

    // Build prompt
    const daysLeft = objective.period_end
      ? Math.max(1, Math.ceil((new Date(objective.period_end).getTime() - Date.now()) / 86400000))
      : 30;

    const prompt = `You are a business operations AI. Generate an operational plan to achieve this objective.

OBJECTIVE:
- Title: ${objective.title}
- Type: ${objective.objective_type}
- Target: ${objective.target_value} ${objective.unit}
- Current: ${objective.current_value} ${objective.unit}
- Days remaining: ${daysLeft}
- Priority: ${objective.priority}
${objective.description ? `- Description: ${objective.description}` : ""}

CURRENT METRICS:
${(metrics || []).map((m: any) => `- ${m.metric_label}: ${m.current_value}/${m.target_value} ${m.unit}`).join("\n") || "None yet"}

AVAILABLE NEXT BEST ACTIONS (${(nbas || []).length}):
${(nbas || []).slice(0, 10).map((n: any) => `- [${n.action_type}] ${n.title} (priority: ${n.priority})`).join("\n") || "None"}

BUSINESS CONTEXT:
- Company: ${bizCtx?.company_name || "Unknown"}
- Sector: ${bizCtx?.industry || "Unknown"}

Generate a JSON plan with this structure:
{
  "initiatives": [
    {
      "title": "string",
      "description": "string",
      "priority": "high|medium|low",
      "action_groups": [
        {
          "action_type": "create_task|enroll_in_sequence|send_email|schedule_meeting|create_followup_note|trigger_abandoned_cart_recovery",
          "title": "string",
          "description": "string",
          "entity_type": "contact|deal|lead|cart|null",
          "estimated_impact_value": number,
          "day_offset": number
        }
      ]
    }
  ],
  "expected_total_impact": number,
  "confidence": "high|medium|low",
  "summary": "string"
}

Rules:
- Focus on actionable steps that map to existing action types
- Distribute actions across the remaining days
- Be realistic about expected impact
- Prioritize high-impact, low-risk actions first
- Keep it pragmatic and executable`;

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      return new Response(
        JSON.stringify({ error: "LOVABLE_API_KEY not configured" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const aiResp = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [
          { role: "system", content: "You are a business operations planner. Return only valid JSON." },
          { role: "user", content: prompt },
        ],
        tools: [
          {
            type: "function",
            function: {
              name: "create_objective_plan",
              description: "Create an operational plan for a business objective",
              parameters: {
                type: "object",
                properties: {
                  initiatives: {
                    type: "array",
                    items: {
                      type: "object",
                      properties: {
                        title: { type: "string" },
                        description: { type: "string" },
                        priority: { type: "string", enum: ["high", "medium", "low"] },
                        action_groups: {
                          type: "array",
                          items: {
                            type: "object",
                            properties: {
                              action_type: { type: "string" },
                              title: { type: "string" },
                              description: { type: "string" },
                              entity_type: { type: "string" },
                              estimated_impact_value: { type: "number" },
                              day_offset: { type: "number" },
                            },
                            required: ["action_type", "title", "day_offset"],
                          },
                        },
                      },
                      required: ["title", "priority", "action_groups"],
                    },
                  },
                  expected_total_impact: { type: "number" },
                  confidence: { type: "string", enum: ["high", "medium", "low"] },
                  summary: { type: "string" },
                },
                required: ["initiatives", "expected_total_impact", "confidence", "summary"],
              },
            },
          },
        ],
        tool_choice: { type: "function", function: { name: "create_objective_plan" } },
      }),
    });

    if (!aiResp.ok) {
      const status = aiResp.status;
      if (status === 429 || status === 402) {
        return new Response(
          JSON.stringify({
            error: status === 429 ? "Rate limit exceeded" : "Payment required",
          }),
          { status, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      console.error("AI error:", await aiResp.text());
      return new Response(
        JSON.stringify({ error: "AI generation failed" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const aiData = await aiResp.json();
    let planJson: any = {};
    try {
      const toolCall = aiData.choices?.[0]?.message?.tool_calls?.[0];
      if (toolCall?.function?.arguments) {
        planJson = JSON.parse(toolCall.function.arguments);
      }
    } catch {
      console.error("Failed to parse AI plan");
      return new Response(
        JSON.stringify({ error: "Failed to parse generated plan" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Supersede old plans
    await supabase
      .from("objective_plans")
      .update({ status: "superseded", updated_at: new Date().toISOString() })
      .eq("objective_id", objective_id)
      .eq("workspace_id", workspace_id)
      .in("status", ["draft", "active"]);

    // Insert new plan
    const { data: plan, error: planErr } = await supabase
      .from("objective_plans")
      .insert({
        workspace_id,
        objective_id,
        title: `Plano: ${objective.title}`,
        plan_json: planJson,
        status: "active",
        generated_by: "ai",
      })
      .select("id")
      .single();

    if (planErr) {
      console.error("Plan insert error:", planErr);
      return new Response(
        JSON.stringify({ error: "Failed to save plan" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Emit kernel event
    try {
      await supabase.from("kernel_events").insert({
        workspace_id,
        type: "OBJECTIVE.PLAN_GENERATED",
        entity_kind: "business_objective",
        entity_id: objective_id,
        actor_type: "system",
        source_module: "generate-objective-plan",
        payload: { plan_id: plan.id, initiatives_count: planJson.initiatives?.length || 0 },
        status: "pending",
        schema_version: 1,
      });
    } catch (e) {
      console.warn("Kernel event emit failed:", e);
    }

    return new Response(
      JSON.stringify({ plan_id: plan.id, plan: planJson }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    console.error("generate-objective-plan error:", err);
    return new Response(
      JSON.stringify({ error: (err as Error).message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
