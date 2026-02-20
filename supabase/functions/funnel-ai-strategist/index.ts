const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { objective, average_ticket, audience, channel, product_or_lead } = await req.json();

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY not configured");

    const prompt = `Cria uma estrutura de funil de marketing digital com base nestes dados:

Objetivo: ${objective}
Ticket médio: ${average_ticket}
Público-alvo: ${audience}
Canal principal: ${channel}
Tipo: ${product_or_lead}

Responde APENAS com JSON válido neste formato:
{
  "funnel_name": "<nome sugerido>",
  "funnel_type": "<leadgen|upsell|remarketing|event|checkout>",
  "steps": [
    { "name": "<nome>", "type": "<page|optin|checkout|thankyou|upsell>", "copy_suggestion": "<texto sugerido>" }
  ],
  "recommended_events": ["PageView", "Lead", ...],
  "strategy_notes": "<notas estratégicas em 2-3 frases>"
}`;

    const aiResponse = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [
          { role: "system", content: "És um estratega de funis de conversão. Responde sempre em português." },
          { role: "user", content: prompt },
        ],
      }),
    });

    if (!aiResponse.ok) {
      if (aiResponse.status === 429) {
        return new Response(JSON.stringify({ error: "Rate limit exceeded" }), {
          status: 429,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (aiResponse.status === 402) {
        return new Response(JSON.stringify({ error: "Payment required" }), {
          status: 402,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      throw new Error("AI gateway error: " + aiResponse.status);
    }

    const aiData = await aiResponse.json();
    const content = aiData.choices?.[0]?.message?.content || "";
    
    const jsonMatch = content.match(/\{[\s\S]*\}/);
    const strategy = jsonMatch ? JSON.parse(jsonMatch[0]) : {
      funnel_name: "Funil Personalizado",
      funnel_type: "leadgen",
      steps: [
        { name: "Landing Page", type: "page", copy_suggestion: "Página de captura" },
        { name: "Formulário", type: "optin", copy_suggestion: "Formulário de contacto" },
        { name: "Obrigado", type: "thankyou", copy_suggestion: "Página de agradecimento" },
      ],
      recommended_events: ["PageView", "Lead"],
      strategy_notes: "Funil base criado com estrutura padrão.",
    };

    return new Response(JSON.stringify(strategy), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("funnel-ai-strategist error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
