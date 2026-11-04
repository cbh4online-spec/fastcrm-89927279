import type { IndicatorFormula, IndicatorUnit } from "./indicatorCatalog";

/** Fórmulas calculadas por `bgi_compute_indicators`; as restantes aparecem como «Em breve». */
export const SUPPORTED_FORMULAS: ReadonlySet<IndicatorFormula> = new Set<IndicatorFormula>([
  "sum_invoiced_net", "sum_amount_paid", "sum_open_balance", "count_active_customers",
  "repeat_purchase_rate", "count_new_leads", "lead_to_customer_rate", "sum_pipeline_value",
  "weighted_pipeline", "count_closed_deals", "count_orders", "avg_order_value",
  "count_enrollments", "class_occupancy_pct", "revenue_per_course",
]);

export const isSupportedFormula = (f: IndicatorFormula) => SUPPORTED_FORMULAS.has(f);

export function formatIndicatorValue(value: number | null | undefined, unit: IndicatorUnit): string {
  if (value === null || value === undefined || Number.isNaN(value)) return "Sem dados";
  switch (unit) {
    case "eur":
      return new Intl.NumberFormat("pt-PT", { style: "currency", currency: "EUR", maximumFractionDigits: 0 }).format(value);
    case "percent":
      return `${new Intl.NumberFormat("pt-PT", { maximumFractionDigits: 1 }).format(value)}%`;
    case "hours":
      return `${new Intl.NumberFormat("pt-PT", { maximumFractionDigits: 1 }).format(value)} h`;
    default:
      return new Intl.NumberFormat("pt-PT", { maximumFractionDigits: 0 }).format(value);
  }
}

/** Variação percentual; null quando a base é 0 ou desconhecida (nunca inventa infinito). */
export function computeDelta(current: number | null | undefined, base: number | null | undefined): number | null {
  if (current == null || base == null || base === 0) return null;
  return Math.round(((current - base) / Math.abs(base)) * 1000) / 10;
}
