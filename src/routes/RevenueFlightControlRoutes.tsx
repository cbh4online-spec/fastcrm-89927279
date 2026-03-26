import { lazy } from "react";
import { Route } from "react-router-dom";

const RevenueFlightControlPage = lazy(() => import("@/pages/RevenueFlightControlPage"));
const RFCDealsPage = lazy(() => import("@/pages/RFCDealsPage"));
const RFCForecastPage = lazy(() => import("@/pages/RFCForecastPage"));
const RFCScenariosPage = lazy(() => import("@/pages/RFCScenariosPage"));
const RFCSettingsPage = lazy(() => import("@/pages/RFCSettingsPage"));

export function RevenueFlightControlRoutes() {
  return (
    <>
      <Route path="/dashboard/revenue-flight-control" element={<RevenueFlightControlPage />} />
      <Route path="/dashboard/revenue-flight-control/deals" element={<RFCDealsPage />} />
      <Route path="/dashboard/revenue-flight-control/forecast" element={<RFCForecastPage />} />
      <Route path="/dashboard/revenue-flight-control/scenarios" element={<RFCScenariosPage />} />
      <Route path="/dashboard/revenue-flight-control/settings" element={<RFCSettingsPage />} />
    </>
  );
}
