import { aiGate } from '../_shared/ai-gate.ts';
import { logAIUsage } from '../_shared/ai-instrumentation.ts';
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY not configured");

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // Auth guard
    const authHeader = req.headers.get("Authorization") ?? "";
    const token = authHeader.replace("Bearer ", "");
    const { data: { user }, error: authErr } = await supabase.auth.getUser(token);
    if (authErr || !user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { product_id, workspace_id, mode = "suggest" } = await req.json();


    // AI Gate — enforce credit consumption
    if (workspace_id) {
      const gate = await aiGate(workspace_id, 'light', 'suggest-related-products');
      if (!gate.allowed) {
        return new Response(JSON.stringify({ error: 'quota_exceeded', upgrade_required: true }), {
          status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
    }
    if (!product_id || !workspace_id) {
      return new Response(JSON.stringify({ error: "product_id and workspace_id required" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
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
      return new Response(JSON.stringify({ error: "Forbidden" }), {
        status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Get source product
    const { data: sourceProduct } = await supabase
      .from("products")
      .select("id, name, category, short_description, specifications, sku, base_price, product_type")
      .eq("id", product_id)
      .single();

    if (!sourceProduct) {
      return new Response(JSON.stringify({ error: "Product not found" }), {
        status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Get catalog products
    const { data: catalogProducts } = await supabase
      .from("products")
      .select("id, name, category, short_description, base_price, sku, product_type")
      .eq("workspace_id", workspace_id)
      .eq("status", "active")
      .neq("id", product_id)
      .limit(80);

    if (!catalogProducts || catalogProducts.length === 0) {
      return new Response(JSON.stringify({ success: true, suggestions: [], added: 0 }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Get existing relations
    const { data: existingRelations } = await supabase
      .from("product_relations")
      .select("target_product_id, relation_type")
      .eq("source_product_id", product_id);

    const existingSet = new Set(
      (existingRelations || []).map((r: any) => `${r.target_product_id}:${r.relation_type}`)
    );

    // Get co-occurrence data if available
    let cooccurrenceContext = "";
    try {
      const { data: cooc } = await supabase
        .from("product_cooccurrence")
        .select("product_b, cooccurrence_count, lift_score")
        .eq("workspace_id", workspace_id)
        .eq("product_a", product_id)
        .order("lift_score", { ascending: false })
        .limit(20);

      if (cooc && cooc.length > 0) {
        const productMap = new Map(catalogProducts.map((p: any) => [p.id, p.name]));
        cooccurrenceContext = "\n\nPRODUTOS FREQUENTEMENTE COMPRADOS JUNTO (dados reais de faturas):\n" +
          cooc
            .filter((c: any) => productMap.has(c.product_b))
            .map((c: any) => `- "${productMap.get(c.product_b)}" (ID:${c.product_b}) — ${c.cooccurrence_count} vezes juntos, lift: ${(c.lift_score as number).toFixed(2)}`)
            .join("\n");
      }
    } catch { /* materialized view may not exist yet */ }

    // Build catalog string
    const catalog = catalogProducts
      .map((p: any) => `ID:${p.id} | ${p.name} | cat:${p.category || "N/A"} | tipo:${p.product_type || "N/A"} | €${p.base_price || 0} | SKU:${p.sku || ""}`)
      .join("\n");

    const prompt = `Analisa o produto "${sourceProduct.name}" e sugere relações com outros produtos do catálogo.

PRODUTO FONTE:
- Nome: ${sourceProduct.name}
- Categoria: ${(sourceProduct as any).category || "N/A"}
- Tipo: ${(sourceProduct as any).product_type || "N/A"}
- SKU: ${sourceProduct.sku || "N/A"}
- Preço: €${(sourceProduct as any).base_price || "N/A"}
- Descrição: ${(sourceProduct as any).short_description || "N/A"}
${cooccurrenceContext}

CATÁLOGO DISPONÍVEL:
${catalog}

TIPOS DE RELAÇÃO DISPONÍVEIS:
- accessory: acessórios e complementos que melhoram ou completam o produto (cabos, suportes, capas, etc.)
- alternative: produto substituto/similar que o cliente pode preferir (mesmo tipo, preço similar)
- required: produto necessário/obrigatório para usar o produto fonte (bateria, licença, software)
- upgrade: versão superior ou evolução do produto (mais funcionalidades, melhor performance)
- compatible: produto tecnicamente compatível (funciona junto, mesma plataforma/protocolo)
- bundle: produtos que fazem sentido comprar como kit/conjunto
- related: produto genericamente relacionado (mesma categoria, complementar)

Responde APENAS em JSON válido (sem markdown):
{
  "suggestions": [
    {
      "target_id": "uuid",
      "relation_type": "accessory|alternative|required|upgrade|compatible|bundle|related",
      "reason": "Motivo curto (max 60 chars)",
      "confidence": "high|medium|low"
    }
  ]
}

REGRAS:
- Máximo 12 sugestões
- Prioriza relações com alta confiança
- Se há dados de co-ocorrência, usa-os para justificar "bundle" e "accessory"
- Não sugiras relações que não façam sentido comercial
- Cada produto só pode ter UMA relação (a mais relevante)`;

    const aiResp = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [
          {
            role: "system",
            content: "Especialista em catálogo de produtos e cross-sell/up-sell. Sugere relações inteligentes entre produtos com base em compatibilidade técnica, uso complementar e dados de vendas. Responde APENAS em JSON.",
          },
          { role: "user", content: prompt },
        ],
        temperature: 0.4,
      }),
    });

    if (!aiResp.ok) {
      const status = aiResp.status;
      if (status === 429) {
        return new Response(JSON.stringify({ error: "Rate limit exceeded. Try again later." }), {
          status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (status === 402) {
        return new Response(JSON.stringify({ error: "AI credits insufficient." }), {
          status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      throw new Error(`AI gateway error: ${status}`);
    }

    const aiData = await aiResp.json();
    const aiContent = aiData.choices?.[0]?.message?.content || "";

    let suggestions: any[] = [];
    try {
      const jsonMatch = aiContent.match(/\{[\s\S]*\}/);
      const parsed = jsonMatch ? JSON.parse(jsonMatch[0]) : { suggestions: [] };
      suggestions = parsed.suggestions || [];
    } catch {
      suggestions = [];
    }

    // Validate and filter
    const validProductIds = new Set(catalogProducts.map((p: any) => p.id));
    const validTypes = new Set(["accessory", "alternative", "required", "upgrade", "compatible", "bundle", "related"]);

    const validSuggestions = suggestions.filter(
      (s: any) =>
        validProductIds.has(s.target_id) &&
        validTypes.has(s.relation_type) &&
        !existingSet.has(`${s.target_id}:${s.relation_type}`)
    );

    // Auto-insert if mode is "suggest-and-save"
    let added = 0;
    if (mode === "suggest-and-save" && validSuggestions.length > 0) {
      const toInsert = validSuggestions.map((s: any, i: number) => ({
        workspace_id,
        source_product_id: product_id,
        target_product_id: s.target_id,
        relation_type: s.relation_type,
        reason: s.reason || null,
        sort_order: i,
      }));

      const { error: insertError } = await supabase
        .from("product_relations")
        .insert(toInsert);

      if (!insertError) added = toInsert.length;
      else console.error("Insert error:", insertError);
    }

    // Enrich with product names
    const productNameMap = new Map(catalogProducts.map((p: any) => [p.id, p]));
    const enriched = validSuggestions.map((s: any) => {
      const target = productNameMap.get(s.target_id);
      return {
        target_id: s.target_id,
        target_name: target?.name || "Produto",
        target_sku: target?.sku || null,
        target_price: target?.base_price || 0,
        relation_type: s.relation_type,
        reason: s.reason || "",
        confidence: s.confidence || "medium",
      };
    });

    return new Response(
      JSON.stringify({ success: true, suggestions: enriched, added }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("suggest-related-products error:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
