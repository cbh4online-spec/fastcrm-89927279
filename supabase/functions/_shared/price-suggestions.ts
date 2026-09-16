/**
 * Geração e validade das sugestões de preço.
 *
 * Regras:
 * - Só contam referências de concorrência vivas (não expiradas) e com preço válido.
 * - A sugestão é sempre recalculada a partir da referência mais baixa viva.
 * - Uma sugestão só é apresentável durante 24 horas e enquanto o preço do produto não mudar.
 */

import {
  computeUndercutPrice,
  totalProductCost,
  type UndercutReason,
} from "./undercut-pricing.ts";

export const SUGGESTION_TTL_HOURS = 24;

export interface CompetitorRefLite {
  source_name?: string | null;
  price: number;
  expires_at?: string | null;
}

export interface SuggestionProduct {
  id: string;
  base_price: number;
  direct_cost?: number | null;
  operational_cost?: number | null;
  tax_included?: boolean | null;
  tax_rate_estimate_pct?: number | null;
  price_on_request?: boolean | null;
  auto_price_excluded?: boolean | null;
}

export interface SuggestionParams {
  undercutPct?: number | null;
  minMarginPct?: number | null;
  maxDropPct?: number | null;
  now?: Date;
}

export interface PriceSuggestionDraft {
  product_id: string;
  original_price: number;
  suggested_price: number;
  margin_change: number | null;
  optimization_type: "undercut" | "margin_protection";
  reasoning: string;
  status: "pending";
  expires_at: string;
  refs_count: number;
  source_name: string | null;
  limited_by_margin: boolean;
  applied: false;
}

export interface SuggestionOutcome {
  draft: PriceSuggestionDraft | null;
  reason: UndercutReason;
  refsCount: number;
  lowestPrice: number | null;
  sourceName: string | null;
}

/** Referências ainda válidas (não expiradas) e com preço utilizável. */
export function liveCompetitorRefs<T extends CompetitorRefLite>(refs: T[], now: Date = new Date()): T[] {
  return (refs || []).filter((r) => {
    if (typeof r?.price !== "number" || !Number.isFinite(r.price) || r.price <= 0) return false;
    if (!r.expires_at) return true;
    return new Date(r.expires_at).getTime() > now.getTime();
  });
}

/** Referência mais baixa entre as válidas. */
export function lowestCompetitorRef<T extends CompetitorRefLite>(refs: T[]): T | null {
  const live = refs || [];
  if (live.length === 0) return null;
  return live.reduce((min, r) => (r.price < min.price ? r : min), live[0]);
}

export function buildPriceSuggestion(
  product: SuggestionProduct,
  refs: CompetitorRefLite[],
  params: SuggestionParams = {},
): SuggestionOutcome {
  const now = params.now ?? new Date();
  const live = liveCompetitorRefs(refs, now);
  const lowest = lowestCompetitorRef(live);

  const decision = computeUndercutPrice({
    currentPrice: Number(product.base_price),
    competitorLowest: lowest ? lowest.price : null,
    competitorRefsCount: live.length,
    totalCost: totalProductCost(product.direct_cost, product.operational_cost),
    minMarginPct: params.minMarginPct,
    undercutPct: params.undercutPct,
    maxDropPct: params.maxDropPct,
    taxIncluded: product.tax_included,
    vatRatePct: product.tax_rate_estimate_pct,
    priceOnRequest: product.price_on_request,
    autoPriceExcluded: product.auto_price_excluded,
  });

  const sourceName = lowest?.source_name ?? null;
  const base = {
    reason: decision.reason,
    refsCount: live.length,
    lowestPrice: lowest ? lowest.price : null,
    sourceName,
  };

  if (!decision.shouldApply || decision.proposedPrice == null || !lowest) {
    return { draft: null, ...base };
  }

  const undercutPct = Number(params.undercutPct ?? 1);
  const reasoning = decision.limitedByMargin
    ? `Limitado pela margem mínima. Referência mais baixa: ${sourceName ?? "loja externa"} €${lowest.price.toFixed(2)} (${live.length} referência(s)).`
    : `${undercutPct}% abaixo de ${sourceName ?? "loja externa"} (€${lowest.price.toFixed(2)}), com ${live.length} referência(s).`;

  return {
    ...base,
    draft: {
      product_id: product.id,
      original_price: Number(product.base_price),
      suggested_price: decision.proposedPrice,
      margin_change: decision.marginPct,
      optimization_type: decision.limitedByMargin ? "margin_protection" : "undercut",
      reasoning,
      status: "pending",
      expires_at: new Date(now.getTime() + SUGGESTION_TTL_HOURS * 3600 * 1000).toISOString(),
      refs_count: live.length,
      source_name: sourceName,
      limited_by_margin: decision.limitedByMargin,
      applied: false,
    },
  };
}

/** Uma sugestão só é mostrada se estiver dentro da validade e ainda descer o preço atual. */
export function isSuggestionShowable(
  suggestion: { status?: string | null; expires_at?: string | null; original_price: number; suggested_price: number },
  currentPrice: number | null | undefined,
  now: Date = new Date(),
): boolean {
  if (suggestion.status && suggestion.status !== "pending") return false;
  if (!suggestion.expires_at) return false;
  if (new Date(suggestion.expires_at).getTime() <= now.getTime()) return false;
  if (currentPrice == null) return false;
  if (Math.abs(Number(suggestion.original_price) - Number(currentPrice)) > 0.005) return false;
  return Number(suggestion.suggested_price) < Number(currentPrice) - 0.005;
}
