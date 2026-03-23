import { logAIUsage } from '../_shared/ai-instrumentation.ts';
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

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
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Auth guard
    const token = req.headers.get("Authorization")?.replace("Bearer ", "");
    const {
      data: { user },
    } = await supabase.auth.getUser(token);

    const body = await req.json();

    // Support both old format { context: { ... } } and new format { workspace_id, contact_id, ... }
    let workspace_id: string;
    let contact_id: string | null = null;
    let company_id: string | null = null;
    let lead_id: string | null = null;
    let context = "contact_view";
    let limit = 8;
    let refresh = false;

    if (body.context && typeof body.context === "object") {
      // Old format from useEntityProductSuggestions
      workspace_id = body.context.workspaceId;
      if (body.context.entityType === "contact") contact_id = body.context.entityId;
      else if (body.context.entityType === "company") company_id = body.context.entityId;
      else if (body.context.entityType === "lead") lead_id = body.context.entityId;
      context = `${body.context.entityType}_view`;
    } else {
      // New format
      workspace_id = body.workspace_id;
      contact_id = body.contact_id || null;
      company_id = body.company_id || null;
      lead_id = body.lead_id || null;
      context = body.context || "contact_view";
      limit = body.limit || 8;
      refresh = body.refresh || false;
    }

    if (!workspace_id || !(contact_id || company_id || lead_id)) {
      return new Response(
        JSON.stringify({ error: "workspace_id e uma entidade são obrigatórios" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Verify workspace membership
    if (user) {
      const { data: member } = await supabase
        .from("workspace_members")
        .select("id")
        .eq("workspace_id", workspace_id)
        .eq("user_id", user.id)
        .maybeSingle();
      if (!member) {
        return new Response(
          JSON.stringify({ error: "Sem acesso a este workspace" }),
          { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
    }

    const entityRef: Record<string, string> = {};
    if (contact_id) entityRef.contact_id = contact_id;
    else if (company_id) entityRef.company_id = company_id;
    else if (lead_id) entityRef.lead_id = lead_id;

    // 0. Check cache (pending recs less than 30 min old)
    if (!refresh) {
      const thirtyMinAgo = new Date(Date.now() - 30 * 60 * 1000).toISOString();
      const { data: cached } = await supabase
        .from("product_recommendations")
        .select(
          `id, score, strategy, confidence, reason, reason_tags, status,
          product:products(id, name, sku, base_price, short_description, category,
            product_images(url))`
        )
        .match({ workspace_id, status: "pending", ...entityRef })
        .gt("generated_at", thirtyMinAgo)
        .order("score", { ascending: false })
        .limit(limit);

      if (cached && cached.length >= 3) {
        return new Response(
          JSON.stringify({ success: true, source: "cache", recommendations: cached }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
    }

    // 1. Load workspace config
    const { data: config } = await supabase
      .from("recommendation_config")
      .select("*")
      .eq("workspace_id", workspace_id)
      .maybeSingle();

    const weights = {
      history: Number(config?.weight_history ?? 0.4),
      profile: Number(config?.weight_profile ?? 0.25),
      collaborative: Number(config?.weight_collaborative ?? 0.2),
    };
    const minThreshold = Number(config?.min_score_threshold ?? 20);
    const maxRecs = config?.max_recommendations ?? 10;

    // 2. Build entity profile
    const entity = await buildEntityProfile(supabase, workspace_id, entityRef);

    // 3. Run 3 SQL strategies in parallel
    const [historyScores, profileScores, collaborativeScores] = await Promise.all([
      scoreByHistory(supabase, workspace_id, entity),
      scoreByProfile(supabase, workspace_id, entity, context),
      scoreByCollaborative(supabase, workspace_id, entity),
    ]);

    // 4. Combine and rank
    const allIds = new Set([
      ...Object.keys(historyScores),
      ...Object.keys(profileScores),
      ...Object.keys(collaborativeScores),
    ]);

    // Exclude recently purchased (last 30 days)
    const recentIds = new Set(
      entity.purchaseHistory
        .filter((h: any) => {
          const days = (Date.now() - new Date(h.last_purchased_at).getTime()) / 86400000;
          return days < 30;
        })
        .map((h: any) => h.product_id)
    );

    let candidates = Array.from(allIds)
      .filter((id) => !recentIds.has(id))
      .map((product_id) => {
        const h = Math.min(historyScores[product_id] ?? 0, 100);
        const p = Math.min(profileScores[product_id] ?? 0, 100);
        const c = Math.min(collaborativeScores[product_id] ?? 0, 100);
        const score =
          h * weights.history + p * weights.profile + c * weights.collaborative;
        const dominant =
          h * weights.history >= p * weights.profile &&
          h * weights.history >= c * weights.collaborative
            ? "history"
            : p * weights.profile >= c * weights.collaborative
            ? "profile"
            : "collaborative";
        return { product_id, score, dominant_strategy: dominant, h, p, c };
      })
      .filter((c) => c.score >= minThreshold)
      .sort((a, b) => b.score - a.score)
      .slice(0, Math.min(limit, maxRecs));

    // 5. If no SQL-based candidates, fallback to AI-only
    if (candidates.length === 0) {
      const aiCandidates = await fallbackAISuggestions(
        supabase,
        workspace_id,
        entity,
        context,
        limit
      );
      if (aiCandidates.length === 0) {
        return new Response(
          JSON.stringify({ success: true, source: "fresh", recommendations: [] }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      candidates = aiCandidates;
    }

    // 6. Fetch product data
    const { data: products } = await supabase
      .from("products")
      .select(
        "id, name, sku, base_price, short_description, category, product_images(url)"
      )
      .in(
        "id",
        candidates.map((c) => c.product_id)
      )
      .eq("workspace_id", workspace_id)
      .eq("status", "active");

    const productMap = new Map((products ?? []).map((p: any) => [p.id, p]));

    // 7. Generate reasons with AI
    const topCandidates = candidates.filter((c) => productMap.has(c.product_id));
    const reasons = await generateReasons(entity, topCandidates, productMap);

    // 8. Delete old pending and insert new
    await supabase
      .from("product_recommendations")
      .delete()
      .match({ workspace_id, status: "pending", ...entityRef });

    const { data: saved } = await supabase
      .from("product_recommendations")
      .insert(
        topCandidates.map((c, i) => ({
          workspace_id,
          ...entityRef,
          product_id: c.product_id,
          score: Math.round(c.score * 100) / 100,
          strategy: c.dominant_strategy,
          confidence: c.score > 70 ? "high" : c.score > 40 ? "medium" : "low",
          reason: reasons[i]?.reason ?? "",
          reason_tags: reasons[i]?.tags ?? [],
          generated_by: ["proposal", "order"].includes(context)
            ? `${context}_context`
            : "auto",
          trigger_module: context,
          calc_history_score: c.h,
          calc_profile_score: c.p,
          calc_collaborative_score: c.c,
        }))
      )
      .select(
        `id, score, strategy, confidence, reason, reason_tags, status,
        product:products(id, name, sku, base_price, short_description, category,
          product_images(url))`
      );

    return new Response(
      JSON.stringify({
        success: true,
        source: "fresh",
        entity_name: entity.name,
        recommendations: saved ?? [],
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Error in suggest-products-for-entity:", error);
    return new Response(
      JSON.stringify({
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
        recommendations: [],
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});

// ── Strategy 1: History ─────────────────────────────────────────────
async function scoreByHistory(
  supabase: any,
  workspaceId: string,
  entity: any
) {
  const scores: Record<string, number> = {};
  if (!entity.purchasedCategories.length && !entity.purchaseHistory.length)
    return scores;

  // Same category, not yet purchased
  if (entity.purchasedCategories.length > 0) {
    const { data: sameCat } = await supabase
      .from("products")
      .select("id")
      .eq("workspace_id", workspaceId)
      .eq("status", "active")
      .in("category", entity.purchasedCategories)
      .not(
        "id",
        "in",
        `(${
          entity.allPurchasedProductIds.length
            ? entity.allPurchasedProductIds.join(",")
            : "00000000-0000-0000-0000-000000000000"
        })`
      )
      .limit(20);

    for (const p of sameCat ?? []) scores[p.id] = (scores[p.id] ?? 0) + 30;
  }

  // Reorder cycle detection
  for (const h of entity.purchaseHistory) {
    if (!h.avg_reorder_days || h.avg_reorder_days <= 0) continue;
    const daysSince =
      (Date.now() - new Date(h.last_purchased_at).getTime()) / 86400000;
    const ratio = daysSince / h.avg_reorder_days;
    if (ratio >= 0.75) {
      scores[h.product_id] =
        (scores[h.product_id] ?? 0) + Math.min(ratio * 35, 65);
    }
  }

  return scores;
}

// ── Strategy 2: Profile ─────────────────────────────────────────────
async function scoreByProfile(
  supabase: any,
  workspaceId: string,
  entity: any,
  context: string
) {
  const scores: Record<string, number> = {};

  // Context boost
  const contextBoost: Record<string, number> = {
    proposal: 15,
    order: 10,
    opportunity: 20,
    b2b_catalog: 25,
    security_renewal: 30,
    procurement: 20,
  };
  const boost = contextBoost[context] ?? 0;

  // Industry-based product matching via protocols
  if (entity.industry) {
    const { data: protocols } = await supabase
      .from("product_protocols")
      .select("id")
      .eq("workspace_id", workspaceId)
      .eq("is_active", true)
      .limit(5);

    if (protocols && protocols.length > 0) {
      const { data: protocolProducts } = await supabase
        .from("protocol_products")
        .select("product_id")
        .in(
          "protocol_id",
          protocols.map((p: any) => p.id)
        );

      for (const item of protocolProducts ?? []) {
        scores[item.product_id] = (scores[item.product_id] ?? 0) + 25;
      }
    }
  }

  // Popular products in workspace (for new entities without history)
  if (entity.purchaseHistory.length === 0) {
    const { data: popular } = await supabase
      .from("products")
      .select("id")
      .eq("workspace_id", workspaceId)
      .eq("status", "active")
      .not("base_price", "is", null)
      .order("updated_at", { ascending: false })
      .limit(15);

    for (const p of popular ?? []) {
      scores[p.id] = (scores[p.id] ?? 0) + 20;
    }
  }

  if (boost > 0) {
    for (const id of Object.keys(scores)) scores[id] += boost;
  }

  return scores;
}

// ── Strategy 3: Collaborative ───────────────────────────────────────
async function scoreByCollaborative(
  supabase: any,
  workspaceId: string,
  entity: any
) {
  const scores: Record<string, number> = {};
  if (!entity.recentProductIds.length) return scores;

  const { data: cooc } = await supabase
    .from("product_cooccurrence")
    .select("product_b, cooccurrence_count")
    .eq("workspace_id", workspaceId)
    .in("product_a", entity.recentProductIds)
    .order("cooccurrence_count", { ascending: false })
    .limit(60);

  for (const row of cooc ?? []) {
    scores[row.product_b] =
      (scores[row.product_b] ?? 0) + Math.min(row.cooccurrence_count * 15, 60);
  }

  return scores;
}

// ── AI Fallback (for entities with no purchase history) ─────────────
async function fallbackAISuggestions(
  supabase: any,
  workspaceId: string,
  entity: any,
  context: string,
  limit: number
) {
  const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
  if (!LOVABLE_API_KEY) return [];

  const { data: products } = await supabase
    .from("products")
    .select("id, name, category, base_price, short_description")
    .eq("workspace_id", workspaceId)
    .eq("status", "active")
    .limit(40);

  if (!products || products.length === 0) return [];

  const catalog = products
    .map(
      (p: any) =>
        `${p.id}|${p.name}|${p.category || ""}|€${p.base_price || 0}`
    )
    .join("\n");

  const prompt = `Analisa este perfil e sugere os ${limit} produtos mais relevantes.

Cliente: ${entity.name}
Sector: ${entity.industry ?? "desconhecido"}
Contexto: ${context}

Catálogo (id|nome|categoria|preço):
${catalog}

Responde APENAS JSON sem markdown:
[{"product_id":"...","score":75,"reason":"frase curta"}]`;

  try {
    const response = await fetch(
      "https://ai.gateway.lovable.dev/v1/chat/completions",
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${LOVABLE_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "google/gemini-3-flash-preview",
          messages: [{ role: "user", content: prompt }],
          temperature: 0.3,
        }),
      }
    );

    if (!response.ok) return [];
    const aiResponse = await response.json();
    const content = aiResponse.choices?.[0]?.message?.content || "";
    const jsonMatch = content.match(/\[[\s\S]*\]/);
    if (!jsonMatch) return [];

    const parsed = JSON.parse(jsonMatch[0]);
    const validIds = new Set(products.map((p: any) => p.id));

    return parsed
      .filter((s: any) => validIds.has(s.product_id))
      .slice(0, limit)
      .map((s: any) => ({
        product_id: s.product_id,
        score: s.score ?? 50,
        dominant_strategy: "ai_fallback",
        h: 0,
        p: s.score ?? 50,
        c: 0,
      }));
  } catch {
    return [];
  }
}

// ── Generate reasons with AI ────────────────────────────────────────
async function generateReasons(
  entity: any,
  candidates: any[],
  productMap: Map<string, any>
) {
  const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
  if (!LOVABLE_API_KEY || candidates.length === 0) {
    return candidates.map((c) => ({
      product_id: c.product_id,
      reason: "",
      tags: [],
    }));
  }

  const list = candidates
    .slice(0, 10)
    .map((c) => {
      const p = productMap.get(c.product_id);
      return `- "${p?.name}" | estratégia:${c.dominant_strategy} | score:${Math.round(c.score)}`;
    })
    .join("\n");

  const prompt = `Cliente: ${entity.name}
Sector: ${entity.industry ?? "desconhecido"}
Categorias compradas: ${entity.purchasedCategories?.join(", ") || "nenhuma"}

Produtos:
${list}

Para cada produto, UMA frase curta (máx 8 palavras) em português.
Responde APENAS JSON: [{"product_id":"...","reason":"frase","tags":["tag"]}]
Tags: recompra_prevista, complemento_natural, mesmo_sector, clientes_similares, upgrade_disponivel, protocolo_sector`;

  try {
    const response = await fetch(
      "https://ai.gateway.lovable.dev/v1/chat/completions",
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${LOVABLE_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "google/gemini-3-flash-preview",
          messages: [{ role: "user", content: prompt }],
          temperature: 0.3,
        }),
      }
    );

    if (!response.ok) throw new Error("AI error");
    const aiResponse = await response.json();
    const content = aiResponse.choices?.[0]?.message?.content || "";
    const jsonMatch = content.match(/\[[\s\S]*\]/);
    if (!jsonMatch) throw new Error("No JSON");
    return JSON.parse(jsonMatch[0]);
  } catch {
    return candidates.map((c) => ({
      product_id: c.product_id,
      reason: "",
      tags: [],
    }));
  }
}

// ── Build entity profile ────────────────────────────────────────────
async function buildEntityProfile(
  supabase: any,
  workspaceId: string,
  entityRef: Record<string, string>
) {
  const entityQuery = entityRef.contact_id
    ? supabase
        .from("contacts")
        .select("id, name, first_name, last_name, company_id")
        .eq("id", entityRef.contact_id)
        .single()
    : entityRef.company_id
    ? supabase
        .from("companies")
        .select("id, name, industry, size")
        .eq("id", entityRef.company_id)
        .single()
    : supabase
        .from("leads")
        .select("id, name")
        .eq("id", entityRef.lead_id)
        .single();

  const historyQuery = supabase
    .from("entity_purchase_history")
    .select("*")
    .eq("workspace_id", workspaceId);

  // Add appropriate filter
  if (entityRef.contact_id) {
    historyQuery.eq("contact_id", entityRef.contact_id);
  } else if (entityRef.company_id) {
    historyQuery.eq("company_id", entityRef.company_id);
  }

  const [entityData, historyData] = await Promise.all([
    entityQuery,
    historyQuery,
  ]);

  const e = entityData.data;
  const history = historyData.data ?? [];

  const name = entityRef.contact_id
    ? `${e?.first_name ?? ""} ${e?.last_name ?? ""}`.trim() || e?.name || "Cliente"
    : e?.name ?? "Cliente";

  const purchasedCategories = [
    ...new Set(history.map((h: any) => h.category).filter(Boolean)),
  ];
  const allPurchasedProductIds = history.map((h: any) => h.product_id);
  const recentProductIds = history
    .filter(
      (h: any) =>
        (Date.now() - new Date(h.last_purchased_at).getTime()) / 86400000 <= 180
    )
    .map((h: any) => h.product_id);

  return {
    name,
    industry: e?.industry ?? null,
    purchaseHistory: history,
    purchasedCategories,
    allPurchasedProductIds,
    recentProductIds,
    lastPurchaseDate: history.length
      ? new Date(
          Math.max(
            ...history.map((h: any) => new Date(h.last_purchased_at).getTime())
          )
        ).toLocaleDateString("pt-PT")
      : null,
  };
}
