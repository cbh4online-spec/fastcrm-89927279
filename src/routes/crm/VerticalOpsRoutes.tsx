import { lazy } from "react";
import { Navigate, Route } from "react-router-dom";
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
const BackofficePricingV2 = lazy(() => import("@/pages/backoffice-v2/BackofficeSectionsV2").then((m) => ({ default: m.BackofficePricingV2 })));
const BackofficeLimitsV2 = lazy(() => import("@/pages/backoffice-v2/BackofficeSectionsV2").then((m) => ({ default: m.BackofficeLimitsV2 })));
const BackofficeAIUsageV2 = lazy(() => import("@/pages/backoffice-v2/BackofficeSectionsV2").then((m) => ({ default: m.BackofficeAIUsageV2 })));
const BackofficePaymentsV2 = lazy(() => import("@/pages/backoffice-v2/BackofficeSectionsV2").then((m) => ({ default: m.BackofficePaymentsV2 })));
const BackofficeStripeSyncV2 = lazy(() => import("@/pages/backoffice-v2/BackofficeSectionsV2").then((m) => ({ default: m.BackofficeStripeSyncV2 })));
const BackofficeAlertsV2 = lazy(() => import("@/pages/backoffice-v2/BackofficeSectionsV2").then((m) => ({ default: m.BackofficeAlertsV2 })));
const BackofficeIncidentsV2 = lazy(() => import("@/pages/backoffice-v2/BackofficeSectionsV2").then((m) => ({ default: m.BackofficeIncidentsV2 })));
const BackofficeModerationV2 = lazy(() => import("@/pages/backoffice-v2/BackofficeSectionsV2").then((m) => ({ default: m.BackofficeModerationV2 })));
const BackofficeBugsV2 = lazy(() => import("@/pages/backoffice-v2/BackofficeSectionsV2").then((m) => ({ default: m.BackofficeBugsV2 })));
const BackofficeLogsV2 = lazy(() => import("@/pages/backoffice-v2/BackofficeSectionsV2").then((m) => ({ default: m.BackofficeLogsV2 })));
const BackofficeActivityLogsV2 = lazy(() => import("@/pages/backoffice-v2/BackofficeSectionsV2").then((m) => ({ default: m.BackofficeActivityLogsV2 })));
const BackofficeFeaturesV2 = lazy(() => import("@/pages/backoffice-v2/BackofficeSectionsV2").then((m) => ({ default: m.BackofficeFeaturesV2 })));
const BackofficeRolloutV2 = lazy(() => import("@/pages/backoffice-v2/BackofficeSectionsV2").then((m) => ({ default: m.BackofficeRolloutV2 })));
const BackofficeWorkspaceMenusV2 = lazy(() => import("@/pages/backoffice-v2/BackofficeSectionsV2").then((m) => ({ default: m.BackofficeWorkspaceMenusV2 })));
const BackofficeSettingsV2 = lazy(() => import("@/pages/backoffice-v2/BackofficeSectionsV2").then((m) => ({ default: m.BackofficeSettingsV2 })));
const ModuleOnboardingAdminPage = lazy(() => import("@/pages/super-admin/ModuleOnboardingAdminPage"));
const ModulePresentationsAdminPage = lazy(() => import("@/pages/super-admin/ModulePresentationsAdminPage"));
const TeamProgressionPage = lazy(() => import("@/pages/team/TeamProgressionPage"));
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
      <Route path="/super-admin-v2/pricing" element={<RequireSuperAdmin><BackofficePricingV2 /></RequireSuperAdmin>} />
      <Route path="/super-admin-v2/limits" element={<RequireSuperAdmin><BackofficeLimitsV2 /></RequireSuperAdmin>} />
      <Route path="/super-admin-v2/ai" element={<RequireSuperAdmin><BackofficeAIUsageV2 /></RequireSuperAdmin>} />
      <Route path="/super-admin-v2/payments" element={<RequireSuperAdmin><BackofficePaymentsV2 /></RequireSuperAdmin>} />
      <Route path="/super-admin-v2/stripe" element={<RequireSuperAdmin><BackofficeStripeSyncV2 /></RequireSuperAdmin>} />
      <Route path="/super-admin-v2/alerts" element={<RequireSuperAdmin><BackofficeAlertsV2 /></RequireSuperAdmin>} />
      <Route path="/super-admin-v2/incidents" element={<RequireSuperAdmin><BackofficeIncidentsV2 /></RequireSuperAdmin>} />
      <Route path="/super-admin-v2/moderation" element={<RequireSuperAdmin><BackofficeModerationV2 /></RequireSuperAdmin>} />
      <Route path="/super-admin-v2/bugs" element={<RequireSuperAdmin><BackofficeBugsV2 /></RequireSuperAdmin>} />
      <Route path="/super-admin-v2/logs" element={<RequireSuperAdmin><BackofficeLogsV2 /></RequireSuperAdmin>} />
      <Route path="/super-admin-v2/activity" element={<RequireSuperAdmin><BackofficeActivityLogsV2 /></RequireSuperAdmin>} />
      <Route path="/super-admin-v2/features" element={<RequireSuperAdmin><BackofficeFeaturesV2 /></RequireSuperAdmin>} />
      <Route path="/super-admin-v2/rollout" element={<RequireSuperAdmin><BackofficeRolloutV2 /></RequireSuperAdmin>} />
      <Route path="/super-admin-v2/workspace-menus" element={<RequireSuperAdmin><BackofficeWorkspaceMenusV2 /></RequireSuperAdmin>} />
      <Route path="/super-admin-v2/settings" element={<RequireSuperAdmin><BackofficeSettingsV2 /></RequireSuperAdmin>} />
      <Route path="/super-admin-v2/*" element={<Navigate to="/super-admin-v2" replace />} />
      <Route path="/dashboard/super-admin/module-onboarding" element={<RequireSuperAdmin><ModuleOnboardingAdminPage /></RequireSuperAdmin>} />
      <Route path="/dashboard/super-admin/module-presentations" element={<RequireSuperAdmin><ModulePresentationsAdminPage /></RequireSuperAdmin>} />
      <Route path="/dashboard/team/progression" element={<TeamProgressionPage />} />
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
