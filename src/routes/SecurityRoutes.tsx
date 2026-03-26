import { lazy } from "react";
import { Route } from "react-router-dom";

const SecurityDashboardPage = lazy(() => import("@/pages/security/SecurityDashboardPage"));
const SecurityPartnerRequestsPage = lazy(() => import("@/pages/security/SecurityPartnerRequestsPage"));
const SecurityPartnerRequestDetailPage = lazy(() => import("@/pages/security/SecurityPartnerRequestDetailPage"));
const SecuritySitesPage = lazy(() => import("@/pages/security/SecuritySitesPage"));
const SecuritySiteDetailPage = lazy(() => import("@/pages/security/SecuritySiteDetailPage"));
const SecuritySystemsPage = lazy(() => import("@/pages/security/SecuritySystemsPage"));
const SecuritySystemDetailPage = lazy(() => import("@/pages/security/SecuritySystemDetailPage"));
const SecurityEquipmentPage = lazy(() => import("@/pages/security/SecurityEquipmentPage"));
const SecurityEquipmentDetailPage = lazy(() => import("@/pages/security/SecurityEquipmentDetailPage"));
const SecurityContractsPage = lazy(() => import("@/pages/security/SecurityContractsPage"));
const SecurityContractDetailPage = lazy(() => import("@/pages/security/SecurityContractDetailPage"));
const SecurityClientsPage = lazy(() => import("@/pages/security/SecurityClientsPage"));
const SecurityClientDetailPage = lazy(() => import("@/pages/security/SecurityClientDetailPage"));
const SecurityProposalsPage = lazy(() => import("@/pages/security/SecurityProposalsPage"));
const SecurityProposalDetailPage = lazy(() => import("@/pages/security/SecurityProposalDetailPage"));
const SecurityLeadsPage = lazy(() => import("@/pages/security/SecurityLeadsPage"));
const SecurityLeadDetailPage = lazy(() => import("@/pages/security/SecurityLeadDetailPage"));
const SecurityDocumentsPage = lazy(() => import("@/pages/security/SecurityDocumentsPage"));
const SecurityDocumentDetailPage = lazy(() => import("@/pages/security/SecurityDocumentDetailPage"));
const SecurityMaintenancePage = lazy(() => import("@/pages/security/SecurityMaintenancePage"));
const SecurityMaintenanceVisitDetailPage = lazy(() => import("@/pages/security/SecurityMaintenanceVisitDetailPage"));
const SecurityOccurrencesPage = lazy(() => import("@/pages/security/SecurityOccurrencesPage"));
const SecurityOccurrenceDetailPage = lazy(() => import("@/pages/security/SecurityOccurrenceDetailPage"));
const SecurityRenewalsPage = lazy(() => import("@/pages/security/SecurityRenewalsPage"));
const SecurityRenewalDetailPage = lazy(() => import("@/pages/security/SecurityRenewalDetailPage"));
const SecurityManagementPage = lazy(() => import("@/pages/security/SecurityManagementPage"));

export function SecurityRoutes() {
  return (
    <>
      <Route path="/dashboard/security" element={<SecurityDashboardPage />} />
      <Route path="/dashboard/security/partner-requests" element={<SecurityPartnerRequestsPage />} />
      <Route path="/dashboard/security/partner-requests/:id" element={<SecurityPartnerRequestDetailPage />} />
      <Route path="/dashboard/security/sites" element={<SecuritySitesPage />} />
      <Route path="/dashboard/security/sites/:id" element={<SecuritySiteDetailPage />} />
      <Route path="/dashboard/security/systems" element={<SecuritySystemsPage />} />
      <Route path="/dashboard/security/systems/:id" element={<SecuritySystemDetailPage />} />
      <Route path="/dashboard/security/equipment" element={<SecurityEquipmentPage />} />
      <Route path="/dashboard/security/equipment/:id" element={<SecurityEquipmentDetailPage />} />
      <Route path="/dashboard/security/clients" element={<SecurityClientsPage />} />
      <Route path="/dashboard/security/clients/:id" element={<SecurityClientDetailPage />} />
      <Route path="/dashboard/security/contracts" element={<SecurityContractsPage />} />
      <Route path="/dashboard/security/contracts/:id" element={<SecurityContractDetailPage />} />
      <Route path="/dashboard/security/proposals" element={<SecurityProposalsPage />} />
      <Route path="/dashboard/security/proposals/:id" element={<SecurityProposalDetailPage />} />
      <Route path="/dashboard/security/leads" element={<SecurityLeadsPage />} />
      <Route path="/dashboard/security/leads/:id" element={<SecurityLeadDetailPage />} />
      <Route path="/dashboard/security/documents" element={<SecurityDocumentsPage />} />
      <Route path="/dashboard/security/documents/:id" element={<SecurityDocumentDetailPage />} />
      <Route path="/dashboard/security/maintenance" element={<SecurityMaintenancePage />} />
      <Route path="/dashboard/security/maintenance/:id" element={<SecurityMaintenanceVisitDetailPage />} />
      <Route path="/dashboard/security/occurrences" element={<SecurityOccurrencesPage />} />
      <Route path="/dashboard/security/occurrences/:id" element={<SecurityOccurrenceDetailPage />} />
      <Route path="/dashboard/security/renewals" element={<SecurityRenewalsPage />} />
      <Route path="/dashboard/security/renewals/:id" element={<SecurityRenewalDetailPage />} />
      <Route path="/dashboard/security/management" element={<SecurityManagementPage />} />
    </>
  );
}
