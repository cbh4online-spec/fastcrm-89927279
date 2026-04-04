import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { action, context } = await req.json();
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY not configured");

    let systemPrompt = "";
    let userPrompt = "";

    if (action === "generate_layout") {
      systemPrompt = `És um assistente especializado em catálogos de produtos. Analisa os produtos e sugere um agrupamento por categoria com ordem otimizada. Responde APENAS com JSON válido no formato: {"groups": [{"category": "Nome Categoria", "productIds": ["id1","id2"]}], "style_tokens": {"primaryColor": "#hex", "secondaryColor": "#hex", "accentColor": "#hex"}}`;
      const products = context.products as any[];
      userPrompt = `Produtos para organizar no catálogo:\n${products?.map((p: any) => `- ID: ${p.id}, Nome: ${p.name}, Categoria: ${p.category || "Sem categoria"}, Preço: ${p.price}`).join("\n")}`;
    } else if (action === "generate_descriptions") {
      systemPrompt = `És um copywriter especializado em catálogos de produtos premium. Gera descrições curtas (máx 80 palavras) otimizadas para catálogo visual. Responde APENAS com JSON válido no formato: [{"productId": "id", "description": "texto"}]`;
      const products = context.products as any[];
      userPrompt = `Gera descrições de catálogo para:\n${products?.map((p: any) => `- ID: ${p.id}, Nome: ${p.name}, Descrição atual: ${p.description || "Sem descrição"}`).join("\n")}`;
    } else {
      return new Response(JSON.stringify({ error: "Ação inválida" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: { Authorization: `Bearer ${LOVABLE_API_KEY}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [{ role: "system", content: systemPrompt }, { role: "user", content: userPrompt }],
      }),
    });

    if (!response.ok) {
      const status = response.status;
      if (status === 429) return new Response(JSON.stringify({ error: "Limite de pedidos IA excedido. Tente mais tarde." }), { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      if (status === 402) return new Response(JSON.stringify({ error: "Créditos IA insuficientes." }), { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      throw new Error(`AI gateway error: ${status}`);
    }

    const aiData = await response.json();
    const content = aiData.choices?.[0]?.message?.content || "";
    
    // Extract JSON from response
    const jsonMatch = content.match(/\{[\s\S]*\}|\[[\s\S]*\]/);
    if (!jsonMatch) throw new Error("Resposta IA inválida");
    
    const parsed = JSON.parse(jsonMatch[0]);

    if (action === "generate_layout") {
      return new Response(JSON.stringify({ layout: parsed }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    } else {
      return new Response(JSON.stringify({ descriptions: Array.isArray(parsed) ? parsed : parsed.descriptions || [] }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }
  } catch (e) {
    console.error("ai-catalog-suggest error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Erro desconhecido" }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});
