import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface LaborRate {
  name: string;
  hourly_rate: number;
}

interface RequestBody {
  productName: string;
  productCategory?: string;
  productType?: string;
  existingRates?: LaborRate[];
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { productName, productCategory, productType, existingRates } = await req.json() as RequestBody;

    if (!productName) {
      return new Response(
        JSON.stringify({ error: "Nome do produto é obrigatório" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      return new Response(
        JSON.stringify({ error: "LOVABLE_API_KEY não configurada" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const ratesContext = existingRates && existingRates.length > 0
      ? `Taxas de mão de obra disponíveis: ${existingRates.map(r => `${r.name}: €${r.hourly_rate}/h`).join(", ")}`
      : "Usar valores de mercado português típicos para o setor.";

    const systemPrompt = `És um especialista em estimativas de trabalho e serviços técnicos em Portugal.
Analisa o produto/serviço e sugere tempo de trabalho (em horas) e valor por hora adequado.

Considera:
- Complexidade técnica do trabalho
- Tempo de deslocação típico
- Configuração e testes
- Formação ao cliente (se aplicável)
- Valores de mercado em Portugal

${ratesContext}

Deves responder APENAS chamando a função suggest_labor_estimate.`;

    const userPrompt = `Produto/Serviço: ${productName}
${productCategory ? `Categoria: ${productCategory}` : ""}
${productType ? `Tipo: ${productType}` : ""}

Sugere o tempo de trabalho (horas) e valor por hora (€) adequado para este produto/serviço.`;

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt },
        ],
        tools: [
          {
            type: "function",
            function: {
              name: "suggest_labor_estimate",
              description: "Sugere estimativa de tempo e valor de mão de obra",
              parameters: {
                type: "object",
                properties: {
                  hours: {
                    type: "number",
                    description: "Tempo estimado em horas (pode ser decimal, ex: 1.5)",
                  },
                  rate: {
                    type: "number",
                    description: "Valor por hora em euros",
                  },
                  rationale: {
                    type: "string",
                    description: "Explicação breve da estimativa (máx 100 palavras)",
                  },
                },
                required: ["hours", "rate", "rationale"],
                additionalProperties: false,
              },
            },
          },
        ],
        tool_choice: { type: "function", function: { name: "suggest_labor_estimate" } },
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(
          JSON.stringify({ error: "Limite de pedidos excedido, tente novamente mais tarde" }),
          { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      if (response.status === 402) {
        return new Response(
          JSON.stringify({ error: "Créditos insuficientes" }),
          { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      throw new Error(`AI gateway error: ${response.status}`);
    }

    const data = await response.json();
    const toolCall = data.choices?.[0]?.message?.tool_calls?.[0];

    if (!toolCall?.function?.arguments) {
      return new Response(
        JSON.stringify({ error: "Resposta inválida da IA" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const suggestion = JSON.parse(toolCall.function.arguments);

    return new Response(
      JSON.stringify({ suggestion }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Error in suggest-labor-estimate:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Erro desconhecido" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
