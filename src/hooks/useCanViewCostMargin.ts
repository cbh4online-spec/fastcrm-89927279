import { useWorkspace } from "@/contexts/WorkspaceContext";
import { useUserRole } from "@/hooks/useUserRole";

/**
 * Determina se o utilizador pode ver dados sensíveis de custos e margens
 * de produtos. Agentes e viewers ficam restritos. Super admins veem sempre.
 */
export function useCanViewCostMargin(): boolean {
  const { currentWorkspace } = useWorkspace();
  const { isSuperAdmin } = useUserRole();

  if (isSuperAdmin) return true;
  const role = currentWorkspace?.role;
  if (!role) return false;
  return role === "owner" || role === "admin" || role === "agency" || role === "hr";
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
