/**
 * Extrai dados estruturados de um PitchPricingPlan (string-based) para
 * compor o resumo de investimento: preço base, número de utilizadores,
 * créditos IA incluídos.
 */
import type { PitchPricingPlan } from './tokens';

export interface PlanBreakdown {
  /** Plano selecionado (highlight ou primeiro). */
  plan: PitchPricingPlan;
  /** Preço base por utilizador/mês em EUR (parsed). */
  pricePerUserEur: number;
  /** Número de utilizadores incluídos (parsed do `sub`). 1 se não detetado. */
  users: number;
  /** "X créditos IA / mês" extraído das features. */
  aiCreditsLabel?: string;
  /** Valor numérico dos créditos IA, se detetado. */
  aiCreditsCount?: number;
}

const NUMERIC_RE = /(\d+[.\d]*)/;

/** Extrai o primeiro número euro de uma string ("€39", "€149,00"). */
function parseEur(input: string | undefined): number {
  if (!input) return 0;
  const m = input.match(/€\s*([\d.,]+)/);
  if (!m) return 0;
  const v = parseFloat(m[1].replace(/\./g, '').replace(',', '.'));
  return isFinite(v) ? v : 0;
}

/** Detecta "até N utilizadores" / "ilimitado". */
function parseUsers(sub: string | undefined): number {
  if (!sub) return 1;
  if (/ilimitado|unlimited/i.test(sub)) return 1; // tratamos como por-utilizador
  const m = sub.match(/at[ée]\s+(\d+)\s+utilizador/i) || sub.match(/(\d+)\s+utilizador/i);
  if (!m) return 1;
  const n = parseInt(m[1], 10);
  return isFinite(n) && n > 0 ? n : 1;
}

/** Extrai linha "X créditos IA / mês" das features. */
function parseAiCredits(features: string[] | undefined): { label?: string; count?: number } {
  if (!features) return {};
  const line = features.find((f) => /cr[ée]ditos?\s+ia/i.test(f));
  if (!line) return {};
  const m = line.match(/([\d.\s]+)\s+cr[ée]ditos/i);
  if (!m) return { label: line };
  const cleaned = m[1].replace(/[.\s]/g, '');
  const n = parseInt(cleaned, 10);
  return { label: line, count: isFinite(n) ? n : undefined };
}

export function getSelectedPlan(plans: PitchPricingPlan[]): PitchPricingPlan | undefined {
  if (!plans || plans.length === 0) return undefined;
  return plans.find((p) => p.highlight) ?? plans[0];
}

export function buildPlanBreakdown(plan: PitchPricingPlan): PlanBreakdown {
  const ai = parseAiCredits(plan.features);
  return {
    plan,
    pricePerUserEur: parseEur(plan.price),
    users: parseUsers(plan.sub),
    aiCreditsLabel: ai.label,
    aiCreditsCount: ai.count,
  };
}

/** Setup default por tier (em EUR), pode ser sobreposto via slideOverrides. */
export const DEFAULT_PLAN_SETUP_EUR: Record<string, number> = {
  grow: 990,
  pro: 1990,
  enterprise: 4990,
};
