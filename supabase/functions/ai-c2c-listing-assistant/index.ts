import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

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
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY not configured");

    const { mode, image, title, description, categories, condition, price } = await req.json();

    const AI_URL = "https://ai.gateway.lovable.dev/v1/chat/completions";
    const headers = {
      Authorization: `Bearer ${LOVABLE_API_KEY}`,
      "Content-Type": "application/json",
    };

    // Helper to call AI
    async function callAI(messages: any[], tools?: any[], toolChoice?: any) {
      const body: any = { model: "google/gemini-3-flash-preview", messages };
      if (tools) { body.tools = tools; body.tool_choice = toolChoice; }
      const res = await fetch(AI_URL, { method: "POST", headers, body: JSON.stringify(body) });
      if (!res.ok) {
        if (res.status === 429) throw new Error("RATE_LIMITED");
        if (res.status === 402) throw new Error("PAYMENT_REQUIRED");
        throw new Error(`AI error: ${res.status}`);
      }
      return res.json();
    }

    // ===== ANALYZE PHOTO =====
    if (mode === "analyze-photo") {
      const userContent: any[] = [
        { type: "text", text: `Analisa esta foto de um produto à venda num marketplace C2C português. Identifica o produto e retorna informações estruturadas. As categorias disponíveis são: ${(categories || []).map((c: any) => `${c.id}:${c.name}`).join(", ")}` },
      ];
      if (image) {
        userContent.push({ type: "image_url", image_url: { url: image } });
      } else if (title) {
        userContent[0] = { type: "text", text: `Com base no título "${title}", sugere informações completas para um anúncio de marketplace C2C português. Categorias disponíveis: ${(categories || []).map((c: any) => `${c.id}:${c.name}`).join(", ")}` };
      }

      const result = await callAI(
        [
          { role: "system", content: "És um especialista em marketplace C2C. Analisa produtos e retorna sugestões otimizadas para venda rápida. Responde sempre em português de Portugal." },
          { role: "user", content: userContent },
        ],
        [{
          type: "function",
          function: {
            name: "analyze_product",
            description: "Retorna análise completa do produto",
            parameters: {
              type: "object",
              properties: {
                title: { type: "string", description: "Título otimizado SEO-friendly com marca, modelo, specs chave. Máx 80 chars." },
                description: { type: "string", description: "Descrição estruturada com emojis, secções (estado, inclui, motivo), e hashtags no final" },
                suggested_price_min: { type: "number", description: "Preço mínimo estimado em EUR" },
                suggested_price_max: { type: "number", description: "Preço máximo estimado em EUR" },
                suggested_price: { type: "number", description: "Preço competitivo sugerido em EUR" },
                condition: { type: "string", enum: ["new", "like_new", "used", "for_parts"], description: "Condição estimada" },
                category_id: { type: "string", description: "ID da categoria mais adequada" },
              },
              required: ["title", "description", "suggested_price", "condition"],
              additionalProperties: false,
            },
          },
        }],
        { type: "function", function: { name: "analyze_product" } }
      );

      const toolCall = result.choices?.[0]?.message?.tool_calls?.[0];
      if (toolCall) {
        const parsed = JSON.parse(toolCall.function.arguments);
        return new Response(JSON.stringify({ success: true, data: parsed }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      throw new Error("No tool call returned");
    }

    // ===== GENERATE TITLE =====
    if (mode === "generate-title") {
      const result = await callAI(
        [
          { role: "system", content: "És um copywriter especialista em marketplaces C2C. Gera títulos otimizados para venda rápida em português de Portugal." },
          { role: "user", content: `Gera um título otimizado para este anúncio:\nTítulo atual: ${title || "sem título"}\nDescrição: ${description || "sem descrição"}\nCondição: ${condition || "usado"}\n\nO título deve ser SEO-friendly, incluir marca/modelo/specs chave, máximo 80 caracteres. Estilo: "iPhone 14 Pro Max 256GB - Desbloqueado, Bateria 95%"` },
        ],
        [{
          type: "function",
          function: {
            name: "suggest_title",
            description: "Retorna título otimizado",
            parameters: {
              type: "object",
              properties: { title: { type: "string" } },
              required: ["title"],
              additionalProperties: false,
            },
          },
        }],
        { type: "function", function: { name: "suggest_title" } }
      );

      const toolCall = result.choices?.[0]?.message?.tool_calls?.[0];
      if (toolCall) {
        const parsed = JSON.parse(toolCall.function.arguments);
        return new Response(JSON.stringify({ success: true, title: parsed.title }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      throw new Error("No tool call");
    }

    // ===== GENERATE DESCRIPTION =====
    if (mode === "generate-description") {
      const result = await callAI(
        [
          { role: "system", content: "És um copywriter de marketplace C2C. Gera descrições otimizadas para venda rápida em português de Portugal." },
          { role: "user", content: `Gera uma descrição otimizada para este anúncio:\nTítulo: ${title || "sem título"}\nDescrição atual: ${description || ""}\nCondição: ${condition || "usado"}\nPreço: ${price || "a definir"}€\n\nA descrição deve:\n- Usar emojis relevantes\n- Ter secções: Estado, O que inclui, Motivo de venda\n- Destacar benefícios\n- Terminar com 5-8 hashtags relevantes (#Marca #Categoria #Usado etc)` },
        ],
        [{
          type: "function",
          function: {
            name: "suggest_description",
            description: "Retorna descrição otimizada",
            parameters: {
              type: "object",
              properties: { description: { type: "string" } },
              required: ["description"],
              additionalProperties: false,
            },
          },
        }],
        { type: "function", function: { name: "suggest_description" } }
      );

      const toolCall = result.choices?.[0]?.message?.tool_calls?.[0];
      if (toolCall) {
        const parsed = JSON.parse(toolCall.function.arguments);
        return new Response(JSON.stringify({ success: true, description: parsed.description }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      throw new Error("No tool call");
    }

    // ===== SUGGEST PRICE =====
    if (mode === "suggest-price") {
      const result = await callAI(
        [
          { role: "system", content: "És um analista de preços de marketplace C2C em Portugal. Sugere preços competitivos baseado no produto." },
          { role: "user", content: `Sugere um preço competitivo para:\nTítulo: ${title}\nDescrição: ${description || ""}\nCondição: ${condition || "usado"}\nPreço atual: ${price || "não definido"}€\n\nRetorna range de preços e avaliação do preço atual.` },
        ],
        [{
          type: "function",
          function: {
            name: "suggest_price",
            description: "Retorna sugestão de preço",
            parameters: {
              type: "object",
              properties: {
                min_price: { type: "number" },
                max_price: { type: "number" },
                suggested_price: { type: "number" },
                price_assessment: { type: "string", enum: ["below_market", "competitive", "above_market"], description: "Avaliação do preço atual vs mercado" },
                reasoning: { type: "string", description: "Explicação breve da avaliação" },
              },
              required: ["min_price", "max_price", "suggested_price", "price_assessment", "reasoning"],
              additionalProperties: false,
            },
          },
        }],
        { type: "function", function: { name: "suggest_price" } }
      );

      const toolCall = result.choices?.[0]?.message?.tool_calls?.[0];
      if (toolCall) {
        const parsed = JSON.parse(toolCall.function.arguments);
        return new Response(JSON.stringify({ success: true, data: parsed }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      throw new Error("No tool call");
    }

    // ===== SUGGEST CATEGORY =====
    if (mode === "suggest-category") {
      const result = await callAI(
        [
          { role: "system", content: "És um classificador de produtos de marketplace C2C." },
          { role: "user", content: `Qual a melhor categoria para este produto?\nTítulo: ${title}\nDescrição: ${description || ""}\n\nCategorias disponíveis:\n${(categories || []).map((c: any) => `- ${c.id}: ${c.name}`).join("\n")}` },
        ],
        [{
          type: "function",
          function: {
            name: "suggest_category",
            description: "Retorna categoria sugerida",
            parameters: {
              type: "object",
              properties: { category_id: { type: "string" } },
              required: ["category_id"],
              additionalProperties: false,
            },
          },
        }],
        { type: "function", function: { name: "suggest_category" } }
      );

      const toolCall = result.choices?.[0]?.message?.tool_calls?.[0];
      if (toolCall) {
        const parsed = JSON.parse(toolCall.function.arguments);
        return new Response(JSON.stringify({ success: true, category_id: parsed.category_id }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      throw new Error("No tool call");
    }

    return new Response(JSON.stringify({ error: "Invalid mode" }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  } catch (e) {
    console.error("ai-c2c-listing-assistant error:", e);
    const msg = e instanceof Error ? e.message : "Unknown error";
    const status = msg === "RATE_LIMITED" ? 429 : msg === "PAYMENT_REQUIRED" ? 402 : 500;
    return new Response(JSON.stringify({ error: msg }), {
      status,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
