import { aiGate } from '../_shared/ai-gate.ts';
import { logAIUsage } from '../_shared/ai-instrumentation.ts';
import {
  checkRelationGrounding,
  classifyRelationIntent,
  isRelationAvailable,
  isRelationConfidence,
  isRelationType,
  shouldAutoApprove,
  type RelationConfidence,
  type RelationProductFacts,
  type RelationType,
} from '../_shared/ai-commerce/relationIntent.ts';
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const PRODUCT_FIELDS =
  "id, name, category, subcategory, brand, short_description, specifications, sku, base_price, product_type, status, stock_status, track_stock, stock_quantity, store_published";

function aiContext(row: Record<string, unknown> | undefined, product: Record<string, unknown>): string {
  const specs = product.specifications;
  const specText =
    specs && typeof specs === "object"
      ? Object.entries(specs as Record<string, unknown>)
          .map(([key, value]) => `${key} ${String(value ?? "")}`)
          .join(" ")
      : "";
  const arr = (value: unknown) => (Array.isArray(value) ? value.join(" ") : "");
  return [
    product.short_description || "",
    specText,
    arr(row?.ai_keywords),
    arr(row?.ai_use_cases),
    arr(row?.ai_key_features),
    (row?.ai_recommendation_context as string) || "",
  ]
    .join(" ")
    .trim();
}

function toFacts(product: Record<string, any>, context: string): RelationProductFacts {
  return {
    id: product.id,
    name: product.name ?? null,
    brand: product.brand ?? null,
    category: product.category ?? null,
    subcategory: product.subcategory ?? null,
    productType: product.product_type ?? null,
    price: typeof product.base_price === "number" ? product.base_price : null,
    status: product.status ?? null,
    stockStatus: product.stock_status ?? null,
    trackStock: product.track_stock ?? null,
    stockQuantity: product.stock_quantity ?? null,
    storePublished: product.store_published ?? null,
    context,
  };
}

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
      .select(PRODUCT_FIELDS)
      .eq("id", product_id)
      .eq("workspace_id", workspace_id)
      .maybeSingle();

    if (!sourceProduct) {
      return new Response(JSON.stringify({ error: "Product not found" }), {
        status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Get catalog products (only sellable ones — nunca sugerir o que não se pode vender)
    const { data: catalogProducts } = await supabase
      .from("products")
      .select(PRODUCT_FIELDS)
      .eq("workspace_id", workspace_id)
      .eq("status", "active")
      .neq("id", product_id)
      .limit(120);

    if (!catalogProducts || catalogProducts.length === 0) {
      return new Response(JSON.stringify({ success: true, suggestions: [], added: 0, pending: 0 }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Conteúdo AI Commerce (fonte de verdade para contexto e compatibilidade)
    const allIds = [product_id, ...catalogProducts.map((p: any) => p.id)];
    const { data: aiRows } = await supabase
      .from("product_ai_commerce")
      .select("product_id, ai_keywords, ai_use_cases, ai_key_features, ai_recommendation_context, ai_exclusions")
      .eq("workspace_id", workspace_id)
      .in("product_id", allIds);

    const aiById = new Map<string, any>((aiRows || []).map((r: any) => [r.product_id, r]));

    const sourceContext = aiContext(aiById.get(product_id), sourceProduct as any);
    const sourceFacts = toFacts(sourceProduct as any, sourceContext);

    const candidateFacts = new Map<string, RelationProductFacts>();
    for (const p of catalogProducts as any[]) {
      candidateFacts.set(p.id, toFacts(p, aiContext(aiById.get(p.id), p)));
    }

    // Get existing relations
    const { data: existingRelations } = await supabase
      .from("product_relations")
      .select("target_product_id, relation_type")
      .eq("source_product_id", product_id);

    const existingSet = new Set(
      (existingRelations || []).map((r: any) => `${r.target_product_id}:${r.relation_type}`)
    );

    // Co-ocorrência real em faturas
    const cooccurrenceByProduct = new Map<string, number>();
    let cooccurrenceContext = "";
    try {
      const { data: cooc } = await supabase
        .from("product_cooccurrence")
        .select("product_b, cooccurrence_count, lift_score")
        .eq("workspace_id", workspace_id)
        .eq("product_a", product_id)
        .order("lift_score", { ascending: false })
        .limit(20);

      for (const c of cooc || []) {
        cooccurrenceByProduct.set(c.product_b, c.cooccurrence_count || 0);
      }

      if (cooc && cooc.length > 0) {
        const nameById = new Map((catalogProducts as any[]).map((p) => [p.id, p.name]));
        cooccurrenceContext = "\n\nVENDIDOS JUNTOS (dados reais de faturas):\n" +
          cooc
            .filter((c: any) => nameById.has(c.product_b))
            .map((c: any) => `- "${nameById.get(c.product_b)}" (ID:${c.product_b}) — ${c.cooccurrence_count}x juntos`)
            .join("\n");
      }
    } catch { /* materialized view may not exist yet */ }

    // Catálogo com os factos reais que a IA pode usar como evidência
    const catalog = (catalogProducts as any[])
      .map((p) => {
        const facts = candidateFacts.get(p.id)!;
        const ctx = (facts.context || "").slice(0, 180);
        return `ID:${p.id} | ${p.name} | marca:${p.brand || "N/A"} | cat:${p.category || "N/A"} > ${p.subcategory || "N/A"} | tipo:${p.product_type || "N/A"} | €${p.base_price ?? 0} | stock:${p.stock_status || "N/A"} | ctx:${ctx}`;
      })
      .join("\n");

    const prompt = `És responsável pelas relações comerciais do catálogo. Objetivo: aumentar o ticket médio e nunca perder uma venda.

PRODUTO FONTE:
- Nome: ${sourceProduct.name}
- Marca: ${(sourceProduct as any).brand || "N/A"}
- Categoria: ${(sourceProduct as any).category || "N/A"} > ${(sourceProduct as any).subcategory || "N/A"}
- Tipo: ${(sourceProduct as any).product_type || "N/A"}
- SKU: ${sourceProduct.sku || "N/A"}
- Preço: €${(sourceProduct as any).base_price ?? "N/A"}
- Contexto AI Commerce: ${sourceContext.slice(0, 600) || "N/A"}
- Exclusões declaradas: ${aiById.get(product_id)?.ai_exclusions || "N/A"}
${cooccurrenceContext}

CATÁLOGO DISPONÍVEL (única fonte permitida):
${catalog}

TIPOS DE RELAÇÃO:
- accessory: complementa o produto (sobe o ticket)
- required: indispensável para o utilizar (sobe o ticket)
- bundle: kit lógico, só com histórico de vendas em conjunto ou ligação clara na ficha
- upgrade: versão superior e MAIS CARA do mesmo tipo (up-sell)
- alternative: substituto da mesma categoria (down-sell se mais barato — salva a venda)
- compatible: funciona em conjunto, compatibilidade comprovada na ficha/marca
- related: mesma categoria, ligação genérica (usar só em último recurso)

REGRAS OBRIGATÓRIAS:
1. NUNCA inventes dados. Só podes usar os IDs listados acima e os factos apresentados (marca, categoria, contexto, preço, vendas conjuntas).
2. Cada sugestão tem de incluir "evidence": 1 a 3 frases curtas que citem o facto real usado (ex: "mesma marca Ajax", "ficha refere SmartBracket", "faturados juntos 12x"). Sem evidência real, não sugiras.
3. "upgrade" exige preço superior ao produto fonte. "alternative" exige a mesma categoria.
4. Não sugiras nada que contrarie as exclusões declaradas.
5. Se não houver evidência suficiente, devolve uma lista vazia. É melhor zero relações do que uma relação inventada.
6. Máximo 10 sugestões, uma relação por produto, a mais relevante.
7. confidence: "high" só quando a evidência é inequívoca (marca/ficha/vendas); caso contrário "medium" ou "low".

Responde APENAS em JSON válido (sem markdown):
{
  "suggestions": [
    {
      "target_id": "uuid",
      "relation_type": "accessory|alternative|required|upgrade|compatible|bundle|related",
      "reason": "Motivo comercial curto (max 60 chars)",
      "evidence": ["facto real citado"],
      "confidence": "high|medium|low"
    }
  ]
}`;

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
            content:
              "Especialista em cross-sell, up-sell e down-sell de catálogo. Trabalhas apenas com factos fornecidos: nunca inventas compatibilidades, preços ou stock. Responde APENAS em JSON.",
          },
          { role: "user", content: prompt },
        ],
        temperature: 0.2,
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
    try {
      logAIUsage({
        workspace_id: workspace_id,
        feature: "suggest-related-products",
        model: "google/gemini-3-flash-preview",
        tokens_input: aiData?.usage?.prompt_tokens ?? 0,
        tokens_output: aiData?.usage?.completion_tokens ?? 0,
      });
    } catch (_e) { /* logging never blocks */ }

    const aiContent = aiData.choices?.[0]?.message?.content || "";

    let suggestions: any[] = [];
    try {
      const jsonMatch = aiContent.match(/\{[\s\S]*\}/);
      const parsed = jsonMatch ? JSON.parse(jsonMatch[0]) : { suggestions: [] };
      suggestions = Array.isArray(parsed.suggestions) ? parsed.suggestions : [];
    } catch {
      suggestions = [];
    }

    // Validação rigorosa: grounding em dados reais + intenção comercial determinística
    const rejected: { target_id?: string; relation_type?: string; reason: string }[] = [];
    const seenTargets = new Set<string>();
    const validated: any[] = [];

    for (const s of suggestions) {
      const targetId = String(s?.target_id || "");
      const relationType = s?.relation_type as RelationType;

      if (!candidateFacts.has(targetId) || !isRelationType(relationType)) {
        rejected.push({ target_id: targetId, reason: "Produto ou tipo de relação inválido" });
        continue;
      }
      if (seenTargets.has(targetId)) continue;
      if (existingSet.has(`${targetId}:${relationType}`)) continue;

      const target = candidateFacts.get(targetId)!;

      if (!isRelationAvailable(target)) {
        rejected.push({ target_id: targetId, relation_type: relationType, reason: "Produto sem disponibilidade" });
        continue;
      }

      const grounding = checkRelationGrounding({
        source: sourceFacts,
        target,
        relationType,
        cooccurrenceCount: cooccurrenceByProduct.get(targetId) ?? 0,
      });

      if (!grounding.grounded) {
        rejected.push({
          target_id: targetId,
          relation_type: relationType,
          reason: grounding.rejection || "Sem evidência real",
        });
        continue;
      }

      const confidence: RelationConfidence = isRelationConfidence(s?.confidence) ? s.confidence : "low";
      const intent = classifyRelationIntent(relationType, sourceFacts.price, target.price);
      const autoApprove = shouldAutoApprove(confidence, grounding);

      seenTargets.add(targetId);
      validated.push({
        target_id: targetId,
        target_name: target.name || "Produto",
        target_price: target.price ?? 0,
        relation_type: relationType,
        commercial_intent: intent,
        reason: typeof s?.reason === "string" ? s.reason.slice(0, 120) : "",
        evidence: grounding.signals,
        confidence,
        auto_approved: autoApprove,
      });
    }

    // Guardar: só as de confiança alta ficam ativas; as restantes ficam pendentes de revisão.
    let added = 0;
    let pending = 0;
    if (mode === "suggest-and-save" && validated.length > 0) {
      const toInsert = validated.map((s, i) => ({
        workspace_id,
        source_product_id: product_id,
        target_product_id: s.target_id,
        relation_type: s.relation_type,
        commercial_intent: s.commercial_intent,
        reason: s.reason || null,
        evidence: s.evidence,
        confidence: s.confidence,
        source: "ai_commerce",
        validation_status: s.auto_approved ? "approved" : "pending",
        is_active: s.auto_approved,
        created_by: user.id,
        sort_order: i,
      }));

      const { error: insertError } = await supabase.from("product_relations").insert(toInsert);

      if (!insertError) {
        added = toInsert.filter((r) => r.is_active).length;
        pending = toInsert.length - added;
      } else {
        console.error("Insert error:", insertError.message);
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        suggestions: validated,
        added,
        pending,
        rejected_count: rejected.length,
        rejected,
      }),
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
