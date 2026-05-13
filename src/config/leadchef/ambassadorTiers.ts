/**
 * LeadChef — Programa de Embaixadores.
 * Níveis por volume de receita mensal gerada (mensalidades + anuidades pro-rata).
 * Comissão recorrente vitalícia enquanto cliente referido se mantém ativo.
 */

export type AmbassadorTier = "iniciante" | "bronze" | "prata" | "ouro" | "diamante";

export interface AmbassadorTierConfig {
  slug: AmbassadorTier;
  name: string;
  minMonthlyRevenue: number;
  maxMonthlyRevenue: number | null;
  commissionRate: number; // 0-1
  color: string; // tailwind color hint
  perks: string[];
}

export const AMBASSADOR_TIERS: AmbassadorTierConfig[] = [
  {
    slug: "iniciante",
    name: "Iniciante",
    minMonthlyRevenue: 0,
    maxMonthlyRevenue: 50,
    commissionRate: 0.15,
    color: "muted",
    perks: ["Link único de afiliado", "Painel de comissões", "Pagamentos a partir de 50€"],
  },
  {
    slug: "bronze",
    name: "Bronze",
    minMonthlyRevenue: 50,
    maxMonthlyRevenue: 200,
    commissionRate: 0.20,
    color: "amber",
    perks: ["Tudo do Iniciante", "Materiais de apoio à venda", "Bónus 10€ no 5º cliente ativo"],
  },
  {
    slug: "prata",
    name: "Prata",
    minMonthlyRevenue: 200,
    maxMonthlyRevenue: 500,
    commissionRate: 0.25,
    color: "slate",
    perks: ["Tudo do Bronze", "Acesso antecipado a novidades", "Sessão mensal de coaching"],
  },
  {
    slug: "ouro",
    name: "Ouro",
    minMonthlyRevenue: 500,
    maxMonthlyRevenue: 1500,
    commissionRate: 0.30,
    color: "yellow",
    perks: ["Tudo do Prata", "Destaque na página de embaixadores", "Co-marketing personalizado"],
  },
  {
    slug: "diamante",
    name: "Diamante",
    minMonthlyRevenue: 1500,
    maxMonthlyRevenue: null,
    commissionRate: 0.35,
    color: "cyan",
    perks: ["Tudo do Ouro", "Gestor de conta dedicado", "Evento anual de embaixadores"],
  },
];

export function calcAmbassadorTier(monthlyRevenue: number): AmbassadorTierConfig {
  for (let i = AMBASSADOR_TIERS.length - 1; i >= 0; i--) {
    const t = AMBASSADOR_TIERS[i];
    if (monthlyRevenue >= t.minMonthlyRevenue) return t;
  }
  return AMBASSADOR_TIERS[0];
}

export function nextAmbassadorTier(current: AmbassadorTier): AmbassadorTierConfig | null {
  const idx = AMBASSADOR_TIERS.findIndex((t) => t.slug === current);
  return idx >= 0 && idx < AMBASSADOR_TIERS.length - 1 ? AMBASSADOR_TIERS[idx + 1] : null;
}

export const AMBASSADOR_MIN_PAYOUT = 50;
export const formatPercent = (v: number) => `${Math.round(v * 100)}%`;
