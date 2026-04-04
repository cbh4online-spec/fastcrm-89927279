import { lazy } from "react";
import { Route } from "react-router-dom";

const AffiliateDashboardPage = lazy(() => import("@/pages/AffiliateDashboardPage"));
const AffiliateAdminPage = lazy(() => import("@/pages/AffiliateAdminPage"));

export function AffiliateRoutes() {
  return (
    <>
      <Route path="/dashboard/affiliates" element={<AffiliateDashboardPage />} />
      <Route path="/dashboard/affiliates/admin" element={<AffiliateAdminPage />} />
    </>
  );
}
