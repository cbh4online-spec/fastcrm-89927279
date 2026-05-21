import { lazy } from "react";
import { Route } from "react-router-dom";
import { CapabilityGuard } from "@/components/guards/CapabilityGuard";

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
      <Route path="/dashboard/security" element={<CapabilityGuard need="security.access"><SecurityDashboardPage /></CapabilityGuard>} />
      <Route path="/dashboard/security/partner-requests" element={<CapabilityGuard need="security.access"><SecurityPartnerRequestsPage /></CapabilityGuard>} />
      <Route path="/dashboard/security/partner-requests/:id" element={<CapabilityGuard need="security.access"><SecurityPartnerRequestDetailPage /></CapabilityGuard>} />
      <Route path="/dashboard/security/sites" element={<CapabilityGuard need="security.access"><SecuritySitesPage /></CapabilityGuard>} />
      <Route path="/dashboard/security/sites/:id" element={<CapabilityGuard need="security.access"><SecuritySiteDetailPage /></CapabilityGuard>} />
      <Route path="/dashboard/security/systems" element={<CapabilityGuard need="security.access"><SecuritySystemsPage /></CapabilityGuard>} />
      <Route path="/dashboard/security/systems/:id" element={<CapabilityGuard need="security.access"><SecuritySystemDetailPage /></CapabilityGuard>} />
      <Route path="/dashboard/security/equipment" element={<CapabilityGuard need="security.access"><SecurityEquipmentPage /></CapabilityGuard>} />
      <Route path="/dashboard/security/equipment/:id" element={<CapabilityGuard need="security.access"><SecurityEquipmentDetailPage /></CapabilityGuard>} />
      <Route path="/dashboard/security/clients" element={<CapabilityGuard need="security.access"><SecurityClientsPage /></CapabilityGuard>} />
      <Route path="/dashboard/security/clients/:id" element={<CapabilityGuard need="security.access"><SecurityClientDetailPage /></CapabilityGuard>} />
      <Route path="/dashboard/security/contracts" element={<CapabilityGuard need="security.access"><SecurityContractsPage /></CapabilityGuard>} />
      <Route path="/dashboard/security/contracts/:id" element={<CapabilityGuard need="security.access"><SecurityContractDetailPage /></CapabilityGuard>} />
      <Route path="/dashboard/security/proposals" element={<CapabilityGuard need="security.access"><SecurityProposalsPage /></CapabilityGuard>} />
      <Route path="/dashboard/security/proposals/:id" element={<CapabilityGuard need="security.access"><SecurityProposalDetailPage /></CapabilityGuard>} />
      <Route path="/dashboard/security/leads" element={<CapabilityGuard need="security.access"><SecurityLeadsPage /></CapabilityGuard>} />
      <Route path="/dashboard/security/leads/:id" element={<CapabilityGuard need="security.access"><SecurityLeadDetailPage /></CapabilityGuard>} />
      <Route path="/dashboard/security/documents" element={<CapabilityGuard need="security.access"><SecurityDocumentsPage /></CapabilityGuard>} />
      <Route path="/dashboard/security/documents/:id" element={<CapabilityGuard need="security.access"><SecurityDocumentDetailPage /></CapabilityGuard>} />
      <Route path="/dashboard/security/maintenance" element={<CapabilityGuard need="security.access"><SecurityMaintenancePage /></CapabilityGuard>} />
      <Route path="/dashboard/security/maintenance/:id" element={<CapabilityGuard need="security.access"><SecurityMaintenanceVisitDetailPage /></CapabilityGuard>} />
      <Route path="/dashboard/security/occurrences" element={<CapabilityGuard need="security.access"><SecurityOccurrencesPage /></CapabilityGuard>} />
      <Route path="/dashboard/security/occurrences/:id" element={<CapabilityGuard need="security.access"><SecurityOccurrenceDetailPage /></CapabilityGuard>} />
      <Route path="/dashboard/security/renewals" element={<CapabilityGuard need="security.access"><SecurityRenewalsPage /></CapabilityGuard>} />
      <Route path="/dashboard/security/renewals/:id" element={<CapabilityGuard need="security.access"><SecurityRenewalDetailPage /></CapabilityGuard>} />
      <Route path="/dashboard/security/management" element={<CapabilityGuard need="security.access"><SecurityManagementPage /></CapabilityGuard>} />
    </>
  );
}
