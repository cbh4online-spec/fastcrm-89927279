const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { vertical, objective, offer, tone } = await req.json();

    if (!vertical || !objective || !offer || !tone) {
      return new Response(
        JSON.stringify({ error: "Todos os campos são obrigatórios." }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY is not configured");
    }

    const systemPrompt = `És um especialista em marketing digital e criação de páginas "link in bio" de alta conversão.
Gera uma estrutura completa de página bio optimizada para conversão usando a framework AIDA (Atenção, Interesse, Desejo, Ação).

Regras:
- O copy deve ser curto, directo e em português de Portugal
- Gera entre 5 e 8 blocos
- O slug deve ser lowercase, sem acentos, com hifens
- A cor primária deve ser um hex que combine com a vertical
- Tipos de blocos disponíveis: text, button, link, social, divider, whatsapp, calendar
- O primeiro bloco deve ser "text" com headline chamativa
- Inclui pelo menos 1 botão CTA forte
- Inclui bloco social no final`;

    const userPrompt = `Cria uma página bio para:
- Vertical/Nicho: ${vertical}
- Objectivo: ${objective}
- Oferta principal: ${offer}
- Tom de comunicação: ${tone}`;

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
              name: "generate_bio_page",
              description: "Gera a estrutura completa de uma página bio com blocos optimizados para conversão.",
              parameters: {
                type: "object",
                properties: {
                  pageName: { type: "string", description: "Nome da página bio" },
                  slug: { type: "string", description: "URL slug (lowercase, sem acentos, com hifens)" },
                  primaryColor: { type: "string", description: "Cor primária em hex (ex: #6366f1)" },
                  blocks: {
                    type: "array",
                    items: {
                      type: "object",
                      properties: {
                        type: {
                          type: "string",
                          enum: ["text", "button", "link", "social", "divider", "whatsapp", "calendar"],
                        },
                        content: {
                          type: "object",
                          description: "Conteúdo do bloco. Para text: {text}. Para button/link: {text, url}. Para social: {instagram, linkedin, facebook, twitter}. Para divider: {style}. Para whatsapp: {phone, message}. Para calendar: {url, text}.",
                          additionalProperties: true,
                        },
                      },
                      required: ["type", "content"],
                      additionalProperties: false,
                    },
                  },
                },
                required: ["pageName", "slug", "primaryColor", "blocks"],
                additionalProperties: false,
              },
            },
          },
        ],
        tool_choice: { type: "function", function: { name: "generate_bio_page" } },
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(
          JSON.stringify({ error: "Limite de pedidos excedido. Tenta novamente em breve." }),
          { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      if (response.status === 402) {
        return new Response(
          JSON.stringify({ error: "Créditos insuficientes. Adiciona créditos ao workspace." }),
          { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      const errText = await response.text();
      console.error("AI gateway error:", response.status, errText);
      return new Response(
        JSON.stringify({ error: "Erro ao gerar página com IA." }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const data = await response.json();
    const toolCall = data.choices?.[0]?.message?.tool_calls?.[0];

    if (!toolCall?.function?.arguments) {
      console.error("No tool call in response:", JSON.stringify(data));
      return new Response(
        JSON.stringify({ error: "Resposta inesperada da IA." }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const result = typeof toolCall.function.arguments === "string"
      ? JSON.parse(toolCall.function.arguments)
      : toolCall.function.arguments;

    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("bio-ai-builder error:", e);
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : "Erro desconhecido" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
