// Cópia Deno do motor puro em src/lib/pricing/undercutPricing.ts.
// Manter as duas versões em sincronia (edge functions não podem importar "@/").

export const DEFAULT_UNDERCUT_PCT = 1;
export const DEFAULT_MIN_MARGIN_PCT = 10;
export const DEFAULT_MAX_DROP_PCT = 20;
export const DEFAULT_VAT_RATE_PCT = 23;

export type UndercutReason =
  | "applied"
  | "limited_by_margin"
  | "already_below"
  | "no_valid_reference"
  | "no_cost"
  | "excluded"
  | "price_on_request"
  | "insufficient_margin"
  | "drop_too_large";

export interface UndercutInput {
  currentPrice: number;
  competitorLowest: number | null;
  competitorRefsCount?: number | null;
  totalCost?: number | null;
  minMarginPct?: number | null;
  undercutPct?: number | null;
  maxDropPct?: number | null;
  taxIncluded?: boolean | null;
  vatRatePct?: number | null;
  priceOnRequest?: boolean | null;
  autoPriceExcluded?: boolean | null;
}

export interface UndercutResult {
  shouldApply: boolean;
  proposedPrice: number | null;
  limitedByMargin: boolean;
  reason: UndercutReason;
  marginPct: number | null;
}

function round2(value: number): number {
  return Math.round((value + Number.EPSILON) * 100) / 100;
}

function netOf(gross: number, taxIncluded: boolean, vatRatePct: number): number {
  if (!taxIncluded || vatRatePct <= 0) return gross;
  return gross / (1 + vatRatePct / 100);
}

function grossOf(net: number, taxIncluded: boolean, vatRatePct: number): number {
  if (!taxIncluded || vatRatePct <= 0) return net;
  return net * (1 + vatRatePct / 100);
}

function marginPctOf(gross: number, cost: number, taxIncluded: boolean, vatRatePct: number): number | null {
  const net = netOf(gross, taxIncluded, vatRatePct);
  if (!net || net <= 0) return null;
  return ((net - cost) / net) * 100;
}

export function computeUndercutPrice(input: UndercutInput): UndercutResult {
  const { currentPrice, competitorLowest, competitorRefsCount, totalCost, priceOnRequest, autoPriceExcluded } = input;

  const undercutPct = Number(input.undercutPct ?? DEFAULT_UNDERCUT_PCT);
  const minMarginPct = Number(input.minMarginPct ?? DEFAULT_MIN_MARGIN_PCT);
  const maxDropPct = Number(input.maxDropPct ?? DEFAULT_MAX_DROP_PCT);
  const taxIncluded = input.taxIncluded !== false;
  const vatRatePct = Number(input.vatRatePct ?? DEFAULT_VAT_RATE_PCT);

  const skip = (reason: UndercutReason): UndercutResult => ({
    shouldApply: false,
    proposedPrice: null,
    limitedByMargin: false,
    reason,
    marginPct: null,
  });

  if (autoPriceExcluded) return skip("excluded");
  if (priceOnRequest) return skip("price_on_request");
  if (!competitorLowest || competitorLowest <= 0) return skip("no_valid_reference");
  if (competitorRefsCount != null && competitorRefsCount <= 0) return skip("no_valid_reference");
  if (!currentPrice || currentPrice <= 0) return skip("no_valid_reference");

  const cost = Number(totalCost ?? 0);
  if (cost <= 0) return skip("no_cost");

  const target = round2(competitorLowest * (1 - undercutPct / 100));

  const marginFactor = 1 - minMarginPct / 100;
  if (marginFactor <= 0) return skip("insufficient_margin");
  const floorGross = round2(grossOf(cost / marginFactor, taxIncluded, vatRatePct));

  if (floorGross > competitorLowest) return skip("insufficient_margin");

  let finalPrice = target;
  let limitedByMargin = false;
  if (target < floorGross) {
    finalPrice = floorGross;
    limitedByMargin = true;
  }

  if (round2(finalPrice) >= round2(currentPrice)) {
    return {
      shouldApply: false,
      proposedPrice: round2(finalPrice),
      limitedByMargin,
      reason: "already_below",
      marginPct: marginPctOf(currentPrice, cost, taxIncluded, vatRatePct),
    };
  }

  const dropPct = ((currentPrice - finalPrice) / currentPrice) * 100;
  if (dropPct > maxDropPct) {
    return {
      shouldApply: false,
      proposedPrice: round2(finalPrice),
      limitedByMargin,
      reason: "drop_too_large",
      marginPct: marginPctOf(finalPrice, cost, taxIncluded, vatRatePct),
    };
  }

  return {
    shouldApply: true,
    proposedPrice: round2(finalPrice),
    limitedByMargin,
    reason: limitedByMargin ? "limited_by_margin" : "applied",
    marginPct: marginPctOf(finalPrice, cost, taxIncluded, vatRatePct),
  };
}

export function totalProductCost(directCost?: number | null, operationalCost?: number | null): number {
  return (Number(directCost) || 0) + (Number(operationalCost) || 0);
}
