import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

interface GenerateRequest {
  workspaceId: string;
  forceRegenerate?: boolean;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { workspaceId, forceRegenerate = false }: GenerateRequest = await req.json();

    if (!workspaceId) {
      return new Response(
        JSON.stringify({ success: false, error: "workspaceId is required" }),
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

    // Fetch products that need search keywords
    let query = supabase
      .from("products")
      .select(`
        id, name, sku, short_description, commercial_description, category,
        product_attributes (attribute_type, attribute_value)
      `)
      .eq("workspace_id", workspaceId)
      .eq("status", "active");

    if (!forceRegenerate) {
      query = query.is("search_keywords", null);
    }

    const { data: products, error: fetchError } = await query;

    if (fetchError) {
      console.error("Error fetching products:", fetchError);
      return new Response(
        JSON.stringify({ success: false, error: "Failed to fetch products" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (!products || products.length === 0) {
      return new Response(
        JSON.stringify({ success: true, message: "No products to process", processed: 0 }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log(`Processing ${products.length} products for workspace ${workspaceId}`);

    let processed = 0;
    let errors = 0;

    for (const product of products) {
      try {
        // Build product text for AI analysis
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

        const productInfo = [
          `Nome: ${product.name}`,
          product.sku ? `SKU: ${product.sku}` : null,
          product.category ? `Categoria: ${product.category}` : null,
          product.short_description ? `Descrição: ${product.short_description}` : null,
          product.commercial_description ? `Detalhes: ${product.commercial_description}` : null,
          functions ? `Funções: ${functions}` : null,
          pathologies ? `Patologias: ${pathologies}` : null,
          indications ? `Indicações: ${indications}` : null,
        ].filter(Boolean).join("\n");

        console.log(`Processing: ${product.name}`);

        // Use AI to generate search keywords
        const aiResponse = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
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
                content: `Gera uma lista de 20-30 palavras-chave de pesquisa para este produto.
Inclui: sinónimos, termos relacionados, variações, problemas que resolve, público-alvo.
Responde APENAS com as palavras separadas por vírgula, sem numeração nem explicações.
Exemplo de resposta: crm, gestão clientes, vendas, leads, pipeline, automação, follow-up`
              },
              {
                role: "user",
                content: productInfo
              }
            ],
            max_tokens: 300,
            temperature: 0.3,
          }),
        });

        if (!aiResponse.ok) {
          const errorText = await aiResponse.text();
          console.error(`AI failed for product ${product.id}: ${aiResponse.status} - ${errorText}`);
          errors++;
          
          if (aiResponse.status === 429) {
            await new Promise((resolve) => setTimeout(resolve, 5000));
          }
          continue;
        }

        const aiData = await aiResponse.json();
        const keywords = aiData.choices?.[0]?.message?.content?.toLowerCase()?.trim() || "";
        
        if (!keywords) {
          console.error(`No keywords for product ${product.id}`);
          errors++;
          continue;
        }

        // Combine keywords with product data for full-text search
        const searchText = [
          product.name,
          product.sku,
          product.category,
          product.short_description,
          keywords
        ].filter(Boolean).join(" ").toLowerCase();

        // Save search keywords
        const { error: updateError } = await supabase
          .from("products")
          .update({ search_keywords: searchText })
          .eq("id", product.id);

        if (updateError) {
          console.error(`Failed to save for product ${product.id}:`, updateError);
          errors++;
          continue;
        }

        processed++;
        console.log(`Processed: ${product.name} - ${keywords.substring(0, 100)}...`);

        // Delay to avoid rate limiting
        await new Promise((resolve) => setTimeout(resolve, 300));
      } catch (error) {
        console.error(`Error processing product ${product.id}:`, error);
        errors++;
      }
    }

    console.log(`Completed: ${processed} processed, ${errors} errors`);

    return new Response(
      JSON.stringify({
        success: true,
        message: `Keywords generated successfully`,
        processed,
        errors,
        total: products.length,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Generate keywords error:", error);
    return new Response(
      JSON.stringify({ success: false, error: error instanceof Error ? error.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
