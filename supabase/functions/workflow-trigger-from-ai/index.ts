import { createClient } from "@supabase/supabase-js";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface WorkflowTriggerRequest {
  workspaceId: string;
  conversationId: string;
  botId: string;
  detectedIntent: string;
  entityType?: string;
  entityId?: string;
  inputData?: Record<string, unknown>;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const body: WorkflowTriggerRequest = await req.json();
    const { workspaceId, conversationId, botId, detectedIntent, entityType, entityId, inputData } = body;

    if (!workspaceId || !conversationId || !botId || !detectedIntent) {
      return new Response(
        JSON.stringify({ error: "workspaceId, conversationId, botId, and detectedIntent are required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log(`[WORKFLOW-TRIGGER-AI] Evaluating triggers for bot=${botId} intent="${detectedIntent}"`);

    // Fetch active triggers for this bot
    const { data: triggers } = await supabaseAdmin
      .from("ai_workflow_triggers")
      .select("*")
      .eq("bot_id", botId)
      .eq("workspace_id", workspaceId)
      .eq("is_active", true);

    if (!triggers || triggers.length === 0) {
      return new Response(
        JSON.stringify({ triggered: false, reason: "no_active_triggers" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Use AI to match intent against trigger conditions
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      return new Response(
        JSON.stringify({ triggered: false, reason: "no_ai_key" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const triggersContext = triggers.map((t, i) =>
      `Trigger ${i + 1} (action: "${t.action_name}", workflow: ${t.workflow_id}): Condition: "${t.trigger_condition_text}"${t.examples?.length ? ` Examples: ${t.examples.join("; ")}` : ""}`
    ).join("\n");

    const aiResponse = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash-lite",
        messages: [
          {
            role: "system",
            content: `You are a workflow trigger evaluator. Given a detected intent from a conversation and a list of workflow triggers, determine which triggers (if any) should fire. Reply ONLY with a JSON object: {"matches": [{"trigger_index": <1-based>, "confidence": <0-1>}]}. Only include triggers with confidence >= 0.7. Return empty matches array if none match.`,
          },
          {
            role: "user",
            content: `Detected intent: "${detectedIntent}"\n\nTriggers:\n${triggersContext}`,
          },
        ],
        temperature: 0.1,
        max_tokens: 200,
      }),
    });

    if (!aiResponse.ok) {
      console.error("[WORKFLOW-TRIGGER-AI] AI call failed:", await aiResponse.text());
      return new Response(
        JSON.stringify({ triggered: false, reason: "ai_error" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const aiData = await aiResponse.json();
    const content = aiData.choices?.[0]?.message?.content || "";
    
    let matches: Array<{ trigger_index: number; confidence: number }> = [];
    try {
      const parsed = JSON.parse(content.replace(/```json?\n?/g, "").replace(/```/g, "").trim());
      matches = parsed.matches || [];
    } catch {
      console.warn("[WORKFLOW-TRIGGER-AI] Could not parse AI response:", content);
      return new Response(
        JSON.stringify({ triggered: false, reason: "parse_error" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (matches.length === 0) {
      return new Response(
        JSON.stringify({ triggered: false, reason: "no_match" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Fire matched workflows (only first match to avoid cascading)
    const triggeredWorkflows: Array<{ workflowId: string; actionName: string; confidence: number }> = [];

    for (const match of matches.slice(0, 1)) {
      const trigger = triggers[match.trigger_index - 1];
      if (!trigger) continue;

      // Safety: prevent bot-triggered workflows from triggering other bots
      const safeInputData = {
        ...(inputData || {}),
        _triggered_by_ai: true,
        _source_bot_id: botId,
        _conversation_id: conversationId,
        _intent: detectedIntent,
      };

      // Call existing workflow-trigger function
      const { error: wfError } = await supabaseAdmin.functions.invoke("workflow-trigger", {
        body: {
          workspaceId,
          workflowCode: trigger.workflow_id,
          triggerType: "ai_intent",
          triggerSource: "ai_bot",
          entityType: entityType || "conversation",
          entityId: entityId || conversationId,
          inputData: safeInputData,
        },
      });

      if (wfError) {
        console.error(`[WORKFLOW-TRIGGER-AI] Failed to fire workflow ${trigger.workflow_id}:`, wfError);
      } else {
        triggeredWorkflows.push({
          workflowId: trigger.workflow_id,
          actionName: trigger.action_name,
          confidence: match.confidence,
        });
        console.log(`[WORKFLOW-TRIGGER-AI] Fired workflow ${trigger.workflow_id} action="${trigger.action_name}"`);
      }
    }

    // Log event
    if (triggeredWorkflows.length > 0) {
      await supabaseAdmin
        .from("autopilot_events")
        .insert({
          workspace_id: workspaceId,
          conversation_id: conversationId,
          event_type: "workflow_triggered_by_ai",
          bot_id: botId,
          metadata: {
            intent: detectedIntent,
            triggered_workflows: triggeredWorkflows,
          },
        });
    }

    return new Response(
      JSON.stringify({
        triggered: triggeredWorkflows.length > 0,
        workflows: triggeredWorkflows,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("[WORKFLOW-TRIGGER-AI] Error:", error);
    return new Response(
      JSON.stringify({ error: error.message || "Internal server error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
