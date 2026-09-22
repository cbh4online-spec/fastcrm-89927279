/**
 * commerce-api — API pública controlada do catálogo (AI Commerce).
 *
 * Rotas (todas GET):
 *   /commerce-api/products?workspace=<slug|uuid>
 *   /commerce-api/products/{slug}
 *   /commerce-api/products/{slug}/variants
 *   /commerce-api/categories
 *   /commerce-api/feed?token=<public_token>   (ou ?workspace=&channel=)
 *
 * Só devolve produtos ativos, publicados na loja e com AI Commerce ativo.
 * Nunca expõe custos, margens, fornecedores nem stock exato.
 */
import { createClient } from "npm:@supabase/supabase-js@2";
import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";
import { buildFeed, type FeedContext } from "../_shared/ai-commerce/feeds.ts";
import type { CommerceProduct, FeedChannel, ProductAICommerce } from "../_shared/ai-commerce/types.ts";
import { productPublicUrl } from "../_shared/ai-commerce/schemaOrg.ts";
import { effectivePrice, priceRange } from "../_shared/ai-commerce/readiness.ts";

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const SLUG_RE = /^[a-z0-9][a-z0-9-_]{0,120}$/i;
const MAX_PAGE_SIZE = 100;
const RATE_LIMIT_MAX = 120;
const RATE_LIMIT_WINDOW_MS = 60_000;

const PRODUCT_COLUMNS = [
  "id",
  "name",
  "sku",
  "brand",
  "manufacturer",
  "gtin",
  "mpn",
  "store_slug",
  "category",
  "subcategory",
  "product_type",
  "schema_type",
  "short_description",
  "commercial_description",
  "base_price",
  "compare_at_price",
  "currency",
  "tax_included",
  "tax_class",
  "activation_fee",
  "setup_fee",
  "recurring_fee",
  "billing_type",
  "billing_frequency",
  "stock_status",
  "status",
  "store_published",
  "images",
  "primary_image_index",
  "seo_title",
  "seo_description",
  "canonical_url",
  "checkout_url",
  "target_audience",
  "problem_solved",
  "use_cases",
  "main_benefits",
  "benefits",
  "features",
  "countries",
  "languages",
  "product_condition",
  "origin_country",
  "weight",
  "weight_gross",
  "weight_net",
  "target_margin_pct",
].join(", ");

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json; charset=utf-8", "Cache-Control": "public, max-age=300" },
  });
}

function admin() {
  return createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!, {
    auth: { persistSession: false },
  });
}

function clientIp(req: Request): string {
  return (
    req.headers.get("cf-connecting-ip") ||
    req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    "unknown"
  );
}

async function resolveWorkspace(
  supabase: ReturnType<typeof admin>,
  param: string | null,
): Promise<{ workspaceId: string; slug: string } | null> {
  if (!param) return null;
  if (UUID_RE.test(param)) return { workspaceId: param, slug: param };
  if (!SLUG_RE.test(param)) return null;
  const { data } = await supabase
    .from("store_settings")
    .select("workspace_id, store_slug")
    .eq("store_slug", param)
    .maybeSingle();
  if (data?.workspace_id) return { workspaceId: data.workspace_id, slug: data.store_slug || param };
  const { data: ws } = await supabase.from("workspaces").select("id, slug").eq("slug", param).maybeSingle();
  if (ws?.id) return { workspaceId: ws.id, slug: ws.slug || param };
  return null;
}

interface AiRow extends Partial<ProductAICommerce> {
  product_id: string;
}

interface VariantRow {
  id: string;
  product_id: string;
  name: string | null;
  sku: string | null;
  price_override: number | null;
  stock_quantity: number | null;
  is_active: boolean | null;
  attributes: Record<string, string> | null;
}

async function loadPublishedProducts(
  supabase: ReturnType<typeof admin>,
  workspaceId: string,
  opts: {
    slug?: string;
    category?: string | null;
    brand?: string | null;
    availability?: string | null;
    language?: string | null;
    country?: string | null;
    limit?: number;
    offset?: number;
  },
): Promise<{ rows: { product: CommerceProduct; ai: Partial<ProductAICommerce> | null }[]; total: number }> {
  // Junção no servidor: evita listas `in(...)` gigantes no URL (HTTP 400).
  let query = supabase
    .from("products")
    .select(`${PRODUCT_COLUMNS}, product_ai_commerce!inner(*)`, { count: "exact" })
    .eq("workspace_id", workspaceId)
    .eq("store_published", true)
    .eq("status", "active")
    .eq("ai_commerce_gate_blocked", false)
    .eq("product_ai_commerce.workspace_id", workspaceId)
    .eq("product_ai_commerce.ai_commerce_enabled", true);

  if (opts.slug) query = query.eq("store_slug", opts.slug);
  if (opts.category) query = query.eq("category", opts.category);
  if (opts.brand) query = query.eq("brand", opts.brand);
  if (opts.availability) query = query.eq("stock_status", opts.availability);
  if (opts.language) query = query.contains("languages", [opts.language]);
  if (opts.country) query = query.contains("countries", [opts.country]);

  const limit = Math.min(opts.limit ?? 50, MAX_PAGE_SIZE);
  const offset = Math.max(opts.offset ?? 0, 0);
  query = query.order("name", { ascending: true }).range(offset, offset + limit - 1);

  const { data, count, error } = await query;
  if (error) throw new Error(error.message);

  const joined = (data || []) as unknown as (CommerceProduct & { product_ai_commerce?: AiRow | AiRow[] | null })[];
  if (!joined.length) return { rows: [], total: count ?? 0 };

  const aiByProduct = new Map<string, AiRow>();
  const products: CommerceProduct[] = joined.map((row) => {
    const { product_ai_commerce, ...product } = row;
    const ai = Array.isArray(product_ai_commerce) ? product_ai_commerce[0] : product_ai_commerce;
    if (ai) aiByProduct.set((product as CommerceProduct).id, ai);
    return product as CommerceProduct;
  });

  // Variantes ativas: fonte do preço mínimo e das opções expostas.
  const variantsByProduct = new Map<string, VariantRow[]>();
  if (products.length) {
    const { data: variants } = await supabase
      .from("product_variants")
      .select("id, product_id, name, sku, price_override, stock_quantity, is_active, attributes, sort_order")
      .in("product_id", products.map((p) => p.id))
      .eq("is_active", true)
      .order("sort_order");
    for (const v of (variants || []) as unknown as VariantRow[]) {
      const list = variantsByProduct.get(v.product_id) || [];
      list.push(v);
      variantsByProduct.set(v.product_id, list);
    }
  }

  const rows = products.map((p) => ({
    product: { ...p, variants: variantsByProduct.get(p.id) ?? [] } as CommerceProduct,
    ai: aiByProduct.get(p.id) ?? null,
  }));
  return { rows, total: count ?? rows.length };
}

function publicProduct(
  product: CommerceProduct,
  ai: Partial<ProductAICommerce> | null,
  ctx: { baseUrl: string; workspaceSlug: string },
) {
  const url = productPublicUrl(product, ctx);
  return {
    id: product.id,
    sku: product.sku,
    gtin: product.gtin ?? null,
    mpn: product.mpn ?? null,
    slug: product.store_slug,
    name: ai?.ai_title || product.name,
    brand: product.brand || product.manufacturer || null,
    product_type: product.product_type,
    schema_type: product.schema_type,
    category: ai?.ai_category || product.category,
    subcategory: product.subcategory ?? null,
    short_description: ai?.ai_short_description || product.short_description,
    long_description: ai?.ai_long_description || product.commercial_description || null,
    price: effectivePrice(product) ?? product.base_price,
    price_min: priceRange(product)?.min ?? null,
    price_max: priceRange(product)?.max ?? null,
    regular_price: product.compare_at_price ?? null,
    currency: product.currency || "EUR",
    tax_included: product.tax_included ?? null,
    activation_fee: product.activation_fee ?? product.setup_fee ?? null,
    billing_period: product.billing_frequency ?? null,
    availability: product.stock_status,
    main_image: (product.images || [])[product.primary_image_index ?? 0] || (product.images || [])[0] || null,
    gallery: product.images || [],
    product_url: url,
    canonical_url: product.canonical_url || url,
    checkout_url: product.checkout_url || url,
    seo_title: product.seo_title ?? null,
    seo_description: product.seo_description ?? null,
    target_audience: ai?.ai_target_audience || product.target_audience || null,
    problem_solved: ai?.ai_problem_solved || product.problem_solved || null,
    use_cases: ai?.ai_use_cases?.length ? ai.ai_use_cases : product.use_cases || [],
    main_benefits: product.main_benefits?.length ? product.main_benefits : product.benefits || [],
    features: ai?.ai_key_features?.length ? ai.ai_key_features : product.features || [],
    faq: ai?.ai_faq || [],
    keywords: ai?.ai_keywords || [],
    recommendation_context: ai?.ai_recommendation_context || null,
    exclusions: ai?.ai_exclusions || null,
    countries: product.countries || [],
    languages: product.languages || [],
    condition: product.product_condition || null,
    origin_country: product.origin_country || null,
    variants: (product.variants || []).map((v) => ({
      id: v.id,
      name: v.name,
      sku: v.sku,
      price: v.price_override ?? product.base_price,
      currency: product.currency || "EUR",
      attributes: v.attributes ?? {},
    })),
  };
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "GET") return json({ error: "method_not_allowed" }, 405);

  const supabase = admin();
  const url = new URL(req.url);
  const rawParts = url.pathname.replace(/^\/+/, "").split("/").filter(Boolean);
  // rawParts[0] === "commerce-api"; o segmento de versão é opcional (/v1).
  const versioned = /^v\d+$/i.test(rawParts[1] || "");
  const apiVersion = versioned ? rawParts[1].toLowerCase() : "v1";
  if (versioned && apiVersion !== "v1") {
    return json({ error: "unsupported_version", supported: ["v1"] }, 404);
  }
  const parts = versioned ? [rawParts[0], ...rawParts.slice(2)] : rawParts;
  const route = parts[1] || "";
  const baseUrl = Deno.env.get("PUBLIC_SITE_URL") || url.origin.replace("supabase.co", "lovable.app");

  try {
    // `check_rate_limit` devolve TRUE quando o limite foi excedido.
    const { data: isLimited, error: rlError } = await supabase.rpc("check_rate_limit", {
      p_key: `commerce-api:${clientIp(req)}`,
      p_max_requests: RATE_LIMIT_MAX,
      p_window_ms: RATE_LIMIT_WINDOW_MS,
    });
    if (!rlError && isLimited === true) {
      return json({ error: "rate_limited", message: "Demasiados pedidos. Tente novamente em breve." }, 429);
    }

    // ---------- FEED ----------
    if (route === "feed") {
      const token = url.searchParams.get("token");
      let feed: Record<string, unknown> | null = null;

      if (token) {
        if (!/^[a-f0-9]{16,64}$/i.test(token)) return json({ error: "invalid_token" }, 400);
        const { data } = await supabase.from("commerce_feeds").select("*").eq("public_token", token).maybeSingle();
        feed = data;
        if (!feed || feed.is_active !== true) return json({ error: "feed_not_found" }, 404);
      } else {
        const ws = await resolveWorkspace(supabase, url.searchParams.get("workspace"));
        const channel = (url.searchParams.get("channel") || "json") as FeedChannel;
        if (!ws) return json({ error: "workspace_not_found" }, 404);
        feed = { workspace_id: ws.workspaceId, channel, language: null, country: null, id: null, filters: {} };
      }

      const workspaceId = String(feed.workspace_id);
      const wsInfo = await resolveWorkspace(supabase, workspaceId);
      const { data: settings } = await supabase
        .from("store_settings")
        .select("store_slug")
        .eq("workspace_id", workspaceId)
        .maybeSingle();
      const workspaceSlug = settings?.store_slug || wsInfo?.slug || workspaceId;

      const { rows } = await loadPublishedProducts(supabase, workspaceId, {
        language: (feed.language as string) || null,
        country: (feed.country as string) || null,
        limit: MAX_PAGE_SIZE,
      });

      const ctx: FeedContext = {
        baseUrl,
        workspaceSlug,
        language: (feed.language as string) || null,
        country: (feed.country as string) || null,
      };
      const started = Date.now();
      const result = buildFeed(feed.channel as FeedChannel, rows, ctx);

      // Um feed sem produtos válidos NUNCA substitui a última versão válida:
      // é registado como erro e não é servido.
      const hasValidOutput = result.productCount > 0;
      const status = hasValidOutput ? (result.errors.length ? "partial" : "success") : "error";
      const version = Number(feed.version ?? 1);

      if (feed.id) {
        await supabase.from("commerce_feed_runs").insert({
          workspace_id: workspaceId,
          feed_id: feed.id,
          status,
          product_count: result.productCount,
          valid_count: result.productCount,
          rejected_count: result.rejectedCount,
          feed_version: hasValidOutput ? version + 1 : version,
          served: hasValidOutput,
          errors: result.errors,
          warnings: result.warnings,
          duration_ms: Date.now() - started,
        });

        const patch: Record<string, unknown> = {
          last_generated_at: new Date().toISOString(),
          last_status: status,
          last_error_count: result.errors.length,
          last_warning_count: result.warnings.length,
          last_error_message: result.summary || null,
        };
        if (hasValidOutput) {
          patch.version = version + 1;
          patch.last_product_count = result.productCount;
          patch.last_valid_generated_at = new Date().toISOString();
          patch.last_valid_version = version + 1;
        }
        await supabase.from("commerce_feeds").update(patch).eq("id", feed.id).eq("workspace_id", workspaceId);
      }

      if (!hasValidOutput) {
        return json(
          {
            error: "feed_invalid",
            message: "Nenhum produto passou a validação do canal. A última versão válida foi preservada.",
            details: result.summary,
            rejected_count: result.rejectedCount,
          },
          422,
        );
      }

      return new Response(result.body, {
        headers: {
          ...corsHeaders,
          "Content-Type": result.contentType,
          "Cache-Control": "public, max-age=900",
          "X-Feed-Version": String(version + 1),
        },
      });
    }

    const workspaceParam = url.searchParams.get("workspace");
    if (!workspaceParam) {
      return json({ error: "workspace_required", message: "Indique ?workspace=<slug>" }, 400);
    }
    const ws = await resolveWorkspace(supabase, workspaceParam);
    if (!ws) return json({ error: "workspace_not_found", message: "Loja não encontrada." }, 404);

    // ---------- CATEGORIES ----------
    if (route === "categories") {
      const { rows } = await loadPublishedProducts(supabase, ws.workspaceId, { limit: MAX_PAGE_SIZE });
      const counts = new Map<string, number>();
      for (const { product, ai } of rows) {
        const key = (ai?.ai_category || product.category || "").trim();
        if (key) counts.set(key, (counts.get(key) || 0) + 1);
      }
      return json({
        data: Array.from(counts.entries()).map(([name, product_count]) => ({ name, product_count })),
      });
    }

    // ---------- PRODUCTS ----------
    if (route === "products") {
      const slug = parts[2] ? decodeURIComponent(parts[2]) : null;
      const sub = parts[3] || null;

      if (slug) {
        if (!SLUG_RE.test(slug) && !UUID_RE.test(slug)) return json({ error: "invalid_slug" }, 400);
        const { rows } = await loadPublishedProducts(supabase, ws.workspaceId, { slug, limit: 1 });
        const row = rows[0];
        if (!row) return json({ error: "not_found" }, 404);

        if (sub === "variants") {
          const { data: variants } = await supabase
            .from("product_variants")
            .select("id, name, sku, price_override, attributes, is_active, sort_order")
            .eq("product_id", row.product.id)
            .eq("is_active", true)
            .order("sort_order");
          return json({
            data: (variants || []).map((v) => ({
              id: v.id,
              name: v.name,
              sku: v.sku,
              price: v.price_override ?? row.product.base_price,
              currency: row.product.currency || "EUR",
              attributes: v.attributes,
            })),
          });
        }
        if (sub) return json({ error: "not_found" }, 404);

        return json({
          data: publicProduct(row.product, row.ai, { baseUrl, workspaceSlug: ws.slug }),
        });
      }

      const page = Math.max(parseInt(url.searchParams.get("page") || "1", 10) || 1, 1);
      const perPage = Math.min(Math.max(parseInt(url.searchParams.get("per_page") || "25", 10) || 25, 1), MAX_PAGE_SIZE);
      const { rows, total } = await loadPublishedProducts(supabase, ws.workspaceId, {
        category: url.searchParams.get("category"),
        brand: url.searchParams.get("brand"),
        availability: url.searchParams.get("availability"),
        language: url.searchParams.get("language"),
        country: url.searchParams.get("country"),
        limit: perPage,
        offset: (page - 1) * perPage,
      });

      return json({
        data: rows.map((r) => publicProduct(r.product, r.ai, { baseUrl, workspaceSlug: ws.slug })),
        meta: {
          api_version: apiVersion,
          page,
          per_page: perPage,
          total,
          total_pages: Math.ceil(total / perPage),
        },
      });
    }

    return json(
      {
        error: "not_found",
        api_version: apiVersion,
        routes: [
          "v1/products",
          "v1/products/{slug}",
          "v1/products/{slug}/variants",
          "v1/categories",
          "v1/feed",
        ],
      },
      404,
    );
  } catch (error) {
    console.error("[commerce-api] erro:", error instanceof Error ? error.message : error);
    return json({ error: "internal_error", message: "Não foi possível processar o pedido." }, 500);
  }
});
