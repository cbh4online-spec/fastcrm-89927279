

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface GeneratedPipeline {
  name: string;
  description: string;
  type: "sales" | "value_ladder" | "funnel";
  industry: string;
  stages: Array<{
    name: string;
    probability: number;
    color: string;
    description: string;
    daysTarget?: number;
  }>;
  suggestedAutomations: Array<{
    name: string;
    trigger: string;
    action: string;
    description: string;
  }>;
  suggestedFields: Array<{
    name: string;
    type: string;
    description: string;
  }>;
  explanation: string;
}

const systemPrompt = `És um especialista em CRM e processos de vendas. A tua função é analisar descrições de negócios e criar pipelines de vendas otimizados.

REGRAS:
1. Responde SEMPRE em português de Portugal
2. Cria entre 4 a 8 etapas por pipeline
3. As probabilidades devem ser realistas e progressivas (ex: 10%, 25%, 40%, 60%, 80%, 100%)
4. Usa cores HEX vibrantes e distintas para cada etapa
5. Inclui SEMPRE uma etapa final de "Ganho/Fechado" (100%) e opcionalmente "Perdido" (0%)
6. Sugere automações práticas e relevantes para o negócio
7. Sugere campos personalizados úteis para o contexto

TIPOS DE PIPELINE:
- sales: Pipeline de vendas tradicional (leads → clientes)
- value_ladder: Escada de valor (produtos de entrada → premium)
- funnel: Funil de marketing/conversão

CORES SUGERIDAS POR ETAPA:
- Início/Lead: #3B82F6 (azul)
- Contacto/Qualificação: #8B5CF6 (roxo)
- Reunião/Demo: #F59E0B (laranja)
- Proposta: #EAB308 (amarelo)
- Negociação: #06B6D4 (cyan)
- Fechado/Ganho: #22C55E (verde)
- Perdido: #EF4444 (vermelho)

Adapta os nomes das etapas ao contexto específico do negócio descrito.`;

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { description, currentIndustry, existingStages } = await req.json();

    if (!description || typeof description !== "string") {
      return new Response(
        JSON.stringify({ error: "Descrição é obrigatória" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY não está configurada");
    }

    let userPrompt = `Analisa a seguinte descrição de negócio e cria um pipeline de vendas completo:\n\n"${description}"`;
    
    if (currentIndustry) {
      userPrompt += `\n\nIndústria/Setor: ${currentIndustry}`;
    }
    
    if (existingStages && existingStages.length > 0) {
      userPrompt += `\n\nEtapas existentes para referência: ${existingStages.join(", ")}`;
    }

    userPrompt += `\n\nGera o pipeline usando a função generate_pipeline.`;

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
              name: "generate_pipeline",
              description: "Gera um pipeline de vendas estruturado com etapas, automações e campos sugeridos",
              parameters: {
                type: "object",
                properties: {
                  name: {
                    type: "string",
                    description: "Nome do pipeline (ex: 'Vendas Consultoria', 'Matrículas Escola')",
                  },
                  description: {
                    type: "string",
                    description: "Descrição breve do pipeline e seu propósito",
                  },
                  type: {
                    type: "string",
                    enum: ["sales", "value_ladder", "funnel"],
                    description: "Tipo de pipeline",
                  },
                  industry: {
                    type: "string",
                    description: "Indústria ou setor do negócio identificado",
                  },
                  stages: {
                    type: "array",
                    items: {
                      type: "object",
                      properties: {
                        name: { type: "string", description: "Nome da etapa" },
                        probability: { type: "number", description: "Probabilidade de fecho (0-100)" },
                        color: { type: "string", description: "Cor HEX da etapa" },
                        description: { type: "string", description: "Descrição do que acontece nesta etapa" },
                        daysTarget: { type: "number", description: "Dias ideais para passar para próxima etapa" },
                      },
                      required: ["name", "probability", "color", "description"],
                    },
                    description: "Lista de etapas do pipeline",
                  },
                  suggestedAutomations: {
                    type: "array",
                    items: {
                      type: "object",
                      properties: {
                        name: { type: "string", description: "Nome da automação" },
                        trigger: { type: "string", description: "O que dispara a automação" },
                        action: { type: "string", description: "Ação a executar" },
                        description: { type: "string", description: "Explicação da automação" },
                      },
                      required: ["name", "trigger", "action", "description"],
                    },
                    description: "Automações sugeridas para este pipeline",
                  },
                  suggestedFields: {
                    type: "array",
                    items: {
                      type: "object",
                      properties: {
                        name: { type: "string", description: "Nome do campo" },
                        type: { type: "string", enum: ["text", "number", "date", "select", "boolean"], description: "Tipo de campo" },
                        description: { type: "string", description: "Para que serve este campo" },
                      },
                      required: ["name", "type", "description"],
                    },
                    description: "Campos personalizados sugeridos",
                  },
                  explanation: {
                    type: "string",
                    description: "Explicação do raciocínio e porquê destas escolhas",
                  },
                },
                required: ["name", "description", "type", "industry", "stages", "suggestedAutomations", "suggestedFields", "explanation"],
              },
            },
          },
        ],
        tool_choice: { type: "function", function: { name: "generate_pipeline" } },
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(
          JSON.stringify({ error: "Limite de pedidos excedido. Tente novamente em alguns segundos." }),
          { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      if (response.status === 402) {
        return new Response(
          JSON.stringify({ error: "Créditos esgotados. Adicione créditos para continuar." }),
          { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      const errorText = await response.text();
      console.error("AI gateway error:", response.status, errorText);
      throw new Error(`Erro no gateway IA: ${response.status}`);
    }

    const aiResponse = await response.json();
    const toolCall = aiResponse.choices?.[0]?.message?.tool_calls?.[0];

    if (!toolCall || toolCall.function.name !== "generate_pipeline") {
      throw new Error("Resposta inesperada da IA");
    }

    const pipeline: GeneratedPipeline = JSON.parse(toolCall.function.arguments);

    return new Response(
      JSON.stringify({ pipeline }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("generate-pipeline error:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Erro desconhecido" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
