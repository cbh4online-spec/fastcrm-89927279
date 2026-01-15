import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface Message {
  direction: string;
  content: string;
}

interface FollowupContext {
  triggerType: "no_reply" | "proposal_viewed" | "hot_stalled" | "general";
  hoursSinceLastMessage: number;
  proposalTitle?: string;
  proposalValue?: number;
  proposalViewCount?: number;
  temperatureScore?: number;
  leadName?: string;
  leadEmail?: string;
  channel: string;
  conversationSummary?: string;
}

interface DraftRequest {
  messages: Message[];
  context: FollowupContext;
}

const channelGuidelines: Record<string, string> = {
  email: `
    - Use saudação formal apropriada
    - Pode ter parágrafos estruturados
    - Inclua linha de assunto sugerida
    - Tom profissional mas amigável
    - Máximo 3-4 parágrafos curtos`,
  whatsapp: `
    - Mensagem curta e direta (máximo 2-3 linhas)
    - Sem formalidades excessivas
    - Tom conversacional e próximo
    - Pode usar emoji ocasional se apropriado
    - Evite blocos grandes de texto`,
  instagram: `
    - Super casual e direto
    - Uma a duas frases curtas
    - Pode usar emoji com moderação
    - Tom amigável e descontraído
    - Lembre-se que é DM`,
};

const triggerPrompts: Record<string, string> = {
  no_reply: `O lead não respondeu há algum tempo. Crie um follow-up gentil que:
    - Reafirme interesse em ajudar
    - Não pareça insistente ou desesperado
    - Ofereça uma nova perspectiva ou valor
    - Faça uma pergunta aberta para reengajar`,
  proposal_viewed: `O lead visualizou a proposta mas não respondeu. Crie um follow-up que:
    - Mencione sutilmente que está disponível para esclarecer dúvidas
    - Reforce o principal benefício da proposta
    - Ofereça flexibilidade (prazo, condições)
    - Não pressione, mas crie senso de oportunidade`,
  hot_stalled: `Esta era uma conversa quente que esfriou. Crie um follow-up que:
    - Retome de forma natural
    - Lembre brevemente do contexto anterior
    - Reacenda o interesse
    - Proponha próximo passo concreto`,
  general: `Crie um follow-up profissional que:
    - Seja amigável mas não invasivo
    - Ofereça valor ou nova informação
    - Mantenha a porta aberta
    - Sugira próximo passo simples`,
};

function buildSystemPrompt(context: FollowupContext): string {
  const channelGuide = channelGuidelines[context.channel] || channelGuidelines.email;
  const triggerGuide = triggerPrompts[context.triggerType] || triggerPrompts.general;

  return `Você é um especialista em comunicação comercial e follow-ups. Sua tarefa é redigir uma mensagem de follow-up perfeita.

## CONTEXTO DA SITUAÇÃO
- Tipo de follow-up: ${context.triggerType}
- Tempo sem resposta: ${context.hoursSinceLastMessage}h
${context.proposalTitle ? `- Proposta: "${context.proposalTitle}"` : ""}
${context.proposalValue ? `- Valor da proposta: R$ ${context.proposalValue.toLocaleString()}` : ""}
${context.proposalViewCount ? `- Visualizações da proposta: ${context.proposalViewCount}x` : ""}
${context.temperatureScore ? `- Score de temperatura: ${context.temperatureScore}/100` : ""}
${context.leadName ? `- Nome do lead: ${context.leadName}` : ""}

## DIRETRIZES DO CANAL (${context.channel.toUpperCase()})
${channelGuide}

## OBJETIVO DO FOLLOW-UP
${triggerGuide}

## REGRAS IMPORTANTES
1. NUNCA invente informações sobre produtos/serviços
2. Use o histórico da conversa como contexto
3. Personalize baseado no que o lead já disse
4. Adapte o tom ao que já foi usado na conversa
5. Seja genuíno e humano, não robótico
6. O follow-up deve parecer uma continuação natural

## SAÍDA ESPERADA
Retorne usando a função draft_followup com:
- draftMessage: A mensagem de follow-up pronta para uso
- subject: Assunto do email (apenas se canal for email)
- tone: Tom usado (formal, friendly, empathetic, professional)
- reasoning: Breve explicação das escolhas feitas`;
}

const tools = [
  {
    type: "function",
    function: {
      name: "draft_followup",
      description: "Gera um rascunho de mensagem de follow-up",
      parameters: {
        type: "object",
        properties: {
          draftMessage: {
            type: "string",
            description: "A mensagem de follow-up completa e pronta para envio",
          },
          subject: {
            type: "string",
            description: "Assunto sugerido (apenas para emails)",
          },
          tone: {
            type: "string",
            enum: ["formal", "friendly", "empathetic", "professional"],
            description: "Tom utilizado na mensagem",
          },
          reasoning: {
            type: "string",
            description: "Explicação breve das escolhas feitas no rascunho",
          },
        },
        required: ["draftMessage", "tone", "reasoning"],
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
    const { messages, context } = (await req.json()) as DraftRequest;

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

    // Build conversation history for context
    const recentMessages = messages.slice(-10);
    const conversationContext = recentMessages
      .map((m) => `[${m.direction === "inbound" ? "LEAD" : "VOCÊ"}]: ${m.content}`)
      .join("\n\n");

    const userPrompt = `## HISTÓRICO DA CONVERSA (últimas ${recentMessages.length} mensagens)

${conversationContext}

---

Por favor, crie um follow-up apropriado para esta situação. O follow-up deve ser enviado ${context.hoursSinceLastMessage}h após a última mensagem.`;

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [
          { role: "system", content: buildSystemPrompt(context) },
          { role: "user", content: userPrompt },
        ],
        tools,
        tool_choice: { type: "function", function: { name: "draft_followup" } },
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

    return new Response(
      JSON.stringify({
        draftMessage: result.draftMessage,
        subject: result.subject || null,
        tone: result.tone,
        reasoning: result.reasoning,
        triggerType: context.triggerType,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Error in ai-followup-draft:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
