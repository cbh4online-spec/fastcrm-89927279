/**
 * Regra única de stock vendável da loja (espelhada em
 * supabase/functions/_shared/store-pricing.ts — manter em paridade).
 *
 * - track_stock desligado → sem limite de quantidade (só bloqueia esgotado/despublicado).
 * - track_stock ligado com stock_quantity numérico → disponível = quantidade − reservado.
 * - track_stock ligado sem quantidade registada → sem limite (sob encomenda).
 */
export interface StockFacts {
  track_stock?: boolean | null;
  stock_quantity?: number | null;
  stock_reserved?: number | null;
  stock_status?: string | null;
}

export const MAX_LINE_QUANTITY = 999;

export function availableToSell(p: StockFacts): number | null {
  if (!p.track_stock) return null;
  if (typeof p.stock_quantity !== "number") return null;
  const reserved = typeof p.stock_reserved === "number" && p.stock_reserved > 0 ? p.stock_reserved : 0;
  return Math.max(0, Math.floor(p.stock_quantity - reserved));
}

export type LineStockResult =
  | { ok: true }
  | { ok: false; reason: "out_of_stock" | "insufficient_stock"; available: number };

export function evaluateLineStock(p: StockFacts, requested: number): LineStockResult {
  if (p.stock_status === "out_of_stock") return { ok: false, reason: "out_of_stock", available: 0 };
  const available = availableToSell(p);
  if (available === null) return { ok: true };
  if (available <= 0) return { ok: false, reason: "out_of_stock", available: 0 };
  if (requested > available) return { ok: false, reason: "insufficient_stock", available };
  return { ok: true };
}

/** Soma linhas repetidas do mesmo produto para não contornar o limite. */
export function aggregateQuantities(items: Array<{ productId: string; quantity: number }>): Map<string, number> {
  const map = new Map<string, number>();
  for (const i of items) map.set(i.productId, (map.get(i.productId) ?? 0) + i.quantity);
  return map;
}
