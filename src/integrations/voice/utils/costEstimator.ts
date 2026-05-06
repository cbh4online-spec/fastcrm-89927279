import type { CostEstimateInput, CostEstimateResult } from "../providers/types";

/**
 * Cálculo determinístico de custo por chamada.
 * Usa billing_increment_seconds (ex: 60s) e arredonda a duração para o múltiplo seguinte.
 * Adiciona connection_fee (taxa fixa) se existir.
 */
export function estimateCallCost(input: CostEstimateInput): CostEstimateResult {
  const currency = input.currency ?? "EUR";
  const cpm = input.costPerMinute;
  if (cpm === undefined || cpm === null) {
    return { amount: null, currency, message: "Custo não configurado." };
  }
  const increment = Math.max(1, input.billingIncrementSeconds ?? 60);
  const duration = Math.max(0, input.durationSeconds ?? 0);
  const billable = duration > 0 ? Math.ceil(duration / increment) * increment : increment;
  const minutes = billable / 60;
  const variable = minutes * cpm;
  const fee = input.connectionFee ?? 0;
  const total = +(variable + fee).toFixed(4);
  return {
    amount: total,
    currency,
    breakdown: {
      billable_seconds: billable,
      cost_per_minute: cpm,
      connection_fee: fee,
      variable_amount: +variable.toFixed(4),
    },
  };
}
