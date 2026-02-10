import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

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

    // Check if we have cached results less than 24h old
    const { data: cached } = await supabase
      .from("product_external_prices")
      .select("*")
      .eq("product_id", productId)
      .gte("expires_at", new Date().toISOString());

    if (cached && cached.length > 0) {
      console.log("Returning cached external prices");
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

    // Search for the product on the web
    console.log("Searching for:", product.name);
    const searchResponse = await fetch("https://api.firecrawl.dev/v1/search", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${firecrawlKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        query: `${product.name} preço comprar`,
        limit: 5,
        lang: "pt",
        country: "PT",
      }),
    });

    if (!searchResponse.ok) {
      console.error("Firecrawl search failed:", searchResponse.status);
      return new Response(
        JSON.stringify({ success: true, data: [], source: "search_failed" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const searchData = await searchResponse.json();
    const results = searchData.data || [];

    // Extract prices from results using simple regex
    const priceRegex = /€\s*(\d+[.,]\d{2})/g;
    const externalPrices: Array<{
      source_name: string;
      source_url: string;
      price: number;
    }> = [];

    for (const result of results) {
      const text = result.markdown || result.description || "";
      const matches = [...text.matchAll(priceRegex)];
      if (matches.length > 0) {
        const price = parseFloat(matches[0][1].replace(",", "."));
        if (price > 0 && price < product.base_price * 5) {
          // Extract domain name
          const url = new URL(result.url);
          const sourceName = url.hostname.replace("www.", "").split(".")[0];
          externalPrices.push({
            source_name: sourceName.charAt(0).toUpperCase() + sourceName.slice(1),
            source_url: result.url,
            price,
          });
        }
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
