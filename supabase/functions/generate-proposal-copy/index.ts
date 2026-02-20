

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface GenerateProposalRequest {
  action: "generate_copy" | "adapt_tone" | "expand" | "shorten";
  context: {
    contactName?: string;
    companyName?: string;
    dealValue?: number;
    dealTitle?: string;
    channel?: string;
    existingContent?: string;
    offerDescription?: string;
  };
  tone?: "formal" | "comercial" | "casual" | "curto";
  sections?: ("intro" | "offer" | "benefits" | "pricing" | "cta" | "testimonial")[];
}

const toneInstructions = {
  formal: "Use tom formal e profissional. Evite gírias. Use 'você' ou tratamento formal.",
  comercial: "Use tom comercial persuasivo. Destaque benefícios e valor. Crie urgência moderada.",
  casual: "Use tom amigável e descontraído. Seja conversacional mas profissional.",
  curto: "Seja extremamente conciso. Vá direto ao ponto. Máximo 2-3 frases por seção.",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { action, context, tone, sections }: GenerateProposalRequest = await req.json();

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY is not configured");
    }

    const toneGuide = toneInstructions[tone || "comercial"];
    const selectedSections = sections || ["intro", "offer", "benefits", "cta"];

    let systemPrompt = `Você é um especialista em copywriting para propostas comerciais. Sua tarefa é criar conteúdo persuasivo e profissional para propostas de vendas.

REGRAS CRÍTICAS:
1. NUNCA invente dados pessoais, valores ou informações não fornecidas
2. Use placeholders [campo] para dados não disponíveis
3. Escreva em português de Portugal
4. ${toneGuide}
5. Foque nos benefícios para o cliente, não em características técnicas

Use a ferramenta apropriada para retornar o resultado.`;

    let userPrompt = "";

    if (action === "generate_copy") {
      userPrompt = `Gere conteúdo para uma proposta comercial com as seguintes seções: ${selectedSections.join(", ")}

Contexto disponível:
${context.contactName ? `- Nome do cliente: ${context.contactName}` : "- Nome do cliente: [nome do cliente]"}
${context.companyName ? `- Empresa: ${context.companyName}` : ""}
${context.dealTitle ? `- Título da proposta: ${context.dealTitle}` : ""}
${context.dealValue ? `- Valor: €${context.dealValue}` : "- Valor: [valor a definir]"}
${context.offerDescription ? `- Descrição da oferta: ${context.offerDescription}` : ""}

Gere conteúdo persuasivo para cada seção solicitada.`;
    } else if (action === "adapt_tone") {
      userPrompt = `Adapte o seguinte texto para tom ${tone}:

Texto original:
${context.existingContent}

Mantenha o significado e informações, apenas ajuste o tom.`;
    } else if (action === "expand") {
      userPrompt = `Expanda o seguinte texto, adicionando mais detalhes e argumentos persuasivos:

Texto original:
${context.existingContent}

Adicione mais contexto, benefícios e argumentos de venda.`;
    } else if (action === "shorten") {
      userPrompt = `Encurte o seguinte texto, mantendo apenas o essencial:

Texto original:
${context.existingContent}

Reduza para o mínimo necessário sem perder a mensagem principal.`;
    }

    const tools = action === "generate_copy" ? [
      {
        type: "function",
        function: {
          name: "generate_proposal_copy",
          description: "Generate proposal copy sections",
          parameters: {
            type: "object",
            properties: {
              intro: {
                type: "object",
                properties: {
                  title: { type: "string", description: "Greeting title" },
                  body: { type: "string", description: "Introduction paragraph" }
                },
                required: ["title", "body"],
                additionalProperties: false
              },
              offer: {
                type: "object",
                properties: {
                  title: { type: "string", description: "Offer section title" },
                  description: { type: "string", description: "What's included" },
                  features: { 
                    type: "array", 
                    items: { type: "string" },
                    description: "List of features/benefits (3-5 items)"
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
                    }
                  }
                },
                required: ["title", "items"],
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
              },
              testimonial: {
                type: "object",
                properties: {
                  quote: { type: "string" },
                  author: { type: "string" },
                  role: { type: "string" }
                },
                required: ["quote", "author", "role"],
                additionalProperties: false
              }
            },
            required: selectedSections,
            additionalProperties: false
          }
        }
      }
    ] : [
      {
        type: "function",
        function: {
          name: "adapt_text",
          description: "Return adapted text",
          parameters: {
            type: "object",
            properties: {
              adaptedText: { type: "string", description: "The adapted text" },
              changes: { type: "string", description: "Summary of changes made" }
            },
            required: ["adaptedText", "changes"],
            additionalProperties: false
          }
        }
      }
    ];

    const toolName = action === "generate_copy" ? "generate_proposal_copy" : "adapt_text";

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
        tool_choice: { type: "function", function: { name: toolName } },
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
          JSON.stringify({ error: "Payment required. Please add credits." }),
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

    if (!toolCall || !toolCall.function?.arguments) {
      throw new Error("Invalid response from AI");
    }

    const result = JSON.parse(toolCall.function.arguments);

    return new Response(JSON.stringify({ action, result }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Generate proposal copy error:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
