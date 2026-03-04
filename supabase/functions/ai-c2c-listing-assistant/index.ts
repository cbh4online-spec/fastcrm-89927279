import { createClient } from "@supabase/supabase-js";


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

    const { mode, image, title, description, categories, condition, price, count: reqCount, category_name, category_id } = await req.json();

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

    // ===== GENERATE CATEGORY IMAGE (3D) =====
    if (mode === "generate-category-image") {
      const catName = category_name || title || "generic";
      const imgPrompt = `Create a high-quality 3D isometric icon representing the "${catName}" product category for an online marketplace. The icon should be a single 3D rendered object on a pure white background, with soft shadows, vibrant colors, clean minimal style. No text, no labels. Professional 3D render quality.`;

      const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
      const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
      const sb = createClient(supabaseUrl, supabaseKey);

      const aiRes = await fetch(AI_URL, {
        method: "POST",
        headers,
        body: JSON.stringify({
          model: "google/gemini-3-pro-image-preview",
          messages: [{ role: "user", content: imgPrompt }],
          modalities: ["image", "text"],
        }),
      });

      if (!aiRes.ok) {
        if (aiRes.status === 429) throw new Error("RATE_LIMITED");
        if (aiRes.status === 402) throw new Error("PAYMENT_REQUIRED");
        throw new Error(`AI image error: ${aiRes.status}`);
      }

      const aiData = await aiRes.json();
      const imageUrl = aiData.choices?.[0]?.message?.images?.[0]?.image_url?.url;
      if (!imageUrl) throw new Error("No image returned from AI");

      const base64Data = imageUrl.replace(/^data:image\/\w+;base64,/, "");
      const binaryData = Uint8Array.from(atob(base64Data), (c) => c.charCodeAt(0));
      const filePath = `category-icons/${crypto.randomUUID()}.png`;

      const { error: uploadError } = await sb.storage
        .from("c2c-photos")
        .upload(filePath, binaryData, { contentType: "image/png", upsert: true });
      if (uploadError) throw new Error(`Upload failed: ${uploadError.message}`);

      const { data: publicUrlData } = sb.storage.from("c2c-photos").getPublicUrl(filePath);
      const publicUrl = publicUrlData.publicUrl;

      // Update the category record if category_id provided
      if (category_id) {
        await sb.from("c2c_categories").update({ image_url: publicUrl }).eq("id", category_id);
      }

      return new Response(JSON.stringify({ success: true, image_url: publicUrl }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // ===== GENERATE IMAGE =====
    if (mode === "generate-image") {
      const count = Math.min(Math.max(1, Number(reqCount) || 1), 3);
      const prompt = `Generate a realistic product photo for a C2C marketplace listing. The product is: "${title || "unknown product"}". ${description ? `Description: ${description}.` : ""} ${condition ? `Condition: ${condition}.` : ""} Show the product on a clean white/neutral background, professional product photography style, high quality, well-lit. Single product, no text overlays.`;

      const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
      const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
      const sb = createClient(supabaseUrl, supabaseKey);

      const images: string[] = [];
      const angles = ["front view", "slight angle view", "detail close-up view"];

      for (let i = 0; i < count; i++) {
        const anglePrompt = count > 1 ? `${prompt} Show from ${angles[i] || "different angle"}.` : prompt;
        
        const aiRes = await fetch(AI_URL, {
          method: "POST",
          headers,
          body: JSON.stringify({
            model: "google/gemini-3-pro-image-preview",
            messages: [{ role: "user", content: anglePrompt }],
            modalities: ["image", "text"],
          }),
        });

        if (!aiRes.ok) {
          if (aiRes.status === 429) throw new Error("RATE_LIMITED");
          if (aiRes.status === 402) throw new Error("PAYMENT_REQUIRED");
          const errText = await aiRes.text();
          console.error(`AI image gen error:`, aiRes.status, errText);
          continue;
        }

        const aiData = await aiRes.json();
        const imageUrl = aiData.choices?.[0]?.message?.images?.[0]?.image_url?.url;
        if (!imageUrl) continue;

        // Upload to c2c-photos storage
        const base64Data = imageUrl.replace(/^data:image\/\w+;base64,/, "");
        const binaryData = Uint8Array.from(atob(base64Data), (c) => c.charCodeAt(0));
        const filePath = `ai-generated/${crypto.randomUUID()}.png`;

        const { error: uploadError } = await sb.storage
          .from("c2c-photos")
          .upload(filePath, binaryData, { contentType: "image/png", upsert: true });

        if (uploadError) {
          console.error("Upload error:", uploadError);
          continue;
        }

        const { data: publicUrlData } = sb.storage.from("c2c-photos").getPublicUrl(filePath);
        images.push(publicUrlData.publicUrl);
      }

      if (images.length === 0) throw new Error("Não foi possível gerar imagens");

      return new Response(JSON.stringify({ success: true, images }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
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
