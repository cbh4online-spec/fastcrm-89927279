import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.4";

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
    const authHeader = req.headers.get("Authorization");
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader || "" } } }
    );

    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { product_name, sku, category, barcode, product_id, workspace_id, cost_price } = await req.json();

    if (!product_name || !workspace_id || !product_id) {
      return new Response(JSON.stringify({ error: "product_name, workspace_id, and product_id are required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Verify workspace membership
    const { data: membership } = await supabase
      .from("workspace_members")
      .select("id")
      .eq("workspace_id", workspace_id)
      .eq("user_id", user.id)
      .maybeSingle();

    if (!membership) {
      return new Response(JSON.stringify({ error: "Not a workspace member" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Step 1: Search for competitors via Firecrawl
    const FIRECRAWL_API_KEY = Deno.env.get("FIRECRAWL_API_KEY");
    let searchResults: any[] = [];

    if (FIRECRAWL_API_KEY) {
      const searchQuery = `"${product_name}" preço comprar Portugal`;
      console.log("[MARKET-RESEARCH] Searching:", searchQuery);

      try {
        const searchResp = await fetch("https://api.firecrawl.dev/v1/search", {
          method: "POST",
          headers: {
            Authorization: `Bearer ${FIRECRAWL_API_KEY}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            query: searchQuery,
            limit: 8,
            lang: "pt",
            country: "pt",
            scrapeOptions: { formats: ["markdown"] },
          }),
        });

        if (searchResp.ok) {
          const searchData = await searchResp.json();
          searchResults = searchData.data || [];
          console.log("[MARKET-RESEARCH] Found", searchResults.length, "results");
        }
      } catch (e) {
        console.warn("[MARKET-RESEARCH] Firecrawl search failed:", e);
      }
    }

    // Step 2: Use AI to extract pricing data from search results
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      return new Response(JSON.stringify({ error: "AI not configured" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const searchContext = searchResults
      .map((r: any, i: number) => {
        const content = (r.markdown || r.description || "").slice(0, 1500);
        return `[Resultado ${i + 1}] URL: ${r.url || "N/A"}\nTítulo: ${r.title || "N/A"}\nConteúdo: ${content}`;
      })
      .join("\n\n---\n\n");

    const systemPrompt = `És um analista de preços de mercado especializado em Portugal. 
Analisa os resultados de pesquisa e extrai informação de preços para o produto especificado.
Foco: preços de venda ao público em Portugal (€), identificar concorrentes e calcular margens sugeridas.
Se o custo do produto for fornecido, calcula a margem sugerida garantindo SEMPRE que o preço de venda > custo.
A margem mínima segura para este tipo de produto deve ser pelo menos 15%.`;

    const userPrompt = `Produto: ${product_name}
${sku ? `SKU: ${sku}` : ""}
${barcode ? `Barcode/EAN: ${barcode}` : ""}
${category ? `Categoria: ${category}` : ""}
${cost_price ? `Preço de Custo: ${cost_price}€` : ""}

Resultados de pesquisa de mercado:
${searchContext || "Sem resultados de pesquisa disponíveis. Faz uma estimativa baseada no tipo de produto e categoria."}`;

    const aiResp = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt },
        ],
        tools: [
          {
            type: "function",
            function: {
              name: "market_price_analysis",
              description: "Return structured market price analysis for a product",
              parameters: {
                type: "object",
                properties: {
                  market_avg_price: { type: "number", description: "Average market selling price in EUR" },
                  market_min_price: { type: "number", description: "Lowest price found in EUR" },
                  market_max_price: { type: "number", description: "Highest price found in EUR" },
                  suggested_price: { type: "number", description: "Suggested selling price in EUR (must be above cost)" },
                  suggested_margin_pct: { type: "number", description: "Suggested margin percentage" },
                  competitors: {
                    type: "array",
                    items: {
                      type: "object",
                      properties: {
                        name: { type: "string", description: "Competitor/store name" },
                        price: { type: "number", description: "Price in EUR" },
                        url: { type: "string", description: "Product URL" },
                      },
                      required: ["name", "price"],
                    },
                  },
                  market_summary: { type: "string", description: "Brief summary of market analysis in Portuguese" },
                  price_position: { type: "string", enum: ["below_market", "at_market", "above_market"], description: "Current product position vs market" },
                },
                required: ["market_avg_price", "suggested_price", "suggested_margin_pct", "competitors", "market_summary"],
              },
            },
          },
        ],
        tool_choice: { type: "function", function: { name: "market_price_analysis" } },
      }),
    });

    if (!aiResp.ok) {
      const status = aiResp.status;
      if (status === 429) {
        return new Response(JSON.stringify({ error: "Rate limit exceeded. Try again later." }), {
          status: 429,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (status === 402) {
        return new Response(JSON.stringify({ error: "AI credits exhausted. Please add funds." }), {
          status: 402,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      throw new Error(`AI gateway error: ${status}`);
    }

    const aiData = await aiResp.json();
    const toolCall = aiData.choices?.[0]?.message?.tool_calls?.[0];

    if (!toolCall?.function?.arguments) {
      throw new Error("AI did not return structured data");
    }

    const analysis = JSON.parse(toolCall.function.arguments);
    console.log("[MARKET-RESEARCH] Analysis complete:", JSON.stringify(analysis).slice(0, 200));

    // Step 3: Persist results
    const serviceClient = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const { error: insertError } = await serviceClient
      .from("product_market_research")
      .insert({
        workspace_id,
        product_id,
        market_avg_price: analysis.market_avg_price,
        market_min_price: analysis.market_min_price || null,
        market_max_price: analysis.market_max_price || null,
        competitors_json: analysis.competitors || [],
        suggested_price: analysis.suggested_price,
        suggested_margin_pct: analysis.suggested_margin_pct,
        research_source: "ai_firecrawl",
        model_used: "gemini-3-flash-preview",
      });

    if (insertError) {
      console.error("[MARKET-RESEARCH] Insert error:", insertError);
    }

    return new Response(
      JSON.stringify({
        success: true,
        ...analysis,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (e) {
    console.error("[MARKET-RESEARCH] Error:", e);
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
