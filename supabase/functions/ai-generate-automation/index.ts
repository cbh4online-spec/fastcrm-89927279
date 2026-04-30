import { createClient } from "@supabase/supabase-js";
import { logAIUsage } from '../_shared/ai-instrumentation.ts';
import { aiGate } from '../_shared/ai-gate.ts';

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

interface ConversationContext {
  messages: Array<{
    direction: string;
    content: string;
    sent_at: string;
  }>;
  leadName?: string;
  leadEmail?: string;
  channel?: string;
  aiIntent?: string;
  aiSentiment?: string;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // --- Auth: validate JWT ---
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;

    const userClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
    });

    const { data: userData, error: userError } = await userClient.auth.getUser();
    if (userError || !userData?.user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const userId = userData.user.id;

    const { conversation, userRequest, workspace_id } = await req.json() as {
      conversation?: ConversationContext;
      userRequest?: string;
      workspace_id?: string;
    };

    if (!workspace_id) {
      return new Response(JSON.stringify({ error: "workspace_id is required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // --- Verify workspace membership ---
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const serviceClient = createClient(supabaseUrl, serviceKey);

    const { data: membership } = await serviceClient
      .from("workspace_members")
      .select("id")
      .eq("workspace_id", workspace_id)
      .eq("user_id", userId)
      .maybeSingle();

    if (!membership) {
      // Check super admin
      const isSuperAdmin = userData.user.app_metadata?.is_super_admin === true;
      if (!isSuperAdmin) {
        return new Response(JSON.stringify({ error: "Forbidden" }), {
          status: 403,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
    }

    // AI Gate check
    const gate = await aiGate(workspace_id, 'light', 'ai-generate-automation');
    if (!gate.allowed) {
      return new Response(JSON.stringify({ error: 'quota_exceeded', upgrade_required: true }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const lovableApiKey = Deno.env.get("LOVABLE_API_KEY");
    if (!lovableApiKey) {
      return new Response(
        JSON.stringify({ error: "LOVABLE_API_KEY not configured" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const systemPrompt = `You are an AI assistant that helps create CRM automation rules.
You analyze conversations and user requests to suggest appropriate automations.

AVAILABLE TRIGGERS:
- lead_created: When a new lead is created
- lead_status_changed: When lead status changes
- lead_no_response: When a lead doesn't respond (requires no_response_hours in trigger_config)
- opportunity_created: When an opportunity is created
- opportunity_stage_changed: When opportunity stage changes
- contact_created: When a contact is created
- message_received: When a message is received (can filter by channels in trigger_config)
- first_message_from_lead: When a lead sends the first message
- conversation_no_reply: When there's no reply (requires no_reply_hours in trigger_config)
- proposal_viewed: When a proposal is viewed
- proposal_paid: When a proposal is paid
- tag_added: When a tag is added (requires tag_name in trigger_config)
- tag_removed: When a tag is removed

AVAILABLE ACTIONS:
- send_template_message: Send a message using a template (config: { channel: "email"|"whatsapp"|"instagram" })
- create_task: Create a task (config: { title: string, description?: string })
- create_opportunity: Create an opportunity (config: { title?: string })
- add_tag: Add a tag (config: { tag: string })
- assign_owner: Assign owner (config: { owner_id?: string })
- change_lead_status: Change lead status (config: { new_status: string })
- move_opportunity_stage: Move opportunity stage (config: { stage_id?: string })
- notify_user: Notify a user (config: { message: string })

AVAILABLE CONDITION OPERATORS:
- equals, not_equals, contains, not_contains, greater_than, less_than, is_empty, is_not_empty

RULES:
1. Generate automations that are practical and safe
2. Always include an explanation in Portuguese
3. Provide a natural language summary in Portuguese
4. Never auto-send without user approval - all automations require confirmation
5. Focus on helpful, non-intrusive automations`;

    let userPrompt = "";
    
    if (conversation) {
      const recentMessages = conversation.messages.slice(-5).map(m => 
        `[${m.direction}] ${m.content}`
      ).join("\n");
      
      userPrompt = `Based on this conversation, suggest an automation:

Lead: ${conversation.leadName || "Unknown"} (${conversation.leadEmail || "no email"})
Channel: ${conversation.channel || "unknown"}
Intent: ${conversation.aiIntent || "unknown"}
Sentiment: ${conversation.aiSentiment || "unknown"}

Recent messages:
${recentMessages}

${userRequest ? `User request: ${userRequest}` : "Analyze the conversation and suggest a relevant automation."}

Use the generate_automation function to create the automation.`;
    } else if (userRequest) {
      userPrompt = `Create an automation based on this request:
"${userRequest}"

Use the generate_automation function to create the automation.`;
    } else {
      return new Response(
        JSON.stringify({ error: "Either conversation or userRequest is required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${lovableApiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt },
        ],
        tools: [
          {
            type: "function",
            function: {
              name: "generate_automation",
              description: "Generate a CRM automation rule",
              parameters: {
                type: "object",
                properties: {
                  name: { type: "string", description: "Name for the automation rule in Portuguese" },
                  description: { type: "string", description: "Brief description in Portuguese" },
                  trigger: {
                    type: "string",
                    enum: [
                      "lead_created", "lead_status_changed", "lead_no_response",
                      "opportunity_created", "opportunity_stage_changed",
                      "contact_created", "message_received", "first_message_from_lead",
                      "conversation_no_reply", "proposal_viewed", "proposal_paid",
                      "tag_added", "tag_removed"
                    ],
                  },
                  trigger_config: { type: "object" },
                  conditions: {
                    type: "array",
                    items: {
                      type: "object",
                      properties: {
                        field_name: { type: "string" },
                        operator: { type: "string", enum: ["equals", "not_equals", "contains", "not_contains", "greater_than", "less_than", "is_empty", "is_not_empty"] },
                        value: { type: "string" },
                      },
                      required: ["field_name", "operator"],
                    },
                  },
                  actions: {
                    type: "array",
                    items: {
                      type: "object",
                      properties: {
                        action_type: { type: "string", enum: ["send_template_message", "create_task", "create_opportunity", "add_tag", "assign_owner", "change_lead_status", "move_opportunity_stage", "notify_user"] },
                        config: { type: "object" },
                      },
                      required: ["action_type", "config"],
                    },
                  },
                  explanation: { type: "string", description: "Detailed explanation in Portuguese" },
                  natural_language_summary: { type: "string", description: "Plain language summary in Portuguese" },
                },
                required: ["name", "description", "trigger", "actions", "explanation", "natural_language_summary"],
                additionalProperties: false,
              },
            },
          },
        ],
        tool_choice: { type: "function", function: { name: "generate_automation" } },
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(
          JSON.stringify({ error: "Limite de pedidos excedido. Tente novamente mais tarde." }),
          { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      if (response.status === 402) {
        return new Response(
          JSON.stringify({ error: "Créditos de IA insuficientes." }),
          { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      const errorText = await response.text();
      console.error("AI gateway error:", response.status, errorText);
      throw new Error("AI gateway error");
    }

    const data = await response.json();
    // Log AI usage (fire-and-forget)
    try {
      logAIUsage({
        workspace_id: workspace_id,
        feature: "ai-generate-automation",
        model: "google/gemini-3-flash-preview",
        tokens_input: data?.usage?.prompt_tokens ?? 0,
        tokens_output: data?.usage?.completion_tokens ?? 0,
      });
    } catch (_e) { /* logging never blocks */ }

    const toolCall = data.choices?.[0]?.message?.tool_calls?.[0];

    if (!toolCall || toolCall.function.name !== "generate_automation") {
      throw new Error("Invalid AI response format");
    }

    const automation = JSON.parse(toolCall.function.arguments);

    return new Response(
      JSON.stringify({ automation }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error) {
    console.error("Error in ai-generate-automation:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
