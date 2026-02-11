import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
  'Access-Control-Allow-Methods': 'POST, GET, OPTIONS',
};

interface AssistantRequest {
  mode: "suggest" | "sku-search" | "generate-description" | "generate-store-description" | "price-analysis" | "compare-sources" | "generate-category" | "generate-category-image" | "suggest-category-details" | "generate-product-image" | "search-video" | "suggest-relations" | "image-to-product" | "generate-store-banner" | "suggest-brand-colors" | "ensure-store-category";
  storeName?: string;
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

  // Helper: search for brand logo via Firecrawl
  async function searchBrandLogo(brandName: string, firecrawlKey: string): Promise<string | null> {
    if (!brandName || !firecrawlKey) return null;
    
    try {
      console.log('Searching brand logo for:', brandName);
      const logoQuery = `"${brandName}" official logo png transparent`;
      
      const searchResponse = await fetch('https://api.firecrawl.dev/v1/search', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${firecrawlKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          query: logoQuery,
          limit: 3,
          scrapeOptions: { formats: ['markdown', 'html'] }
        }),
      });

      if (!searchResponse.ok) return null;
      
      const searchData = await searchResponse.json();
      const results = searchData.data || [];
      
      // Extract logo image URLs from results
      const logoUrls: string[] = [];
      for (const result of results) {
        const content = (result.markdown || '') + (result.html || '') + (result.description || '');
        
        // Match image URLs that look like logos
        const imgRegex = /(https?:\/\/[^\s<>"]+\.(?:png|svg|webp|jpg|jpeg)(?:\?[^\s<>"]*)?)/gi;
        let match;
        while ((match = imgRegex.exec(content)) !== null) {
          const url = match[1];
          const lower = url.toLowerCase();
          // Prefer URLs that contain logo-related terms
          if (lower.includes('logo') || lower.includes('brand') || lower.includes(brandName.toLowerCase().replace(/\s+/g, ''))) {
            logoUrls.unshift(url); // prioritize
          } else if (!lower.includes('icon') && !lower.includes('favicon') && !lower.includes('1x1') && !lower.includes('pixel') && !lower.includes('placeholder')) {
            logoUrls.push(url);
          }
        }
      }
      
      const bestLogo = [...new Set(logoUrls)][0] || null;
      console.log('Brand logo found:', bestLogo ? 'yes' : 'no');
      return bestLogo;
    } catch (e) {
      console.error('Brand logo search failed:', e);
      return null;
    }
  }

  serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { mode, productName, sku, category, productType, context, theme, categoryName, description, existingCategories, productId: reqProductId, workspaceId: reqWorkspaceId, imageBase64, storeName } = await req.json() as AssistantRequest & { storeName?: string };
    
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
        `site:visiotechsecurity.com ${sku}`,
      ];

      let allResults: any[] = [];
      let extractedImages: string[] = [];
      
      // Execute all search queries in parallel for maximum speed
      console.log('Executing all search queries in parallel...');
      const searchPromises = searchQueries.map(async (searchQuery) => {
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
            return results;
          }
        } catch (e) {
          console.error('Search query failed:', searchQuery, e);
        }
        return [];
      });

      const searchResultArrays = await Promise.all(searchPromises);
      
      // Merge all results and extract images
      for (const results of searchResultArrays) {
        for (const result of results) {
          const content = (result.markdown || '') + (result.html || '') + (result.description || '');
          const images = extractImagesFromContent(content);
          extractedImages = [...extractedImages, ...images];
        }
        allResults = [...allResults, ...results];
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
  "weight": 0.5,
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

REGRAS para weight (peso em kg):
- Estime o peso real do produto com embalagem em kg
- Use valores realistas: câmara CCTV ~0.3-0.8kg, router ~0.5kg, NVR ~2-3kg, monitor ~5-8kg
- Se não souber, use 0.5 como default

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

      // Search for brand logo
      const brand = result.specifications?.brand;
      if (brand && FIRECRAWL_API_KEY) {
        const brandLogoUrl = await searchBrandLogo(brand, FIRECRAWL_API_KEY);
        if (brandLogoUrl) {
          (result as any).brandLogoUrl = brandLogoUrl;
        }
      }

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

    } else if (mode === 'generate-store-description' && storeName) {
      // Generate SEO-optimized store description
      const storeDescPrompt = `Gere uma descrição otimizada para SEO para a seguinte loja online:

Nome da Loja: ${storeName}
${category ? `Categoria de Produtos: ${category}` : ''}

Crie:
1. Uma meta description para SEO (máximo 160 caracteres, apelativa, com call-to-action)
2. Uma descrição completa da loja (máximo 300 caracteres, profissional, que transmita confiança)

Responda em JSON:
{
  "metaDescription": "...",
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
            { role: 'system', content: 'Você é um especialista em SEO e copywriting para e-commerce. Crie descrições que convertem visitantes em clientes. Responda apenas em JSON.' },
            { role: 'user', content: storeDescPrompt }
          ],
          temperature: 0.7,
        }),
      });

      if (!response.ok) {
        throw new Error(`AI gateway error: ${response.status}`);
      }

      const data = await response.json();
      const content = data.choices?.[0]?.message?.content || '';

      let storeDesc;
      try {
        const jsonMatch = content.match(/\{[\s\S]*\}/);
        storeDesc = jsonMatch ? JSON.parse(jsonMatch[0]) : null;
      } catch {
        storeDesc = {
          metaDescription: `${storeName} - A sua loja online de confiança. Descubra os melhores produtos com entrega rápida.`,
          fullDescription: `Bem-vindo à ${storeName}! Oferecemos produtos de qualidade com atendimento personalizado e entrega rápida.`
        };
      }

      return new Response(JSON.stringify({
        success: true,
        data: storeDesc
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
Tente identificar a MARCA e MODELO específico para permitir pesquisa online posterior.

Responda APENAS em JSON válido:
{
  "found": true,
  "technicalName": "Nome técnico completo com modelo se visível",
  "commercialName": "Nome apelativo estilo Amazon focado em benefícios (máx 150 chars)",
  "technicalDescription": "Descrição técnica com especificações (máx 200 chars)",
  "commercialDescription": "Descrição comercial focada em benefícios, pode usar emojis (máx 300 chars)",
  "priceRange": { "min": 0, "max": 0 },
  "suggestedPrice": 0,
  "weight": 0.5,
  "category": "Categoria principal do produto",
  "searchQuery": "Marca Modelo - termos de pesquisa para encontrar este produto online",
  "specifications": {
    "brand": "Marca (se visível)",
    "model": "Modelo (se visível)",
    "color": "Cor",
    "material": "Material (se identificável)",
    "dimensions": "Dimensões aproximadas"
  }
}

REGRAS para weight (peso em kg):
- Estime o peso real do produto com embalagem em kg
- Use valores realistas baseados no tipo/tamanho do produto visível na imagem
- Se não souber, use 0.5 como default

REGRAS para nome comercial:
- Começa com o tipo de produto
- Inclui marca se visível
- Destaca 2-3 features principais
- Ex: "Câmara Vigilância WiFi Full HD - Visão Noturna, Exterior IP66"

REGRAS para descrição comercial:
- Foca em BENEFÍCIOS (o que o cliente ganha)
- Pode usar emojis para destaque visual

REGRAS para searchQuery:
- Inclui marca e modelo se identificáveis
- Termos que permitam encontrar o produto no Google
- Ex: "Dahua IPC-HDBW4431 FAS câmara segurança"

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

      // If product was identified, enrich with Firecrawl search for images and more data
      if (imageResult.found && FIRECRAWL_API_KEY) {
        const searchQuery = (imageResult as any).searchQuery || imageResult.name || '';
        if (searchQuery) {
          console.log('Enriching image-to-product with Firecrawl search:', searchQuery);
          
          const enrichQueries = [
            `${searchQuery} produto preço imagens`,
            `"${(imageResult.specifications as any)?.brand || ''} ${(imageResult.specifications as any)?.model || ''}" ficha técnica`.trim(),
          ].filter(q => q.trim().length > 5);

          let extractedImages: string[] = [];
          let enrichedSources: string[] = [];

          const extractImagesFromContent = (content: string): string[] => {
            const urls: string[] = [];
            const mdImgRx = /!\[.*?\]\((https?:\/\/[^\s\)]+)\)/g;
            const imgTagRx = /<img[^>]+src=["']?(https?:\/\/[^\s"'>]+)["']?/gi;
            const directRx = /(https?:\/\/[^\s<>"]+\.(?:jpg|jpeg|png|webp|gif)(?:\?[^\s<>"]*)?)/gi;
            let m;
            while ((m = mdImgRx.exec(content)) !== null) if (m[1]) urls.push(m[1]);
            while ((m = imgTagRx.exec(content)) !== null) if (m[1]) urls.push(m[1]);
            while ((m = directRx.exec(content)) !== null) if (m[1]) urls.push(m[1]);
            return [...new Set(urls)].filter(u => {
              const l = u.toLowerCase();
              return !l.includes('icon') && !l.includes('logo') && !l.includes('favicon') && !l.includes('placeholder') && !l.includes('1x1') && u.length < 500;
            });
          };

          for (const q of enrichQueries) {
            try {
              const sr = await fetch('https://api.firecrawl.dev/v1/search', {
                method: 'POST',
                headers: { 'Authorization': `Bearer ${FIRECRAWL_API_KEY}`, 'Content-Type': 'application/json' },
                body: JSON.stringify({ query: q, limit: 5, scrapeOptions: { formats: ['markdown', 'html'] } }),
              });
              if (sr.ok) {
                const sd = await sr.json();
                for (const r of (sd.data || [])) {
                  const content = (r.markdown || '') + (r.html || '') + (r.description || '');
                  extractedImages.push(...extractImagesFromContent(content));
                  if (r.url) enrichedSources.push(r.url);
                }
              }
            } catch (e) {
              console.error('Enrich search failed:', q, e);
            }
          }

          extractedImages = [...new Set(extractedImages)].slice(0, 10);
          enrichedSources = [...new Set(enrichedSources)].slice(0, 5);

          console.log('Enrichment found', extractedImages.length, 'images and', enrichedSources.length, 'sources');

          // Merge enriched data
          imageResult.images = extractedImages;
          imageResult.imageUrl = extractedImages[0];
          imageResult.sources = enrichedSources;
          imageResult.source = enrichedSources[0];
        }
      }

      // Search for brand logo
      const brand = imageResult.specifications?.brand;
      if (brand && FIRECRAWL_API_KEY) {
        const brandLogoUrl = await searchBrandLogo(brand, FIRECRAWL_API_KEY);
        if (brandLogoUrl) {
          (imageResult as any).brandLogoUrl = brandLogoUrl;
        }
      }

      return new Response(JSON.stringify({
        success: true,
        data: imageResult
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });

    } else if (mode === 'generate-store-banner' && storeName) {
      // Generate a photorealistic banner for the store
      const bannerPrompt = `Generate a photorealistic wide banner image (16:9 aspect ratio) for an online store called "${storeName}".${description ? ` The store is about: ${description}.` : ''}${category ? ` Main category: ${category}.` : ''} The image should be professional, modern, and suitable as a hero banner for an e-commerce website. Use warm, inviting lighting with a clean composition. Ultra high resolution. Do NOT include any text or logos in the image.`;

      const bannerResponse = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${LOVABLE_API_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: 'google/gemini-3-pro-image-preview',
          messages: [{ role: 'user', content: bannerPrompt }],
          modalities: ['image', 'text'],
        }),
      });

      if (!bannerResponse.ok) {
        if (bannerResponse.status === 429) {
          return new Response(JSON.stringify({ error: 'Rate limit exceeded. Please try again later.' }), {
            status: 429,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          });
        }
        throw new Error(`AI banner generation error: ${bannerResponse.status}`);
      }

      const bannerData = await bannerResponse.json();
      const bannerImageUrl = bannerData.choices?.[0]?.message?.images?.[0]?.image_url?.url;
      if (!bannerImageUrl) throw new Error('No image returned from AI');

      return new Response(JSON.stringify({
        success: true,
        data: { imageBase64: bannerImageUrl }
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });

    } else if (mode === 'suggest-brand-colors' && storeName) {
      // Suggest brand colors based on store name and description
      const colorPrompt = `Analisa o nome e contexto de uma loja online e sugere uma paleta de cores profissional.

Loja: "${storeName}"
${description ? `Descrição: ${description}` : ''}
${category ? `Categoria: ${category}` : ''}

Sugere duas cores em formato hexadecimal:
1. Cor Primária: a cor principal da marca (botões, links, destaques)
2. Cor de Destaque: cor secundária complementar (badges, CTAs, acentos)

Considera psicologia das cores e o tipo de negócio. Garante bom contraste.

Responda APENAS em JSON válido:
{
  "primaryColor": "#hex",
  "accentColor": "#hex",
  "rationale": "Explicação curta em PT de porque estas cores funcionam para esta loja"
}`;

      const colorResponse = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${LOVABLE_API_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: 'google/gemini-3-flash-preview',
          messages: [
            { role: 'system', content: 'Você é um designer de branding especializado. Responda apenas em JSON válido.' },
            { role: 'user', content: colorPrompt }
          ],
          temperature: 0.7,
        }),
      });

      if (!colorResponse.ok) {
        if (colorResponse.status === 429) {
          return new Response(JSON.stringify({ error: 'Rate limit exceeded. Please try again later.' }), {
            status: 429,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          });
        }
        throw new Error(`AI color suggestion error: ${colorResponse.status}`);
      }

      const colorData = await colorResponse.json();
      const colorContent = colorData.choices?.[0]?.message?.content || '';

      let colorResult;
      try {
        const jsonMatch = colorContent.match(/\{[\s\S]*\}/);
        colorResult = jsonMatch ? JSON.parse(jsonMatch[0]) : null;
      } catch {
        colorResult = { primaryColor: '#6366f1', accentColor: '#f59e0b', rationale: 'Cores padrão' };
      }

      return new Response(JSON.stringify({
        success: true,
        data: colorResult
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });

    } else if (mode === 'ensure-store-category' && categoryName && reqWorkspaceId) {
      // Ensure a store category exists, creating it with AI description + image if needed
      const { createClient } = await import('https://esm.sh/@supabase/supabase-js@2');
      const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
      const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
      const adminClient = createClient(supabaseUrl, supabaseServiceKey);

      // Check if category already exists (case-insensitive)
      const { data: existing } = await adminClient
        .from('store_categories')
        .select('id, name, image_url')
        .eq('workspace_id', reqWorkspaceId)
        .ilike('name', categoryName.trim())
        .maybeSingle();

      if (existing) {
        console.log('Category already exists:', existing.id);
        return new Response(JSON.stringify({
          success: true,
          data: { categoryId: existing.id, categoryName: existing.name, isNew: false, imageUrl: existing.image_url }
        }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
      }

      // Generate slug
      const slug = categoryName.trim().toLowerCase()
        .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
        .replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');

      // Generate AI description (SEO optimized)
      console.log('Generating AI description for category:', categoryName);
      const descResponse = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${LOVABLE_API_KEY}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: 'google/gemini-3-flash-preview',
          messages: [
            { role: 'system', content: 'Você é um especialista em SEO para e-commerce. Responda apenas em JSON válido.' },
            { role: 'user', content: `Gere uma descrição SEO otimizada para a categoria de loja online "${categoryName}". A descrição deve ser apelativa para clientes e otimizada para motores de busca. Máximo 200 caracteres.\n\nResponda em JSON:\n{ "description": "..." }` }
          ],
          temperature: 0.7,
        }),
      });

      let categoryDescription = `Explore os nossos produtos de ${categoryName}`;
      if (descResponse.ok) {
        const descData = await descResponse.json();
        const descContent = descData.choices?.[0]?.message?.content || '';
        try {
          const jsonMatch = descContent.match(/\{[\s\S]*\}/);
          if (jsonMatch) {
            const parsed = JSON.parse(jsonMatch[0]);
            categoryDescription = parsed.description || categoryDescription;
          }
        } catch { /* use default */ }
      }

      // Generate category image
      let imageUrl: string | null = null;
      try {
        console.log('Generating category image for:', categoryName);
        const imagePrompt = `Create a simple, professional icon or illustration for a product category called "${categoryName}". ${categoryDescription ? `Category description: ${categoryDescription}` : ''}\nStyle: Modern, clean, minimalist icon style suitable for a business catalog.\nColors: Use vibrant but professional colors.\nComposition: Centered, simple background, no text.\nFormat: Square aspect ratio, suitable as a category thumbnail.`;

        const imgResponse = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
          method: 'POST',
          headers: { 'Authorization': `Bearer ${LOVABLE_API_KEY}`, 'Content-Type': 'application/json' },
          body: JSON.stringify({
            model: 'google/gemini-2.5-flash-image-preview',
            messages: [{ role: 'user', content: imagePrompt }],
            modalities: ['image', 'text'],
          }),
        });

        if (imgResponse.ok) {
          const imgData = await imgResponse.json();
          const images = imgData.choices?.[0]?.message?.images || [];
          const base64Data = images[0]?.image_url?.url || null;

          if (base64Data) {
            // Upload to storage
            const base64Content = base64Data.includes(',') ? base64Data.split(',')[1] : base64Data;
            const binaryStr = atob(base64Content);
            const bytes = new Uint8Array(binaryStr.length);
            for (let i = 0; i < binaryStr.length; i++) bytes[i] = binaryStr.charCodeAt(i);

            const filePath = `${reqWorkspaceId}/${slug}-${Date.now()}.png`;
            const { error: uploadError } = await adminClient.storage
              .from('store-category-images')
              .upload(filePath, bytes.buffer, { contentType: 'image/png', upsert: true });

            if (!uploadError) {
              const { data: publicData } = adminClient.storage
                .from('store-category-images')
                .getPublicUrl(filePath);
              imageUrl = publicData.publicUrl;
              console.log('Category image uploaded:', imageUrl);
            } else {
              console.error('Category image upload error:', uploadError);
            }
          }
        }
      } catch (imgErr) {
        console.error('Category image generation failed:', imgErr);
      }

      // Insert the new category
      const { data: newCat, error: insertError } = await adminClient
        .from('store_categories')
        .insert({
          workspace_id: reqWorkspaceId,
          name: categoryName.trim(),
          slug,
          description: categoryDescription,
          image_url: imageUrl,
          is_active: true,
        })
        .select('id, name, image_url')
        .single();

      if (insertError) {
        console.error('Category insert error:', insertError);
        throw new Error(`Failed to create category: ${insertError.message}`);
      }

      console.log('New category created:', newCat.id);
      return new Response(JSON.stringify({
        success: true,
        data: { categoryId: newCat.id, categoryName: newCat.name, isNew: true, imageUrl: newCat.image_url }
      }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });

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
