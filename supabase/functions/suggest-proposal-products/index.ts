import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface ProductInfo {
  id: string;
  name: string;
  category: string | null;
  product_type: string;
  short_description: string | null;
  base_price: number | null;
  billing_type: string;
}

interface SuggestionContext {
  opportunityTitle?: string;
  opportunityValue?: number;
  leadName?: string;
  companyName?: string;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { context, products } = await req.json() as {
      context: SuggestionContext;
      products: ProductInfo[];
    };

    if (!products || products.length === 0) {
      return new Response(
        JSON.stringify({ suggestions: [] }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY is not configured");
    }

    // Build context description
    const contextParts: string[] = [];
    if (context.opportunityTitle) {
      contextParts.push(`Oportunidade: "${context.opportunityTitle}"`);
    }
    if (context.opportunityValue) {
      contextParts.push(`Valor estimado: €${context.opportunityValue.toLocaleString()}`);
    }
    if (context.leadName) {
      contextParts.push(`Cliente: ${context.leadName}`);
    }
    if (context.companyName) {
      contextParts.push(`Empresa: ${context.companyName}`);
    }

    const contextDescription = contextParts.length > 0 
      ? contextParts.join(", ") 
      : "Proposta comercial genérica";

    // Build products catalog description
    const productsCatalog = products.map((p) => 
      `- ID: ${p.id} | Nome: "${p.name}" | Tipo: ${p.product_type} | Categoria: ${p.category || "Sem categoria"} | Preço: ${p.base_price ? `€${p.base_price}` : "Sob consulta"} | ${p.short_description || ""}`
    ).join("\n");

    const systemPrompt = `Você é um assistente especializado em vendas B2B que sugere os melhores produtos/serviços para propostas comerciais.

Analise o contexto da proposta e o catálogo de produtos disponíveis para sugerir os mais relevantes.

Regras:
1. Sugira no máximo 5 produtos
2. Priorize produtos que façam sentido para o contexto
3. Considere o valor da oportunidade ao sugerir
4. Para oportunidades de alto valor, sugira serviços premium ou bundles
5. Sempre explique brevemente por que cada produto é relevante

Responda APENAS com um JSON válido no seguinte formato:
{
  "suggestions": [
    {
      "productId": "uuid-do-produto",
      "matchScore": 85,
      "reason": "Razão breve da sugestão",
      "suggestedQuantity": 1
    }
  ]
}`;

    const userPrompt = `Contexto da proposta: ${contextDescription}

Catálogo de produtos disponíveis:
${productsCatalog}

Sugira os produtos mais adequados para esta proposta.`;

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
        temperature: 0.3,
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(
          JSON.stringify({ error: "Rate limits exceeded, please try again later." }),
          { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      if (response.status === 402) {
        return new Response(
          JSON.stringify({ error: "Payment required, please add funds." }),
          { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      throw new Error(`AI gateway error: ${response.status}`);
    }

    const aiResponse = await response.json();
    const content = aiResponse.choices?.[0]?.message?.content || "";

    // Parse the JSON response
    let suggestions = [];
    try {
      // Extract JSON from the response
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[0]);
        suggestions = parsed.suggestions || [];
      }
    } catch (parseError) {
      console.error("Error parsing AI response:", parseError, content);
      // Return empty suggestions if parsing fails
    }

    // Validate that productIds exist in our catalog
    suggestions = suggestions.filter((s: any) => 
      products.some((p) => p.id === s.productId)
    );

    return new Response(
      JSON.stringify({ suggestions }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error) {
    console.error("Error in suggest-proposal-products:", error);
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
