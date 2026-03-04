const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface Message {
  direction: string;
  content: string;
}

interface LeadData {
  name?: string;
  email?: string;
  phone?: string;
  status?: string;
  source?: string;
  tags?: string[];
}

interface OpportunityData {
  title?: string;
  value?: number;
  stage?: string;
  status?: string;
}

interface IntelligenceResult {
  buyingIntent: {
    level: "high" | "medium" | "low" | "none";
    signals: string[];
    confidence: number;
  };
  objections: {
    detected: boolean;
    list: string[];
    suggestedResponses: string[];
  };
  urgency: {
    level: "high" | "medium" | "low";
    indicators: string[];
  };
  dropOffRisk: {
    level: "high" | "medium" | "low";
    factors: string[];
    daysInactive?: number;
  };
  suggestedNextStep: {
    action: string;
    reason: string;
    microcopy: string;
  };
  tags: string[];
  alerts: string[];
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const startTime = performance.now();

  try {
    const { messages, leadData, opportunityData, channel, lastMessageAt } = await req.json();
    
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY is not configured");
    }

    if (!messages || !Array.isArray(messages) || messages.length === 0) {
      return new Response(
        JSON.stringify({ error: "No messages provided" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const daysSinceLastMessage = lastMessageAt 
      ? Math.floor((Date.now() - new Date(lastMessageAt).getTime()) / (1000 * 60 * 60 * 24))
      : 0;

    const conversationContext = messages
      .slice(-30)
      .map((m: Message) => `${m.direction === "inbound" ? "Cliente" : "Agente"}: ${m.content}`)
      .join("\n");

    let leadContext = "";
    if (leadData) {
      leadContext = `
## Dados do Lead:
`;
      if (leadData.name) leadContext += `- Nome: ${leadData.name}\n`;
      if (leadData.email) leadContext += `- Email: ${leadData.email}\n`;
      if (leadData.status) leadContext += `- Estado: ${leadData.status}\n`;
      if (leadData.source) leadContext += `- Origem: ${leadData.source}\n`;
      if (leadData.tags?.length) leadContext += `- Tags: ${leadData.tags.join(", ")}\n`;
    }

    let oppContext = "";
    if (opportunityData) {
      oppContext = `
## Oportunidade:
`;
      if (opportunityData.title) oppContext += `- Título: ${opportunityData.title}\n`;
      if (opportunityData.value) oppContext += `- Valor: €${opportunityData.value}\n`;
      if (opportunityData.stage) oppContext += `- Etapa: ${opportunityData.stage}\n`;
      if (opportunityData.status) oppContext += `- Estado: ${opportunityData.status}\n`;
    }

    const systemPrompt = `Você é um assistente de inteligência de vendas para um CRM. Analise conversas para detectar sinais de compra, objeções, urgência e risco de abandono.

Sua análise deve ser:
- Baseada em evidências da conversa
- Prática e acionável
- Em português de Portugal

CRITÉRIOS DE ANÁLISE:

1. INTENÇÃO DE COMPRA:
   - "high": Pede preços, pergunta sobre disponibilidade, quer avançar
   - "medium": Demonstra interesse, faz perguntas sobre o produto/serviço
   - "low": Interesse vago, ainda a explorar
   - "none": Sem sinais de compra

2. OBJEÇÕES comuns:
   - Preço muito alto
   - Precisa de aprovação
   - Timing não é bom
   - Comparando com concorrência
   - Dúvidas sobre qualidade/entrega

3. URGÊNCIA:
   - "high": Deadline mencionado, precisa para já
   - "medium": Quer resolver em breve
   - "low": Sem pressa

4. RISCO DE ABANDONO:
   - "high": Sem resposta há muito tempo, sinais de desinteresse
   - "medium": Respostas lentas, hesitação
   - "low": Conversa ativa e engajada

5. PRÓXIMO PASSO SUGERIDO:
   - Deve ser específico e acionável
   - Incluir microcopy em português pronto a usar

Dias sem resposta: ${daysSinceLastMessage}
Canal: ${channel || "desconhecido"}

Use a ferramenta analyze_conversation para retornar a análise.`;

    const userPrompt = `Analise esta conversa:

${conversationContext}
${leadContext}
${oppContext}

Forneça uma análise completa de inteligência de vendas.`;

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
        tools: [
          {
            type: "function",
            function: {
              name: "analyze_conversation",
              description: "Analyze conversation for buying intent, objections, urgency and drop-off risk",
              parameters: {
                type: "object",
                properties: {
                  buyingIntent: {
                    type: "object",
                    properties: {
                      level: { type: "string", enum: ["high", "medium", "low", "none"] },
                      signals: { type: "array", items: { type: "string" } },
                      confidence: { type: "number", minimum: 0, maximum: 100 }
                    },
                    required: ["level", "signals", "confidence"],
                    additionalProperties: false
                  },
                  objections: {
                    type: "object",
                    properties: {
                      detected: { type: "boolean" },
                      list: { type: "array", items: { type: "string" } },
                      suggestedResponses: { type: "array", items: { type: "string" } }
                    },
                    required: ["detected", "list", "suggestedResponses"],
                    additionalProperties: false
                  },
                  urgency: {
                    type: "object",
                    properties: {
                      level: { type: "string", enum: ["high", "medium", "low"] },
                      indicators: { type: "array", items: { type: "string" } }
                    },
                    required: ["level", "indicators"],
                    additionalProperties: false
                  },
                  dropOffRisk: {
                    type: "object",
                    properties: {
                      level: { type: "string", enum: ["high", "medium", "low"] },
                      factors: { type: "array", items: { type: "string" } }
                    },
                    required: ["level", "factors"],
                    additionalProperties: false
                  },
                  suggestedNextStep: {
                    type: "object",
                    properties: {
                      action: { type: "string", description: "Specific action to take" },
                      reason: { type: "string", description: "Why this action" },
                      microcopy: { type: "string", description: "Ready-to-use Portuguese message" }
                    },
                    required: ["action", "reason", "microcopy"],
                    additionalProperties: false
                  },
                  tags: {
                    type: "array",
                    items: { type: "string" },
                    description: "Tags to apply to the conversation like 'Alta intenção', 'Pedido de preço'"
                  },
                  alerts: {
                    type: "array",
                    items: { type: "string" },
                    description: "Important alerts for the agent"
                  }
                },
                required: ["buyingIntent", "objections", "urgency", "dropOffRisk", "suggestedNextStep", "tags", "alerts"],
                additionalProperties: false
              }
            }
          }
        ],
        tool_choice: { type: "function", function: { name: "analyze_conversation" } },
      }),
    });

    if (!response.ok) {
      const latencyMs = Math.round(performance.now() - startTime);
      if (response.status === 429) {
        console.error(`[CONV-INTELLIGENCE] latency_ms=${latencyMs} status=rate_limited`);
        return new Response(
          JSON.stringify({ error: "Rate limit exceeded. Please try again later." }),
          { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      if (response.status === 402) {
        console.error(`[CONV-INTELLIGENCE] latency_ms=${latencyMs} status=payment_required`);
        return new Response(
          JSON.stringify({ error: "Payment required. Please add credits to continue." }),
          { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      const errorText = await response.text();
      console.error(`[CONV-INTELLIGENCE] latency_ms=${latencyMs} status=error http_status=${response.status} error=${errorText}`);
      return new Response(
        JSON.stringify({ error: "AI analysis failed" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const data = await response.json();
    const toolCall = data.choices?.[0]?.message?.tool_calls?.[0];

    if (!toolCall || toolCall.function.name !== "analyze_conversation") {
      const latencyMs = Math.round(performance.now() - startTime);
      console.error(`[CONV-INTELLIGENCE] latency_ms=${latencyMs} status=error reason=invalid_tool_call`);
      throw new Error("Invalid response from AI");
    }

    const intelligence: IntelligenceResult = JSON.parse(toolCall.function.arguments);
    intelligence.dropOffRisk.daysInactive = daysSinceLastMessage;

    const latencyMs = Math.round(performance.now() - startTime);
    const usage = data.usage;
    console.log(`[CONV-INTELLIGENCE] latency_ms=${latencyMs} status=ok intent=${intelligence.buyingIntent.level} urgency=${intelligence.urgency.level} risk=${intelligence.dropOffRisk.level} tokens_prompt=${usage?.prompt_tokens ?? 'n/a'} tokens_completion=${usage?.completion_tokens ?? 'n/a'}`);

    return new Response(JSON.stringify(intelligence), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    const latencyMs = Math.round(performance.now() - startTime);
    console.error(`[CONV-INTELLIGENCE] latency_ms=${latencyMs} status=error error=${error instanceof Error ? error.message : "Unknown"}`);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
