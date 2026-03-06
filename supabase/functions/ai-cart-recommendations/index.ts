import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "@supabase/supabase-js";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { cartProductIds, workspaceId } = await req.json();

    if (!cartProductIds?.length || !workspaceId) {
      return new Response(JSON.stringify({ recommendations: [] }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // Fetch cart products
    const { data: cartProducts } = await supabase
      .from("products")
      .select("id, name, category, base_price, images")
      .in("id", cartProductIds);

    // Fetch attributes for cart products
    const { data: cartAttrs } = await supabase
      .from("product_attributes")
      .select("product_id, attribute_type, attribute_value")
      .in("product_id", cartProductIds);

    // Fetch existing cross-sells
    const { data: crossSells } = await supabase
      .from("product_cross_sells")
      .select(`
        target_product_id, reason, weight,
        target_product:products!product_cross_sells_target_product_id_fkey(id, name, base_price, images)
      `)
      .in("source_product_id", cartProductIds)
      .eq("is_active", true)
      .order("weight", { ascending: false })
      .limit(10);

    // Fetch complementary products
    const { data: allProducts } = await supabase
      .from("products")
      .select("id, name, base_price, images, category, short_description")
      .eq("workspace_id", workspaceId)
      .eq("status", "active")
      .not("id", "in", `(${cartProductIds.join(",")})`)
      .limit(20);

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      // Fallback: return cross-sells only
      const fallbackRecs = (crossSells || []).slice(0, 5).map((cs: any) => ({
        product_id: cs.target_product_id,
        product_name: cs.target_product?.name || "Produto",
        reason: cs.reason || "Produto complementar",
        type: "complementar",
        priority: "media",
        base_price: cs.target_product?.base_price,
        images: cs.target_product?.images,
      }));
      return new Response(JSON.stringify({ recommendations: fallbackRecs }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const cartInfo = (cartProducts || [])
      .map((p: any) => {
        const attrs = (cartAttrs || [])
          .filter((a: any) => a.product_id === p.id)
          .map((a: any) => `${a.attribute_type}: ${a.attribute_value}`)
          .join(", ");
        return `- ${p.name} (${p.category || "sem categoria"}) [${attrs || "sem atributos"}]`;
      })
      .join("\n");

    const availableProducts = (allProducts || [])
      .map((p: any) => `- ${p.name} (${p.category || "N/A"}): ${p.short_description || "N/A"} - ${p.base_price}€`)
      .join("\n");

    const aiResponse = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          {
            role: "system",
            content: `Você é um consultor técnico em cosmética/tricologia profissional B2B. Recomende produtos complementares para melhorar o tratamento. NUNCA diagnostique - apenas recomende para a situação. Responda em português.`,
          },
          {
            role: "user",
            content: `Produtos no carrinho:\n${cartInfo}\n\nProdutos disponíveis:\n${availableProducts}\n\nRecomende até 5 produtos complementares que melhorem o tratamento.`,
          },
        ],
        tools: [
          {
            type: "function",
            function: {
              name: "recommend_products",
              description: "Return complementary product recommendations",
              parameters: {
                type: "object",
                properties: {
                  recommendations: {
                    type: "array",
                    items: {
                      type: "object",
                      properties: {
                        product_name: { type: "string" },
                        reason: { type: "string" },
                        type: { type: "string", enum: ["complementar", "upgrade", "manutencao", "substituicao"] },
                        priority: { type: "string", enum: ["alta", "media", "baixa"] },
                      },
                      required: ["product_name", "reason", "type", "priority"],
                      additionalProperties: false,
                    },
                  },
                },
                required: ["recommendations"],
                additionalProperties: false,
              },
            },
          },
        ],
        tool_choice: { type: "function", function: { name: "recommend_products" } },
      }),
    });

    if (!aiResponse.ok) {
      if (aiResponse.status === 429) {
        return new Response(JSON.stringify({ error: "Limite de pedidos excedido." }), {
          status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (aiResponse.status === 402) {
        return new Response(JSON.stringify({ error: "Créditos esgotados." }), {
          status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      return new Response(JSON.stringify({ recommendations: [] }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const aiData = await aiResponse.json();
    const toolCall = aiData.choices?.[0]?.message?.tool_calls?.[0];

    let recommendations: any[] = [];
    if (toolCall?.function?.arguments) {
      try {
        const parsed = JSON.parse(toolCall.function.arguments);
        recommendations = (parsed.recommendations || []).map((r: any) => {
          const matched = (allProducts || []).find(
            (p: any) => p.name.toLowerCase() === r.product_name.toLowerCase()
          );
          return {
            product_id: matched?.id || null,
            product_name: r.product_name,
            reason: r.reason,
            type: r.type,
            priority: r.priority,
            base_price: matched?.base_price,
            images: matched?.images,
          };
        }).filter((r: any) => r.product_id);
      } catch {
        recommendations = [];
      }
    }

    return new Response(JSON.stringify({ recommendations }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("[B2B-INTELLIGENCE] CART_RECS_FAILED", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
