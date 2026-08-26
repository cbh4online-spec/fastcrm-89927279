/**
 * Cálculos de margem e preço com tratamento correto de IVA.
 *
 * Convenções:
 * - `base_price` no produto pode estar com ou sem IVA, conforme `tax_included`.
 * - Toda a análise de margem deve ser feita sobre o **preço sem IVA (líquido)**.
 * - "Margem" = margem comercial = (PVP_sem_IVA - custo) / PVP_sem_IVA × 100
 * - "Markup" = (PVP_sem_IVA - custo) / custo × 100
 */

export interface ProductPricingInput {
  base_price?: number | null;
  direct_cost?: number | null;
  tax_included?: boolean | null;
  tax_rate_estimate_pct?: number | null;
  pvp_recommended?: number | null;
}

export const DEFAULT_VAT_RATE = 23; // PT taxa normal

/** Arredonda a 2 decimais (evita derivas de floating point). */
export function round2(value: number): number {
  if (!Number.isFinite(value)) return 0;
  return Math.round((value + Number.EPSILON) * 100) / 100;
}

/** Converte um valor com IVA em valor sem IVA. */
export function netFromGross(gross: number, vatRatePct: number): number {
  const rate = Number(vatRatePct) || 0;
  if (rate <= 0) return round2(gross);
  return round2(gross / (1 + rate / 100));
}

/** Converte um valor sem IVA em valor com IVA. */
export function grossFromNet(net: number, vatRatePct: number): number {
  const rate = Number(vatRatePct) || 0;
  if (rate <= 0) return round2(net);
  return round2(net * (1 + rate / 100));
}

/** Devolve o preço líquido (sem IVA), independentemente de `tax_included`. */
export function getNetPrice(p: ProductPricingInput): number {
  const price = Number(p.base_price) || 0;
  if (!price) return 0;
  const vat = Number(p.tax_rate_estimate_pct ?? DEFAULT_VAT_RATE) || 0;
  if (p.tax_included && vat > 0) {
    return price / (1 + vat / 100);
  }
  return price;
}

/** Devolve o preço bruto (com IVA), independentemente de `tax_included`. */
export function getGrossPrice(p: ProductPricingInput): number {
  const price = Number(p.base_price) || 0;
  if (!price) return 0;
  const vat = Number(p.tax_rate_estimate_pct ?? DEFAULT_VAT_RATE) || 0;
  if (p.tax_included || vat <= 0) return price;
  return price * (1 + vat / 100);
}

/** Margem comercial (% sobre preço de venda líquido). */
export function calcMarginPct(p: ProductPricingInput): number | null {
  const net = getNetPrice(p);
  const cost = Number(p.direct_cost) || 0;
  if (!net || cost <= 0) return null;
  return ((net - cost) / net) * 100;
}

/** Markup (% sobre o custo). */
export function calcMarkupPct(p: ProductPricingInput): number | null {
  const net = getNetPrice(p);
  const cost = Number(p.direct_cost) || 0;
  if (!net || cost <= 0) return null;
  return ((net - cost) / cost) * 100;
}

/** Lucro absoluto (€) sobre preço líquido. */
export function calcProfit(p: ProductPricingInput): number {
  const net = getNetPrice(p);
  const cost = Number(p.direct_cost) || 0;
  return net - cost;
}

/**
 * Preço recomendado (PVP sem IVA).
 * Prioridade:
 *   1. `pvp_recommended` se definido manualmente
 *   2. custo × (1 + markup recomendado/100), default markup 100%
 */
export function getRecommendedNetPrice(
  p: ProductPricingInput,
  recommendedMarkupPct = 100
): number | null {
  if (p.pvp_recommended && Number(p.pvp_recommended) > 0) {
    return Number(p.pvp_recommended);
  }
  const cost = Number(p.direct_cost) || 0;
  if (cost <= 0) return null;
  return Math.ceil(cost * (1 + recommendedMarkupPct / 100) * 100) / 100;
}

/** Preço recomendado com IVA, para apresentação. */
export function getRecommendedGrossPrice(
  p: ProductPricingInput,
  recommendedMarkupPct = 100
): number | null {
  const net = getRecommendedNetPrice(p, recommendedMarkupPct);
  if (net == null) return null;
  const vat = Number(p.tax_rate_estimate_pct ?? DEFAULT_VAT_RATE) || 0;
  return net * (1 + vat / 100);
}

/** Diferença entre preço atual e preço recomendado (líquido). Negativo = abaixo do recomendado. */
export function getRecommendedDelta(p: ProductPricingInput, recommendedMarkupPct = 100) {
  const net = getNetPrice(p);
  const rec = getRecommendedNetPrice(p, recommendedMarkupPct);
  if (rec == null || !net) return null;
  return {
    delta: net - rec,
    deltaPct: ((net - rec) / rec) * 100,
    recommended: rec,
    current: net,
  };
}
