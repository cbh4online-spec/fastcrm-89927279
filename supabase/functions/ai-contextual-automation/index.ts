import { createClient } from "@supabase/supabase-js";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface Context {
  type: "custom_field_created" | "form_created" | "field_updated";
  entityType: string;
  fieldName?: string;
  fieldType?: string;
  formName?: string;
}

interface SuggestedAutomation {
  title: string;
  description: string;
  trigger_type: string;
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
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { workspaceId, context } = await req.json() as {
      workspaceId: string;
      context: Context;
    };

    const lovableApiKey = Deno.env.get("LOVABLE_API_KEY");
    if (!lovableApiKey) {
      return new Response(
        JSON.stringify({ error: "LOVABLE_API_KEY not configured" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Fetch existing automations to avoid duplicates
    const { data: existingAutomations } = await supabase
      .from("automation_rules")
      .select("name, trigger, description")
      .eq("workspace_id", workspaceId);

    const existingRulesInfo = existingAutomations?.map(a => 
      `- ${a.name} (trigger: ${a.trigger})`
    ).join("\n") || "No existing automations";

    const systemPrompt = `You are an AI assistant that suggests contextual automations for a CRM system.

Based on the user's recent action (creating a field, form, etc.), suggest 1-3 relevant automations that could be useful.

CRITICAL SAFETY RULES - You can ONLY:
1. SUGGEST automations (user must create them manually)
2. Provide clear explanations

You CANNOT:
1. Create or activate automations automatically
2. Send messages
3. Modify any existing data

All suggestions REQUIRE explicit user confirmation.

Guidelines:
- Only suggest if there's a clear, useful automation opportunity
- Keep suggestions simple and actionable
- Write in European Portuguese
- Ensure suggestions don't duplicate existing automations`;

    const contextDescriptions: Record<string, string> = {
      custom_field_created: `O utilizador criou um novo campo personalizado "${context.fieldName}" do tipo "${context.fieldType}" na entidade "${context.entityType}"`,
      form_created: `O utilizador criou um novo formulário chamado "${context.formName}"`,
      field_updated: `O utilizador modificou o campo "${context.fieldName}" na entidade "${context.entityType}"`,
    };

    const userPrompt = `${contextDescriptions[context.type]}

Existing automations to avoid duplicating:
${existingRulesInfo}

Suggest relevant automations using the suggest_contextual_automations function. Only suggest if there's a clear value - it's OK to return an empty array if no automation makes sense.`;

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
              name: "suggest_contextual_automations",
              description: "Suggest automations based on the user's recent action",
              parameters: {
                type: "object",
                properties: {
                  suggestions: {
                    type: "array",
                    items: {
                      type: "object",
                      properties: {
                        title: {
                          type: "string",
                          description: "Short, clear title for the automation",
                        },
                        description: {
                          type: "string",
                          description: "Brief description of what this automation does",
                        },
                        trigger_type: {
                          type: "string",
                          enum: [
                            "lead_created", "lead_updated", "custom_field_updated",
                            "opportunity_created", "opportunity_updated",
                            "contact_created", "company_created",
                          ],
                        },
                        conditions: {
                          type: "array",
                          items: {
                            type: "object",
                            properties: {
                              field_name: { type: "string" },
                              operator: { 
                                type: "string",
                                enum: ["equals", "not_equals", "contains", "is_empty", "is_not_empty"],
                              },
                              value: { type: "string", nullable: true },
                            },
                            required: ["field_name", "operator"],
                          },
                        },
                        actions: {
                          type: "array",
                          items: {
                            type: "object",
                            properties: {
                              action_type: {
                                type: "string",
                                enum: ["create_task", "notify_user", "add_tag", "update_field", "create_opportunity"],
                              },
                              config: { type: "object" },
                            },
                            required: ["action_type", "config"],
                          },
                        },
                        explanation: {
                          type: "string",
                          description: "Why this automation would be useful in this context",
                        },
                      },
                      required: ["title", "description", "trigger_type", "conditions", "actions", "explanation"],
                    },
                    maxItems: 3,
                  },
                },
                required: ["suggestions"],
              },
            },
          },
        ],
        tool_choice: { type: "function", function: { name: "suggest_contextual_automations" } },
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(
          JSON.stringify({ error: "Limite de pedidos excedido.", suggestions: [] }),
          { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      if (response.status === 402) {
        return new Response(
          JSON.stringify({ error: "Créditos insuficientes.", suggestions: [] }),
          { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      throw new Error("AI gateway error");
    }

    const data = await response.json();
    const toolCall = data.choices?.[0]?.message?.tool_calls?.[0];

    if (!toolCall) {
      return new Response(
        JSON.stringify({ suggestions: [] }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const result = JSON.parse(toolCall.function.arguments);

    return new Response(
      JSON.stringify({ suggestions: result.suggestions || [] }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error) {
    console.error("Error in ai-contextual-automation:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error", suggestions: [] }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
