import { corsHeaders } from "../_shared/cors.ts";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { profession } = await req.json();
    if (!profession || typeof profession !== "string") {
      return new Response(JSON.stringify({ error: "profession is required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY not configured");

    const systemPrompt = `És um especialista em marketing e vendas B2B. O utilizador quer prospectar profissionais de uma determinada profissão para lhes vender serviços.

Usando o método AIDA (Atenção, Interesse, Desejo, Acção), gera exactamente 4 sugestões de ofertas de serviço para a profissão indicada. Cada sugestão deve ser diferente e cobrir ângulos distintos (ex: marketing digital, websites, conteúdo vídeo, SEO local, consultoria, automação, etc).

Para cada sugestão, pensa:
- Que dores específicas tem esta profissão? (Atenção)
- Que soluções concretas se podem oferecer? (Interesse)
- Que benefícios tangíveis resultam? (Desejo)
- Como motivar à acção?

As dores devem ser escritas de forma persuasiva, curtas e directas (máximo 3 dores por sugestão, separadas por vírgula).
A oferta deve ser uma frase clara e específica para a profissão.
O label deve ter no máximo 2-3 palavras.

Responde SEMPRE em Português de Portugal.`;

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
          { role: "user", content: `Profissão-alvo: ${profession}` },
        ],
        tools: [
          {
            type: "function",
            function: {
              name: "offer_suggestions",
              description: "Return 4 offer suggestions for the given profession.",
              parameters: {
                type: "object",
                properties: {
                  suggestions: {
                    type: "array",
                    items: {
                      type: "object",
                      properties: {
                        label: { type: "string", description: "Short 2-3 word label" },
                        offer: { type: "string", description: "What service to offer" },
                        painPoints: { type: "string", description: "Pain points separated by comma" },
                      },
                      required: ["label", "offer", "painPoints"],
                      additionalProperties: false,
                    },
                  },
                },
                required: ["suggestions"],
                additionalProperties: false,
              },
            },
          },
        ],
        tool_choice: { type: "function", function: { name: "offer_suggestions" } },
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(JSON.stringify({ error: "Rate limit exceeded, tenta novamente em breve." }), {
          status: 429,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (response.status === 402) {
        return new Response(JSON.stringify({ error: "Créditos esgotados." }), {
          status: 402,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const text = await response.text();
      console.error("AI gateway error:", response.status, text);
      throw new Error("AI gateway error");
    }

    const data = await response.json();
    const toolCall = data.choices?.[0]?.message?.tool_calls?.[0];
    if (!toolCall) throw new Error("No tool call in response");

    const parsed = JSON.parse(toolCall.function.arguments);

    return new Response(JSON.stringify(parsed), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("generate-offer-suggestions error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
