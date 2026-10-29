/**
 * Perfil de recompra de um cliente a partir do histórico de faturação.
 * Ciclo médio = (última − primeira compra) ÷ (nº de dias com compra − 1).
 * Fora de perfil quando os dias sem comprar ultrapassam o ciclo em mais de 30%.
 */
export const CADENCE_TOLERANCE = 0.3;
export const VALUE_DROP_RATIO = 0.5;

export type CadenceStatus = "none" | "single" | "on_track" | "due" | "late";

export interface PurchaseCadence {
  status: CadenceStatus;
  daysSinceLast: number | null;
  avgIntervalDays: number | null;
  avgTicket: number | null;
  lastValue: number | null;
  delayDays: number;
  valueDrop: boolean;
}

const DAY = 86_400_000;
const toDay = (d: string) => Math.floor(Date.parse(d.slice(0, 10) + "T00:00:00Z") / DAY);

export function computePurchaseCadence(input: {
  first: string | null;
  last: string | null;
  purchaseDays: number;
  netTotal: number;
  lastValue: number | null;
  today?: Date;
}): PurchaseCadence {
  const { first, last, purchaseDays, netTotal } = input;
  if (!last || purchaseDays < 1) {
    return { status: "none", daysSinceLast: null, avgIntervalDays: null, avgTicket: null, lastValue: null, delayDays: 0, valueDrop: false };
  }
  const todayIso = (input.today ?? new Date()).toISOString().slice(0, 10);
  const daysSinceLast = Math.max(0, toDay(todayIso) - toDay(last));
  const avgTicket = netTotal / purchaseDays;
  const lastValue = input.lastValue;
  const valueDrop = purchaseDays >= 2 && lastValue != null && avgTicket > 0 && lastValue < avgTicket * VALUE_DROP_RATIO;
  if (purchaseDays < 2 || !first) {
    return { status: "single", daysSinceLast, avgIntervalDays: null, avgTicket, lastValue, delayDays: 0, valueDrop: false };
  }
  const avgIntervalDays = Math.max(1, Math.round((toDay(last) - toDay(first)) / (purchaseDays - 1)));
  const limit = Math.round(avgIntervalDays * (1 + CADENCE_TOLERANCE));
  let status: CadenceStatus = "on_track";
  if (daysSinceLast > limit) status = "late";
  else if (daysSinceLast >= avgIntervalDays) status = "due";
  return {
    status, daysSinceLast, avgIntervalDays, avgTicket, lastValue,
    delayDays: Math.max(0, daysSinceLast - avgIntervalDays), valueDrop,
  };
}
