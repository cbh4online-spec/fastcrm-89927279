import { lazy } from "react";
import { Route } from "react-router-dom";
import { CapabilityGuard } from "@/components/guards/CapabilityGuard";

const RevenueFlightControlPage = lazy(() => import("@/pages/RevenueFlightControlPage"));
const RFCDealsPage = lazy(() => import("@/pages/RFCDealsPage"));
const RFCForecastPage = lazy(() => import("@/pages/RFCForecastPage"));
const RFCScenariosPage = lazy(() => import("@/pages/RFCScenariosPage"));
const RFCSettingsPage = lazy(() => import("@/pages/RFCSettingsPage"));

export function RevenueFlightControlRoutes() {
  return (
    <>
      <Route path="/dashboard/revenue-flight-control" element={<CapabilityGuard need="finance.manage"><RevenueFlightControlPage /></CapabilityGuard>} />
      <Route path="/dashboard/revenue-flight-control/deals" element={<CapabilityGuard need="finance.manage"><RFCDealsPage /></CapabilityGuard>} />
      <Route path="/dashboard/revenue-flight-control/forecast" element={<CapabilityGuard need="finance.manage"><RFCForecastPage /></CapabilityGuard>} />
      <Route path="/dashboard/revenue-flight-control/scenarios" element={<CapabilityGuard need="finance.manage"><RFCScenariosPage /></CapabilityGuard>} />
      <Route path="/dashboard/revenue-flight-control/settings" element={<CapabilityGuard need="finance.manage"><RFCSettingsPage /></CapabilityGuard>} />
    </>
  );
}
