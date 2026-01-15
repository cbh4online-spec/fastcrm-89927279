import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface Message {
  direction: string;
  content: string;
}

interface ConversationContext {
  channel: string;
  leadStatus?: string;
  hasOpportunity: boolean;
  opportunityValue?: number;
  aiIntent?: string;
  aiPriority?: string;
  aiSentiment?: string;
}

interface TagRequest {
  messages: Message[];
  context: ConversationContext;
  conversationId: string;
}

// Predefined tags with descriptions for the AI
const AVAILABLE_TAGS = {
  "Lead": "Contact is a potential customer, not yet qualified",
  "Cliente": "Contact is an existing customer with past purchases",
  "Oportunidade Aberta": "There's an active sales opportunity being discussed",
  "Suporte": "Contact needs help with existing product/service",
  "Financeiro": "Discussion involves payments, billing, or financial matters",
  "Alta Intenção": "Contact shows strong buying signals or urgency",
  "Baixa Prioridade": "Contact is just browsing or has low engagement",
  "Negociação": "Active price or terms negotiation happening",
  "Proposta Enviada": "A proposal has been sent and awaiting response",
  "Reclamação": "Contact is complaining about something",
  "Parceria": "Discussion about partnership or collaboration",
  "Indicação": "Contact was referred by someone",
};

function buildSystemPrompt(): string {
  const tagDescriptions = Object.entries(AVAILABLE_TAGS)
    .map(([tag, desc]) => `- "${tag}": ${desc}`)
    .join("\n");

  return `Você é um especialista em classificação de conversas de CRM. Sua tarefa é analisar mensagens e atribuir tags relevantes.

## TAGS DISPONÍVEIS
${tagDescriptions}

## REGRAS DE CLASSIFICAÇÃO

1. **Priorize evidências concretas** - Só atribua tags baseado no que está explícito nas mensagens
2. **Máximo 4 tags** - Selecione apenas as mais relevantes
3. **Considere o contexto** - Use informações sobre lead status, oportunidades, etc.
4. **Não duplique** - Se há "Cliente", não precisa de "Lead"
5. **Seja conservador** - Na dúvida, não adicione a tag

## COMBINAÇÕES COMUNS
- Lead + Alta Intenção = Lead qualificado com interesse
- Cliente + Suporte = Cliente precisando de ajuda
- Oportunidade Aberta + Negociação = Vendas em andamento
- Lead + Baixa Prioridade = Lead frio, só coletando informações

## SAÍDA
Use a função assign_tags para retornar:
- tags: Array das tags selecionadas (1-4 tags)
- reasoning: Breve explicação das escolhas (máx 100 palavras)`;
}

const tools = [
  {
    type: "function",
    function: {
      name: "assign_tags",
      description: "Atribui tags automaticamente baseado na análise da conversa",
      parameters: {
        type: "object",
        properties: {
          tags: {
            type: "array",
            items: {
              type: "string",
              enum: Object.keys(AVAILABLE_TAGS),
            },
            description: "Lista de tags a serem atribuídas (1-4 tags)",
          },
          reasoning: {
            type: "string",
            description: "Breve explicação das escolhas de tags",
          },
        },
        required: ["tags", "reasoning"],
        additionalProperties: false,
      },
    },
  },
];

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { messages, context, conversationId } = (await req.json()) as TagRequest;

    if (!messages || !context) {
      return new Response(
        JSON.stringify({ error: "Missing messages or context" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY is not configured");
    }

    // Build conversation summary for analysis
    const recentMessages = messages.slice(-15);
    const conversationText = recentMessages
      .map((m) => `[${m.direction === "inbound" ? "CONTATO" : "AGENTE"}]: ${m.content}`)
      .join("\n\n");

    const contextInfo = `
## CONTEXTO ADICIONAL
- Canal: ${context.channel}
- Status do Lead: ${context.leadStatus || "Desconhecido"}
- Tem Oportunidade Ativa: ${context.hasOpportunity ? "Sim" : "Não"}
${context.opportunityValue ? `- Valor da Oportunidade: R$ ${context.opportunityValue.toLocaleString()}` : ""}
- Intenção AI: ${context.aiIntent || "Não classificado"}
- Prioridade AI: ${context.aiPriority || "Não classificada"}
- Sentimento AI: ${context.aiSentiment || "Neutro"}
`;

    const userPrompt = `${contextInfo}

## HISTÓRICO DA CONVERSA (últimas ${recentMessages.length} mensagens)

${conversationText}

---

Analise esta conversa e atribua as tags mais relevantes.`;

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [
          { role: "system", content: buildSystemPrompt() },
          { role: "user", content: userPrompt },
        ],
        tools,
        tool_choice: { type: "function", function: { name: "assign_tags" } },
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(
          JSON.stringify({ error: "Rate limit exceeded. Try again later." }),
          { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      if (response.status === 402) {
        return new Response(
          JSON.stringify({ error: "AI credits exhausted. Please add funds." }),
          { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      const errorText = await response.text();
      console.error("AI gateway error:", response.status, errorText);
      throw new Error(`AI gateway error: ${response.status}`);
    }

    const data = await response.json();
    const toolCall = data.choices?.[0]?.message?.tool_calls?.[0];

    if (!toolCall?.function?.arguments) {
      throw new Error("No tool call in response");
    }

    const result = JSON.parse(toolCall.function.arguments);
    
    // Validate tags against allowed list
    const validTags = (result.tags as string[]).filter(tag => 
      Object.keys(AVAILABLE_TAGS).includes(tag)
    ).slice(0, 4);

    // Update conversation with AI tags if conversationId provided
    if (conversationId) {
      const authHeader = req.headers.get("Authorization");
      if (authHeader) {
        const supabaseUrl = Deno.env.get("SUPABASE_URL");
        const supabaseKey = Deno.env.get("SUPABASE_ANON_KEY");
        
        if (supabaseUrl && supabaseKey) {
          const supabase = createClient(supabaseUrl, supabaseKey, {
            global: { headers: { Authorization: authHeader } },
          });

          await supabase
            .from("conversations")
            .update({
              ai_tags: validTags,
              tags_auto_assigned: true,
              tags_assigned_at: new Date().toISOString(),
            })
            .eq("id", conversationId);
        }
      }
    }

    return new Response(
      JSON.stringify({
        tags: validTags,
        reasoning: result.reasoning,
        autoAssigned: true,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Error in ai-auto-tags:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
