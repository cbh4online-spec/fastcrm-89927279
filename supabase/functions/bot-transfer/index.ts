import { createClient } from "@supabase/supabase-js";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface BotTransferRequest {
  workspaceId: string;
  conversationId: string;
  fromBotId: string;
  detectedIntent?: string;
  forceTransferToBotId?: string; // Skip rule evaluation, direct transfer
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const body: BotTransferRequest = await req.json();
    const { workspaceId, conversationId, fromBotId, detectedIntent, forceTransferToBotId } = body;

    if (!workspaceId || !conversationId || !fromBotId) {
      return new Response(
        JSON.stringify({ error: "workspaceId, conversationId, and fromBotId are required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log(`[BOT-TRANSFER] Evaluating transfer for conversation=${conversationId} from bot=${fromBotId}`);

    let targetBotId: string | null = forceTransferToBotId || null;
    let matchedRuleId: string | null = null;

    // If no forced transfer, evaluate rules
    if (!targetBotId) {
      const { data: rules } = await supabaseAdmin
        .from("bot_transfer_rules")
        .select("*")
        .eq("from_bot_id", fromBotId)
        .eq("workspace_id", workspaceId)
        .eq("is_active", true);

      if (!rules || rules.length === 0) {
        return new Response(
          JSON.stringify({ transferred: false, reason: "no_active_rules" }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      // Use AI to match intent against rules
      if (detectedIntent) {
        const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
        if (LOVABLE_API_KEY) {
          const rulesContext = rules.map((r, i) => 
            `Rule ${i + 1} (to_bot: ${r.to_bot_id}): Condition: "${r.trigger_condition_text}"${r.examples?.length ? ` Examples: ${r.examples.join(", ")}` : ""}`
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
                  content: `You are a bot transfer router. Given a user intent and a list of transfer rules, determine if any rule matches. Reply ONLY with a JSON object: {"matched_rule_index": <number or null>, "confidence": <0-1>}. Rule index is 1-based. If no match or confidence < 0.7, return null.`,
                },
                {
                  role: "user",
                  content: `User intent: "${detectedIntent}"\n\nRules:\n${rulesContext}`,
                },
              ],
              temperature: 0.1,
              max_tokens: 100,
            }),
          });

          if (aiResponse.ok) {
            const aiData = await aiResponse.json();
            const content = aiData.choices?.[0]?.message?.content || "";
            try {
              const parsed = JSON.parse(content.replace(/```json?\n?/g, "").replace(/```/g, "").trim());
              if (parsed.matched_rule_index && parsed.confidence >= 0.7) {
                const matchedRule = rules[parsed.matched_rule_index - 1];
                if (matchedRule) {
                  targetBotId = matchedRule.to_bot_id;
                  matchedRuleId = matchedRule.id;
                  console.log(`[BOT-TRANSFER] AI matched rule ${parsed.matched_rule_index} with confidence ${parsed.confidence}`);
                }
              }
            } catch {
              console.warn("[BOT-TRANSFER] Could not parse AI response:", content);
            }
          }
        }
      }
    }

    if (!targetBotId) {
      return new Response(
        JSON.stringify({ transferred: false, reason: "no_match" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Execute transfer: update conversation_ai_state
    const { error: stateError } = await supabaseAdmin
      .from("conversation_ai_state")
      .upsert({
        workspace_id: workspaceId,
        conversation_id: conversationId,
        active_bot_id: targetBotId,
        is_bot_sleeping: false,
        handed_over: false,
        fail_count: 0,
        updated_at: new Date().toISOString(),
      }, {
        onConflict: "conversation_id",
      });

    if (stateError) {
      console.error("[BOT-TRANSFER] State update error:", stateError);
      throw stateError;
    }

    // Log event
    await supabaseAdmin
      .from("autopilot_events")
      .insert({
        workspace_id: workspaceId,
        conversation_id: conversationId,
        event_type: "bot_transfer",
        bot_id: fromBotId,
        metadata: {
          from_bot_id: fromBotId,
          to_bot_id: targetBotId,
          matched_rule_id: matchedRuleId,
          detected_intent: detectedIntent,
        },
      });

    console.log(`[BOT-TRANSFER] Transferred conversation=${conversationId} from ${fromBotId} to ${targetBotId}`);

    return new Response(
      JSON.stringify({
        transferred: true,
        fromBotId,
        toBotId: targetBotId,
        matchedRuleId,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("[BOT-TRANSFER] Error:", error);
    return new Response(
      JSON.stringify({ error: error.message || "Internal server error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
