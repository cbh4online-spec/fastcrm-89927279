import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY not configured");

    const { action, context } = await req.json();

    let systemPrompt = "";
    let userPrompt = "";

    switch (action) {
      case "suggest_prices":
        systemPrompt = `Sou um especialista em pricing de SaaS CRM. Analiso o contexto do produto e sugiro preços competitivos em EUR. Respondo sempre em JSON válido com a estrutura: {"suggestions": [{"config_key": string, "price_monthly": number, "price_yearly": number, "reasoning": string}]}`;
        userPrompt = `Analisa estes planos/módulos e sugere preços competitivos para o mercado europeu de CRM SaaS:\n\n${JSON.stringify(context, null, 2)}\n\nConsidera: competidores como HubSpot, Pipedrive, Monday CRM. Sugere preços que sejam competitivos mas sustentáveis.`;
        break;

      case "generate_features":
        systemPrompt = `Sou um especialista em produto SaaS CRM. Gero listas de features relevantes e diferenciadores. Respondo sempre em JSON válido com a estrutura: {"features": string[], "highlights": string[]}`;
        userPrompt = `Gera uma lista de features para este plano/módulo:\n\n${JSON.stringify(context, null, 2)}\n\nGera 6-10 features claras e concisas em português. Inclui 3-5 highlights (pontos fortes principais).`;
        break;

      case "create_promotion":
        systemPrompt = `Sou um especialista em marketing de SaaS. Crio promoções eficazes. Respondo sempre em JSON válido com a estrutura: {"name": string, "description": string, "discount_percent": number, "valid_days": number, "target_segment": string, "messaging": string}`;
        userPrompt = `Cria uma promoção para este contexto:\n\n${JSON.stringify(context, null, 2)}\n\nObjetivo: aumentar conversões. Sugere uma promoção realista e atrativa.`;
        break;

      case "optimize_pricing":
        systemPrompt = `Sou um analista de pricing SaaS. Analiso a estrutura de preços actual e recomendo optimizações. Respondo em JSON: {"analysis": string, "recommendations": [{"item": string, "current_price": number, "suggested_price": number, "reasoning": string}]}`;
        userPrompt = `Analisa esta estrutura de preços e recomenda optimizações:\n\n${JSON.stringify(context, null, 2)}\n\nConsidera margens, competitividade e elasticidade de preço.`;
        break;

      default:
        return new Response(JSON.stringify({ error: "Unknown action" }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
    }

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
        tools: [{
          type: "function",
          function: {
            name: "pricing_result",
            description: "Return the pricing analysis result",
            parameters: {
              type: "object",
              properties: {
                result: { type: "object", description: "The structured result" }
              },
              required: ["result"],
              additionalProperties: false,
            }
          }
        }],
        tool_choice: { type: "function", function: { name: "pricing_result" } },
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(JSON.stringify({ error: "Rate limit excedido. Tente novamente em breve." }), {
          status: 429,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (response.status === 402) {
        return new Response(JSON.stringify({ error: "Créditos IA insuficientes." }), {
          status: 402,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const text = await response.text();
      console.error("AI error:", response.status, text);
      throw new Error("AI gateway error");
    }

    const aiData = await response.json();
    const toolCall = aiData.choices?.[0]?.message?.tool_calls?.[0];
    let result;

    if (toolCall?.function?.arguments) {
      const parsed = typeof toolCall.function.arguments === "string"
        ? JSON.parse(toolCall.function.arguments)
        : toolCall.function.arguments;
      result = parsed.result || parsed;
    } else {
      // Fallback: try to parse content
      const content = aiData.choices?.[0]?.message?.content || "";
      try {
        result = JSON.parse(content);
      } catch {
        result = { raw: content };
      }
    }

    return new Response(JSON.stringify({ result }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("pricing-ai-assistant error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
