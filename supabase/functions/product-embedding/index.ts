import { createClient } from "@supabase/supabase-js";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

interface ProductEmbeddingRequest {
  productId: string;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { productId }: ProductEmbeddingRequest = await req.json();

    if (!productId) {
      return new Response(
        JSON.stringify({ success: false, error: "productId is required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // Fetch product with attributes
    const { data: product, error: productError } = await supabase
      .from("products")
      .select(`
        id, name, sku, short_description, commercial_description, category,
        product_attributes (attribute_type, attribute_value)
      `)
      .eq("id", productId)
      .single();

    if (productError || !product) {
      console.error("Product not found:", productError);
      return new Response(
        JSON.stringify({ success: false, error: "Product not found" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Build searchable text from product data
    const attributes = product.product_attributes || [];
    const functions = attributes
      .filter((a: any) => a.attribute_type === "function")
      .map((a: any) => a.attribute_value)
      .join(", ");
    const pathologies = attributes
      .filter((a: any) => a.attribute_type === "pathology")
      .map((a: any) => a.attribute_value)
      .join(", ");
    const indications = attributes
      .filter((a: any) => a.attribute_type === "indication")
      .map((a: any) => a.attribute_value)
      .join(", ");

    const textParts = [
      `Produto: ${product.name}`,
      product.sku ? `SKU: ${product.sku}` : null,
      product.category ? `Categoria: ${product.category}` : null,
      product.short_description ? `Descrição: ${product.short_description}` : null,
      product.commercial_description ? `Detalhes: ${product.commercial_description}` : null,
      functions ? `Funções: ${functions}` : null,
      pathologies ? `Patologias: ${pathologies}` : null,
      indications ? `Indicações: ${indications}` : null,
    ].filter(Boolean);

    const textToIndex = textParts.join("\n");

    // Extract keywords using chat model instead of embedding API
    // (text-embedding-ada-002 is not supported by the AI gateway)
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    let keywords: string[] = [];

    if (LOVABLE_API_KEY) {
      try {
        const keywordResponse = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
          method: "POST",
          headers: {
            Authorization: `Bearer ${LOVABLE_API_KEY}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            model: "google/gemini-2.5-flash-lite",
            messages: [
              {
                role: "system",
                content: "Extract important search keywords from this product description. Return ONLY a JSON array of strings. Max 15 keywords in Portuguese."
              },
              { role: "user", content: textToIndex.slice(0, 4000) }
            ],
            temperature: 0
          }),
        });

        if (keywordResponse.ok) {
          const data = await keywordResponse.json();
          const raw = data.choices?.[0]?.message?.content || "[]";
          const match = raw.match(/\[[\s\S]*\]/);
          if (match) {
            keywords = JSON.parse(match[0]);
          }
        }
      } catch (e) {
        console.warn("Keyword extraction failed:", e);
      }
    }

    console.log(`Keywords extracted for product ${productId}: ${product.name} (${keywords.length} keywords)`);

    // Note: We no longer store vector embeddings since the API is unsupported.
    // Product search uses text-based matching instead.

    return new Response(
      JSON.stringify({ success: true, productId, textLength: textToIndex.length, keywords: keywords.length }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Product embedding error:", error);
    return new Response(
      JSON.stringify({ success: false, error: error instanceof Error ? error.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
