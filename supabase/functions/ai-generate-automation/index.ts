import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
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

interface GeneratedAutomation {
  name: string;
  description: string;
  trigger: string;
  trigger_config?: Record<string, unknown>;
  conditions: Array<{
    field_name: string;
    operator: string;
    value: string | null;
  }>;
  actions: Array<{
    action_type: string;
    config: Record<string, unknown>;
  }>;
  explanation: string;
  natural_language_summary: string;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { conversation, userRequest } = await req.json() as {
      conversation?: ConversationContext;
      userRequest?: string;
    };

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
5. Focus on helpful, non-intrusive automations

Common patterns:
- "Se contacto não responder em X dias → enviar follow-up"
- "Se pedir preço → criar oportunidade"
- "Se mensagem recebida → notificar responsável"
- "Se proposta visualizada → criar tarefa de follow-up"`;

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
                  name: {
                    type: "string",
                    description: "Name for the automation rule in Portuguese",
                  },
                  description: {
                    type: "string",
                    description: "Brief description of what the automation does in Portuguese",
                  },
                  trigger: {
                    type: "string",
                    enum: [
                      "lead_created", "lead_status_changed", "lead_no_response",
                      "opportunity_created", "opportunity_stage_changed",
                      "contact_created", "message_received", "first_message_from_lead",
                      "conversation_no_reply", "proposal_viewed", "proposal_paid",
                      "tag_added", "tag_removed"
                    ],
                    description: "The trigger type for the automation",
                  },
                  trigger_config: {
                    type: "object",
                    description: "Configuration for the trigger (e.g., no_response_hours, channels, tag_name)",
                  },
                  conditions: {
                    type: "array",
                    items: {
                      type: "object",
                      properties: {
                        field_name: { type: "string" },
                        operator: { 
                          type: "string",
                          enum: ["equals", "not_equals", "contains", "not_contains", "greater_than", "less_than", "is_empty", "is_not_empty"]
                        },
                        value: { type: "string" },
                      },
                      required: ["field_name", "operator"],
                    },
                    description: "Optional conditions to filter when the automation runs",
                  },
                  actions: {
                    type: "array",
                    items: {
                      type: "object",
                      properties: {
                        action_type: { 
                          type: "string",
                          enum: [
                            "send_template_message", "create_task", "create_opportunity",
                            "add_tag", "assign_owner", "change_lead_status",
                            "move_opportunity_stage", "notify_user"
                          ]
                        },
                        config: { type: "object" },
                      },
                      required: ["action_type", "config"],
                    },
                    description: "Actions to execute when the automation triggers",
                  },
                  explanation: {
                    type: "string",
                    description: "Detailed explanation of what this automation does and why, in Portuguese",
                  },
                  natural_language_summary: {
                    type: "string",
                    description: "Plain language summary like 'Se X acontecer → fazer Y' in Portuguese",
                  },
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
          { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      if (response.status === 402) {
        return new Response(
          JSON.stringify({ error: "Créditos de IA insuficientes." }),
          { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      const errorText = await response.text();
      console.error("AI gateway error:", response.status, errorText);
      throw new Error("AI gateway error");
    }

    const data = await response.json();
    const toolCall = data.choices?.[0]?.message?.tool_calls?.[0];

    if (!toolCall || toolCall.function.name !== "generate_automation") {
      throw new Error("Invalid AI response format");
    }

    const automation: GeneratedAutomation = JSON.parse(toolCall.function.arguments);

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