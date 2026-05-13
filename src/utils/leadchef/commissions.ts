/**
 * LeadChef — Tabela de Comissões dos Agentes (Bimby).
 * Fonte: tabela oficial entregue ao agente.
 */

export const BASE_PER_SALE = 135; // €
export const POST_SALE_VISIT_FEE = 21; // € por visita
export const POST_SALE_VISIT_WINDOW_DAYS = 90;
export const RECRUITMENT_BONUS_ENTRY = 100; // €
export const RECRUITMENT_BONUS_2ND_SALE = 100; // €

/**
 * Bónus acumulado por nº total de vendas no mês.
 * Escalões 1–15 e marco 50 retirados da tabela oficial.
 */
export const BONUS_TIERS: Record<number, number> = {
  1: 0,
  2: 120,
  3: 275,
  4: 380,
  5: 530,
  6: 630,
  7: 730,
  8: 860,
  9: 960,
  10: 1100,
  11: 1200,
  12: 1300,
  13: 1400,
  14: 1500,
  15: 1650,
  50: 5500,
};

export interface CommissionRow {
  sales: number;
  base: number;
  bonus: number;
  total: number;
}

export const COMMISSION_TABLE: CommissionRow[] = Object.keys(BONUS_TIERS)
  .map((k) => Number(k))
  .sort((a, b) => a - b)
  .map((sales) => {
    const base = sales * BASE_PER_SALE;
    const bonus = BONUS_TIERS[sales] ?? 0;
    return { sales, base, bonus, total: base + bonus };
  });

/** Devolve o bónus aplicável a um nº de vendas (último escalão atingido). */
export function getBonusForSales(sales: number): number {
  if (sales <= 0) return 0;
  const tiers = Object.keys(BONUS_TIERS)
    .map(Number)
    .sort((a, b) => a - b);
  let bonus = 0;
  for (const t of tiers) {
    if (sales >= t) bonus = BONUS_TIERS[t];
    else break;
  }
  return bonus;
}

export interface CommissionResult {
  sales: number;
  base: number;
  bonus: number;
  total: number;
  currentTier: number; // último escalão atingido
  nextTier: number | null;
  salesToNextTier: number | null;
  extraToNextTier: number | null;
}

export function calcCommission(sales: number): CommissionResult {
  const safe = Math.max(0, Math.floor(sales || 0));
  const base = safe * BASE_PER_SALE;
  const bonus = getBonusForSales(safe);
  const total = base + bonus;

  const tiers = Object.keys(BONUS_TIERS)
    .map(Number)
    .sort((a, b) => a - b);
  const currentTier = [...tiers].reverse().find((t) => safe >= t) ?? 0;
  const nextTier = tiers.find((t) => t > safe) ?? null;

  let extraToNextTier: number | null = null;
  let salesToNextTier: number | null = null;
  if (nextTier !== null) {
    salesToNextTier = nextTier - safe;
    const nextBase = nextTier * BASE_PER_SALE;
    const nextBonus = BONUS_TIERS[nextTier] ?? 0;
    extraToNextTier = nextBase + nextBonus - total;
  }

  return {
    sales: safe,
    base,
    bonus,
    total,
    currentTier,
    nextTier,
    salesToNextTier,
    extraToNextTier,
  };
}

export function formatEuro(value: number): string {
  return new Intl.NumberFormat("pt-PT", {
    style: "currency",
    currency: "EUR",
    maximumFractionDigits: 2,
  }).format(value);
}
