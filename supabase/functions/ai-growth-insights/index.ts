import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface GrowthInsightsRequest {
  workspaceId: string;
  context?: {
    customerId?: string;
    sellerId?: string;
  };
  topCustomers?: Array<{
    id: string;
    name: string;
    totalRevenue: number;
    purchaseCount: number;
    churnRisk: string;
    products: Array<{ productName: string; purchaseDate: string }>;
  }>;
  topSellers?: Array<{
    id: string;
    name: string;
    totalRevenue: number;
    conversionRate: number;
    dealsWon: number;
    topProducts: Array<{ productName: string; salesCount: number }>;
  }>;
  needMatches?: Array<{
    customerName: string;
    currentProduct: string;
    recommendedProduct: string;
    confidence: number;
  }>;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const body: GrowthInsightsRequest = await req.json();
    const { workspaceId, context, topCustomers, topSellers, needMatches } = body;

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY is not configured");
    }

    // Build context for AI analysis
    let analysisContext = "Analisa os seguintes dados de crescimento do CRM:\n\n";

    if (topCustomers && topCustomers.length > 0) {
      analysisContext += "## Top Clientes:\n";
      topCustomers.forEach((c, i) => {
        analysisContext += `${i + 1}. ${c.name}: €${c.totalRevenue.toLocaleString()} | ${c.purchaseCount} compras | Risco: ${c.churnRisk}\n`;
        if (c.products.length > 0) {
          analysisContext += `   Produtos: ${c.products.map(p => p.productName).join(', ')}\n`;
        }
      });
      analysisContext += "\n";
    }

    if (topSellers && topSellers.length > 0) {
      analysisContext += "## Top Vendedores:\n";
      topSellers.forEach((s, i) => {
        analysisContext += `${i + 1}. ${s.name}: €${s.totalRevenue.toLocaleString()} | ${s.conversionRate.toFixed(1)}% conversão | ${s.dealsWon} negócios\n`;
      });
      analysisContext += "\n";
    }

    if (needMatches && needMatches.length > 0) {
      analysisContext += "## Oportunidades Identificadas:\n";
      needMatches.slice(0, 5).forEach(m => {
        analysisContext += `- ${m.customerName}: de "${m.currentProduct}" para "${m.recommendedProduct}" (${(m.confidence * 100).toFixed(0)}% confiança)\n`;
      });
      analysisContext += "\n";
    }

    const systemPrompt = `És um analista de crescimento especializado em CRM.
Gera insights acionáveis e claros sobre o desempenho comercial.

Regras:
- Usa linguagem simples e direta
- Foca em ações concretas
- Destaca padrões e oportunidades
- Alerta para riscos reais
- Nunca inventes números
- Baseia análises apenas nos dados fornecidos

Responde em JSON com a estrutura:
{
  "insights": ["insight 1", "insight 2"],
  "recommendations": ["recomendação 1", "recomendação 2"],
  "patterns": ["padrão identificado 1"],
  "nextBestActions": ["ação 1", "ação 2"],
  "confidenceLevel": 0.85
}`;

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
          { role: "user", content: analysisContext }
        ],
        temperature: 0.7,
        max_tokens: 1000
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
          JSON.stringify({ error: "Payment required. Please add credits to continue." }),
          { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      const errorText = await response.text();
      console.error("AI gateway error:", response.status, errorText);
      throw new Error("AI gateway error");
    }

    const aiResponse = await response.json();
    const content = aiResponse.choices?.[0]?.message?.content || "";

    // Parse JSON response
    let analysis;
    try {
      // Extract JSON from potential markdown code blocks
      const jsonMatch = content.match(/```json\n?([\s\S]*?)\n?```/) || 
                        content.match(/```\n?([\s\S]*?)\n?```/) ||
                        [null, content];
      analysis = JSON.parse(jsonMatch[1] || content);
    } catch {
      // If parsing fails, create structured response from text
      analysis = {
        insights: [content.slice(0, 200)],
        recommendations: [],
        patterns: [],
        nextBestActions: [],
        confidenceLevel: 0.6
      };
    }

    return new Response(
      JSON.stringify({
        customerId: context?.customerId,
        sellerId: context?.sellerId,
        insights: analysis.insights || [],
        recommendations: analysis.recommendations || [],
        patterns: analysis.patterns || [],
        nextBestActions: analysis.nextBestActions || [],
        confidenceLevel: analysis.confidenceLevel || 0.7,
        analysisTimestamp: new Date().toISOString()
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error) {
    console.error("Error in ai-growth-insights:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
