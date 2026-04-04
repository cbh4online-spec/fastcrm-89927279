import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } }
    );

    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { action, workspace_id, context } = await req.json();

    // Verify workspace membership
    const { data: membership } = await supabase
      .from("workspace_members")
      .select("id")
      .eq("workspace_id", workspace_id)
      .eq("user_id", user.id)
      .maybeSingle();

    if (!membership) {
      return new Response(JSON.stringify({ error: "Forbidden" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      return new Response(
        JSON.stringify({ error: "AI not configured" }),
        {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    let systemPrompt = "";
    let userPrompt = "";

    if (action === "suggest_methods") {
      systemPrompt = `És um especialista em logística e e-commerce em Portugal e Europa. 
Sugere métodos de envio otimizados para uma loja online.
Responde APENAS com JSON válido, sem markdown.
O formato deve ser um array de objetos com:
- name: nome do método (ex: "Envio Standard", "Envio Expresso")
- description: descrição curta
- base_price: preço base em EUR (número)
- free_shipping_threshold: valor para portes grátis ou null
- estimated_delivery: texto como "2-3 dias úteis"
- zones: array de zonas sugeridas, cada uma com:
  - name: nome da zona
  - countries: array de códigos ISO (PT, ES, FR, etc)
  - flat_price: preço fixo ou null
  - weight_rules: array de {min_weight, max_weight, price} ou []`;

      userPrompt = `Contexto da loja:
- País: ${context?.country || "Portugal"}
- Tipo de produtos: ${context?.product_types || "Produtos variados"}
- Peso médio: ${context?.avg_weight || "0.5-2kg"}
- Mercados alvo: ${context?.target_markets || "Portugal, Espanha, Europa"}
- Métodos existentes: ${context?.existing_methods?.length || 0}

Sugere 3-4 métodos de envio completos com zonas e preços competitivos para o mercado português/europeu.`;
    } else if (action === "suggest_prices") {
      systemPrompt = `És um analista de preços de logística especializado no mercado português e europeu.
Analisa os dados fornecidos e sugere preços otimizados.
Responde APENAS com JSON válido, sem markdown.
O formato deve ser:
{
  "base_price": número,
  "free_shipping_threshold": número ou null,
  "zones": [{ "name": string, "countries": [string], "flat_price": número ou null, "weight_rules": [{"min_weight": num, "max_weight": num, "price": num}] }],
  "reasoning": "explicação curta da lógica de pricing"
}`;

      userPrompt = `Método de envio: ${context?.method_name || "Standard"}
País base: ${context?.country || "Portugal"}
Tipo de produtos: ${context?.product_types || "variados"}
Peso médio: ${context?.avg_weight || "1kg"}
Mercados: ${context?.target_markets || "Portugal, Espanha"}
Preço atual: €${context?.current_price ?? "N/A"}

Sugere preços competitivos e realistas baseados nas tarifas médias de transportadoras (CTT, DPD, GLS, UPS) para 2024-2025.`;
    } else if (action === "optimize_zones") {
      systemPrompt = `És um especialista em otimização logística para e-commerce.
Analisa as zonas de envio existentes e sugere melhorias.
Responde APENAS com JSON válido, sem markdown.
O formato:
{
  "suggestions": [
    {
      "type": "add_zone" | "modify_zone" | "merge_zones" | "split_zone",
      "zone_name": string,
      "description": string,
      "countries": [string],
      "suggested_price": número ou null,
      "weight_rules": [{"min_weight": num, "max_weight": num, "price": num}] | [],
      "reason": string
    }
  ],
  "overall_analysis": string
}`;

      userPrompt = `Zonas atuais:
${JSON.stringify(context?.current_zones || [], null, 2)}

Método: ${context?.method_name || "N/A"}
País base: ${context?.country || "Portugal"}
Tipo de produtos: ${context?.product_types || "variados"}

Analisa e sugere otimizações: zonas em falta, preços desajustados, regras de peso a melhorar, países relevantes não cobertos.`;
    } else {
      return new Response(
        JSON.stringify({ error: "Invalid action" }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    const aiResponse = await fetch(
      "https://ai.gateway.lovable.dev/v1/chat/completions",
      {
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
        }),
      }
    );

    if (!aiResponse.ok) {
      if (aiResponse.status === 429) {
        return new Response(
          JSON.stringify({ error: "Limite de pedidos excedido. Tenta novamente em breve." }),
          { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      if (aiResponse.status === 402) {
        return new Response(
          JSON.stringify({ error: "Créditos de IA esgotados." }),
          { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      const errText = await aiResponse.text();
      console.error("AI error:", aiResponse.status, errText);
      throw new Error("AI gateway error");
    }

    const aiData = await aiResponse.json();
    const content = aiData.choices?.[0]?.message?.content || "";

    // Parse JSON from response (strip markdown fences if present)
    let parsed;
    try {
      const cleaned = content.replace(/```json\n?/g, "").replace(/```\n?/g, "").trim();
      parsed = JSON.parse(cleaned);
    } catch {
      console.error("Failed to parse AI response:", content);
      return new Response(
        JSON.stringify({ error: "Resposta da IA inválida", raw: content }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    return new Response(JSON.stringify({ data: parsed }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("ai-shipping-suggest error:", e);
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
