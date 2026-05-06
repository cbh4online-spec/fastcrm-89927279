import { lazy } from "react";
import { Route, Navigate } from "react-router-dom";

const OpportunitiesPage = lazy(() => import("@/pages/OpportunitiesPage"));
const OpportunityDetail = lazy(() => import("@/pages/OpportunityDetail"));
const SalesForecastPage = lazy(() => import("@/pages/SalesForecastPage"));

export function PipelineRoutes() {
  return (
    <>
      <Route path="/dashboard/opportunities" element={<OpportunitiesPage />} />
      <Route path="/dashboard/opportunities/:id" element={<OpportunityDetail />} />
      <Route path="/dashboard/pipeline" element={<Navigate to="/dashboard/opportunities" replace />} />
      <Route path="/dashboard/pipeline/:id" element={<Navigate to="/dashboard/opportunities" replace />} />
      <Route path="/dashboard/sales-forecast" element={<SalesForecastPage />} />
    </>
  );
}
