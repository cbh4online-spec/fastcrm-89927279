import { logAIUsage } from '../_shared/ai-instrumentation.ts';
import { createClient } from "@supabase/supabase-js";
import {
  computeUndercutPrice,
  totalProductCost,
  DEFAULT_MAX_DROP_PCT,
  DEFAULT_MIN_MARGIN_PCT,
  DEFAULT_UNDERCUT_PCT,
} from "../_shared/undercut-pricing.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

/** Máximo de produtos analisados por execução (trabalho limitado por corrida). */
const BATCH_SIZE = 25;
/** Duração do bloqueio de execução, evita corridas sobrepostas. */
const LOCK_MINUTES = 20;

const pricePatterns = [
  /€\s*(\d+[.,]\d{2})/g,
  /(\d+[.,]\d{2})\s*€/g,
  /EUR\s*(\d+[.,]\d{2})/g,
];

function extractPricesFiltered(text: string, minPrice: number, maxPrice: number): number[] {
  const prices: number[] = [];
  for (const regex of pricePatterns) {
    regex.lastIndex = 0;
    for (const match of text.matchAll(regex)) {
      const price = parseFloat(match[1].replace(",", "."));
      if (price >= minPrice && price <= maxPrice) prices.push(price);
    }
  }
  return prices;
}

function extractSourceName(url: string): string {
  try {
    const hostname = new URL(url).hostname.replace("www.", "");
    if (hostname.includes("kuantokusta")) return "KuantoKusta";
    if (hostname.includes("google")) return "Google Shopping";
    const name = hostname.split(".")[0];
    return name.charAt(0).toUpperCase() + name.slice(1);
  } catch {
    return "Desconhecido";
  }
}

interface AIValidation {
  is_match: boolean;
  price: number | null;
  store_name: string;
}

class AIBlockedError extends Error {
  constructor(public status: number) {
    super(`AI gateway blocked with status ${status}`);
  }
}

async function validateWithAI(
  lovableKey: string,
  workspaceId: string | null,
  productName: string,
  productSku: string | null,
  basePrice: number,
  resultUrl: string,
  resultText: string,
): Promise<AIValidation | null> {
  const snippet = resultText.slice(0, 2000);
  const resp = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${lovableKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: "google/gemini-3.1-flash-lite",
      messages: [
        {
          role: "system",
          content:
            "És um validador de preços. Analisa se o resultado de pesquisa é sobre o MESMO produto específico e extrai o preço de venda. Responde APENAS em JSON válido.",
        },
        {
          role: "user",
          content: `Produto procurado: "${productName}"${productSku ? ` (SKU: ${productSku})` : ""}
Preço de referência: €${basePrice.toFixed(2)}
URL do resultado: ${resultUrl}

Texto do resultado:
${snippet}

Verifica:
1. Este resultado é sobre o MESMO produto específico (não um acessório, peça, produto similar ou categoria)?
2. Se sim, qual o preço de venda atual (não portes, não preço de acessórios)?

Responde em JSON:
{"is_match": true/false, "price": 123.45 ou null, "store_name": "Nome da Loja"}`,
        },
      ],
      temperature: 0.1,
    }),
  });

  // Disjuntor: falta de crédito ou bloqueio de política para toda a execução.
  if (resp.status === 402 || resp.status === 403) {
    await resp.text().catch(() => "");
    throw new AIBlockedError(resp.status);
  }

  if (!resp.ok) return null;

  try {
    const data = await resp.json();
    try {
      logAIUsage({
        workspace_id: workspaceId ?? undefined,
        feature: "auto-price-monitor",
        model: "google/gemini-3.1-flash-lite",
        tokens_input: data?.usage?.prompt_tokens ?? 0,
        tokens_output: data?.usage?.completion_tokens ?? 0,
      });
    } catch (_e) { /* logging never blocks */ }

    const content = data.choices?.[0]?.message?.content || "";
    const jsonMatch = content.match(/\{[\s\S]*?\}/);
    if (!jsonMatch) return null;
    const parsed = JSON.parse(jsonMatch[0]);
    return {
      is_match: !!parsed.is_match,
      price: typeof parsed.price === "number" ? parsed.price : null,
      store_name: parsed.store_name || "Desconhecido",
    };
  } catch {
    return null;
  }
}

async function searchFirecrawl(
  apiKey: string,
  query: string,
  limit: number,
): Promise<Array<{ url: string; markdown?: string; description?: string }>> {
  try {
    const response = await fetch("https://api.firecrawl.dev/v1/search", {
      method: "POST",
      headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({ query, limit, lang: "pt", country: "PT" }),
    });
    if (!response.ok) return [];
    const data = await response.json();
    return data.data || [];
  } catch {
    return [];
  }
}

interface AutoPriceSettings {
  workspace_id: string;
  enabled: boolean;
  undercut_pct: number;
  max_drop_pct: number;
  default_min_margin_pct: number;
  paused_reason: string | null;
  lock_until: string | null;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const firecrawlKey = Deno.env.get("FIRECRAWL_API_KEY");
    const lovableKey = Deno.env.get("LOVABLE_API_KEY");

    if (!firecrawlKey) {
      return new Response(
        JSON.stringify({ success: false, error: "FIRECRAWL_API_KEY not configured" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const supabase = createClient(supabaseUrl, supabaseKey);
    const nowIso = new Date().toISOString();

    // 1. Espaços de trabalho com ajuste automático ligado e sem pausa.
    const { data: settingsRows, error: settingsError } = await supabase
      .from("store_auto_price_settings")
      .select("workspace_id, enabled, undercut_pct, max_drop_pct, default_min_margin_pct, paused_reason, lock_until")
      .eq("enabled", true)
      .is("paused_reason", null);

    if (settingsError) throw settingsError;

    const active = ((settingsRows || []) as AutoPriceSettings[]).filter(
      (s) => !s.lock_until || s.lock_until < nowIso,
    );

    if (active.length === 0) {
      return new Response(
        JSON.stringify({ success: true, message: "Sem espaços de trabalho elegíveis", processed: 0, applied: 0 }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    let processed = 0;
    let applied = 0;
    let skipped = 0;
    const pausedWorkspaces: string[] = [];

    for (const settings of active) {
      // Bloqueio de execução (single-flight) por espaço de trabalho.
      const lockUntil = new Date(Date.now() + LOCK_MINUTES * 60 * 1000).toISOString();
      const { data: locked } = await supabase
        .from("store_auto_price_settings")
        .update({ lock_until: lockUntil, last_run_at: nowIso, updated_at: nowIso })
        .eq("workspace_id", settings.workspace_id)
        .or(`lock_until.is.null,lock_until.lt.${nowIso}`)
        .select("workspace_id");

      if (!locked || locked.length === 0) continue;

      const undercutPct = Number(settings.undercut_pct ?? DEFAULT_UNDERCUT_PCT);
      const maxDropPct = Number(settings.max_drop_pct ?? DEFAULT_MAX_DROP_PCT);
      const fallbackMinMargin = Number(settings.default_min_margin_pct ?? DEFAULT_MIN_MARGIN_PCT);

      // Regras de margem mínima do espaço de trabalho.
      const { data: rules } = await supabase
        .from("product_pricing_rules")
        .select("applies_to, category, product_id, min_margin_pct")
        .eq("workspace_id", settings.workspace_id)
        .eq("is_active", true);

      const minMarginFor = (productId: string, category: string | null): number => {
        const list = rules || [];
        const byProduct = list.find((r: any) => r.applies_to === "product" && r.product_id === productId);
        if (byProduct) return Number(byProduct.min_margin_pct);
        const byCategory = category
          ? list.find((r: any) => r.applies_to === "category" && r.category === category)
          : undefined;
        if (byCategory) return Number(byCategory.min_margin_pct);
        const forAll = list.find((r: any) => r.applies_to === "all");
        if (forAll) return Number(forAll.min_margin_pct);
        return fallbackMinMargin;
      };

      const { data: products, error: prodError } = await supabase
        .from("products")
        .select(
          "id, name, sku, category, base_price, currency, workspace_id, competitor_price_low, direct_cost, operational_cost, tax_included, tax_rate_estimate_pct, price_on_request, auto_price_excluded",
        )
        .eq("workspace_id", settings.workspace_id)
        .eq("store_published", true)
        .eq("status", "active")
        .eq("auto_price_excluded", false)
        .order("competitor_checked_at", { ascending: true, nullsFirst: true })
        .limit(BATCH_SIZE);

      if (prodError) throw prodError;

      let aiBlocked = false;

      for (const product of products || []) {
        try {
          const minPrice = product.base_price * 0.3;
          const maxPrice = product.base_price * 3;
          const searchName = product.sku ? `"${product.sku}" ${product.name}` : product.name;

          const [kkResults, generalResults] = await Promise.all([
            searchFirecrawl(firecrawlKey, `site:kuantokusta.pt ${searchName}`, 5),
            searchFirecrawl(firecrawlKey, `${searchName} preço comprar portugal`, 5),
          ]);

          const allResults = [...kkResults, ...generalResults];
          const seenUrls = new Set<string>();
          const externalPrices: { source_name: string; source_url: string; price: number }[] = [];

          for (const result of allResults) {
            if (!result.url || seenUrls.has(result.url)) continue;
            seenUrls.add(result.url);
            const text = result.markdown || result.description || "";

            if (lovableKey) {
              const validation = await validateWithAI(
                lovableKey,
                product.workspace_id ?? null,
                product.name,
                product.sku || null,
                product.base_price,
                result.url,
                text,
              );

              if (validation) {
                if (validation.is_match && validation.price !== null) {
                  if (validation.price >= minPrice && validation.price <= maxPrice) {
                    externalPrices.push({
                      source_name: validation.store_name || extractSourceName(result.url),
                      source_url: result.url,
                      price: validation.price,
                    });
                  }
                }
                continue;
              }
            }

            // Recurso: leitura por texto, com intervalo estrito.
            const prices = extractPricesFiltered(text, minPrice, maxPrice);
            if (prices.length > 0) {
              const closest = prices.reduce((best, p) =>
                Math.abs(p - product.base_price) < Math.abs(best - product.base_price) ? p : best,
              );
              externalPrices.push({
                source_name: extractSourceName(result.url),
                source_url: result.url,
                price: closest,
              });
            }
          }

          const checkedAt = new Date().toISOString();

          await supabase.from("product_external_prices").delete().eq("product_id", product.id);

          if (externalPrices.length === 0) {
            // Sem referências válidas: não mantemos valores antigos.
            await supabase
              .from("products")
              .update({
                competitor_price_low: null,
                competitor_source: null,
                competitor_refs_count: 0,
                competitor_checked_at: checkedAt,
              })
              .eq("id", product.id);
            processed++;
            skipped++;
            await new Promise((r) => setTimeout(r, 1000));
            continue;
          }

          const expiresAt = new Date(Date.now() + 8 * 60 * 60 * 1000).toISOString();
          await supabase.from("product_external_prices").insert(
            externalPrices.map((ep) => ({
              product_id: product.id,
              workspace_id: product.workspace_id,
              source_name: ep.source_name,
              source_url: ep.source_url,
              price: ep.price,
              currency: product.currency || "EUR",
              expires_at: expiresAt,
            })),
          );

          const lowest = externalPrices.reduce(
            (min, ep) => (ep.price < min.price ? ep : min),
            externalPrices[0],
          );

          await supabase
            .from("products")
            .update({
              competitor_price_low: lowest.price,
              competitor_source: lowest.source_name,
              competitor_refs_count: externalPrices.length,
              competitor_checked_at: checkedAt,
            })
            .eq("id", product.id);

          // 2. Preço 1% abaixo da concorrência, protegido pela margem mínima.
          const decision = computeUndercutPrice({
            currentPrice: Number(product.base_price),
            competitorLowest: lowest.price,
            competitorRefsCount: externalPrices.length,
            totalCost: totalProductCost(product.direct_cost, product.operational_cost),
            minMarginPct: minMarginFor(product.id, product.category ?? null),
            undercutPct,
            maxDropPct,
            taxIncluded: product.tax_included,
            vatRatePct: product.tax_rate_estimate_pct,
            priceOnRequest: product.price_on_request,
            autoPriceExcluded: product.auto_price_excluded,
          });

          if (decision.shouldApply && decision.proposedPrice) {
            const oldPrice = Number(product.base_price);
            const { error: updateError } = await supabase
              .from("products")
              .update({ base_price: decision.proposedPrice })
              .eq("id", product.id);

            if (!updateError) {
              await supabase.from("product_price_history").insert({
                product_id: product.id,
                workspace_id: product.workspace_id,
                price: decision.proposedPrice,
                old_price: oldPrice,
                new_price: decision.proposedPrice,
                currency: product.currency || "EUR",
                change_type: "auto_undercut",
                reason: decision.limitedByMargin
                  ? `Limitado pela margem mínima (concorrente ${lowest.source_name} €${lowest.price.toFixed(2)})`
                  : `${undercutPct}% abaixo de ${lowest.source_name} (€${lowest.price.toFixed(2)})`,
              });

              await supabase.from("price_optimization_logs").insert({
                workspace_id: product.workspace_id,
                product_id: product.id,
                original_price: oldPrice,
                suggested_price: decision.proposedPrice,
                margin_change: decision.marginPct,
                optimization_type: decision.limitedByMargin ? "margin_protection" : "undercut",
                reasoning: `Ajuste automático: ${undercutPct}% abaixo de ${lowest.source_name} (€${lowest.price.toFixed(2)}), com ${externalPrices.length} referência(s).${decision.limitedByMargin ? " Limitado pela margem mínima." : ""}`,
                applied: true,
                applied_at: checkedAt,
              });

              applied++;
            }
          } else {
            skipped++;
          }

          processed++;
          await new Promise((r) => setTimeout(r, 1000));
        } catch (err) {
          if (err instanceof AIBlockedError) {
            aiBlocked = true;
            await supabase
              .from("store_auto_price_settings")
              .update({
                paused_reason:
                  err.status === 402
                    ? "Créditos de IA esgotados — o ajuste automático ficou em pausa."
                    : "Utilização de IA bloqueada — o ajuste automático ficou em pausa.",
                lock_until: null,
                updated_at: new Date().toISOString(),
              })
              .eq("workspace_id", settings.workspace_id);
            pausedWorkspaces.push(settings.workspace_id);
            break;
          }
          console.error(`Error processing product ${product.name}:`, err);
        }
      }

      if (!aiBlocked) {
        await supabase
          .from("store_auto_price_settings")
          .update({ lock_until: null, updated_at: new Date().toISOString() })
          .eq("workspace_id", settings.workspace_id);
      }
    }

    console.log(`Done: ${processed} processed, ${applied} applied, ${skipped} skipped`);

    return new Response(
      JSON.stringify({ success: true, processed, applied, skipped, paused: pausedWorkspaces }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (error) {
    console.error("Auto price monitor error:", error);
    return new Response(
      JSON.stringify({ success: false, error: error instanceof Error ? error.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});
