import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, GET, OPTIONS',
};

interface AssistantRequest {
  mode: "suggest" | "sku-search" | "generate-description" | "price-analysis" | "compare-sources" | "generate-category" | "generate-category-image" | "suggest-category-details" | "generate-product-image" | "search-video" | "suggest-relations" | "image-to-product";
  productId?: string;
  workspaceId?: string;
  productName?: string;
  sku?: string;
  category?: string;
  productType?: string;
  context?: string;
  theme?: string;
  categoryName?: string;
  description?: string;
  existingCategories?: string[];
  imageBase64?: string;
}

interface VideoResult {
  url: string;
  title: string;
  thumbnail?: string;
  duration?: string;
  source: string;
}

interface ProductSuggestion {
  categories: string[];
  priceRange: { min: number; max: number };
  suggestedPrice: number;
  description: string;
  productType?: string;
}

interface ProductSpecifications {
  brand?: string;
  resolution?: string;
  sensor?: string;
  lens?: string;
  nightVision?: string;
  audio?: string;
  connectivity?: string;
  storage?: string;
  protection?: string;
  wdr?: string;
  compression?: string;
  temperature?: string;
  compatibility?: string;
  power?: string;
  [key: string]: string | undefined;
}

interface SKUSearchResult {
  found: boolean;
  technicalName?: string;
  technicalDescription?: string;
  commercialName?: string;
  commercialDescription?: string;
  name?: string;
  description?: string;
  priceRange?: { min: number; max: number };
  suggestedPrice?: number;
  category?: string;
  imageUrl?: string;
  images?: string[];
  source?: string;
  sources?: string[];
  specifications?: ProductSpecifications;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { mode, productName, sku, category, productType, context, theme, categoryName, description, existingCategories, productId: reqProductId, workspaceId: reqWorkspaceId, imageBase64 } = await req.json() as AssistantRequest;
    
    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    const FIRECRAWL_API_KEY = Deno.env.get('FIRECRAWL_API_KEY');

    if (!LOVABLE_API_KEY) {
      throw new Error('LOVABLE_API_KEY is not configured');
    }

    console.log(`AI Product Assistant - Mode: ${mode}, Product: ${productName}, SKU: ${sku}`);

    if (mode === 'suggest' && productName) {
      // Use Lovable AI to suggest categories, price, description
      const hasExistingCategories = existingCategories && existingCategories.length > 0;
      
      const systemPrompt = `Você é um assistente especializado em catálogo de produtos e serviços B2B/B2C.
Analise o nome do produto fornecido e sugira:
1. Categorias apropriadas (máximo 4)
2. Range de preço de mercado em EUR
3. Um preço sugerido dentro do range
4. Uma descrição curta profissional (máximo 100 caracteres)
5. Tipo de produto mais adequado
${hasExistingCategories ? '6. Se alguma das categorias existentes for adequada, identifique-a' : ''}

Responda APENAS em JSON válido sem markdown.`;

      const userPrompt = `Produto: "${productName}"
${category ? `Categoria atual: ${category}` : ''}
${productType ? `Tipo atual: ${productType}` : ''}
${context ? `Contexto adicional: ${context}` : ''}
${hasExistingCategories ? `Categorias existentes no sistema: ${existingCategories.join(', ')}` : ''}

Responda no formato JSON:
{
  "categories": ["categoria1", "categoria2"],
  "priceRange": { "min": 100, "max": 500 },
  "suggestedPrice": 300,
  "description": "Descrição curta do produto",
  "productType": "simple|formacao|sessions|physical|programa|recurring|composite"${hasExistingCategories ? `,
  "matchedCategoryName": "Nome da categoria existente que melhor se aplica (ou null se nenhuma for adequada)"` : ''}
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

      // Helper function to extract image URLs from markdown/html content
      const extractImagesFromContent = (content: string): string[] => {
        const imageUrls: string[] = [];
        
        // Match markdown image syntax: ![alt](url)
        const mdImageRegex = /!\[.*?\]\((https?:\/\/[^\s\)]+)\)/g;
        let match;
        while ((match = mdImageRegex.exec(content)) !== null) {
          if (match[1]) imageUrls.push(match[1]);
        }
        
        // Match HTML img tags: <img src="url">
        const imgTagRegex = /<img[^>]+src=["']?(https?:\/\/[^\s"'>]+)["']?/gi;
        while ((match = imgTagRegex.exec(content)) !== null) {
          if (match[1]) imageUrls.push(match[1]);
        }
        
        // Match direct image URLs in text
        const directUrlRegex = /(https?:\/\/[^\s<>"]+\.(?:jpg|jpeg|png|webp|gif)(?:\?[^\s<>"]*)?)/gi;
        while ((match = directUrlRegex.exec(content)) !== null) {
          if (match[1]) imageUrls.push(match[1]);
        }
        
        // Filter and deduplicate
        return [...new Set(imageUrls)]
          .filter(url => {
            // Filter out small icons, logos, etc
            const lower = url.toLowerCase();
            return !lower.includes('icon') && 
                   !lower.includes('logo') && 
                   !lower.includes('avatar') &&
                   !lower.includes('favicon') &&
                   !lower.includes('placeholder') &&
                   !lower.includes('spinner') &&
                   !lower.includes('loading') &&
                   !lower.includes('1x1') &&
                   !lower.includes('pixel') &&
                   url.length < 500;
          })
          .slice(0, 10);
      };

      // Try multiple search queries for better results
      const searchQueries = [
        `${sku} produto preço ficha técnica imagens`,
        `"${sku}" specifications price images`,
        sku.replace(/-/g, ' ') + ' produto foto',
      ];

      let allResults: any[] = [];
      let extractedImages: string[] = [];
      
      for (const searchQuery of searchQueries) {
        try {
          console.log('Searching with query:', searchQuery);
          const searchResponse = await fetch('https://api.firecrawl.dev/v1/search', {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${FIRECRAWL_API_KEY}`,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              query: searchQuery,
              limit: 5,
              scrapeOptions: { formats: ['markdown', 'html'] }
            }),
          });

          if (searchResponse.ok) {
            const searchData = await searchResponse.json();
            const results = searchData.data || [];
            console.log(`Query "${searchQuery}" returned ${results.length} results`);
            
            // Extract images from each result
            for (const result of results) {
              const content = (result.markdown || '') + (result.html || '') + (result.description || '');
              const images = extractImagesFromContent(content);
              extractedImages = [...extractedImages, ...images];
            }
            
            allResults = [...allResults, ...results];
          }
        } catch (e) {
          console.error('Search query failed:', searchQuery, e);
        }
        
        // If we have enough results, stop searching
        if (allResults.length >= 5) break;
      }
      
      // Deduplicate extracted images
      extractedImages = [...new Set(extractedImages)].slice(0, 10);
      console.log('Extracted images from content:', extractedImages.length);

      // Remove duplicates by URL
      const uniqueResults = allResults.filter((r, i, arr) => 
        arr.findIndex(x => x.url === r.url) === i
      ).slice(0, 5);

      if (uniqueResults.length === 0) {
        return new Response(JSON.stringify({
          success: true,
          data: { found: false, message: 'Nenhum resultado encontrado para este SKU' }
        }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      console.log('Total unique results:', uniqueResults.length);

      // Use AI to extract comprehensive structured data with both technical and commercial versions
      const extractPrompt = `Analise os seguintes resultados de pesquisa para o SKU "${sku}" e extraia informações COMPLETAS do produto.

Resultados:
${uniqueResults.slice(0, 4).map((r: any) => `
Título: ${r.title || 'N/A'}
URL: ${r.url || 'N/A'}
Conteúdo: ${(r.markdown || r.description || '').substring(0, 1000)}
`).join('\n---\n')}

${extractedImages.length > 0 ? `
IMAGENS ENCONTRADAS AUTOMATICAMENTE (USE ESTAS NO ARRAY "images"):
${extractedImages.slice(0, 8).join('\n')}
` : ''}

IMPORTANTE: Crie DUAS versões do nome e descrição:
1. TÉCNICA: Focada em especificações (como aparece no fabricante)
2. COMERCIAL: Estilo Amazon, focada em BENEFÍCIOS para o cliente, mais apelativa para vendas

Extraia TODAS as especificações técnicas disponíveis.
IMPORTANTE PARA IMAGENS: Se foram fornecidas URLs de imagens acima, INCLUA-AS no array "images".
Liste TODOS os preços encontrados para calcular range.

Responda APENAS em JSON válido:
{
  "found": true,
  "technicalName": "Nome técnico completo com modelo/SKU",
  "commercialName": "Nome apelativo estilo Amazon focado em benefícios principais (máx 150 chars, inclui características chave como resolução, features principais)",
  "technicalDescription": "Descrição técnica com especificações (máx 200 chars)",
  "commercialDescription": "Descrição comercial focada em benefícios para o cliente, pode usar emojis (máx 300 chars)",
  "priceRange": { "min": 0, "max": 0 },
  "suggestedPrice": 0,
  "category": "Categoria principal do produto",
  "images": ["url1", "url2"],
  "sources": ["url_fonte1", "url_fonte2"],
  "specifications": {
    "brand": "Marca",
    "resolution": "Resolução",
    "sensor": "Tipo de sensor",
    "lens": "Lente",
    "nightVision": "Alcance visão noturna",
    "audio": "Capacidades áudio",
    "connectivity": "Conectividade",
    "storage": "Armazenamento",
    "protection": "Nível proteção IP",
    "wdr": "WDR",
    "compression": "Compressão vídeo",
    "temperature": "Temperatura operação",
    "compatibility": "Compatibilidade",
    "power": "Alimentação"
  }
}

REGRAS para nome comercial:
- Começa com o tipo de produto (ex: "Câmara Vigilância WiFi")
- Inclui marca
- Destaca resolução de forma apelativa (1080P Full HD > 2MP)
- Menciona 2-3 features principais separadas por vírgula
- Ex: "Câmara Vigilância WiFi Safire 1080P Full HD - Visão Noturna 30m, Áudio Bidirecional, Exterior IP66"

REGRAS para descrição comercial:
- Foca em BENEFÍCIOS (o que o cliente ganha)
- Pode usar emojis para destaque visual
- Menciona facilidade de uso
- Ex: "🔒 Proteja a sua casa 24/7 com imagem Full HD. 🌙 Visão noturna até 30m. 🎙️ Fale através da câmara via app. ☔ Pronta para exterior."`;

      const extractResponse = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${LOVABLE_API_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: 'google/gemini-3-flash-preview',
          messages: [
            { role: 'system', content: 'Você é um especialista em catálogo de produtos e marketing. Extrai dados técnicos completos e cria versões comerciais apelativas. Responda apenas em JSON válido.' },
            { role: 'user', content: extractPrompt }
          ],
          temperature: 0.4,
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
        const parsed = jsonMatch ? JSON.parse(jsonMatch[0]) : { found: false };
        
        // Merge AI-extracted images with automatically extracted ones
        let allImages = [...(parsed.images || []), ...extractedImages];
        // Deduplicate and filter valid URLs
        allImages = [...new Set(allImages)]
          .filter(url => url && typeof url === 'string' && url.startsWith('http'))
          .slice(0, 10);
        
        // Ensure backward compatibility
        result = {
          ...parsed,
          images: allImages,
          name: parsed.commercialName || parsed.technicalName,
          description: parsed.commercialDescription || parsed.technicalDescription,
          imageUrl: allImages[0] || parsed.imageUrl,
          source: parsed.sources?.[0]
        };
      } catch {
        // If parsing fails but we have images, return them
        result = { 
          found: extractedImages.length > 0,
          images: extractedImages.length > 0 ? extractedImages : undefined
        };
      }

      console.log('Extraction result with images:', result.images?.length || 0, 'images found');
      console.log('Extraction result:', JSON.stringify(result, null, 2));

      return new Response(JSON.stringify({
        success: true,
        data: result
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });

    } else if (mode === 'search-video' && (productName || sku)) {
      // Search for product demo videos
      if (!FIRECRAWL_API_KEY) {
        return new Response(JSON.stringify({
          success: true,
          data: { videos: [], message: 'Firecrawl API key not configured' }
        }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      const searchTerm = sku || productName;
      const videoQueries = [
        `"${searchTerm}" video review demo youtube`,
        `${searchTerm} product demonstration video`,
        `${searchTerm} unboxing review`,
      ];

      let allVideoResults: VideoResult[] = [];

      for (const query of videoQueries) {
        try {
          console.log('Searching videos with query:', query);
          const searchResponse = await fetch('https://api.firecrawl.dev/v1/search', {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${FIRECRAWL_API_KEY}`,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              query,
              limit: 5,
            }),
          });

          if (searchResponse.ok) {
            const searchData = await searchResponse.json();
            const results = searchData.data || [];

            for (const result of results) {
              const url = result.url || '';
              const title = result.title || '';

              // Check if it's a video platform URL
              const isYouTube = url.includes('youtube.com/watch') || url.includes('youtu.be/');
              const isVimeo = url.includes('vimeo.com/');
              
              if (isYouTube || isVimeo) {
                // Extract YouTube video ID for thumbnail
                let thumbnail: string | undefined;
                if (isYouTube) {
                  const ytMatch = url.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/)([a-zA-Z0-9_-]+)/);
                  if (ytMatch) {
                    thumbnail = `https://img.youtube.com/vi/${ytMatch[1]}/mqdefault.jpg`;
                  }
                }

                allVideoResults.push({
                  url,
                  title: title.substring(0, 100),
                  thumbnail,
                  source: isYouTube ? 'YouTube' : 'Vimeo',
                });
              }
            }
          }
        } catch (e) {
          console.error('Video search query failed:', query, e);
        }

        // Stop if we have enough results
        if (allVideoResults.length >= 5) break;
      }

      // Deduplicate by URL
      const uniqueVideos = allVideoResults.filter((v, i, arr) => 
        arr.findIndex(x => x.url === v.url) === i
      ).slice(0, 8);

      console.log('Found videos:', uniqueVideos.length);

      return new Response(JSON.stringify({
        success: true,
        data: { videos: uniqueVideos }
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

    } else if (mode === 'compare-sources' && sku) {
      // Compare prices across multiple sources
      if (!FIRECRAWL_API_KEY) {
        return new Response(JSON.stringify({
          success: true,
          data: { sku, sources: [], message: 'Firecrawl API key not configured' }
        }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      // Search across multiple platforms
      const searchPlatforms = [
        { name: "Amazon", query: `site:amazon.es OR site:amazon.pt "${sku}" preço` },
        { name: "AliExpress", query: `site:aliexpress.com "${sku}"` },
        { name: "Kuantokusta", query: `site:kuantokusta.pt "${sku}"` },
        { name: "PCDiga", query: `site:pcdiga.com "${sku}"` },
        { name: "Worten", query: `site:worten.pt "${sku}"` },
        { name: "Global", query: `"${sku}" preço comprar stock` },
      ];

      const allResults: any[] = [];

      for (const platform of searchPlatforms) {
        try {
          console.log(`Searching ${platform.name}:`, platform.query);
          const searchResponse = await fetch('https://api.firecrawl.dev/v1/search', {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${FIRECRAWL_API_KEY}`,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              query: platform.query,
              limit: 3,
              scrapeOptions: { formats: ['markdown'] }
            }),
          });

          if (searchResponse.ok) {
            const data = await searchResponse.json();
            const results = (data.data || []).map((r: any) => ({
              ...r,
              platform: platform.name,
            }));
            allResults.push(...results);
          }
        } catch (e) {
          console.error(`Search failed for ${platform.name}:`, e);
        }
      }

      console.log(`Total results found: ${allResults.length}`);

      if (allResults.length === 0) {
        return new Response(JSON.stringify({
          success: true,
          data: { 
            sku, 
            sources: [], 
            message: 'Nenhuma fonte encontrada' 
          }
        }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      // Use AI to extract structured price comparison data
      const comparePrompt = `Analise os seguintes resultados de pesquisa para o SKU "${sku}" e extraia informações de preço de cada fonte.

Resultados:
${allResults.slice(0, 10).map((r: any) => `
Plataforma: ${r.platform}
Título: ${r.title || 'N/A'}
URL: ${r.url || 'N/A'}
Conteúdo: ${(r.markdown || r.description || '').substring(0, 500)}
`).join('\n---\n')}

Extraia informações de CADA fonte encontrada. Responda em JSON:
{
  "sources": [
    {
      "source": "Nome da loja/plataforma",
      "url": "URL completo",
      "name": "Nome do produto encontrado",
      "price": 99.99,
      "currency": "EUR",
      "inStock": true,
      "imageUrl": "URL da imagem se disponível",
      "rating": 4.5,
      "reviews": 123
    }
  ]
}

REGRAS:
- Inclui APENAS resultados com preços válidos
- Converte todos os preços para números (sem símbolos)
- Se não encontrar preço, não inclui essa fonte
- Agrupa resultados do mesmo site
- Ordena por preço (menor primeiro)`;

      const extractResponse = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${LOVABLE_API_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: 'google/gemini-3-flash-preview',
          messages: [
            { role: 'system', content: 'Você é um especialista em comparação de preços. Extrai dados de preço de resultados de pesquisa. Responda apenas em JSON válido.' },
            { role: 'user', content: comparePrompt }
          ],
          temperature: 0.3,
        }),
      });

      if (!extractResponse.ok) {
        throw new Error(`AI extraction failed: ${extractResponse.status}`);
      }

      const extractData = await extractResponse.json();
      const extractContent = extractData.choices?.[0]?.message?.content || '';

      let compareResult: { sources: any[] } = { sources: [] };
      try {
        const jsonMatch = extractContent.match(/\{[\s\S]*\}/);
        compareResult = jsonMatch ? JSON.parse(jsonMatch[0]) : { sources: [] };
      } catch {
        compareResult = { sources: [] };
      }

      // Calculate price statistics
      const validPrices = compareResult.sources
        .filter((s: any) => s.price && s.price > 0)
        .sort((a: any, b: any) => a.price - b.price);

      const lowestPrice = validPrices[0] 
        ? { source: validPrices[0].source, price: validPrices[0].price }
        : undefined;
      
      const highestPrice = validPrices[validPrices.length - 1]
        ? { source: validPrices[validPrices.length - 1].source, price: validPrices[validPrices.length - 1].price }
        : undefined;

      const averagePrice = validPrices.length > 0
        ? validPrices.reduce((sum: number, s: any) => sum + s.price, 0) / validPrices.length
        : undefined;

      return new Response(JSON.stringify({
        success: true,
        data: {
          sku,
          sources: compareResult.sources,
          lowestPrice,
          highestPrice,
          averagePrice,
        }
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    } else if (mode === 'generate-category' && theme) {
      // Generate a complete category from a theme
      const systemPrompt = `Você é um especialista em organização de catálogos de produtos e serviços.
Crie uma categoria profissional baseada no tema fornecido.

REGRAS:
- Nome: curto, profissional, máximo 30 caracteres
- Descrição: explicativa, máximo 100 caracteres
- Cor: hexadecimal que represente visualmente a categoria (evite cores muito claras)
- Evite duplicar categorias existentes se fornecidas

Responda APENAS em JSON válido sem markdown.`;

      const userPrompt = `Tema: "${theme}"
${existingCategories && existingCategories.length > 0 ? `Categorias já existentes (evite duplicar): ${existingCategories.join(', ')}` : ''}

Responda no formato JSON:
{
  "name": "Nome da Categoria",
  "description": "Descrição breve da categoria",
  "color": "#3B82F6"
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

      let suggestion;
      try {
        const jsonMatch = content.match(/\{[\s\S]*\}/);
        suggestion = jsonMatch ? JSON.parse(jsonMatch[0]) : null;
      } catch {
        suggestion = {
          name: theme.charAt(0).toUpperCase() + theme.slice(1),
          description: `Categoria para ${theme}`,
          color: '#3B82F6'
        };
      }

      return new Response(JSON.stringify({
        success: true,
        data: suggestion
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });

    } else if (mode === 'generate-category-image' && categoryName) {
      // Generate an image for a category using the image model
      const imagePrompt = `Create a simple, professional icon or illustration for a product category called "${categoryName}".
${description ? `Category description: ${description}` : ''}

Style: Modern, clean, minimalist icon style suitable for a business catalog.
Colors: Use vibrant but professional colors.
Composition: Centered, simple background, no text.
Format: Square aspect ratio, suitable as a category thumbnail.`;

      console.log('Generating category image with prompt:', imagePrompt);

      const response = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${LOVABLE_API_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: 'google/gemini-2.5-flash-image-preview',
          messages: [
            { role: 'user', content: imagePrompt }
          ],
          modalities: ['image', 'text'],
        }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error('Image generation API error:', response.status, errorText);
        if (response.status === 429) {
          return new Response(JSON.stringify({ error: 'Rate limit exceeded. Please try again later.' }), {
            status: 429,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          });
        }
        throw new Error(`AI gateway error: ${response.status} - ${errorText}`);
      }

      const data = await response.json();
      console.log('Image generation response keys:', Object.keys(data));
      console.log('Image generation response message:', JSON.stringify(data.choices?.[0]?.message, null, 2).substring(0, 500));
      
      const images = data.choices?.[0]?.message?.images || [];
      const imageBase64 = images[0]?.image_url?.url || null;

      if (!imageBase64) {
        console.error('No image in response. Full response:', JSON.stringify(data, null, 2).substring(0, 1000));
        return new Response(JSON.stringify({
          success: false,
          error: 'Não foi possível gerar a imagem. O modelo não retornou uma imagem.'
        }), {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      return new Response(JSON.stringify({
        success: true,
        data: { imageBase64 }
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });

    } else if (mode === 'suggest-category-details' && categoryName) {
      // Suggest description and color for an existing category name
      const systemPrompt = `Você é um especialista em organização de catálogos de produtos.
Sugira uma descrição e cor para a categoria fornecida.

Responda APENAS em JSON válido sem markdown.`;

      const userPrompt = `Categoria: "${categoryName}"

Responda no formato JSON:
{
  "description": "Descrição breve e profissional (máximo 100 chars)",
  "color": "#hexadecimal"
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
        throw new Error(`AI gateway error: ${response.status}`);
      }

      const data = await response.json();
      const content = data.choices?.[0]?.message?.content || '';

      let suggestion;
      try {
        const jsonMatch = content.match(/\{[\s\S]*\}/);
        suggestion = jsonMatch ? JSON.parse(jsonMatch[0]) : null;
      } catch {
        suggestion = {
          description: `Categoria para ${categoryName}`,
          color: '#3B82F6'
        };
      }

      return new Response(JSON.stringify({
        success: true,
        data: suggestion
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    } else if (mode === 'generate-product-image' && productName) {
      // Generate an image for a product using the image model
      const imagePrompt = `Create a professional product photo for "${productName}".
${category ? `Product category: ${category}` : ''}
${description ? `Product description: ${description}` : ''}

Style: Clean, professional product photography on a clean background.
Lighting: Professional studio lighting with soft shadows.
Composition: Centered product, suitable as a product listing image.
Format: Square aspect ratio, e-commerce style.
DO NOT include any text or labels in the image.`;

      console.log('Generating product image with prompt:', imagePrompt);

      const response = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${LOVABLE_API_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: 'google/gemini-2.5-flash-image-preview',
          messages: [
            { role: 'user', content: imagePrompt }
          ],
          modalities: ['image', 'text'],
        }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error('Image generation API error:', response.status, errorText);
        if (response.status === 429) {
          return new Response(JSON.stringify({ error: 'Rate limit exceeded. Please try again later.' }), {
            status: 429,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          });
        }
        throw new Error(`AI gateway error: ${response.status} - ${errorText}`);
      }

      const data = await response.json();
      console.log('Image generation response keys:', Object.keys(data));
      console.log('Image generation response choices:', JSON.stringify(data.choices?.[0]?.message, null, 2).substring(0, 500));
      
      const images = data.choices?.[0]?.message?.images || [];
      const imageBase64 = images[0]?.image_url?.url || null;

      if (!imageBase64) {
        console.error('No image in response. Full response:', JSON.stringify(data, null, 2).substring(0, 1000));
        return new Response(JSON.stringify({
          success: false,
          error: 'Não foi possível gerar a imagem. O modelo não retornou uma imagem.'
        }), {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      return new Response(JSON.stringify({
        success: true,
        data: { imageBase64 }
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });

    } else if (mode === 'suggest-relations' && reqProductId && reqWorkspaceId) {
      // Suggest product relations using AI
      const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
      const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
      const { createClient } = await import("https://esm.sh/@supabase/supabase-js@2");
      const supabase = createClient(supabaseUrl, supabaseKey);

      // Get the source product
      const { data: sourceProduct } = await supabase
        .from('products')
        .select('id, name, category, short_description, specifications, sku, base_price')
        .eq('id', reqProductId)
        .single();

      if (!sourceProduct) {
        return new Response(JSON.stringify({ success: false, error: 'Product not found' }), {
          status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      // Get other products in workspace
      const { data: otherProducts } = await supabase
        .from('products')
        .select('id, name, category, short_description, base_price, sku')
        .eq('workspace_id', reqWorkspaceId)
        .eq('status', 'active')
        .neq('id', reqProductId)
        .limit(50);

      if (!otherProducts || otherProducts.length === 0) {
        return new Response(JSON.stringify({ success: true, data: { added: 0 } }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      // Get existing relations to avoid duplicates
      const { data: existingRelations } = await supabase
        .from('product_relations')
        .select('target_product_id, relation_type')
        .eq('source_product_id', reqProductId);

      const existingSet = new Set((existingRelations || []).map((r: any) => `${r.target_product_id}:${r.relation_type}`));

      const catalog = otherProducts.map((p: any) => `ID:${p.id} | ${p.name} | ${p.category || ''} | ${p.short_description || ''} | SKU:${p.sku || ''}`).join('\n');

      const suggestPrompt = `Analisa o produto "${sourceProduct.name}" (categoria: ${sourceProduct.category || 'N/A'}, SKU: ${sourceProduct.sku || 'N/A'}, preço: ${(sourceProduct as any).base_price || 'N/A'}€) e sugere relações com outros produtos do catálogo.

CATÁLOGO:
${catalog}

Responde APENAS em JSON válido com o formato:
{
  "suggestions": [
    { "targetId": "uuid", "type": "compatible|related|bundle", "reason": "Motivo curto", "label": "Etiqueta amigável" }
  ]
}

REGRAS:
- compatible: acessórios, complementos, peças que funcionam juntos (cross-sell). Label: "Acessório recomendado", "Complemento", etc.
- related: alternativas similares ou versões superiores (up-sell se preço superior). Label: "Alternativa", "Upgrade", "Versão premium", etc.
- bundle: produtos que faz sentido comprar juntos como kit (cross-sell). Label: "Compre junto", "Kit recomendado", etc.
- Máximo 8 sugestões no total
- Razão máxima de 50 caracteres
- Label máximo de 25 caracteres`;
      const aiResp = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${LOVABLE_API_KEY}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: 'google/gemini-3-flash-preview',
          messages: [
            { role: 'system', content: 'Especialista em catálogo de produtos. Sugere relações inteligentes entre produtos. Responde só em JSON.' },
            { role: 'user', content: suggestPrompt },
          ],
          temperature: 0.5,
        }),
      });

      if (!aiResp.ok) throw new Error(`AI error: ${aiResp.status}`);

      const aiData = await aiResp.json();
      const aiContent = aiData.choices?.[0]?.message?.content || '';
      let suggestions: any[] = [];
      try {
        const jsonMatch = aiContent.match(/\{[\s\S]*\}/);
        const parsed = jsonMatch ? JSON.parse(jsonMatch[0]) : { suggestions: [] };
        suggestions = parsed.suggestions || [];
      } catch { suggestions = []; }

      // Build a lookup map for product names
      const productNameMap = new Map(otherProducts.map((p: any) => [p.id, p.name]));

      // Filter out existing relations and invalid IDs
      const validProductIds = new Set(otherProducts.map((p: any) => p.id));
      const validSuggestions = suggestions
        .filter((s: any) => validProductIds.has(s.targetId) && !existingSet.has(`${s.targetId}:${s.type}`));

      const toInsert = validSuggestions
        .map((s: any, i: number) => ({
          workspace_id: reqWorkspaceId,
          source_product_id: reqProductId,
          target_product_id: s.targetId,
          relation_type: s.type,
          reason: s.reason || null,
          sort_order: i,
        }));

      let added = 0;
      if (toInsert.length > 0) {
        const { error: insertError } = await supabase.from('product_relations').insert(toInsert);
        if (!insertError) added = toInsert.length;
        else console.error('Insert error:', insertError);
      }

      // Build enriched relations for frontend display
      const relations = validSuggestions.map((s: any) => ({
        targetId: s.targetId,
        targetName: productNameMap.get(s.targetId) || 'Produto',
        type: s.type,
        reason: s.reason || '',
        label: s.label || (s.type === 'compatible' ? 'Acessório' : s.type === 'bundle' ? 'Compre junto' : 'Alternativa'),
      }));

      return new Response(JSON.stringify({ success: true, data: { added, relations } }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });

    } else if (mode === 'image-to-product' && imageBase64) {
      // Analyze product image using Gemini vision
      console.log('Image-to-product: analyzing image...');

      const visionPrompt = `Analise esta imagem de um produto e identifique-o completamente.

IMPORTANTE: Crie DUAS versões do nome e descrição:
1. TÉCNICA: Focada em especificações (como aparece no fabricante)
2. COMERCIAL: Estilo Amazon, focada em BENEFÍCIOS para o cliente, mais apelativa para vendas

Extraia TODAS as especificações técnicas visíveis na imagem ou que consiga inferir do produto.

Responda APENAS em JSON válido:
{
  "found": true,
  "technicalName": "Nome técnico completo com modelo se visível",
  "commercialName": "Nome apelativo estilo Amazon focado em benefícios (máx 150 chars)",
  "technicalDescription": "Descrição técnica com especificações (máx 200 chars)",
  "commercialDescription": "Descrição comercial focada em benefícios, pode usar emojis (máx 300 chars)",
  "priceRange": { "min": 0, "max": 0 },
  "suggestedPrice": 0,
  "category": "Categoria principal do produto",
  "specifications": {
    "brand": "Marca (se visível)",
    "model": "Modelo (se visível)",
    "color": "Cor",
    "material": "Material (se identificável)",
    "dimensions": "Dimensões aproximadas"
  }
}

REGRAS para nome comercial:
- Começa com o tipo de produto
- Inclui marca se visível
- Destaca 2-3 features principais
- Ex: "Câmara Vigilância WiFi Full HD - Visão Noturna, Exterior IP66"

REGRAS para descrição comercial:
- Foca em BENEFÍCIOS (o que o cliente ganha)
- Pode usar emojis para destaque visual

Se não conseguir identificar o produto, responda: {"found": false}`;

      const visionResponse = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${LOVABLE_API_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: 'google/gemini-2.5-flash',
          messages: [
            { role: 'system', content: 'Você é um especialista em identificação e catálogo de produtos. Analise imagens e extraia dados completos. Responda apenas em JSON válido.' },
            { 
              role: 'user', 
              content: [
                { type: 'text', text: visionPrompt },
                { type: 'image_url', image_url: { url: `data:image/jpeg;base64,${imageBase64}` } }
              ]
            }
          ],
          temperature: 0.4,
        }),
      });

      if (!visionResponse.ok) {
        if (visionResponse.status === 429) {
          return new Response(JSON.stringify({ error: 'Rate limit exceeded. Please try again later.' }), {
            status: 429,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          });
        }
        throw new Error(`AI vision error: ${visionResponse.status}`);
      }

      const visionData = await visionResponse.json();
      const visionContent = visionData.choices?.[0]?.message?.content || '';

      let imageResult: SKUSearchResult;
      try {
        const jsonMatch = visionContent.match(/\{[\s\S]*\}/);
        const parsed = jsonMatch ? JSON.parse(jsonMatch[0]) : { found: false };
        imageResult = {
          ...parsed,
          name: parsed.commercialName || parsed.technicalName,
          description: parsed.commercialDescription || parsed.technicalDescription,
        };
      } catch {
        imageResult = { found: false };
      }

      console.log('Image analysis result:', JSON.stringify(imageResult, null, 2));

      return new Response(JSON.stringify({
        success: true,
        data: imageResult
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
