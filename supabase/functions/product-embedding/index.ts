import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

interface ProductEmbeddingRequest {
  productId: string;
}

serve(async (req) => {
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

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      console.error("LOVABLE_API_KEY not configured");
      return new Response(
        JSON.stringify({ success: false, error: "AI gateway not configured" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
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

    // Build embedding text from product data
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

    const textToEmbed = textParts.join("\n");

    console.log(`Generating embedding for product ${productId}: ${product.name}`);

    // Generate embedding via Lovable AI gateway
    const embeddingResponse = await fetch("https://ai.gateway.lovable.dev/v1/embeddings", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "text-embedding-ada-002",
        input: textToEmbed.slice(0, 8000),
      }),
    });

    if (!embeddingResponse.ok) {
      const errorText = await embeddingResponse.text();
      console.error("Embedding API error:", errorText);
      return new Response(
        JSON.stringify({ success: false, error: `Embedding API error: ${embeddingResponse.status}` }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const embeddingData = await embeddingResponse.json();
    const embedding = embeddingData.data[0].embedding;

    // Save embedding to database
    const { error: updateError } = await supabase
      .from("products")
      .update({ embedding })
      .eq("id", productId);

    if (updateError) {
      console.error("Failed to save embedding:", updateError);
      return new Response(
        JSON.stringify({ success: false, error: "Failed to save embedding" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log(`Embedding saved for product ${productId}`);

    return new Response(
      JSON.stringify({ success: true, productId, textLength: textToEmbed.length }),
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
