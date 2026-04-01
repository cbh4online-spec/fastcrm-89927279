import { lazy } from "react";
import { Route } from "react-router-dom";

const OpportunitiesPage = lazy(() => import("@/pages/OpportunitiesPage"));
const OpportunityDetail = lazy(() => import("@/pages/OpportunityDetail"));

export function PipelineRoutes() {
  return (
    <>
      <Route path="/dashboard/opportunities" element={<OpportunitiesPage />} />
      <Route path="/dashboard/opportunities/:id" element={<OpportunityDetail />} />
    </>
  );
}
