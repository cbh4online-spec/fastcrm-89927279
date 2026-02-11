import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

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
    if (!response.ok) return [];
    const data = await response.json();
    return data.data || [];
  } catch {
    return [];
  }
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const firecrawlKey = Deno.env.get("FIRECRAWL_API_KEY");
    const lovableKey = Deno.env.get("LOVABLE_API_KEY");

    if (!firecrawlKey) {
      return new Response(
        JSON.stringify({ success: false, error: "FIRECRAWL_API_KEY not configured" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabase = createClient(supabaseUrl, supabaseKey);

    // Get all published products with SKU or name across all workspaces
    const { data: products, error: prodError } = await supabase
      .from("products")
      .select("id, name, sku, base_price, currency, workspace_id, competitor_price_low")
      .eq("store_published", true)
      .eq("status", "active")
      .limit(200);

    if (prodError) throw prodError;
    if (!products || products.length === 0) {
      return new Response(
        JSON.stringify({ success: true, message: "No published products", processed: 0 }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log(`Processing ${products.length} published products`);

    let processed = 0;
    let suggestionsCreated = 0;

    for (const product of products) {
      try {
        const maxPrice = product.base_price * 5;
        const searchTerm = product.sku || product.name;

        // Search competitor prices
        const [kkResults, generalResults] = await Promise.all([
          searchFirecrawl(firecrawlKey, `site:kuantokusta.pt ${searchTerm}`, 5),
          searchFirecrawl(firecrawlKey, `${searchTerm} preço comprar portugal`, 5),
        ]);

        const allResults = [...kkResults, ...generalResults];
        const seenUrls = new Set<string>();
        const externalPrices: { source_name: string; source_url: string; price: number }[] = [];

        for (const result of allResults) {
          if (!result.url || seenUrls.has(result.url)) continue;
          seenUrls.add(result.url);
          const text = result.markdown || result.description || "";
          const prices = extractPrices(text, maxPrice);
          if (prices.length > 0) {
            externalPrices.push({
              source_name: extractSourceName(result.url),
              source_url: result.url,
              price: Math.min(...prices),
            });
          }
        }

        // Store external prices
        if (externalPrices.length > 0) {
          const expiresAt = new Date(Date.now() + 8 * 60 * 60 * 1000).toISOString(); // 8h cache (3x/day)

          await supabase
            .from("product_external_prices")
            .delete()
            .eq("product_id", product.id);

          await supabase.from("product_external_prices").insert(
            externalPrices.map((ep) => ({
              product_id: product.id,
              workspace_id: product.workspace_id,
              source_name: ep.source_name,
              source_url: ep.source_url,
              price: ep.price,
              currency: product.currency || "EUR",
              expires_at: expiresAt,
            }))
          );

          // Update competitor_price_low
          const lowest = externalPrices.reduce((min, ep) => (ep.price < min.price ? ep : min), externalPrices[0]);
          await supabase
            .from("products")
            .update({
              competitor_price_low: lowest.price,
              competitor_source: lowest.source_name,
            })
            .eq("id", product.id);

          // Generate AI price suggestion if there's a significant price difference
          const priceDiff = ((product.base_price - lowest.price) / lowest.price) * 100;

          if (Math.abs(priceDiff) > 5 && lovableKey) {
            // Only suggest if difference > 5%
            const avgPrice = externalPrices.reduce((sum, ep) => sum + ep.price, 0) / externalPrices.length;

            const suggestPrompt = `Analisa a posição de preço deste produto e sugere um preço otimizado.

Produto: ${product.name}
SKU: ${product.sku || "N/A"}
Preço atual na loja: €${product.base_price.toFixed(2)}
Preço mais baixo da concorrência: €${lowest.price.toFixed(2)} (${lowest.source_name})
Preço médio da concorrência: €${avgPrice.toFixed(2)}
Fontes encontradas: ${externalPrices.map(ep => `${ep.source_name}: €${ep.price.toFixed(2)}`).join(", ")}

Responde em JSON:
{
  "suggestedPrice": 99.99,
  "reasoning": "Explicação breve em português da razão da sugestão",
  "optimizationType": "competitive_match" | "undercut" | "premium_positioning" | "margin_protection",
  "marginChange": -5.2
}

REGRAS:
- Se o preço atual for competitivo (diferença < 5%), sugere manter
- Se estiver muito acima, sugere redução para ficar competitivo
- Se estiver muito abaixo, sugere aumento ligeiro para melhorar margem
- marginChange é a percentagem de alteração face ao preço atual (negativo = redução)
- Nunca sugerir preço abaixo do menor preço encontrado (proteger margem)`;

            try {
              const aiResp = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
                method: "POST",
                headers: {
                  Authorization: `Bearer ${lovableKey}`,
                  "Content-Type": "application/json",
                },
                body: JSON.stringify({
                  model: "google/gemini-3-flash-preview",
                  messages: [
                    { role: "system", content: "És um especialista em pricing e-commerce. Responde apenas em JSON válido." },
                    { role: "user", content: suggestPrompt },
                  ],
                  temperature: 0.3,
                }),
              });

              if (aiResp.ok) {
                const aiData = await aiResp.json();
                const content = aiData.choices?.[0]?.message?.content || "";
                const jsonMatch = content.match(/\{[\s\S]*\}/);
                if (jsonMatch) {
                  const suggestion = JSON.parse(jsonMatch[0]);

                  if (suggestion.suggestedPrice && suggestion.suggestedPrice !== product.base_price) {
                    // Check if there's already a pending suggestion for this product
                    const { data: existing } = await supabase
                      .from("price_optimization_logs")
                      .select("id")
                      .eq("product_id", product.id)
                      .eq("applied", false)
                      .limit(1);

                    if (!existing || existing.length === 0) {
                      await supabase.from("price_optimization_logs").insert({
                        workspace_id: product.workspace_id,
                        product_id: product.id,
                        original_price: product.base_price,
                        suggested_price: suggestion.suggestedPrice,
                        margin_change: suggestion.marginChange || null,
                        optimization_type: suggestion.optimizationType || "competitive_match",
                        reasoning: suggestion.reasoning || null,
                        applied: false,
                      });
                      suggestionsCreated++;
                    }
                  }
                }
              }
            } catch (aiErr) {
              console.error(`AI suggestion failed for ${product.name}:`, aiErr);
            }
          }
        }

        processed++;

        // Small delay to avoid rate limits
        await new Promise((r) => setTimeout(r, 1000));
      } catch (err) {
        console.error(`Error processing product ${product.name}:`, err);
      }
    }

    console.log(`Done: ${processed} processed, ${suggestionsCreated} suggestions created`);

    return new Response(
      JSON.stringify({ success: true, processed, suggestionsCreated }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Auto price monitor error:", error);
    return new Response(
      JSON.stringify({ success: false, error: error instanceof Error ? error.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
