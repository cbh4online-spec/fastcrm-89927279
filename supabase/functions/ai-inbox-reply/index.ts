import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

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

interface KnowledgeEntry {
  id: string;
  title: string;
  question?: string;
  content: string;
  similarity: number;
}

interface InboxReplyRequest {
  action: ReplyAction;
  messages?: Message[];
  leadData?: LeadData;
  opportunityData?: OpportunityData;
  channel?: string;
  template?: TemplateData;
  currentReply?: string;
  modifyAction?: "shorten" | "direct" | "rewrite" | "formal" | "friendly" | "commercial";
  workspaceId?: string;
  workspaceName?: string;
  personaId?: string;
  useKnowledgeBase?: boolean;
  conversationId?: string;
  useConversationalFlows?: boolean;
}

interface FlowEngineResponse {
  hasActiveFlow: boolean;
  flowId?: string;
  flowName?: string;
  sessionId?: string;
  responses?: string[];
  sessionState?: "active" | "completed" | "handed_off";
  collectedVariables?: Record<string, unknown>;
  personaId?: string;
  knowledgeBaseIds?: string[];
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
2. Only use information explicitly provided in the lead/opportunity data OR the knowledge base
3. If information is missing, use placeholders like [nome], [data], [valor]
4. NEVER pretend to have access to information you don't have
5. Always be honest about what you know vs what you're assuming
6. Do not make promises or commitments on behalf of the business
7. Do not provide pricing unless explicitly given in the knowledge base
8. Maintain professional boundaries at all times
9. PRIORITIZE information from the knowledge base when answering questions about products, services, or procedures
`;

// Fetch relevant knowledge entries using semantic search
async function fetchKnowledgeContext(
  query: string,
  workspaceId: string,
  personaId?: string
): Promise<{ entries: KnowledgeEntry[]; persona: any | null }> {
  const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
  const supabaseAdmin = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
  );

  let entries: KnowledgeEntry[] = [];
  let persona = null;

  // Fetch persona configuration
  if (personaId) {
    const { data: personaData } = await supabaseAdmin
      .from('ai_personas')
      .select('*')
      .eq('id', personaId)
      .single();
    
    if (personaData) {
      persona = personaData;
    }
  }

  // Get knowledge base IDs from persona or use all active ones
  let knowledgeBaseIds: string[] = [];
  
  if (persona?.knowledge_base_ids?.length > 0) {
    knowledgeBaseIds = persona.knowledge_base_ids;
  } else {
    // Fetch all active knowledge bases for workspace
    const { data: kbs } = await supabaseAdmin
      .from('knowledge_bases')
      .select('id')
      .eq('workspace_id', workspaceId)
      .eq('is_active', true);
    
    knowledgeBaseIds = (kbs || []).map(kb => kb.id);
  }

  if (knowledgeBaseIds.length === 0) {
    console.log("[AI-INBOX-REPLY] No knowledge bases found for workspace");
    return { entries: [], persona };
  }

  // Generate embedding for semantic search
  if (!LOVABLE_API_KEY) {
    console.warn("[AI-INBOX-REPLY] LOVABLE_API_KEY not available for embeddings");
    return { entries: [], persona };
  }

  let useTextFallback = false;
  
  try {
    const embeddingResponse = await fetch("https://ai.gateway.lovable.dev/v1/embeddings", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "text-embedding-ada-002",
        input: query
      }),
    });

    if (!embeddingResponse.ok) {
      const errorText = await embeddingResponse.text();
      console.warn("[AI-INBOX-REPLY] Embedding API error, using text fallback:", errorText);
      useTextFallback = true;
    } else {
      const embeddingData = await embeddingResponse.json();
      const queryEmbedding = embeddingData.data[0].embedding;

      // Search for semantically similar entries
      const { data: results, error } = await supabaseAdmin.rpc("match_knowledge_entries", {
        query_embedding: queryEmbedding,
        match_threshold: 0.65,
        match_count: 5,
        filter_workspace_id: workspaceId,
        filter_knowledge_base_id: knowledgeBaseIds.length === 1 ? knowledgeBaseIds[0] : null,
        filter_status: 'validated'
      });

      if (error) {
        console.error("[AI-INBOX-REPLY] Knowledge search error:", error);
        useTextFallback = true;
      } else {
        entries = (results || []).map((r: any) => ({
          id: r.id,
          title: r.title,
          question: r.question,
          content: r.content,
          similarity: r.similarity
        }));
        console.log(`[AI-INBOX-REPLY] Found ${entries.length} relevant entries via embeddings`);
      }
    }
  } catch (error) {
    console.warn("[AI-INBOX-REPLY] Embedding error, using text fallback:", error);
    useTextFallback = true;
  }

  // Fallback: text-based search when embeddings fail
  if (useTextFallback && knowledgeBaseIds.length > 0) {
    console.log("[AI-INBOX-REPLY] Using text-based fallback search");
    try {
      // Extract keywords from query (simple tokenization)
      const keywords = query.toLowerCase().split(/\s+/).filter(w => w.length > 2);
      const searchPattern = `%${keywords.slice(0, 3).join('%')}%`;
      
      const { data: textResults, error: textError } = await supabaseAdmin
        .from('knowledge_entries')
        .select('id, title, question, content')
        .eq('workspace_id', workspaceId)
        .eq('status', 'validated')
        .in('knowledge_base_id', knowledgeBaseIds)
        .or(`title.ilike.${searchPattern},question.ilike.${searchPattern},content.ilike.${searchPattern}`)
        .limit(5);

      if (!textError && textResults) {
        entries = textResults.map((r: any) => ({
          id: r.id,
          title: r.title,
          question: r.question,
          content: r.content,
          similarity: 0.7 // Estimated similarity for text match
        }));
        console.log(`[AI-INBOX-REPLY] Found ${entries.length} entries via text fallback`);
      }
    } catch (fallbackError) {
      console.error("[AI-INBOX-REPLY] Text fallback also failed:", fallbackError);
    }
  }

  return { entries, persona };
}

const buildSystemPrompt = (
  action: ReplyAction, 
  channel?: string, 
  template?: TemplateData,
  knowledgeEntries?: KnowledgeEntry[],
  persona?: any,
  workspaceName?: string
): string => {
  const channelGuide = channel ? channelGuidelines[channel] || channelGuidelines.webchat : channelGuidelines.webchat;
  
  // ULTRA-RESTRICTIVE FALLBACK: When no knowledge base AND no persona configured
  // This prevents the AI from inventing product/service information
  if ((!knowledgeEntries || knowledgeEntries.length === 0) && !persona) {
    console.log("[AI-INBOX-REPLY] No persona and no knowledge entries - using ultra-restrictive fallback mode");
    const businessName = workspaceName || "a nossa empresa";
    
    return `Sou assistente virtual de ${businessName}.

## REGRAS ABSOLUTAS - CUMPRIR RIGOROSAMENTE:
1. NÃO conheço os produtos, serviços ou cursos específicos desta empresa
2. NÃO posso dar detalhes sobre preços, ofertas ou promoções  
3. NÃO posso inventar nomes de produtos, métodos, cursos ou serviços
4. NÃO posso fazer promessas ou compromissos em nome da empresa
5. NUNCA mencionar produtos ou serviços que não foram explicitamente mencionados pelo cliente
6. NUNCA inventar informação que não tenho

## O QUE POSSO FAZER:
- Confirmar a receção da mensagem de forma educada
- Agradecer o contacto
- Explicar que vou encaminhar para um colega da equipa
- Perguntar como posso ajudar de forma genérica
- Sugerir que um especialista entrará em contacto

## RESPOSTA PADRÃO:
Se o cliente perguntar sobre produtos, serviços, cursos ou preços, responder algo como:
"Obrigado pelo seu interesse! Vou encaminhar a sua questão para um colega especializado que poderá dar-lhe todas as informações detalhadas. Em breve entraremos em contacto!"

${channelGuide}

Responde APENAS em Português de Portugal. Sê breve, educado e profissional.`;
  }
  
  // Persona-specific instructions
  let personaInstructions = "";
  if (persona) {
    personaInstructions = `
## AI Persona Configuration:
- Name: ${persona.name}
- Tone: ${persona.tone_of_voice || 'empático'}
- Technical Depth: ${persona.technical_depth || 'medium'}
- Language Style: ${persona.language_style || 'conversational'}
${persona.system_prompt ? `\nCustom Instructions:\n${persona.system_prompt}` : ""}
${persona.limitations?.length ? `\nLimitations:\n${persona.limitations.map((l: string) => `- ${l}`).join('\n')}` : ""}
`;
  }

  // Knowledge base context
  let knowledgeContext = "";
  if (knowledgeEntries && knowledgeEntries.length > 0) {
    knowledgeContext = `
## Knowledge Base Reference:
Use the following validated information when relevant to the conversation. This is your PRIMARY source of truth for product/service information.

${knowledgeEntries.map((entry, i) => `
### Reference ${i + 1} (Relevance: ${Math.round(entry.similarity * 100)}%)
**Topic:** ${entry.title}
${entry.question ? `**Question:** ${entry.question}` : ""}
**Answer:** ${entry.content}
`).join('\n')}

IMPORTANT: When answering questions about products, services, pricing, or procedures, ALWAYS use the information from the Knowledge Base above. Only use this information - do not invent or assume details.
`;
  }
  
  const basePrompt = `You are an AI assistant helping compose professional reply messages for a CRM inbox.
Your role is to SUGGEST replies that will be reviewed by a human before sending.

${safetyRules}
${personaInstructions}
${channelGuide}
${knowledgeContext}
`;

  if (action === "suggest_reply") {
    return `${basePrompt}

Your task: Generate 2-3 reply suggestions based on the conversation context.
Each suggestion should:
- Be contextually relevant to the conversation
- Use information from the Knowledge Base when answering product/service questions
- Use lead/opportunity data for personalization
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
- Using Knowledge Base information if applicable

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
    // Validate authorization - supports both user JWT and service role key
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(
        JSON.stringify({ error: "Unauthorized" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const token = authHeader.replace("Bearer ", "");
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    
    let supabase;
    let isServerCall = false;
    let userId: string | null = null;

    // Check if this is a server-to-server call using service role key
    if (token === serviceRoleKey) {
      console.log("[AI-INBOX-REPLY] Authenticated via service role key (server-to-server)");
      isServerCall = true;
      supabase = createClient(
        Deno.env.get("SUPABASE_URL")!,
        serviceRoleKey
      );
    } else {
      // Try to validate as user JWT
      supabase = createClient(
        Deno.env.get("SUPABASE_URL")!,
        Deno.env.get("SUPABASE_ANON_KEY")!,
        { global: { headers: { Authorization: authHeader } } }
      );

      const { data: claimsData, error: claimsError } = await supabase.auth.getClaims(token);
      
      if (claimsError || !claimsData?.claims) {
        console.error("[AI-INBOX-REPLY] JWT validation failed:", claimsError);
        return new Response(
          JSON.stringify({ error: "Unauthorized" }),
          { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      
      userId = claimsData.claims.sub as string;
      console.log("[AI-INBOX-REPLY] Authenticated via user JWT:", userId);
    }
    const { 
      action, 
      messages, 
      leadData, 
      opportunityData, 
      channel, 
      template,
      currentReply,
      modifyAction,
      workspaceId,
      workspaceName,
      personaId,
      useKnowledgeBase = true,
      conversationId,
      useConversationalFlows = true
    }: InboxReplyRequest = await req.json();

    // Check for active conversational flows first
    if (useConversationalFlows && workspaceId && conversationId && messages?.length) {
      const lastInboundMessage = messages.filter(m => m.direction === "inbound").pop();
      
      if (lastInboundMessage) {
        try {
          const flowResponse = await fetch(
            `${Deno.env.get("SUPABASE_URL")}/functions/v1/flow-engine`,
            {
              method: "POST",
              headers: {
                Authorization: `Bearer ${Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")}`,
                "Content-Type": "application/json",
              },
              body: JSON.stringify({
                action: "continue",
                workspaceId,
                conversationId,
                leadId: leadData?.id,
                userMessage: lastInboundMessage.content,
                channel,
              }),
            }
          );

          if (flowResponse.ok) {
            const flowResult: FlowEngineResponse = await flowResponse.json();
            
            // If there's an active flow with responses, use those instead of AI generation
            if (flowResult.hasActiveFlow && flowResult.responses?.length) {
              console.log(`[AI-INBOX-REPLY] Using flow "${flowResult.flowName}" response`);
              
              // Override persona if flow specifies one
              if (flowResult.personaId && !personaId) {
                // Will be used in knowledge base search below
              }

              return new Response(
                JSON.stringify({
                  action: "suggest_reply",
                  result: {
                    reasoning: `Resposta gerada pelo fluxo "${flowResult.flowName}"`,
                    suggestions: flowResult.responses.map((text, i) => ({
                      text,
                      tone: "professional",
                      intent: i === 0 ? "Resposta do fluxo conversacional" : "Continuação do fluxo"
                    }))
                  },
                  flowUsed: true,
                  flowId: flowResult.flowId,
                  flowName: flowResult.flowName,
                  sessionState: flowResult.sessionState,
                  collectedVariables: flowResult.collectedVariables,
                }),
                { headers: { ...corsHeaders, "Content-Type": "application/json" } }
              );
            }
          }
        } catch (flowError) {
          console.error("[AI-INBOX-REPLY] Flow engine error:", flowError);
          // Continue with normal AI generation if flow fails
        }
      }
    }

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

    // Fetch knowledge base context if enabled and workspaceId provided
    let knowledgeEntries: KnowledgeEntry[] = [];
    let persona: any = null;
    
    if (useKnowledgeBase && workspaceId && messages?.length) {
      // Extract the last customer message as the query
      const customerMessages = messages.filter(m => m.direction === "inbound");
      const lastCustomerMessage = customerMessages[customerMessages.length - 1]?.content || "";
      
      if (lastCustomerMessage) {
        console.log(`[AI-INBOX-REPLY] Searching knowledge base for: "${lastCustomerMessage.slice(0, 100)}..."`);
        const kbResult = await fetchKnowledgeContext(lastCustomerMessage, workspaceId, personaId);
        knowledgeEntries = kbResult.entries;
        persona = kbResult.persona;
        console.log(`[AI-INBOX-REPLY] Found ${knowledgeEntries.length} relevant entries`);
      }
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
        friendly: "Make the reply warmer and more friendly",
        commercial: "Make the reply more commercial and sales-focused. Add persuasive language, highlight value propositions, include a clear call-to-action, and focus on converting the lead. Use urgency where appropriate but keep it natural and not pushy."
      };
      
      userContent += `Instructions: ${modifyInstructions[modifyAction] || modifyAction}\n`;
    }
    
    if (action === "use_template" && template) {
      userContent += `## Template to Personalize:\n${template.content}\n\n`;
      userContent += "Personalize this template using the conversation context and lead data provided above.\n";
    }

    // Pass workspaceName for fallback context when no persona/knowledge
    const systemPrompt = buildSystemPrompt(action, channel, template, knowledgeEntries, persona, workspaceName);
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
      JSON.stringify({ 
        action, 
        result,
        knowledgeUsed: knowledgeEntries.length > 0,
        knowledgeEntriesCount: knowledgeEntries.length,
        personaUsed: persona?.name || null
      }),
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
