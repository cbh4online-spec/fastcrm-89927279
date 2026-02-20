
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, GET, OPTIONS',
};

interface OptimizationRequest {
  mode: "optimize-table" | "optimize-product" | "suggest-customer-pricing" | "analyze-margins" | "bulk-adjust";
  priceTableId?: string;
  productId?: string;
  customerId?: string;
  customerType?: string;
  products?: { id: string; name: string; basePrice: number; cost?: number; category?: string }[];
  targetMargin?: number;
  strategy?: "competitive" | "premium" | "volume" | "customer_value";
  adjustmentPercent?: number;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    const SUPABASE_URL = Deno.env.get('SUPABASE_URL');
    const SUPABASE_ANON_KEY = Deno.env.get('SUPABASE_ANON_KEY');

    if (!LOVABLE_API_KEY) {
      throw new Error('LOVABLE_API_KEY is not configured');
    }

    const authHeader = req.headers.get('Authorization');
    const supabase = createClient(SUPABASE_URL!, SUPABASE_ANON_KEY!, {
      global: { headers: { Authorization: authHeader! } }
    });

    const request: OptimizationRequest = await req.json();
    console.log('AI Pricing Optimizer - Mode:', request.mode);

    if (request.mode === "optimize-table" && request.priceTableId) {
      // Optimize all prices in a table
      const { data: items, error } = await supabase
        .from("price_table_items")
        .select(`
          *,
          product:products(id, name, base_price, direct_cost, category, product_type)
        `)
        .eq("price_table_id", request.priceTableId);

      if (error) throw error;

      const systemPrompt = `Você é um especialista em pricing e otimização de margens para negócios B2B em Portugal.
Analise os produtos e sugira preços otimizados com base na estratégia fornecida.

Estratégias:
- competitive: Preços competitivos para ganhar mercado
- premium: Preços premium para maximizar margem
- volume: Preços para incentivar volume de vendas
- customer_value: Preços baseados no valor percebido pelo cliente

Responda APENAS em JSON válido.`;

      const userPrompt = `Produtos para otimizar (estratégia: ${request.strategy || 'premium'}):
${items.map((item: any) => `
- ${item.product?.name} (Categoria: ${item.product?.category || 'N/A'})
  Preço atual: €${item.unit_price}
  Custo: €${item.product?.direct_cost || 0}
  Tipo: ${item.product?.product_type}
`).join('\n')}

Meta de margem: ${request.targetMargin || 30}%

Responda no formato JSON:
{
  "suggestions": [
    {
      "productId": "id",
      "currentPrice": 100,
      "suggestedPrice": 120,
      "marginBefore": 20,
      "marginAfter": 35,
      "reasoning": "Justificação breve"
    }
  ],
  "summary": "Resumo da otimização",
  "totalMarginImprovement": 5.5
}`;

      const response = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${LOVABLE_API_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: 'google/gemini-3-flash-preview',
          messages: [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: userPrompt }
          ],
          temperature: 0.4,
        }),
      });

      if (!response.ok) {
        if (response.status === 429) {
          return new Response(JSON.stringify({ error: 'Rate limit exceeded. Please try again later.' }), {
            status: 429,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          });
        }
        throw new Error(`AI gateway error: ${response.status}`);
      }

      const data = await response.json();
      const content = data.choices?.[0]?.message?.content || '';

      let result;
      try {
        const jsonMatch = content.match(/\{[\s\S]*\}/);
        result = jsonMatch ? JSON.parse(jsonMatch[0]) : null;
      } catch {
        result = { suggestions: [], summary: "Erro ao processar sugestões", totalMarginImprovement: 0 };
      }

      return new Response(JSON.stringify({
        success: true,
        data: result
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });

    } else if (request.mode === "suggest-customer-pricing" && request.customerId) {
      // Suggest personalized pricing for a specific customer
      const { data: customer } = await supabase
        .from("contacts")
        .select("id, name, abc_category, total_revenue, average_ticket, client_status, client_types")
        .eq("id", request.customerId)
        .single();

      const { data: company } = await supabase
        .from("companies")
        .select("id, name, industry, size, annual_revenue")
        .eq("id", request.customerId)
        .maybeSingle();

      const customerData = customer || company;
      
      if (!customerData) {
        return new Response(JSON.stringify({
          success: false,
          error: "Cliente não encontrado"
        }), {
          status: 404,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      const systemPrompt = `Você é um especialista em pricing personalizado B2B.
Analise o perfil do cliente e sugira uma estratégia de preços personalizada.
Considere: histórico de compras, segmento, potencial de crescimento, categoria ABC.

Responda APENAS em JSON válido.`;

      const userPrompt = `Perfil do cliente:
- Nome: ${customerData.name}
- Categoria ABC: ${(customerData as any).abc_category || 'N/A'}
- Faturação Total: €${(customerData as any).total_revenue || (customerData as any).annual_revenue || 0}
- Ticket Médio: €${(customerData as any).average_ticket || 'N/A'}
- Status: ${(customerData as any).client_status || 'N/A'}
- Tipo: ${(customerData as any).client_types || (customerData as any).industry || 'N/A'}
- Dimensão: ${(customerData as any).size || 'N/A'}

${request.products ? `Produtos a personalizar:
${request.products.map(p => `- ${p.name}: €${p.basePrice}`).join('\n')}` : ''}

Sugira uma estratégia de preços personalizada no formato JSON:
{
  "recommendedSegment": "vip|partner|reseller|end_customer|wholesale",
  "suggestedDiscountRange": { "min": 5, "max": 15 },
  "pricingStrategy": "Descrição da estratégia",
  "reasoning": "Justificação baseada no perfil",
  "upsellOpportunities": ["Lista de oportunidades"],
  "riskLevel": "low|medium|high",
  "productSuggestions": [
    {
      "productName": "Nome",
      "originalPrice": 100,
      "suggestedPrice": 90,
      "discountPercent": 10,
      "justification": "Razão"
    }
  ]
}`;

      const response = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${LOVABLE_API_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: 'google/gemini-3-flash-preview',
          messages: [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: userPrompt }
          ],
          temperature: 0.5,
        }),
      });

      if (!response.ok) {
        if (response.status === 429) {
          return new Response(JSON.stringify({ error: 'Rate limit exceeded. Please try again later.' }), {
            status: 429,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          });
        }
        throw new Error(`AI gateway error: ${response.status}`);
      }

      const data = await response.json();
      const content = data.choices?.[0]?.message?.content || '';

      let result;
      try {
        const jsonMatch = content.match(/\{[\s\S]*\}/);
        result = jsonMatch ? JSON.parse(jsonMatch[0]) : null;
      } catch {
        result = {
          recommendedSegment: "end_customer",
          suggestedDiscountRange: { min: 0, max: 10 },
          pricingStrategy: "Estratégia padrão",
          reasoning: "Sem dados suficientes para personalização",
          riskLevel: "medium"
        };
      }

      return new Response(JSON.stringify({
        success: true,
        data: result
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });

    } else if (request.mode === "analyze-margins") {
      // Analyze and suggest margin improvements
      const systemPrompt = `Você é um especialista em análise de margens e rentabilidade.
Analise os produtos e identifique oportunidades de melhoria de margem.

Responda APENAS em JSON válido.`;

      const userPrompt = `Produtos para análise:
${request.products?.map(p => `
- ${p.name} (${p.category || 'Sem categoria'})
  Preço: €${p.basePrice}
  Custo: €${p.cost || 0}
  Margem atual: ${p.cost ? (((p.basePrice - p.cost) / p.basePrice) * 100).toFixed(1) : 'N/A'}%
`).join('\n') || 'Nenhum produto fornecido'}

Analise e responda no formato JSON:
{
  "overallHealth": "good|warning|critical",
  "averageMargin": 25.5,
  "alerts": [
    {
      "productName": "Nome",
      "issue": "Margem muito baixa",
      "severity": "high|medium|low",
      "recommendation": "Sugestão"
    }
  ],
  "opportunities": [
    {
      "type": "price_increase|cost_reduction|bundle|upsell",
      "description": "Descrição da oportunidade",
      "potentialImpact": "€500/mês"
    }
  ],
  "summary": "Resumo da análise"
}`;

      const response = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${LOVABLE_API_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: 'google/gemini-3-flash-preview',
          messages: [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: userPrompt }
          ],
          temperature: 0.4,
        }),
      });

      if (!response.ok) {
        if (response.status === 429) {
          return new Response(JSON.stringify({ error: 'Rate limit exceeded. Please try again later.' }), {
            status: 429,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          });
        }
        throw new Error(`AI gateway error: ${response.status}`);
      }

      const data = await response.json();
      const content = data.choices?.[0]?.message?.content || '';

      let result;
      try {
        const jsonMatch = content.match(/\{[\s\S]*\}/);
        result = jsonMatch ? JSON.parse(jsonMatch[0]) : null;
      } catch {
        result = {
          overallHealth: "warning",
          averageMargin: 0,
          alerts: [],
          opportunities: [],
          summary: "Não foi possível analisar os dados"
        };
      }

      return new Response(JSON.stringify({
        success: true,
        data: result
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });

    } else if (request.mode === "bulk-adjust") {
      // Calculate bulk price adjustments
      const adjustmentPercent = request.adjustmentPercent || 0;
      
      const adjustedProducts = request.products?.map(p => ({
        ...p,
        newPrice: p.basePrice * (1 + adjustmentPercent / 100),
        adjustment: p.basePrice * (adjustmentPercent / 100)
      })) || [];

      return new Response(JSON.stringify({
        success: true,
        data: {
          adjustmentPercent,
          products: adjustedProducts,
          totalImpact: adjustedProducts.reduce((sum, p) => sum + p.adjustment, 0)
        }
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    return new Response(JSON.stringify({
      success: false,
      error: 'Invalid mode or missing required parameters'
    }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('AI Pricing Optimizer error:', error);
    return new Response(JSON.stringify({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
