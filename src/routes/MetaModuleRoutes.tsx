import { lazy } from "react";
import { Route } from "react-router-dom";

const MetaOverviewPage = lazy(() => import("@/pages/meta/MetaOverviewPage"));
const MetaConnectionsPage = lazy(() => import("@/pages/meta/MetaConnectionsPageRoute"));
const MetaLeadsPage = lazy(() => import("@/pages/meta/MetaLeadsPage"));
const MetaHealthPage = lazy(() => import("@/pages/meta/MetaHealthPage"));
const MetaFieldMappingPage = lazy(() => import("@/pages/meta/MetaFieldMappingPage"));
const MetaInboxRedirect = lazy(() => import("@/pages/meta/MetaInboxRedirect"));

export function MetaModuleRoutes() {
  return (
    <>
      <Route path="/dashboard/meta" element={<MetaOverviewPage />} />
      <Route path="/dashboard/meta/connections" element={<MetaConnectionsPage />} />
      <Route path="/dashboard/meta/leads" element={<MetaLeadsPage />} />
      <Route path="/dashboard/meta/inbox" element={<MetaInboxRedirect />} />
      <Route path="/dashboard/meta/health" element={<MetaHealthPage />} />
      <Route path="/dashboard/meta/field-mapping" element={<MetaFieldMappingPage />} />
    </>
  );
}
