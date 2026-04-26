import { lazy } from "react";
import { Route } from "react-router-dom";
import { RequireSuperAdmin } from "@/components/backoffice-v2/RequireSuperAdmin";

const PublicLandingPage = lazy(() => import("@/pages/PublicLandingPage"));
const PublicProductSheet = lazy(() => import("@/pages/PublicProductSheet"));
const PublicProposalPage = lazy(() => import("@/pages/PublicProposalPage"));
const SuperAdmin = lazy(() => import("@/pages/SuperAdmin"));
const BackofficeOverviewV2 = lazy(() => import("@/pages/backoffice-v2/BackofficeOverviewV2"));
const BackofficeWorkspacesV2 = lazy(() => import("@/pages/backoffice-v2/BackofficeWorkspacesV2"));
const BackofficeUsersV2 = lazy(() => import("@/pages/backoffice-v2/BackofficeUsersV2"));
const BackofficeSubscriptionsV2 = lazy(() => import("@/pages/backoffice-v2/BackofficeSubscriptionsV2"));
const BackofficePermissionsV2 = lazy(() => import("@/pages/backoffice-v2/BackofficePermissionsV2"));
const VerticalLandingPage = lazy(() => import("@/pages/VerticalLandingPage"));
const EventRsvpResponse = lazy(() => import("@/pages/EventRsvpResponse"));
const AcceptWorkspaceInvite = lazy(() => import("@/pages/AcceptWorkspaceInvite"));
const VisionDuoAcceptPage = lazy(() => import("@/pages/VisionDuoAcceptPage"));
const UnsubscribePage = lazy(() => import("@/pages/UnsubscribePage"));
const NotFound = lazy(() => import("@/pages/NotFound"));

export function VerticalOpsRoutes() {
  return (
    <>
      {/* Public pages */}
      <Route path="/p/:workspaceSlug/:pageSlug" element={<PublicLandingPage />} />
      <Route path="/product/:slug" element={<PublicProductSheet />} />
      <Route path="/p/:slug" element={<PublicProposalPage />} />
      <Route path="/super-admin" element={<SuperAdmin />} />
      <Route path="/super-admin-v2" element={<RequireSuperAdmin><BackofficeOverviewV2 /></RequireSuperAdmin>} />
      <Route path="/super-admin-v2/workspaces" element={<RequireSuperAdmin><BackofficeWorkspacesV2 /></RequireSuperAdmin>} />
      <Route path="/super-admin-v2/users" element={<RequireSuperAdmin><BackofficeUsersV2 /></RequireSuperAdmin>} />
      <Route path="/super-admin-v2/subscriptions" element={<RequireSuperAdmin><BackofficeSubscriptionsV2 /></RequireSuperAdmin>} />
      <Route path="/super-admin-v2/billing" element={<RequireSuperAdmin><BackofficeSubscriptionsV2 /></RequireSuperAdmin>} />
      <Route path="/super-admin-v2/permissions" element={<RequireSuperAdmin><BackofficePermissionsV2 /></RequireSuperAdmin>} />
      <Route path="/clinicas" element={<VerticalLandingPage />} />
      <Route path="/imobiliarias" element={<VerticalLandingPage />} />
      <Route path="/formacao" element={<VerticalLandingPage />} />
      <Route path="/condominios" element={<VerticalLandingPage />} />
      <Route path="/agencias" element={<VerticalLandingPage />} />
      <Route path="/empresas" element={<VerticalLandingPage />} />
      <Route path="/event-rsvp" element={<EventRsvpResponse />} />
      <Route path="/unsubscribe" element={<UnsubscribePage />} />
      <Route path="/invite/:token" element={<AcceptWorkspaceInvite />} />
      <Route path="/vision/duo/accept/:token" element={<VisionDuoAcceptPage />} />

      {/* Catch-all */}
      <Route path="/:slug" element={<VerticalLandingPage />} />
      <Route path="*" element={<NotFound />} />
    </>
  );
}
