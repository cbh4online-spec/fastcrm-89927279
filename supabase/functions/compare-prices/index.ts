import { createClient } from "@supabase/supabase-js";

import { logAIUsage } from "../_shared/ai-instrumentation.ts";

// ── AI usage logging helper (auto-injected) ───────────────────────────────────
async function __loggedAIFetch(
  workspaceId: string | null,
  feature: string,
  init: RequestInit
): Promise<Response> {
  const start = Date.now();
  const url = "https://ai.gateway.lovable.dev/v1/chat/completions";
  const body = init.body ? JSON.parse(init.body as string) : {};
  const model = body.model || "google/gemini-3-flash-preview";
  let response: Response;
  try {
    response = await fetch(url, init);
  } catch (e) {
    if (workspaceId) {
      logAIUsage({
        workspace_id: workspaceId,
        feature,
        model,
        tokens_input: 0,
        tokens_output: 0,
        latency_ms: Date.now() - start,
        was_error: true,
        error_type: "network",
      });
    }
    throw e;
  }

  if (!workspaceId) return response;

  const clone = response.clone();
  clone.json().then((data: any) => {
    const tokens_input = data?.usage?.prompt_tokens ?? 0;
    const tokens_output = data?.usage?.completion_tokens ?? 0;
    logAIUsage({
      workspace_id: workspaceId,
      feature,
      model,
      tokens_input,
      tokens_output,
      latency_ms: Date.now() - start,
      was_error: !response.ok,
      error_type: response.ok ? undefined : `http_${response.status}`,
    });
  }).catch(() => {});

  return response;
}

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const pricePatterns = [
  /€\s*(\d+[.,]\d{2})/g,
  /(\d+[.,]\d{2})\s*€/g,
  /EUR\s*(\d+[.,]\d{2})/g,
];

function extractPricesFiltered(text: string, minPrice: number, maxPrice: number): number[] {
  const prices: number[] = [];
  for (const regex of pricePatterns) {
    regex.lastIndex = 0;
    for (const match of text.matchAll(regex)) {
      const price = parseFloat(match[1].replace(",", "."));
      if (price >= minPrice && price <= maxPrice) {
        prices.push(price);
      }
    }
  }
  return prices;
}

function extractSourceName(url: string): string {
  try {
    const hostname = new URL(url).hostname.replace("www.", "");
    if (hostname.includes("kuantokusta")) return "KuantoKusta";
    if (hostname.includes("google")) return "Google Shopping";
    const name = hostname.split(".")[0];
    return name.charAt(0).toUpperCase() + name.slice(1);
  } catch {
    return "Desconhecido";
  }
}

interface ExternalPrice {
  source_name: string;
  source_url: string;
  price: number;
}

interface AIValidation {
  is_match: boolean;
  price: number | null;
  store_name: string;
}

async function validateWithAI(
  lovableKey: string,
  productName: string,
  productSku: string | null,
  basePrice: number,
  resultUrl: string,
  resultText: string,
): Promise<AIValidation | null> {
  try {
    const snippet = resultText.slice(0, 2000);
    const resp = await __loggedAIFetch(workspace_id ?? null, "compare-prices", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${lovableKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash-lite",
        messages: [
          {
            role: "system",
            content: "És um validador de preços. Analisa se o resultado de pesquisa é sobre o MESMO produto específico e extrai o preço de venda. Responde APENAS em JSON válido.",
          },
          {
            role: "user",
            content: `Produto procurado: "${productName}"${productSku ? ` (SKU: ${productSku})` : ""}
Preço de referência: €${basePrice.toFixed(2)}
URL do resultado: ${resultUrl}

Texto do resultado:
${snippet}

Verifica:
1. Este resultado é sobre o MESMO produto específico (não um acessório, peça, produto similar ou categoria)?
2. Se sim, qual o preço de venda atual (não portes, não preço de acessórios)?

Responde em JSON:
{"is_match": true/false, "price": 123.45 ou null, "store_name": "Nome da Loja"}

REGRAS:
- is_match = false se for um produto diferente, categoria, acessório ou peça
- price deve ser o preço do produto principal, não portes ou extras
- price = null se não conseguires identificar o preço correto com confiança`,
          },
        ],
        temperature: 0.1,
      }),
    });

    if (!resp.ok) {
      console.error("AI validation failed:", resp.status);
      return null;
    }

    const data = await resp.json();
    const content = data.choices?.[0]?.message?.content || "";
    const jsonMatch = content.match(/\{[\s\S]*?\}/);
    if (!jsonMatch) return null;

    const parsed = JSON.parse(jsonMatch[0]);
    return {
      is_match: !!parsed.is_match,
      price: typeof parsed.price === "number" ? parsed.price : null,
      store_name: parsed.store_name || "Desconhecido",
    };
  } catch (err) {
    console.error("AI validation error:", err);
    return null;
  }
}

async function searchFirecrawl(
  apiKey: string,
  query: string,
  limit: number
): Promise<Array<{ url: string; markdown?: string; description?: string }>> {
  try {
    const response = await fetch("https://api.firecrawl.dev/v1/search", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ query, limit, lang: "pt", country: "PT" }),
    });
    if (!response.ok) {
      console.error(`Firecrawl search failed for "${query}":`, response.status);
      return [];
    }
    const data = await response.json();
    return data.data || [];
  } catch (err) {
    console.error(`Firecrawl search error for "${query}":`, err);
    return [];
  }
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { productId } = await req.json();
    if (!productId) {
      return new Response(
        JSON.stringify({ success: false, error: "productId is required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const firecrawlKey = Deno.env.get("FIRECRAWL_API_KEY");
    const lovableKey = Deno.env.get("LOVABLE_API_KEY");

    const supabase = createClient(supabaseUrl, supabaseKey);

    // Get product details (include sku for better search)
    const { data: product, error: productError } = await supabase
      .from("products")
      .select("id, name, sku, workspace_id, base_price, currency")
      .eq("id", productId)
      .single();

    if (productError || !product) {
      return new Response(
        JSON.stringify({ success: false, error: "Product not found" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Check cache (24h)
    const { data: cached } = await supabase
      .from("product_external_prices")
      .select("*")
      .eq("product_id", productId)
      .gte("expires_at", new Date().toISOString());

    if (cached && cached.length > 0) {
      console.log("Returning cached external prices");
      const lowest = cached.reduce((min, c) => (c.price < min.price ? c : min), cached[0]);
      await supabase
        .from("products")
        .update({
          competitor_price_low: lowest.price,
          competitor_source: lowest.source_name,
        })
        .eq("id", productId);

      return new Response(
        JSON.stringify({ success: true, data: cached, source: "cache" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (!firecrawlKey) {
      console.log("No Firecrawl API key configured");
      return new Response(
        JSON.stringify({ success: true, data: [], source: "no_api_key" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const minPrice = product.base_price * 0.3;
    const maxPrice = product.base_price * 3;

    // Build search query — include SKU if available for precision
    const searchName = product.sku ? `"${product.sku}" ${product.name}` : product.name;

    console.log(`Searching for: ${searchName} (price range: €${minPrice.toFixed(2)} - €${maxPrice.toFixed(2)})`);
    const [kkResults, generalResults] = await Promise.all([
      searchFirecrawl(firecrawlKey, `site:kuantokusta.pt ${searchName}`, 5),
      searchFirecrawl(firecrawlKey, `${searchName} preço comprar portugal`, 5),
    ]);

    const externalPrices: ExternalPrice[] = [];
    const allResults = [...kkResults, ...generalResults];
    const seenUrls = new Set<string>();

    for (const result of allResults) {
      if (!result.url || seenUrls.has(result.url)) continue;
      seenUrls.add(result.url);

      const text = result.markdown || result.description || "";

      // Try AI validation first
      if (lovableKey) {
        const validation = await validateWithAI(
          lovableKey,
          product.name,
          product.sku || null,
          product.base_price,
          result.url,
          text,
        );

        if (validation) {
          if (validation.is_match && validation.price !== null) {
            if (validation.price >= minPrice && validation.price <= maxPrice) {
              externalPrices.push({
                source_name: validation.store_name || extractSourceName(result.url),
                source_url: result.url,
                price: validation.price,
              });
              console.log(`✓ AI validated: ${result.url} → €${validation.price}`);
            } else {
              console.log(`✗ AI price out of range: €${validation.price} for ${result.url}`);
            }
          } else {
            console.log(`✗ AI rejected (not matching product): ${result.url}`);
          }
          continue; // AI gave an answer, skip regex fallback
        }
      }

      // Fallback: regex with strict min/max filter
      const prices = extractPricesFiltered(text, minPrice, maxPrice);
      if (prices.length > 0) {
        // Pick the price closest to base_price instead of the lowest
        const closest = prices.reduce((best, p) =>
          Math.abs(p - product.base_price) < Math.abs(best - product.base_price) ? p : best
        );
        externalPrices.push({
          source_name: extractSourceName(result.url),
          source_url: result.url,
          price: closest,
        });
        console.log(`⚠ Regex fallback: ${result.url} → €${closest} (${prices.length} prices found)`);
      }
    }

    // Store results in cache
    if (externalPrices.length > 0) {
      const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();
      const rows = externalPrices.map((ep) => ({
        product_id: productId,
        workspace_id: product.workspace_id,
        source_name: ep.source_name,
        source_url: ep.source_url,
        price: ep.price,
        currency: product.currency || "EUR",
        expires_at: expiresAt,
      }));

      await supabase
        .from("product_external_prices")
        .delete()
        .eq("product_id", productId);

      await supabase.from("product_external_prices").insert(rows);

      const lowest = externalPrices.reduce((min, ep) => (ep.price < min.price ? ep : min), externalPrices[0]);
      await supabase
        .from("products")
        .update({
          competitor_price_low: lowest.price,
          competitor_source: lowest.source_name,
        })
        .eq("id", productId);
    }

    console.log(`Found ${externalPrices.length} validated external prices`);
    return new Response(
      JSON.stringify({ success: true, data: externalPrices, source: "fresh" }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Error:", error);
    return new Response(
      JSON.stringify({ success: false, error: error instanceof Error ? error.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
