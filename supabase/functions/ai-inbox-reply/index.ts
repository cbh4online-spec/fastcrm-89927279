import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

type ReplyAction = 
  | "suggest_reply"
  | "modify_reply"
  | "use_template";

interface Message {
  role: string;
  content: string;
  direction?: string;
}

interface LeadData {
  id?: string;
  name?: string;
  email?: string;
  phone?: string;
  status?: string;
  source?: string;
  tags?: string[];
}

interface OpportunityData {
  id?: string;
  title?: string;
  value?: number;
  stage?: string;
  status?: string;
}

interface TemplateData {
  id?: string;
  name?: string;
  content?: string;
  subject?: string;
  tone?: string;
  goal?: string;
}

interface InboxReplyRequest {
  action: ReplyAction;
  messages?: Message[];
  leadData?: LeadData;
  opportunityData?: OpportunityData;
  channel?: string;
  template?: TemplateData;
  currentReply?: string;
  modifyAction?: "shorten" | "direct" | "rewrite" | "formal" | "friendly";
}

// Channel-specific guidelines
const channelGuidelines: Record<string, string> = {
  whatsapp: `WhatsApp guidelines:
- Keep messages short and conversational (max 150 words)
- Use casual but professional tone
- Use emojis sparingly (1-2 max)
- Break long messages into shorter paragraphs
- No formal greetings like "Dear"`,
  
  instagram: `Instagram DM guidelines:
- Very casual and friendly tone
- Short messages (max 100 words)
- Emojis are acceptable
- Use conversational language
- Quick and dynamic responses`,
  
  email: `Email guidelines:
- Professional and structured
- Include proper greeting and sign-off
- Can be longer (up to 300 words)
- Use proper paragraphs
- Include subject line if needed`,
  
  sms: `SMS guidelines:
- Very short (max 160 characters ideal)
- Direct and to the point
- No emojis or minimal
- Essential information only`,
  
  webchat: `Webchat guidelines:
- Friendly and helpful tone
- Moderate length (50-150 words)
- Quick response style
- Include actionable next steps`,
  
  facebook: `Facebook Messenger guidelines:
- Friendly and approachable
- Short to moderate length
- Can use emojis
- Conversational style`,
};

// Safety rules
const safetyRules = `
CRITICAL SAFETY RULES:
1. NEVER invent or fabricate personal data (names, emails, phones, addresses, dates)
2. Only use information explicitly provided in the lead/opportunity data
3. If information is missing, use placeholders like [nome], [data], [valor]
4. NEVER pretend to have access to information you don't have
5. Always be honest about what you know vs what you're assuming
6. Do not make promises or commitments on behalf of the business
7. Do not provide pricing unless explicitly given
8. Maintain professional boundaries at all times
`;

const buildSystemPrompt = (action: ReplyAction, channel?: string, template?: TemplateData): string => {
  const channelGuide = channel ? channelGuidelines[channel] || channelGuidelines.webchat : channelGuidelines.webchat;
  
  const basePrompt = `You are an AI assistant helping compose professional reply messages for a CRM inbox.
Your role is to SUGGEST replies that will be reviewed by a human before sending.

${safetyRules}

${channelGuide}
`;

  if (action === "suggest_reply") {
    return `${basePrompt}

Your task: Generate 2-3 reply suggestions based on the conversation context.
Each suggestion should:
- Be contextually relevant to the conversation
- Use only information provided in the lead/opportunity data
- Match the channel's communication style
- Be actionable and move the conversation forward

You MUST use the suggest_replies tool.`;
  }

  if (action === "modify_reply") {
    return `${basePrompt}

Your task: Modify the provided reply according to the requested action.
Apply the modification while:
- Keeping the core message intent
- Respecting the channel guidelines
- Not adding information that wasn't in the original

You MUST use the modify_reply tool.`;
  }

  if (action === "use_template") {
    const templateInfo = template ? `
Template details:
- Name: ${template.name}
- Content: ${template.content}
- Tone: ${template.tone || "professional"}
- Goal: ${template.goal || "general"}
` : "";

    return `${basePrompt}

Your task: Personalize the provided template using conversation context and lead data.
${templateInfo}

Rules:
- Fill in template variables with actual data when available
- Use placeholders [campo] for missing required data
- Adapt the template to fit the current conversation context
- Maintain the template's original intent and tone

You MUST use the personalize_template tool.`;
  }

  return basePrompt;
};

const tools = {
  suggest_reply: [
    {
      type: "function",
      function: {
        name: "suggest_replies",
        description: "Suggest reply messages for the conversation",
        parameters: {
          type: "object",
          properties: {
            reasoning: {
              type: "string",
              description: "Brief explanation of why these replies are appropriate"
            },
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
          required: ["reasoning", "suggestions"],
          additionalProperties: false
        }
      }
    }
  ],
  
  modify_reply: [
    {
      type: "function",
      function: {
        name: "modify_reply",
        description: "Modify a reply according to the requested action",
        parameters: {
          type: "object",
          properties: {
            modifiedText: { type: "string", description: "The modified reply text" },
            changes: { type: "string", description: "Brief description of changes made" }
          },
          required: ["modifiedText", "changes"],
          additionalProperties: false
        }
      }
    }
  ],
  
  use_template: [
    {
      type: "function",
      function: {
        name: "personalize_template",
        description: "Personalize a template for the current conversation",
        parameters: {
          type: "object",
          properties: {
            personalizedText: { type: "string", description: "The personalized message based on the template" },
            subject: { type: "string", description: "Personalized subject line if applicable" },
            filledVariables: { 
              type: "array", 
              items: { type: "string" },
              description: "List of variables that were filled with actual data" 
            },
            missingVariables: { 
              type: "array", 
              items: { type: "string" },
              description: "List of variables that couldn't be filled (used placeholders)" 
            }
          },
          required: ["personalizedText"],
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
    const { 
      action, 
      messages, 
      leadData, 
      opportunityData, 
      channel, 
      template,
      currentReply,
      modifyAction 
    }: InboxReplyRequest = await req.json();

    if (!action) {
      return new Response(
        JSON.stringify({ error: "Action is required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY is not configured");
    }

    // Build user content with all context
    let userContent = "";
    
    // Add conversation context
    if (messages && messages.length > 0) {
      userContent += "## Conversation History:\n";
      userContent += messages.map(m => 
        `[${m.direction === "inbound" ? "Customer" : "Agent"}]: ${m.content}`
      ).join("\n");
      userContent += "\n\n";
    }
    
    // Add lead data (only what's available)
    if (leadData) {
      userContent += "## Lead Information:\n";
      if (leadData.name) userContent += `- Name: ${leadData.name}\n`;
      if (leadData.email) userContent += `- Email: ${leadData.email}\n`;
      if (leadData.phone) userContent += `- Phone: ${leadData.phone}\n`;
      if (leadData.status) userContent += `- Status: ${leadData.status}\n`;
      if (leadData.source) userContent += `- Source: ${leadData.source}\n`;
      if (leadData.tags?.length) userContent += `- Tags: ${leadData.tags.join(", ")}\n`;
      userContent += "\n";
    }
    
    // Add opportunity data if available
    if (opportunityData) {
      userContent += "## Opportunity Information:\n";
      if (opportunityData.title) userContent += `- Title: ${opportunityData.title}\n`;
      if (opportunityData.value) userContent += `- Value: €${opportunityData.value}\n`;
      if (opportunityData.stage) userContent += `- Stage: ${opportunityData.stage}\n`;
      if (opportunityData.status) userContent += `- Status: ${opportunityData.status}\n`;
      userContent += "\n";
    }
    
    // Add channel info
    if (channel) {
      userContent += `## Channel: ${channel}\n\n`;
    }
    
    // Action-specific content
    if (action === "modify_reply" && currentReply && modifyAction) {
      userContent += `## Current Reply to Modify:\n${currentReply}\n\n`;
      userContent += `## Requested Modification: ${modifyAction}\n`;
      
      const modifyInstructions: Record<string, string> = {
        shorten: "Make the reply shorter and more concise while keeping the main message",
        direct: "Make the reply more direct and to the point, remove unnecessary pleasantries",
        rewrite: "Rewrite the reply with a fresh approach while maintaining the intent",
        formal: "Make the reply more formal and professional",
        friendly: "Make the reply warmer and more friendly"
      };
      
      userContent += `Instructions: ${modifyInstructions[modifyAction] || modifyAction}\n`;
    }
    
    if (action === "use_template" && template) {
      userContent += `## Template to Personalize:\n${template.content}\n\n`;
      userContent += "Personalize this template using the conversation context and lead data provided above.\n";
    }

    const systemPrompt = buildSystemPrompt(action, channel, template);
    const actionTools = tools[action];

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userContent }
        ],
        tools: actionTools,
        tool_choice: { type: "function", function: { name: actionTools[0].function.name } },
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
    console.error("Inbox reply error:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
