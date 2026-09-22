/**
 * ai-commerce-gate
 *
 * Gate de qualidade AI Commerce: reavalia o readiness de todos os produtos do
 * workspace, grava o estado do gate (aprovado/bloqueado + motivos) e marca os
 * produtos bloqueados para que a loja pública e os feeds os excluam.
 *
 * Também aplica correções em massa — apenas campos deriváveis de dados reais ou
 * de valores explicitamente indicados pelo utilizador. Nunca altera preços,
 * stock, GTIN/MPN, marca nem conteúdo comercial.
 *
 * Segurança: usa o JWT do utilizador (RLS) e valida a pertença ao workspace.
 */
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { evaluateReadiness } from "../_shared/ai-commerce/readiness.ts";
import { evaluateQualityGate, normalizeGateConfig } from "../_shared/ai-commerce/qualityGate.ts";
import { buildGateFixPlan, DEFAULT_GATE_FIX_DEFAULTS } from "../_shared/ai-commerce/gateFixes.ts";
import type { GateFixCode, GateFixDefaults } from "../_shared/ai-commerce/gateFixes.ts";
import type {
  CommerceProduct,
  CommerceVariant,
  ProductAICommerce,
  ReadinessConfigOverride,
} from "../_shared/ai-commerce/types.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { ...corsHeaders, "Content-Type": "application/json" } });

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

const PRODUCT_FIELDS =
  "id, workspace_id, name, sku, brand, manufacturer, gtin, mpn, store_slug, category, subcategory, product_type, schema_type, short_description, commercial_description, base_price, compare_at_price, currency, tax_included, stock_status, status, store_published, track_stock, stock_quantity, images, primary_image_index, seo_title, seo_description, canonical_url, checkout_url, target_audience, problem_solved, use_cases, main_benefits, benefits, features, countries, languages, product_condition, ai_commerce_gate_blocked";

const ALLOWED_FIXES: GateFixCode[] = [
  "currency",
  "store_slug",
  "schema_type",
  "availability",
  "language_country",
  "short_description",
];

type Client = ReturnType<typeof createClient>;

interface Row {
  product: CommerceProduct & { track_stock?: boolean | null; stock_quantity?: number | null; ai_commerce_gate_blocked?: boolean | null };
  ai: Partial<ProductAICommerce> | null;
}

async function loadRows(supabase: Client, workspaceId: string): Promise<{ rows: Row[]; overrides: ReadinessConfigOverride[]; activeFeeds: number }> {
  const [productsRes, aiRes, feedsRes, configRes] = await Promise.all([
    supabase.from("products").select(PRODUCT_FIELDS).eq("workspace_id", workspaceId).neq("status", "archived"),
    supabase.from("product_ai_commerce").select("*").eq("workspace_id", workspaceId),
    supabase.from("commerce_feeds").select("id").eq("workspace_id", workspaceId).eq("is_active", true),
    supabase.from("ai_commerce_readiness_config").select("code, weight, severity, enabled").eq("workspace_id", workspaceId),
  ]);

  if (productsRes.error) throw new Error(productsRes.error.message);

  const products = (productsRes.data || []) as unknown as Row["product"][];
  const aiMap = new Map(((aiRes.data || []) as unknown as ProductAICommerce[]).map((r) => [r.product_id, r]));

  const variantsByProduct = new Map<string, CommerceVariant[]>();
  if (products.length) {
    const { data: variants } = await supabase
      .from("product_variants")
      .select("id, product_id, name, sku, price_override, stock_quantity, is_active")
      .in("product_id", products.map((p) => p.id));
    for (const v of (variants || []) as unknown as (CommerceVariant & { product_id: string })[]) {
      const list = variantsByProduct.get(v.product_id) || [];
      list.push(v);
      variantsByProduct.set(v.product_id, list);
    }
  }

  return {
    rows: products.map((p) => ({
      product: { ...p, variants: variantsByProduct.get(p.id) ?? [] },
      ai: aiMap.get(p.id) ?? null,
    })),
    overrides: (configRes.data || []) as unknown as ReadinessConfigOverride[],
    activeFeeds: feedsRes.data?.length ?? 0,
  };
}

async function loadGateConfig(supabase: Client, workspaceId: string) {
  const { data } = await supabase
    .from("ai_commerce_gate_config")
    .select("enabled, min_score, required_codes, block_store, block_feeds")
    .eq("workspace_id", workspaceId)
    .maybeSingle();
  return normalizeGateConfig(
    data
      ? {
          enabled: data.enabled as boolean,
          minScore: data.min_score as number,
          requiredCodes: (data.required_codes as string[]) || [],
          blockStore: data.block_store as boolean,
          blockFeeds: data.block_feeds as boolean,
        }
      : null,
  );
}

/** Reavalia o gate e persiste o estado. */
async function recompute(supabase: Client, workspaceId: string) {
  const config = await loadGateConfig(supabase, workspaceId);
  const { rows, overrides, activeFeeds } = await loadRows(supabase, workspaceId);
  const now = new Date().toISOString();

  const aiUpserts: Record<string, unknown>[] = [];
  const blockedIds: string[] = [];
  const passedIds: string[] = [];
  let blockedPublished = 0;

  for (const row of rows) {
    const readiness = evaluateReadiness(row.product, row.ai, { activeFeeds, overrides });
    const gate = evaluateQualityGate(readiness, config);

    aiUpserts.push({
      workspace_id: workspaceId,
      product_id: row.product.id,
      ai_commerce_enabled: row.ai?.ai_commerce_enabled ?? false,
      ai_readiness_score: readiness.score,
      ai_readiness_issues: readiness.issues,
      gate_status: gate.status,
      gate_blockers: gate.blockers,
      gate_score: gate.score,
      gate_checked_at: now,
    });

    if (gate.blockedFromStore || gate.blockedFromFeeds) {
      blockedIds.push(row.product.id);
      if (row.product.store_published === true) blockedPublished += 1;
    } else {
      passedIds.push(row.product.id);
    }
  }

  // Estado por produto (chunks para não exceder limites do PostgREST).
  for (let i = 0; i < aiUpserts.length; i += 200) {
    const chunk = aiUpserts.slice(i, i + 200);
    const { error } = await supabase.from("product_ai_commerce").upsert(chunk as never, { onConflict: "product_id" });
    if (error) throw new Error(error.message);
  }

  // Marca de bloqueio usada pelas consultas públicas.
  for (const [value, ids] of [[true, blockedIds], [false, passedIds]] as const) {
    for (let i = 0; i < ids.length; i += 200) {
      const chunk = ids.slice(i, i + 200);
      if (!chunk.length) continue;
      const { error } = await supabase
        .from("products")
        .update({ ai_commerce_gate_blocked: value })
        .eq("workspace_id", workspaceId)
        .in("id", chunk);
      if (error) throw new Error(error.message);
    }
  }

  return {
    config,
    total: rows.length,
    blocked: blockedIds.length,
    passed: passedIds.length,
    blocked_published: blockedPublished,
    checked_at: now,
  };
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const authHeader = req.headers.get("Authorization") ?? "";
    if (!authHeader.startsWith("Bearer ")) return json({ error: "unauthorized" }, 401);

    const body = await req.json().catch(() => ({}));
    const action = String(body?.action || "recompute");
    const workspaceId = String(body?.workspaceId || "");
    if (!UUID.test(workspaceId)) return json({ error: "invalid_workspace" }, 400);

    const supabase = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_ANON_KEY")!, {
      global: { headers: { Authorization: authHeader } },
    });

    const { data: userData } = await supabase.auth.getUser();
    const userId = userData?.user?.id;
    if (!userId) return json({ error: "unauthorized" }, 401);

    // Pertença ao workspace (fail-closed).
    const { data: membership } = await supabase
      .from("workspace_members")
      .select("workspace_id")
      .eq("workspace_id", workspaceId)
      .eq("user_id", userId)
      .maybeSingle();
    if (!membership) return json({ error: "forbidden" }, 403);

    if (action === "recompute") {
      return json({ ok: true, ...(await recompute(supabase, workspaceId)) });
    }

    if (action === "fix") {
      const fixes = Array.isArray(body?.fixes)
        ? (body.fixes as string[]).filter((f): f is GateFixCode => (ALLOWED_FIXES as string[]).includes(f))
        : [];
      if (!fixes.length) return json({ error: "no_fixes_selected" }, 400);

      const defaults: GateFixDefaults = {
        currency: String(body?.defaults?.currency || DEFAULT_GATE_FIX_DEFAULTS.currency).slice(0, 3),
        language: String(body?.defaults?.language || DEFAULT_GATE_FIX_DEFAULTS.language).slice(0, 5),
        country: String(body?.defaults?.country || DEFAULT_GATE_FIX_DEFAULTS.country).slice(0, 2),
      };
      const targetIds: string[] | null = Array.isArray(body?.productIds)
        ? (body.productIds as string[]).filter((id) => UUID.test(String(id)))
        : null;

      const { rows } = await loadRows(supabase, workspaceId);
      const scoped = targetIds?.length ? rows.filter((r) => targetIds.includes(r.product.id)) : rows;

      let fixedProducts = 0;
      const appliedCount: Record<string, number> = {};

      for (const row of scoped) {
        const plan = buildGateFixPlan(row.product, row.ai, fixes, defaults);
        if (!plan) continue;

        if (Object.keys(plan.productPatch).length) {
          const { error } = await supabase
            .from("products")
            .update(plan.productPatch as never)
            .eq("id", plan.productId)
            .eq("workspace_id", workspaceId);
          if (error) continue;
        }
        if (Object.keys(plan.aiPatch).length) {
          const { error } = await supabase.from("product_ai_commerce").upsert(
            {
              workspace_id: workspaceId,
              product_id: plan.productId,
              ai_commerce_enabled: row.ai?.ai_commerce_enabled ?? false,
              ...plan.aiPatch,
            } as never,
            { onConflict: "product_id" },
          );
          if (error) continue;
        }
        fixedProducts += 1;
        for (const code of plan.applied) appliedCount[code] = (appliedCount[code] || 0) + 1;
      }

      const result = await recompute(supabase, workspaceId);
      return json({ ok: true, fixed: fixedProducts, applied: appliedCount, ...result });
    }

    if (action === "unpublish_blocked") {
      const { rows } = await loadRows(supabase, workspaceId);
      const ids = rows
        .filter((r) => r.product.ai_commerce_gate_blocked === true && r.product.store_published === true)
        .map((r) => r.product.id);
      if (ids.length) {
        for (let i = 0; i < ids.length; i += 200) {
          const { error } = await supabase
            .from("products")
            .update({ store_published: false })
            .eq("workspace_id", workspaceId)
            .in("id", ids.slice(i, i + 200));
          if (error) throw new Error(error.message);
        }
      }
      return json({ ok: true, unpublished: ids.length, ...(await recompute(supabase, workspaceId)) });
    }

    return json({ error: "unknown_action" }, 400);
  } catch (error) {
    // Erro tratado: nunca rebenta no cliente.
    return json({ ok: false, error: "internal_error", message: (error as Error).message }, 200);
  }
});
