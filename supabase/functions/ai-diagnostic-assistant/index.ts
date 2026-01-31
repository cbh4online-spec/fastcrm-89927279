import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

interface DiagnosticRequest {
  message: string;
  workspaceId: string;
  conversationHistory?: Array<{ role: string; content: string }>;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { message, workspaceId, conversationHistory = [] }: DiagnosticRequest = await req.json();

    if (!message || !workspaceId) {
      return new Response(
        JSON.stringify({ success: false, error: "message and workspaceId are required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      return new Response(
        JSON.stringify({ success: false, error: "AI gateway not configured" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    console.log(`Diagnostic assistant query: "${message}" in workspace ${workspaceId}`);

    // Step 1: Generate embedding for the user's message
    const embeddingResponse = await fetch("https://ai.gateway.lovable.dev/v1/embeddings", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "text-embedding-ada-002",
        input: message,
      }),
    });

    if (!embeddingResponse.ok) {
      const errorText = await embeddingResponse.text();
      console.error("Embedding error:", errorText);
      return new Response(
        JSON.stringify({ success: false, error: "Failed to process query" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const embeddingData = await embeddingResponse.json();
    const queryEmbedding = embeddingData.data[0].embedding;

    // Step 2: Search for relevant products
    const { data: products, error: searchError } = await supabase.rpc("match_products", {
      query_embedding: queryEmbedding,
      match_threshold: 0.4,
      match_count: 5,
      filter_workspace_id: workspaceId,
    });

    if (searchError) {
      console.error("Product search error:", searchError);
    }

    // Step 3: Build context for AI
    const productContext = (products || [])
      .map((p: any, i: number) => {
        const imageUrl = p.images?.[p.primary_image_index ?? 0] || null;
        return `[Produto ${i + 1}]
Nome: ${p.name}
SKU: ${p.sku || "N/A"}
Preço: ${p.base_price?.toFixed(2) || "N/A"}€
Categoria: ${p.category || "N/A"}
Descrição: ${p.short_description || p.commercial_description || "Sem descrição"}
Relevância: ${(p.similarity * 100).toFixed(0)}%`;
      })
      .join("\n\n");

    const systemPrompt = `Você é um assistente especializado em produtos de saúde e bem-estar. 
Ajuda clientes a encontrar os produtos mais adequados para as suas necessidades.

INSTRUÇÕES:
- Analise a descrição do cliente e recomende produtos do catálogo
- Explique brevemente porque cada produto é adequado
- Se não houver produtos relevantes, diga honestamente
- Seja conciso e profissional
- Responda sempre em português de Portugal
- Use linguagem acessível, evitando termos demasiado técnicos

PRODUTOS DISPONÍVEIS:
${productContext || "Nenhum produto encontrado no catálogo para esta pesquisa."}`;

    // Step 4: Generate AI response
    const chatResponse = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [
          { role: "system", content: systemPrompt },
          ...conversationHistory.slice(-6),
          { role: "user", content: message },
        ],
        max_tokens: 1000,
        temperature: 0.7,
      }),
    });

    if (!chatResponse.ok) {
      if (chatResponse.status === 429) {
        return new Response(
          JSON.stringify({ success: false, error: "Limite de pedidos excedido. Tente novamente mais tarde." }),
          { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      if (chatResponse.status === 402) {
        return new Response(
          JSON.stringify({ success: false, error: "Créditos insuficientes. Por favor contacte o administrador." }),
          { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      const errorText = await chatResponse.text();
      console.error("Chat API error:", errorText);
      return new Response(
        JSON.stringify({ success: false, error: "Failed to generate response" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const chatData = await chatResponse.json();
    const assistantMessage = chatData.choices?.[0]?.message?.content || "Desculpe, não consegui processar o seu pedido.";

    // Format recommended products for display
    const recommendedProducts = (products || []).map((p: any) => ({
      id: p.id,
      name: p.name,
      sku: p.sku,
      price: p.base_price,
      category: p.category,
      description: p.short_description,
      imageUrl: p.images?.[p.primary_image_index ?? 0] || null,
      similarity: p.similarity,
    }));

    console.log(`Diagnostic response generated with ${recommendedProducts.length} products`);

    return new Response(
      JSON.stringify({
        success: true,
        message: assistantMessage,
        products: recommendedProducts,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Diagnostic assistant error:", error);
    return new Response(
      JSON.stringify({ success: false, error: error instanceof Error ? error.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
