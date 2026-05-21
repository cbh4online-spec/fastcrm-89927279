import { useCapability } from "@/hooks/useCapability";

/**
 * @deprecated Usar `useCapability("finance.view")` directamente.
 * Mantido como shim de retrocompatibilidade — encaminha para a SSoT em
 * `src/lib/permissions/capabilities.ts`.
 */
export function useCanViewCostMargin(): boolean {
  return useCapability("finance.view");
}

/** Lista canónica de IDs de colunas/campos sensíveis de custo e margem. */
export const COST_MARGIN_FIELDS = new Set<string>([
  "direct_cost",
  "operational_cost",
  "margin",
  "margin_status",
  "recommended_price",
  "target_margin_pct",
  "labor_hours",
  "labor_hourly_rate",
]);
