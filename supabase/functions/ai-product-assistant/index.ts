import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, GET, OPTIONS',
};

interface AssistantRequest {
  mode: "suggest" | "sku-search" | "generate-description" | "price-analysis";
  productName?: string;
  sku?: string;
  category?: string;
  productType?: string;
  context?: string;
}

interface ProductSuggestion {
  categories: string[];
  priceRange: { min: number; max: number };
  suggestedPrice: number;
  description: string;
  productType?: string;
}

interface SKUSearchResult {
  found: boolean;
  name?: string;
  description?: string;
  priceRange?: { min: number; max: number };
  suggestedPrice?: number;
  category?: string;
  imageUrl?: string;
  source?: string;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { mode, productName, sku, category, productType, context } = await req.json() as AssistantRequest;
    
    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    const FIRECRAWL_API_KEY = Deno.env.get('FIRECRAWL_API_KEY');

    if (!LOVABLE_API_KEY) {
      throw new Error('LOVABLE_API_KEY is not configured');
    }

    console.log(`AI Product Assistant - Mode: ${mode}, Product: ${productName}, SKU: ${sku}`);

    if (mode === 'suggest' && productName) {
      // Use Lovable AI to suggest categories, price, description
      const systemPrompt = `Você é um assistente especializado em catálogo de produtos e serviços B2B/B2C.
Analise o nome do produto fornecido e sugira:
1. Categorias apropriadas (máximo 4)
2. Range de preço de mercado em EUR
3. Um preço sugerido dentro do range
4. Uma descrição curta profissional (máximo 100 caracteres)
5. Tipo de produto mais adequado

Responda APENAS em JSON válido sem markdown.`;

      const userPrompt = `Produto: "${productName}"
${category ? `Categoria atual: ${category}` : ''}
${productType ? `Tipo atual: ${productType}` : ''}
${context ? `Contexto adicional: ${context}` : ''}

Responda no formato JSON:
{
  "categories": ["categoria1", "categoria2"],
  "priceRange": { "min": 100, "max": 500 },
  "suggestedPrice": 300,
  "description": "Descrição curta do produto",
  "productType": "simple|formacao|sessions|physical|programa|recurring|composite"
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
          temperature: 0.7,
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
      
      // Parse JSON from response
      let suggestion: ProductSuggestion;
      try {
        const jsonMatch = content.match(/\{[\s\S]*\}/);
        suggestion = jsonMatch ? JSON.parse(jsonMatch[0]) : null;
      } catch {
        suggestion = {
          categories: [category || 'Geral'],
          priceRange: { min: 50, max: 500 },
          suggestedPrice: 100,
          description: 'Produto/Serviço profissional',
          productType: 'simple'
        };
      }

      return new Response(JSON.stringify({
        success: true,
        data: suggestion
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });

    } else if (mode === 'sku-search' && sku) {
      // Search for product by SKU using Firecrawl
      if (!FIRECRAWL_API_KEY) {
        return new Response(JSON.stringify({
          success: true,
          data: { found: false, message: 'Firecrawl API key not configured' }
        }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      // Search web for SKU
      const searchQuery = `"${sku}" produto preço especificações`;
      const searchResponse = await fetch('https://api.firecrawl.dev/v1/search', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${FIRECRAWL_API_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          query: searchQuery,
          limit: 5,
          scrapeOptions: { formats: ['markdown'] }
        }),
      });

      if (!searchResponse.ok) {
        console.error('Firecrawl search failed:', searchResponse.status);
        return new Response(JSON.stringify({
          success: true,
          data: { found: false, message: 'Search failed' }
        }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      const searchData = await searchResponse.json();
      const searchResults = searchData.data || [];

      if (searchResults.length === 0) {
        return new Response(JSON.stringify({
          success: true,
          data: { found: false }
        }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      // Use AI to extract structured data from search results
      const extractPrompt = `Analise os seguintes resultados de pesquisa para o SKU "${sku}" e extraia informações do produto.

Resultados:
${searchResults.slice(0, 3).map((r: any) => `
Título: ${r.title || 'N/A'}
URL: ${r.url || 'N/A'}
Conteúdo: ${(r.markdown || r.description || '').substring(0, 500)}
`).join('\n---\n')}

Extraia e responda APENAS em JSON válido:
{
  "found": true/false,
  "name": "Nome do produto",
  "description": "Descrição do produto (máximo 200 caracteres)",
  "priceRange": { "min": 0, "max": 0 },
  "suggestedPrice": 0,
  "category": "Categoria do produto",
  "source": "URL fonte principal"
}`;

      const extractResponse = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${LOVABLE_API_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: 'google/gemini-3-flash-preview',
          messages: [
            { role: 'system', content: 'Você é um assistente especializado em extração de dados de produtos. Responda apenas em JSON válido.' },
            { role: 'user', content: extractPrompt }
          ],
          temperature: 0.3,
        }),
      });

      if (!extractResponse.ok) {
        throw new Error(`AI extraction failed: ${extractResponse.status}`);
      }

      const extractData = await extractResponse.json();
      const extractContent = extractData.choices?.[0]?.message?.content || '';

      let result: SKUSearchResult;
      try {
        const jsonMatch = extractContent.match(/\{[\s\S]*\}/);
        result = jsonMatch ? JSON.parse(jsonMatch[0]) : { found: false };
      } catch {
        result = { found: false };
      }

      return new Response(JSON.stringify({
        success: true,
        data: result
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });

    } else if (mode === 'generate-description' && productName) {
      // Generate a more detailed description
      const descPrompt = `Gere uma descrição profissional para o seguinte produto/serviço:

Nome: ${productName}
${category ? `Categoria: ${category}` : ''}
${productType ? `Tipo: ${productType}` : ''}

Crie:
1. Uma descrição curta (máximo 100 caracteres)
2. Uma descrição completa (máximo 300 caracteres)

Responda em JSON:
{
  "shortDescription": "...",
  "fullDescription": "..."
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
            { role: 'system', content: 'Você é um copywriter especializado em descrições de produtos B2B. Responda apenas em JSON.' },
            { role: 'user', content: descPrompt }
          ],
          temperature: 0.7,
        }),
      });

      if (!response.ok) {
        throw new Error(`AI gateway error: ${response.status}`);
      }

      const data = await response.json();
      const content = data.choices?.[0]?.message?.content || '';

      let descriptions;
      try {
        const jsonMatch = content.match(/\{[\s\S]*\}/);
        descriptions = jsonMatch ? JSON.parse(jsonMatch[0]) : null;
      } catch {
        descriptions = {
          shortDescription: `${productName} - Produto/Serviço profissional`,
          fullDescription: `${productName} oferece soluções de qualidade para as necessidades do seu negócio.`
        };
      }

      return new Response(JSON.stringify({
        success: true,
        data: descriptions
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });

    } else if (mode === 'price-analysis' && productName) {
      // Analyze market prices
      const pricePrompt = `Analise o mercado para o seguinte produto/serviço e sugira preços:

Nome: ${productName}
${category ? `Categoria: ${category}` : ''}
${productType ? `Tipo: ${productType}` : ''}

Considere o mercado português/europeu B2B.

Responda em JSON:
{
  "priceRange": { "min": 0, "max": 0 },
  "suggestedPrice": 0,
  "pricingStrategy": "economy|standard|premium",
  "rationale": "Breve explicação da sugestão"
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
            { role: 'system', content: 'Você é um especialista em pricing B2B. Responda apenas em JSON.' },
            { role: 'user', content: pricePrompt }
          ],
          temperature: 0.5,
        }),
      });

      if (!response.ok) {
        throw new Error(`AI gateway error: ${response.status}`);
      }

      const data = await response.json();
      const content = data.choices?.[0]?.message?.content || '';

      let priceAnalysis;
      try {
        const jsonMatch = content.match(/\{[\s\S]*\}/);
        priceAnalysis = jsonMatch ? JSON.parse(jsonMatch[0]) : null;
      } catch {
        priceAnalysis = {
          priceRange: { min: 50, max: 500 },
          suggestedPrice: 150,
          pricingStrategy: 'standard',
          rationale: 'Preço baseado em médias de mercado'
        };
      }

      return new Response(JSON.stringify({
        success: true,
        data: priceAnalysis
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
    console.error('AI Product Assistant error:', error);
    return new Response(JSON.stringify({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
