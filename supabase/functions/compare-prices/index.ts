import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

// Price regex patterns: €12.99, €12,99, 12.99€, 12,99€, 12.99 €, EUR 12.99
const pricePatterns = [
  /€\s*(\d+[.,]\d{2})/g,
  /(\d+[.,]\d{2})\s*€/g,
  /EUR\s*(\d+[.,]\d{2})/g,
];

function extractPrices(text: string, maxPrice: number): number[] {
  const prices: number[] = [];
  for (const regex of pricePatterns) {
    regex.lastIndex = 0;
    for (const match of text.matchAll(regex)) {
      const price = parseFloat(match[1].replace(",", "."));
      if (price > 0 && price < maxPrice) {
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
      body: JSON.stringify({
        query,
        limit,
        lang: "pt",
        country: "PT",
      }),
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

    const supabase = createClient(supabaseUrl, supabaseKey);

    // Get product details
    const { data: product, error: productError } = await supabase
      .from("products")
      .select("id, name, workspace_id, base_price, currency")
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
      // Even from cache, update competitor_price_low
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

    const maxPrice = product.base_price * 5;

    // Run KuantoKusta + general search in parallel
    console.log("Searching for:", product.name);
    const [kkResults, generalResults] = await Promise.all([
      searchFirecrawl(firecrawlKey, `site:kuantokusta.pt ${product.name}`, 5),
      searchFirecrawl(firecrawlKey, `${product.name} preço comprar portugal`, 5),
    ]);

    const externalPrices: ExternalPrice[] = [];

    // Process all results
    const allResults = [...kkResults, ...generalResults];
    const seenUrls = new Set<string>();

    for (const result of allResults) {
      if (!result.url || seenUrls.has(result.url)) continue;
      seenUrls.add(result.url);

      const text = result.markdown || result.description || "";
      const prices = extractPrices(text, maxPrice);
      if (prices.length > 0) {
        const lowestPrice = Math.min(...prices);
        externalPrices.push({
          source_name: extractSourceName(result.url),
          source_url: result.url,
          price: lowestPrice,
        });
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

      // Delete old results first
      await supabase
        .from("product_external_prices")
        .delete()
        .eq("product_id", productId);

      await supabase.from("product_external_prices").insert(rows);

      // Update competitor_price_low on products table
      const lowest = externalPrices.reduce((min, ep) => (ep.price < min.price ? ep : min), externalPrices[0]);
      await supabase
        .from("products")
        .update({
          competitor_price_low: lowest.price,
          competitor_source: lowest.source_name,
        })
        .eq("id", productId);
    }

    console.log(`Found ${externalPrices.length} external prices`);
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
