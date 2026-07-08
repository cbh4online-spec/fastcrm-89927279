import { lazy, Suspense } from "react";
import { useLocation } from "react-router-dom";

const WeeklyDashboard = lazy(() => import("@/pages/WeeklyDashboard"));
const IXDashboard = lazy(() => import("@/pages/dashboard/IXDashboard"));

/**
 * Router de entrada para /dashboard.
 * Por omissão renderiza a Visão Global IX (5 secções + atalhos).
 * Para voltar ao dashboard semanal legado usar ?nav=legacy (ou watidy/adaptive),
 * ou localStorage("fastcrm.sidebar") diferente de "ix".
 */
export default function DashboardEntry() {
  const location = useLocation();
  const nav = new URLSearchParams(location.search).get("nav");
  let useLegacy = false;
  if (nav === "legacy" || nav === "watidy" || nav === "adaptive") useLegacy = true;
  else if (nav === "ix") useLegacy = false;
  else {
    try {
      const stored = localStorage.getItem("fastcrm.sidebar");
      useLegacy = stored != null && stored !== "ix";
    } catch {
      useLegacy = false;
    }
  }
  return (
    <Suspense fallback={null}>
      {useLegacy ? <WeeklyDashboard /> : <IXDashboard />}
    </Suspense>
  );
}

