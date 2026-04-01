import { lazy } from "react";
import { Route } from "react-router-dom";

const ProspectingHub = lazy(() => import("@/pages/ProspectingHub"));
const GoogleLocalProspecting = lazy(() => import("@/pages/GoogleLocalProspecting"));
const WebSearchProspecting = lazy(() => import("@/pages/WebSearchProspecting"));
const ProfessionalProspecting = lazy(() => import("@/pages/ProfessionalProspecting"));
const CompetitorTrackerPage = lazy(() => import("@/pages/CompetitorTrackerPage"));
const LeadEnricher = lazy(() => import("@/pages/LeadEnricher"));
const FastMatchDiscoveryPage = lazy(() => import("@/pages/fastmatch/FastMatchDiscoveryPage"));

export function ProspectingRoutes() {
  return (
    <>
      <Route path="/dashboard/prospecting" element={<ProspectingHub />} />
      <Route path="/dashboard/prospecting/google-local" element={<GoogleLocalProspecting />} />
      <Route path="/dashboard/prospecting/web-search" element={<WebSearchProspecting />} />
      <Route path="/dashboard/prospecting/professionals" element={<ProfessionalProspecting />} />
      <Route path="/dashboard/competitors" element={<CompetitorTrackerPage />} />
      <Route path="/dashboard/lead-enricher" element={<LeadEnricher />} />
      <Route path="/dashboard/fastmatch" element={<FastMatchDiscoveryPage />} />
    </>
  );
}
