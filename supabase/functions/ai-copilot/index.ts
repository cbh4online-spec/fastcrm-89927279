import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

type CopilotAction = 
  | "classify_intent"
  | "extract_contact"
  | "suggest_reply"
  | "summarize_conversation"
  | "suggest_next_actions";

interface CopilotRequest {
  action: CopilotAction;
  messages?: { role: string; content: string; direction?: string }[];
  leadData?: Record<string, unknown>;
  conversationContext?: string;
}

const systemPrompts: Record<CopilotAction, string> = {
  classify_intent: `You are an AI assistant that classifies customer intents.
Analyze the message(s) and classify the primary intent into one of these categories:
- sales: Customer interested in purchasing, pricing, or product features
- support: Customer needs help with an issue, bug, or problem
- question: General inquiry or information request

You MUST use the classify_intent tool to provide your analysis.`,

  extract_contact: `You are an AI assistant that extracts contact information from messages.
Extract any contact details found in the text including:
- Name (full name or partial)
- Email addresses
- Phone numbers
- Company name
- Job title
- Address or location

You MUST use the extract_contact tool to provide the extracted data. Only extract what is explicitly mentioned.`,

  suggest_reply: `You are an AI assistant that suggests professional reply messages.
Based on the conversation history, suggest 2-3 appropriate reply options.
Each reply should be:
- Professional and friendly
- Contextually relevant
- Actionable

You MUST use the suggest_replies tool to provide your suggestions.`,

  summarize_conversation: `You are an AI assistant that summarizes conversations.
Create a concise summary of the conversation that includes:
- Main topic/issue discussed
- Key points or requests
- Current status or outcome
- Any pending actions

You MUST use the summarize_conversation tool to provide the summary.`,

  suggest_next_actions: `You are a CRM AI assistant that suggests next actions for leads and opportunities.
Based on the current state and history, suggest 2-4 actionable next steps.
Each action should be:
- Specific and actionable
- Time-bound when appropriate
- Prioritized by importance

You MUST use the suggest_actions tool to provide your recommendations.`,
};

interface ToolDefinition {
  type: string;
  function: {
    name: string;
    description: string;
    parameters: Record<string, unknown>;
  };
}

const tools: Record<CopilotAction, ToolDefinition[]> = {
  classify_intent: [
    {
      type: "function",
      function: {
        name: "classify_intent",
        description: "Classify the customer intent based on the message analysis",
        parameters: {
          type: "object",
          properties: {
            intent: { 
              type: "string", 
              enum: ["sales", "support", "question"],
              description: "The primary intent classification"
            },
            confidence: { 
              type: "number", 
              description: "Confidence score from 0 to 1" 
            },
            reasoning: { 
              type: "string", 
              description: "Brief explanation for the classification" 
            },
            subIntent: { 
              type: "string", 
              description: "More specific intent category if applicable" 
            }
          },
          required: ["intent", "confidence", "reasoning"],
          additionalProperties: false
        }
      }
    }
  ],
  
  extract_contact: [
    {
      type: "function",
      function: {
        name: "extract_contact",
        description: "Extract contact information from the provided text",
        parameters: {
          type: "object",
          properties: {
            name: { type: "string", description: "Full name if found" },
            email: { type: "string", description: "Email address if found" },
            phone: { type: "string", description: "Phone number if found" },
            company: { type: "string", description: "Company name if found" },
            title: { type: "string", description: "Job title if found" },
            location: { type: "string", description: "Location or address if found" },
            confidence: { type: "number", description: "Overall confidence score 0-1" }
          },
          required: ["confidence"],
          additionalProperties: false
        }
      }
    }
  ],
  
  suggest_reply: [
    {
      type: "function",
      function: {
        name: "suggest_replies",
        description: "Suggest reply messages for the conversation",
        parameters: {
          type: "object",
          properties: {
            suggestions: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  text: { type: "string", description: "The suggested reply text" },
                  tone: { type: "string", enum: ["formal", "friendly", "empathetic", "professional"] },
                  intent: { type: "string", description: "What this reply aims to achieve" }
                },
                required: ["text", "tone", "intent"],
                additionalProperties: false
              }
            }
          },
          required: ["suggestions"],
          additionalProperties: false
        }
      }
    }
  ],
  
  summarize_conversation: [
    {
      type: "function",
      function: {
        name: "summarize_conversation",
        description: "Provide a structured summary of the conversation",
        parameters: {
          type: "object",
          properties: {
            summary: { type: "string", description: "Brief overall summary" },
            mainTopic: { type: "string", description: "The main topic discussed" },
            keyPoints: { 
              type: "array", 
              items: { type: "string" },
              description: "Key points from the conversation"
            },
            sentiment: { type: "string", enum: ["positive", "neutral", "negative"] },
            status: { type: "string", description: "Current status or outcome" },
            pendingActions: {
              type: "array",
              items: { type: "string" },
              description: "Any pending actions mentioned"
            }
          },
          required: ["summary", "mainTopic", "keyPoints", "sentiment"],
          additionalProperties: false
        }
      }
    }
  ],
  
  suggest_next_actions: [
    {
      type: "function",
      function: {
        name: "suggest_actions",
        description: "Suggest next actions for the CRM record",
        parameters: {
          type: "object",
          properties: {
            actions: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  action: { type: "string", description: "The specific action to take" },
                  priority: { type: "string", enum: ["high", "medium", "low"] },
                  category: { type: "string", enum: ["call", "email", "meeting", "task", "follow_up", "update"] },
                  timeframe: { type: "string", description: "Suggested timeframe" },
                  reasoning: { type: "string", description: "Why this action is recommended" }
                },
                required: ["action", "priority", "category"],
                additionalProperties: false
              }
            }
          },
          required: ["actions"],
          additionalProperties: false
        }
      }
    }
  ]
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { action, messages, leadData, conversationContext }: CopilotRequest = await req.json();

    if (!action || !systemPrompts[action]) {
      return new Response(
        JSON.stringify({ error: "Invalid action specified" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY is not configured");
    }

    // Build user content based on action
    let userContent = "";
    
    if (action === "classify_intent" || action === "suggest_reply" || action === "summarize_conversation" || action === "extract_contact") {
      if (messages && messages.length > 0) {
        userContent = "Conversation:\n" + messages.map(m => 
          `[${m.direction || m.role}]: ${m.content}`
        ).join("\n");
      }
    }
    
    if (action === "suggest_next_actions" && leadData) {
      userContent = `Lead/Opportunity Data:\n${JSON.stringify(leadData, null, 2)}`;
      if (conversationContext) {
        userContent += `\n\nRecent Activity:\n${conversationContext}`;
      }
    }

    if (!userContent) {
      return new Response(
        JSON.stringify({ error: "No content provided for analysis" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [
          { role: "system", content: systemPrompts[action] },
          { role: "user", content: userContent }
        ],
        tools: tools[action],
        tool_choice: { type: "function", function: { name: tools[action][0].function.name } },
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(
          JSON.stringify({ error: "Rate limit exceeded. Please try again later." }),
          { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      if (response.status === 402) {
        return new Response(
          JSON.stringify({ error: "AI credits exhausted. Please add credits to continue." }),
          { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      const errorText = await response.text();
      console.error("AI gateway error:", response.status, errorText);
      return new Response(
        JSON.stringify({ error: "AI service temporarily unavailable" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const data = await response.json();
    
    // Extract tool call result
    const toolCall = data.choices?.[0]?.message?.tool_calls?.[0];
    if (!toolCall?.function?.arguments) {
      return new Response(
        JSON.stringify({ error: "AI did not provide structured response" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const result = JSON.parse(toolCall.function.arguments);

    return new Response(
      JSON.stringify({ action, result }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error) {
    console.error("Copilot error:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
