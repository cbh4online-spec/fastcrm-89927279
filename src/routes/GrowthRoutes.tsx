import { lazy } from "react";
import { Route } from "react-router-dom";

const GrowthIntelligencePage = lazy(() => import("@/pages/growth/GrowthIntelligencePage"));

export function GrowthRoutes() {
  return <Route path="/dashboard/growth" element={<GrowthIntelligencePage />} />;
}
