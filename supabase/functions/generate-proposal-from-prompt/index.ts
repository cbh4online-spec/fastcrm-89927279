import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface GenerateFromPromptRequest {
  prompt: string;
  context?: {
    contactName?: string;
    companyName?: string;
    conversationContext?: string;
    opportunityTitle?: string;
    opportunityValue?: number;
  };
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { prompt, context }: GenerateFromPromptRequest = await req.json();

    if (!prompt || prompt.trim().length < 10) {
      return new Response(
        JSON.stringify({ error: "Por favor, forneça uma descrição mais detalhada." }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY is not configured");
    }

    const contextInfo = [];
    if (context?.contactName) contextInfo.push(`Cliente: ${context.contactName}`);
    if (context?.companyName) contextInfo.push(`Empresa: ${context.companyName}`);
    if (context?.opportunityTitle) contextInfo.push(`Oportunidade: ${context.opportunityTitle}`);
    if (context?.opportunityValue) contextInfo.push(`Valor referência: €${context.opportunityValue}`);
    if (context?.conversationContext) contextInfo.push(`Contexto da conversa: ${context.conversationContext}`);

    const systemPrompt = `Você é um especialista em propostas comerciais e copywriting de vendas. Sua tarefa é criar uma proposta comercial completa a partir de uma descrição livre.

REGRAS CRÍTICAS:
1. NUNCA invente dados pessoais específicos que não foram fornecidos
2. Use os dados do contexto quando disponíveis
3. Escreva em português de Portugal (não brasileiro)
4. Seja persuasivo mas honesto
5. Foque nos benefícios para o cliente
6. Sugira um preço realista baseado no mercado português se não foi fornecido
7. Escolha o tom mais apropriado baseado no tipo de serviço/produto

ESTRUTURA DA PROPOSTA:
- Título: Curto e impactante
- Introdução: Personalizada, mostrando que entende o cliente
- Problema/Contexto: O desafio que o cliente enfrenta
- Solução: Como você vai resolver
- Oferta: O que está incluído (lista de entregáveis)
- Benefícios: 3-4 benefícios principais
- Garantia: Algo que reduza o risco do cliente
- CTA: Chamada à ação convincente

Use a ferramenta generate_full_proposal para retornar a proposta estruturada.`;

    const userPrompt = `Crie uma proposta comercial completa baseada nesta descrição:

"${prompt}"

${contextInfo.length > 0 ? `\nContexto disponível:\n${contextInfo.join("\n")}` : ""}

Gere uma proposta profissional e persuasiva.`;

    const tools = [
      {
        type: "function",
        function: {
          name: "generate_full_proposal",
          description: "Generate a complete commercial proposal",
          parameters: {
            type: "object",
            properties: {
              title: {
                type: "string",
                description: "Proposal title (short and impactful)"
              },
              tone: {
                type: "string",
                enum: ["formal", "comercial", "casual", "consultivo"],
                description: "The tone of the proposal"
              },
              suggestedPrice: {
                type: "number",
                description: "Suggested price in EUR based on market rates (optional)"
              },
              intro: {
                type: "object",
                properties: {
                  title: { type: "string", description: "Greeting/intro title" },
                  body: { type: "string", description: "Personalized introduction paragraph" }
                },
                required: ["title", "body"],
                additionalProperties: false
              },
              problem: {
                type: "object",
                properties: {
                  title: { type: "string" },
                  body: { type: "string", description: "The challenge/problem being addressed" }
                },
                required: ["title", "body"],
                additionalProperties: false
              },
              solution: {
                type: "object",
                properties: {
                  title: { type: "string" },
                  body: { type: "string", description: "How you will solve the problem" }
                },
                required: ["title", "body"],
                additionalProperties: false
              },
              offer: {
                type: "object",
                properties: {
                  title: { type: "string" },
                  description: { type: "string" },
                  features: {
                    type: "array",
                    items: { type: "string" },
                    description: "List of deliverables/what's included (4-6 items)"
                  }
                },
                required: ["title", "description", "features"],
                additionalProperties: false
              },
              benefits: {
                type: "object",
                properties: {
                  title: { type: "string" },
                  items: {
                    type: "array",
                    items: {
                      type: "object",
                      properties: {
                        title: { type: "string" },
                        description: { type: "string" }
                      },
                      required: ["title", "description"],
                      additionalProperties: false
                    },
                    description: "3-4 key benefits"
                  }
                },
                required: ["title", "items"],
                additionalProperties: false
              },
              guarantee: {
                type: "object",
                properties: {
                  title: { type: "string" },
                  body: { type: "string", description: "Risk reduction / guarantee statement" }
                },
                required: ["title", "body"],
                additionalProperties: false
              },
              cta: {
                type: "object",
                properties: {
                  text: { type: "string", description: "Call to action button text" },
                  urgencyText: { type: "string", description: "Optional urgency message" }
                },
                required: ["text"],
                additionalProperties: false
              }
            },
            required: ["title", "tone", "intro", "offer", "benefits", "cta"],
            additionalProperties: false
          }
        }
      }
    ];

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
          { role: "user", content: userPrompt },
        ],
        tools,
        tool_choice: { type: "function", function: { name: "generate_full_proposal" } },
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
          JSON.stringify({ error: "Créditos insuficientes. Por favor adicione créditos." }),
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

    if (!toolCall || !toolCall.function?.arguments) {
      console.error("Invalid AI response:", data);
      throw new Error("Resposta inválida da IA");
    }

    const result = JSON.parse(toolCall.function.arguments);

    return new Response(JSON.stringify({ result }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Generate proposal from prompt error:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Erro desconhecido" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
