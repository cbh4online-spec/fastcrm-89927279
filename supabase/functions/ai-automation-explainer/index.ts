import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface AutomationRule {
  name: string;
  description?: string;
  trigger: string;
  trigger_config?: Record<string, unknown>;
  conditions?: Array<{
    field_name: string;
    operator: string;
    value: string | null;
  }>;
  actions?: Array<{
    action_type: string;
    config: Record<string, unknown>;
  }>;
  is_active: boolean;
}

interface AIExplanation {
  summary: string;
  triggerExplanation: string;
  conditionsExplanation: string;
  actionsExplanation: string;
  potentialIssues: string[];
  suggestions: string[];
  estimatedFrequency: string;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { rule, plainLanguageSummary } = await req.json() as {
      rule: AutomationRule;
      plainLanguageSummary: string;
    };

    const lovableApiKey = Deno.env.get("LOVABLE_API_KEY");
    if (!lovableApiKey) {
      return new Response(
        JSON.stringify({ error: "LOVABLE_API_KEY not configured" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const systemPrompt = `You are an AI assistant that explains CRM automation rules in simple, clear language.
Your explanations should be:
- Written in European Portuguese
- Easy to understand by non-technical users
- Focused on practical implications
- Honest about potential issues

CRITICAL SAFETY RULES - You are ONLY allowed to:
1. EXPLAIN automations in simple language
2. SUGGEST improvements (user must implement manually)
3. IDENTIFY potential issues

You are NEVER allowed to:
1. Activate or deactivate automations
2. Modify active automations
3. Send messages or trigger actions
4. Make any changes - only explain and suggest

All suggestions you make REQUIRE user confirmation before being applied.`;

    const userPrompt = `Analyze and explain this automation rule:

Name: ${rule.name}
Description: ${rule.description || "No description"}
Active: ${rule.is_active ? "Yes" : "No"}
Plain language summary: ${plainLanguageSummary}

Trigger: ${rule.trigger}
${rule.trigger_config ? `Trigger Config: ${JSON.stringify(rule.trigger_config)}` : ""}

Conditions: ${rule.conditions && rule.conditions.length > 0 
  ? rule.conditions.map(c => `${c.field_name} ${c.operator} ${c.value || ""}`).join(", ")
  : "None"}

Actions: ${rule.actions && rule.actions.length > 0 
  ? rule.actions.map(a => `${a.action_type}: ${JSON.stringify(a.config)}`).join("; ")
  : "None"}

Provide a comprehensive explanation using the explain_automation function.`;

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
              name: "explain_automation",
              description: "Provide a structured explanation of an automation rule",
              parameters: {
                type: "object",
                properties: {
                  summary: {
                    type: "string",
                    description: "A 2-3 sentence summary of what this automation does, written for a non-technical user",
                  },
                  triggerExplanation: {
                    type: "string",
                    description: "Explanation of when/how this automation is triggered",
                  },
                  conditionsExplanation: {
                    type: "string",
                    description: "Explanation of the conditions that must be met, or 'Sem condições - executa sempre que o gatilho ocorre' if none",
                  },
                  actionsExplanation: {
                    type: "string",
                    description: "Step-by-step explanation of what actions are taken",
                  },
                  potentialIssues: {
                    type: "array",
                    items: { type: "string" },
                    description: "Potential issues or risks with this automation (empty array if none)",
                  },
                  suggestions: {
                    type: "array",
                    items: { type: "string" },
                    description: "Suggestions for improvement (empty array if automation is well-configured). IMPORTANT: These are just suggestions - user must implement manually",
                  },
                  estimatedFrequency: {
                    type: "string",
                    description: "Estimated frequency of execution (e.g., 'Aproximadamente 5-10 vezes por dia' or 'Sempre que um lead é criado')",
                  },
                },
                required: [
                  "summary",
                  "triggerExplanation",
                  "conditionsExplanation",
                  "actionsExplanation",
                  "potentialIssues",
                  "suggestions",
                  "estimatedFrequency",
                ],
                additionalProperties: false,
              },
            },
          },
        ],
        tool_choice: { type: "function", function: { name: "explain_automation" } },
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

    if (!toolCall || toolCall.function.name !== "explain_automation") {
      throw new Error("Invalid AI response format");
    }

    const explanation: AIExplanation = JSON.parse(toolCall.function.arguments);

    return new Response(
      JSON.stringify({ explanation }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error) {
    console.error("Error in ai-automation-explainer:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
