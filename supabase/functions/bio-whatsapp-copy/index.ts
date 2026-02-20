

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { pageName, vertical, tone = "amigável" } = await req.json();

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY is not configured");

    const systemPrompt = `És um especialista em copywriting para WhatsApp Business em português de Portugal.

O utilizador tem uma página bio/link-in-bio e quer configurar um botão de WhatsApp.

Gera:
1. "text" — texto curto para o botão (2-4 palavras, ex: "Fale connosco", "Marcar consulta", "Pedir orçamento")
2. "message" — mensagem pré-definida que o visitante envia ao clicar (1-2 frases, persuasiva e natural)

A mensagem deve:
- Ser personalizada ao negócio
- Parecer natural e humana
- Incluir referência à página/marca
- Tom: ${tone}

IMPORTANTE: Escreve em português de Portugal.`;

    const userPrompt = `Página: "${pageName || "Minha Página"}"
Vertical/Descrição: "${vertical || "negócio genérico"}"

Gera o texto do botão e a mensagem pré-definida para o WhatsApp.`;

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
              name: "whatsapp_copy",
              description: "Return the WhatsApp button text and pre-filled message.",
              parameters: {
                type: "object",
                properties: {
                  text: { type: "string", description: "Short button label (2-4 words)" },
                  message: { type: "string", description: "Pre-filled WhatsApp message (1-2 sentences)" },
                },
                required: ["text", "message"],
                additionalProperties: false,
              },
            },
          },
        ],
        tool_choice: { type: "function", function: { name: "whatsapp_copy" } },
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(JSON.stringify({ error: "Limite de pedidos excedido. Tente novamente em breve." }), {
          status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (response.status === 402) {
        return new Response(JSON.stringify({ error: "Créditos insuficientes." }), {
          status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const text = await response.text();
      console.error("AI gateway error:", response.status, text);
      throw new Error("Erro ao gerar copy");
    }

    const data = await response.json();
    const toolCall = data.choices?.[0]?.message?.tool_calls?.[0];

    let result;
    if (toolCall?.function?.arguments) {
      result = JSON.parse(toolCall.function.arguments);
    } else {
      const content = data.choices?.[0]?.message?.content || "";
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      result = jsonMatch ? JSON.parse(jsonMatch[0]) : { text: "Fale connosco", message: "Olá! Vi a vossa página e gostava de saber mais." };
    }

    return new Response(JSON.stringify({ success: true, data: result }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Error:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Erro desconhecido" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
