import { lazy, Suspense } from "react";
import { useIXMode } from "@/hooks/useIXMode";

const WeeklyDashboard = lazy(() => import("@/pages/WeeklyDashboard"));
const IXDashboard = lazy(() => import("@/pages/dashboard/IXDashboard"));

/**
 * Router de entrada para /dashboard.
 * Renderiza a versão IX (5 secções: Faturação, Cobranças, Clientes, Itens, Impostos)
 * quando o modo IX está activo (?nav=ix ou localStorage). Caso contrário mantém
 * o WeeklyDashboard legado. Nenhuma funcionalidade existente é removida.
 */
export default function DashboardEntry() {
  const ix = useIXMode();
  return (
    <Suspense fallback={null}>
      {ix ? <IXDashboard /> : <WeeklyDashboard />}
    </Suspense>
  );
}
