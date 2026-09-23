/**
 * Motor determinístico de construção de bundles (AI Commerce).
 *
 * Princípios (não negociáveis):
 * - Nunca inventar preços, custos ou stock: só dados reais do catálogo.
 * - Só agrupa produtos com relação comercial aprovada (ou da mesma marca +
 *   categoria compatível quando existe evidência explícita).
 * - Desconto sugerido com margem protegida: nunca ultrapassa a margem mínima.
 */

import type { RelationType } from "./relationIntent";

export interface BundleCandidateProduct {
  id: string;
  name: string;
  sku?: string | null;
  brand?: string | null;
  category?: string | null;
  base_price?: number | null;
  /** Custo unitário real (compra/último custo). Null quando desconhecido. */
  unit_cost?: number | null;
  status?: string | null;
  store_published?: boolean | null;
  track_stock?: boolean | null;
  stock_quantity?: number | null;
  stock_reserved?: number | null;
  image_url?: string | null;
}

export interface BundleCandidateRelation {
  source_product_id: string;
  target_product_id: string;
  relation_type: string;
  is_active?: boolean | null;
  validation_status?: string | null;
}

export type BundleGoal = "starter" | "solution" | "accessories";

export interface BundleSuggestionItem {
  product_id: string;
  name: string;
  sku?: string | null;
  quantity: number;
  unit_price: number;
  unit_cost: number | null;
  image_url?: string | null;
  role: "anchor" | "complement";
  relation_type?: RelationType | string;
}

export interface BundleSuggestion {
  key: string;
  goal: BundleGoal;
  name: string;
  description: string;
  anchor_product_id: string;
  items: BundleSuggestionItem[];
  /** Soma dos PVP individuais. */
  list_total: number;
  /** Desconto sugerido em percentagem (inteiro). */
  discount_pct: number;
  /** PVP do pacote com desconto. */
  bundle_total: number;
  /** Poupança para o cliente em euros. */
  savings: number;
  /** Margem do pacote após desconto, quando os custos são conhecidos. */
  margin_pct: number | null;
  /** Motivo textual, sempre baseado em dados reais. */
  reason: string;
}

/** Margem mínima de contribuição a proteger no pacote. */
export const MIN_BUNDLE_MARGIN_PCT = 20;
/** Desconto máximo permitido quando não há custos conhecidos. */
export const MAX_DISCOUNT_WITHOUT_COST_PCT = 10;
/** Tetos de desconto por objetivo comercial. */
const GOAL_MAX_DISCOUNT: Record<BundleGoal, number> = {
  starter: 12,
  solution: 15,
  accessories: 8,
};

const GOAL_LABEL: Record<BundleGoal, string> = {
  starter: "Kit Inicial",
  solution: "Solução Completa",
  accessories: "Pack de Complementos",
};

/** Tipos de relação aceites como complemento de um pacote. */
const COMPLEMENT_TYPES = new Set(["accessory", "required", "bundle", "compatible"]);

function isApproved(relation: BundleCandidateRelation): boolean {
  if (relation.is_active === false) return false;
  const status = relation.validation_status;
  return status !== "rejected" && status !== "pending";
}

export function isBundleEligible(product: BundleCandidateProduct): boolean {
  if (product.status && product.status !== "active") return false;
  const price = Number(product.base_price ?? 0);
  if (!(price > 0)) return false;
  if (product.track_stock) {
    const available = Number(product.stock_quantity ?? 0) - Number(product.stock_reserved ?? 0);
    if (available <= 0) return false;
  }
  return true;
}

function round2(value: number): number {
  return Math.round(value * 100) / 100;
}

/**
 * Calcula o desconto máximo que respeita a margem mínima.
 * Sem custos conhecidos, aplica o teto conservador.
 */
export function maxSafeDiscountPct(
  listTotal: number,
  totalCost: number | null,
  goal: BundleGoal
): number {
  const goalCap = GOAL_MAX_DISCOUNT[goal];
  if (listTotal <= 0) return 0;
  if (totalCost === null || totalCost <= 0) {
    return Math.min(goalCap, MAX_DISCOUNT_WITHOUT_COST_PCT);
  }
  // preço mínimo que mantém a margem mínima: custo / (1 - margem)
  const minPrice = totalCost / (1 - MIN_BUNDLE_MARGIN_PCT / 100);
  if (minPrice >= listTotal) return 0;
  const marginRoom = ((listTotal - minPrice) / listTotal) * 100;
  return Math.max(0, Math.min(goalCap, Math.floor(marginRoom)));
}

function goalFor(types: string[]): BundleGoal {
  if (types.some((t) => t === "required" || t === "compatible")) return "solution";
  if (types.every((t) => t === "accessory")) return "accessories";
  return "starter";
}

/**
 * Gera sugestões de bundles a partir dos produtos e relações aprovadas.
 * Cada sugestão precisa do produto âncora + pelo menos 2 complementos reais.
 */
export function buildBundleSuggestions(
  products: BundleCandidateProduct[],
  relations: BundleCandidateRelation[],
  options?: { brand?: string | null; category?: string | null; limit?: number; minItems?: number }
): BundleSuggestion[] {
  const limit = options?.limit ?? 5;
  const minComplements = Math.max(1, (options?.minItems ?? 3) - 1);
  const byId = new Map<string, BundleCandidateProduct>();
  for (const p of products) byId.set(p.id, p);

  const grouped = new Map<string, BundleCandidateRelation[]>();
  for (const rel of relations) {
    if (!isApproved(rel)) continue;
    if (!COMPLEMENT_TYPES.has(rel.relation_type)) continue;
    const list = grouped.get(rel.source_product_id) ?? [];
    list.push(rel);
    grouped.set(rel.source_product_id, list);
  }

  const suggestions: BundleSuggestion[] = [];

  for (const [anchorId, rels] of grouped) {
    const anchor = byId.get(anchorId);
    if (!anchor || !isBundleEligible(anchor)) continue;
    if (options?.brand && (anchor.brand ?? "") !== options.brand) continue;
    if (options?.category && (anchor.category ?? "") !== options.category) continue;

    const seen = new Set<string>();
    const complements: BundleSuggestionItem[] = [];
    for (const rel of rels) {
      if (seen.has(rel.target_product_id)) continue;
      const target = byId.get(rel.target_product_id);
      if (!target || !isBundleEligible(target)) continue;
      seen.add(target.id);
      complements.push({
        product_id: target.id,
        name: target.name,
        sku: target.sku ?? null,
        quantity: 1,
        unit_price: round2(Number(target.base_price ?? 0)),
        unit_cost: target.unit_cost == null ? null : round2(Number(target.unit_cost)),
        image_url: target.image_url ?? null,
        role: "complement",
        relation_type: rel.relation_type,
      });
    }

    if (complements.length < minComplements) continue;

    const items: BundleSuggestionItem[] = [
      {
        product_id: anchor.id,
        name: anchor.name,
        sku: anchor.sku ?? null,
        quantity: 1,
        unit_price: round2(Number(anchor.base_price ?? 0)),
        unit_cost: anchor.unit_cost == null ? null : round2(Number(anchor.unit_cost)),
        image_url: anchor.image_url ?? null,
        role: "anchor",
      },
      ...complements.slice(0, 5),
    ];

    const listTotal = round2(items.reduce((sum, i) => sum + i.unit_price * i.quantity, 0));
    const costKnown = items.every((i) => i.unit_cost != null && i.unit_cost > 0);
    const totalCost = costKnown
      ? round2(items.reduce((sum, i) => sum + (i.unit_cost as number) * i.quantity, 0))
      : null;

    const goal = goalFor(complements.map((c) => String(c.relation_type ?? "")));
    const discountPct = maxSafeDiscountPct(listTotal, totalCost, goal);
    const bundleTotal = round2(listTotal * (1 - discountPct / 100));
    const marginPct =
      totalCost != null && bundleTotal > 0
        ? Math.round(((bundleTotal - totalCost) / bundleTotal) * 1000) / 10
        : null;

    const brandLabel = anchor.brand ? `${anchor.brand} ` : "";
    const name = `${GOAL_LABEL[goal]} ${brandLabel}${anchor.name}`.trim().slice(0, 90);
    const description =
      goal === "accessories"
        ? `Complementos necessários à instalação de ${anchor.name}, num só pacote.`
        : goal === "solution"
          ? `Solução pronta a instalar com ${anchor.name} e os equipamentos compatíveis já validados.`
          : `Pacote de arranque com ${anchor.name} e os complementos essenciais.`;

    suggestions.push({
      key: `${anchor.id}:${goal}`,
      goal,
      name,
      description,
      anchor_product_id: anchor.id,
      items,
      list_total: listTotal,
      discount_pct: discountPct,
      bundle_total: bundleTotal,
      savings: round2(listTotal - bundleTotal),
      margin_pct: marginPct,
      reason:
        totalCost == null
          ? `Baseado em ${complements.length} relações aprovadas. Sem custos registados, o desconto fica limitado a ${MAX_DISCOUNT_WITHOUT_COST_PCT}%.`
          : `Baseado em ${complements.length} relações aprovadas. Desconto validado com margem mínima de ${MIN_BUNDLE_MARGIN_PCT}%.`,
    });
  }

  suggestions.sort((a, b) => b.list_total - a.list_total);
  return suggestions.slice(0, limit);
}
