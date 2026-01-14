import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

type TemplateAction = 
  | "generate_template"
  | "personalize_template"
  | "improve_template"
  | "suggest_subject_lines"
  | "suggest_ctas";

type TemplateChannel = "email" | "whatsapp" | "instagram_dm" | "sms" | "proposal";
type TemplateTone = "formal" | "direct" | "friendly" | "casual";
type TemplateGoal = "qualification" | "follow_up" | "booking" | "closing" | "support" | "other";

interface TemplateContext {
  lead?: {
    id?: string;
    name?: string;
    email?: string;
    phone?: string;
    status?: string;
    source?: string;
  };
  opportunity?: {
    id?: string;
    title?: string;
    value?: number;
    stage?: string;
    status?: string;
  };
  company?: {
    name?: string;
    industry?: string;
    size?: string;
  };
  contact?: {
    name?: string;
    email?: string;
    job_title?: string;
  };
  user?: {
    full_name?: string;
    email?: string;
  };
  conversationHistory?: string[];
}

interface TemplateRequest {
  action: TemplateAction;
  // For generate
  description?: string;
  channel?: TemplateChannel;
  tone?: TemplateTone;
  goal?: TemplateGoal;
  language?: string;
  // For personalize/improve
  template?: {
    content: string;
    subject?: string;
    type?: TemplateChannel;
    goal?: TemplateGoal;
    tone?: TemplateTone;
  };
  context?: TemplateContext;
  instructions?: string;
}

const channelGuidelines: Record<TemplateChannel, string> = {
  email: `
- Professional greeting and sign-off
- Clear subject line connection
- Can be longer and more detailed
- Use paragraphs for readability
- Include clear call-to-action`,
  whatsapp: `
- Keep it concise (under 300 characters ideal)
- Friendly, conversational tone
- Use emojis sparingly if appropriate
- No formal sign-off needed
- Direct and personal
- One clear action per message`,
  instagram_dm: `
- Very short and casual (under 200 characters ideal)
- Conversational, like talking to a friend
- Emojis acceptable
- Quick engagement hook
- Mobile-friendly formatting`,
  sms: `
- Ultra-short (under 160 characters)
- Direct and to the point
- No greetings or sign-offs
- One clear purpose
- Urgent or time-sensitive content`,
  proposal: `
- Professional and detailed
- Structured with sections
- Include value propositions
- Clear pricing or next steps
- Formal business language`
};

const toneGuidelines: Record<TemplateTone, string> = {
  formal: "Professional, respectful, business-appropriate language. Use full sentences and proper titles.",
  direct: "Clear, concise, action-oriented. Get to the point quickly without excessive pleasantries.",
  friendly: "Warm, personable, approachable. Use first names and conversational language.",
  casual: "Relaxed, informal, like texting a friend. Can use contractions and casual expressions."
};

const goalGuidelines: Record<TemplateGoal, string> = {
  qualification: "Focus on understanding needs, asking qualifying questions, identifying fit.",
  follow_up: "Reference previous interaction, provide value, move relationship forward.",
  booking: "Encourage scheduling a call/meeting, provide clear time options or calendar link.",
  closing: "Address objections, create urgency, facilitate decision-making.",
  support: "Solve problems, provide clear instructions, ensure satisfaction.",
  other: "General communication, adapt to context."
};

// Safety prompts
const safetyRules = `
CRITICAL SAFETY RULES:
1. NEVER invent personal data - if information is missing, use {{variable}} placeholders
2. NEVER suggest sending messages automatically
3. NEVER include sensitive information like passwords or financial details
4. If context is missing for personalization, leave placeholders like {{lead.name}}, {{opportunity.value}}
5. All output is for REVIEW ONLY - user must approve before sending
6. Do not make assumptions about personal details not provided in context
`;

function buildSystemPrompt(action: TemplateAction, channel?: TemplateChannel, tone?: TemplateTone, goal?: TemplateGoal): string {
  const basePrompt = `You are an expert copywriter specializing in CRM and sales communication templates.
${safetyRules}

Language: Write in the same language as the user's input. If Portuguese context is detected, write in Portuguese.
`;

  switch (action) {
    case "generate_template":
      return `${basePrompt}
Generate a new message template based on the user's description.

${channel ? `Channel: ${channel}\n${channelGuidelines[channel]}` : 'Adapt to the described channel.'}
${tone ? `Tone: ${tone}\n${toneGuidelines[tone]}` : ''}
${goal ? `Goal: ${goal}\n${goalGuidelines[goal]}` : ''}

Use {{variable}} syntax for dynamic fields. Common variables:
- {{lead.name}}, {{lead.email}}, {{lead.phone}}
- {{opportunity.title}}, {{opportunity.value}}
- {{company.name}}, {{company.industry}}
- {{user.full_name}}, {{user.email}}

You MUST use the generate_template tool to return your result.`;

    case "personalize_template":
      return `${basePrompt}
Personalize the given template for a specific recipient using the provided context.

Rules:
1. Replace relevant variables with actual data from context
2. Adapt the language naturally - don't just swap values
3. If data is missing, KEEP the {{variable}} placeholder
4. Adapt message length for the channel (shorter for WhatsApp/IG)
5. Make it feel personal without inventing details

You MUST use the personalize_template tool to return your result.`;

    case "improve_template":
      return `${basePrompt}
Improve the given template to be more effective.

Suggest improvements for:
1. Clarity and conciseness
2. Stronger call-to-action
3. Better subject lines (for email)
4. Engagement hooks
5. Channel-appropriate formatting

You MUST use the improve_template tool to return your suggestions.`;

    case "suggest_subject_lines":
      return `${basePrompt}
Generate 3-5 compelling email subject lines for the given template.

Subject lines should be:
- Under 50 characters ideal
- Create curiosity or urgency
- Personalized when possible
- A/B testable variations

You MUST use the suggest_subject_lines tool to return your suggestions.`;

    case "suggest_ctas":
      return `${basePrompt}
Suggest 3-5 alternative call-to-action phrases for the template.

CTAs should be:
- Action-oriented verbs
- Clear on what happens next
- Appropriate for the channel
- Varied in urgency level

You MUST use the suggest_ctas tool to return your suggestions.`;

    default:
      return basePrompt;
  }
}

interface ToolDefinition {
  type: string;
  function: {
    name: string;
    description: string;
    parameters: Record<string, unknown>;
  };
}

const tools: Record<TemplateAction, ToolDefinition[]> = {
  generate_template: [{
    type: "function",
    function: {
      name: "generate_template",
      description: "Generate a new message template",
      parameters: {
        type: "object",
        properties: {
          content: { type: "string", description: "The template content with {{variables}}" },
          subject: { type: "string", description: "Email subject line if applicable" },
          suggestedVariables: {
            type: "array",
            items: { type: "string" },
            description: "List of variables used in the template"
          },
          suggestedName: { type: "string", description: "A suggested name for this template" },
          suggestedGoal: { 
            type: "string", 
            enum: ["qualification", "follow_up", "booking", "closing", "support", "other"],
            description: "The goal this template serves"
          },
          tips: { type: "string", description: "Usage tips for this template" }
        },
        required: ["content", "suggestedVariables", "suggestedName"],
        additionalProperties: false
      }
    }
  }],

  personalize_template: [{
    type: "function",
    function: {
      name: "personalize_template",
      description: "Return a personalized version of the template",
      parameters: {
        type: "object",
        properties: {
          personalizedContent: { type: "string", description: "The personalized message content" },
          personalizedSubject: { type: "string", description: "Personalized subject line if applicable" },
          unresolvedVariables: {
            type: "array",
            items: { type: "string" },
            description: "Variables that could not be resolved due to missing data"
          },
          adaptations: {
            type: "array",
            items: { type: "string" },
            description: "List of adaptations made to personalize the message"
          },
          confidence: { type: "number", description: "Confidence score 0-1 in the personalization" }
        },
        required: ["personalizedContent", "unresolvedVariables", "adaptations", "confidence"],
        additionalProperties: false
      }
    }
  }],

  improve_template: [{
    type: "function",
    function: {
      name: "improve_template",
      description: "Suggest improvements to the template",
      parameters: {
        type: "object",
        properties: {
          improvedContent: { type: "string", description: "The improved template content" },
          improvedSubject: { type: "string", description: "Improved subject line if applicable" },
          changes: {
            type: "array",
            items: {
              type: "object",
              properties: {
                type: { type: "string", enum: ["clarity", "cta", "tone", "length", "structure"] },
                original: { type: "string" },
                improved: { type: "string" },
                reason: { type: "string" }
              },
              required: ["type", "improved", "reason"],
              additionalProperties: false
            }
          },
          alternativeVersion: { type: "string", description: "A completely different approach" },
          scoreImprovement: { 
            type: "object",
            properties: {
              before: { type: "number" },
              after: { type: "number" },
              explanation: { type: "string" }
            },
            additionalProperties: false
          }
        },
        required: ["improvedContent", "changes"],
        additionalProperties: false
      }
    }
  }],

  suggest_subject_lines: [{
    type: "function",
    function: {
      name: "suggest_subject_lines",
      description: "Suggest alternative email subject lines",
      parameters: {
        type: "object",
        properties: {
          suggestions: {
            type: "array",
            items: {
              type: "object",
              properties: {
                subject: { type: "string" },
                style: { type: "string", enum: ["curiosity", "urgency", "value", "personal", "question"] },
                characterCount: { type: "number" }
              },
              required: ["subject", "style", "characterCount"],
              additionalProperties: false
            }
          },
          bestPick: { type: "number", description: "Index of the recommended subject line" },
          reasoning: { type: "string", description: "Why the best pick was chosen" }
        },
        required: ["suggestions", "bestPick", "reasoning"],
        additionalProperties: false
      }
    }
  }],

  suggest_ctas: [{
    type: "function",
    function: {
      name: "suggest_ctas",
      description: "Suggest alternative call-to-action phrases",
      parameters: {
        type: "object",
        properties: {
          suggestions: {
            type: "array",
            items: {
              type: "object",
              properties: {
                cta: { type: "string" },
                urgency: { type: "string", enum: ["low", "medium", "high"] },
                style: { type: "string", enum: ["button", "link", "inline"] }
              },
              required: ["cta", "urgency", "style"],
              additionalProperties: false
            }
          },
          bestPick: { type: "number", description: "Index of the recommended CTA" },
          context: { type: "string", description: "When to use each CTA style" }
        },
        required: ["suggestions", "bestPick", "context"],
        additionalProperties: false
      }
    }
  }]
};

function buildUserContent(request: TemplateRequest): string {
  const parts: string[] = [];

  switch (request.action) {
    case "generate_template":
      parts.push(`Generate a template for: ${request.description}`);
      if (request.language) parts.push(`Language: ${request.language}`);
      break;

    case "personalize_template":
      if (request.template) {
        parts.push(`Template to personalize:\n---\n${request.template.content}\n---`);
        if (request.template.subject) {
          parts.push(`Subject: ${request.template.subject}`);
        }
      }
      if (request.context) {
        parts.push(`\nContext for personalization:`);
        if (request.context.lead) {
          parts.push(`Lead: ${JSON.stringify(request.context.lead)}`);
        }
        if (request.context.opportunity) {
          parts.push(`Opportunity: ${JSON.stringify(request.context.opportunity)}`);
        }
        if (request.context.company) {
          parts.push(`Company: ${JSON.stringify(request.context.company)}`);
        }
        if (request.context.contact) {
          parts.push(`Contact: ${JSON.stringify(request.context.contact)}`);
        }
        if (request.context.user) {
          parts.push(`Sender: ${JSON.stringify(request.context.user)}`);
        }
        if (request.context.conversationHistory?.length) {
          parts.push(`\nRecent conversation:\n${request.context.conversationHistory.slice(-5).join('\n')}`);
        }
      }
      if (request.instructions) {
        parts.push(`\nAdditional instructions: ${request.instructions}`);
      }
      break;

    case "improve_template":
    case "suggest_subject_lines":
    case "suggest_ctas":
      if (request.template) {
        parts.push(`Template:\n---\n${request.template.content}\n---`);
        if (request.template.subject) {
          parts.push(`Current subject: ${request.template.subject}`);
        }
        if (request.template.type) {
          parts.push(`Channel: ${request.template.type}`);
        }
        if (request.template.goal) {
          parts.push(`Goal: ${request.template.goal}`);
        }
      }
      if (request.instructions) {
        parts.push(`\nSpecific focus: ${request.instructions}`);
      }
      break;
  }

  return parts.join('\n');
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const request: TemplateRequest = await req.json();
    
    if (!request.action || !tools[request.action]) {
      return new Response(
        JSON.stringify({ error: "Invalid action specified" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY is not configured");
    }

    const systemPrompt = buildSystemPrompt(
      request.action,
      request.channel || request.template?.type,
      request.tone || request.template?.tone,
      request.goal || request.template?.goal
    );
    
    const userContent = buildUserContent(request);

    if (!userContent.trim()) {
      return new Response(
        JSON.stringify({ error: "No content provided for processing" }),
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
          { role: "system", content: systemPrompt },
          { role: "user", content: userContent }
        ],
        tools: tools[request.action],
        tool_choice: { type: "function", function: { name: tools[request.action][0].function.name } },
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(
          JSON.stringify({ error: "Limite de requisições excedido. Tente novamente em alguns minutos." }),
          { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      if (response.status === 402) {
        return new Response(
          JSON.stringify({ error: "Créditos de IA esgotados. Adicione créditos para continuar." }),
          { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      const errorText = await response.text();
      console.error("AI gateway error:", response.status, errorText);
      return new Response(
        JSON.stringify({ error: "Serviço de IA temporariamente indisponível" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const data = await response.json();
    
    const toolCall = data.choices?.[0]?.message?.tool_calls?.[0];
    if (!toolCall?.function?.arguments) {
      return new Response(
        JSON.stringify({ error: "AI não retornou resposta estruturada" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const result = JSON.parse(toolCall.function.arguments);

    return new Response(
      JSON.stringify({ action: request.action, result }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error) {
    console.error("Template copilot error:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Erro desconhecido" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
