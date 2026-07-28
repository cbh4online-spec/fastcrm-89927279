import { lazy } from "react";
import { Route, Navigate } from "react-router-dom";

const FastCRMLanding = lazy(() => import("@/pages/FastCRMLanding"));
const FastCRMWhatsAppSalesLanding = lazy(() => import("@/pages/FastCRMWhatsAppSalesLanding"));

const Login = lazy(() => import("@/pages/Login"));
const Signup = lazy(() => import("@/pages/Signup"));
const Auth = lazy(() => import("@/pages/Auth"));
const OAuthConsentPage = lazy(() => import("@/pages/OAuthConsentPage"));
const ForgotPassword = lazy(() => import("@/pages/ForgotPassword"));
const Onboarding = lazy(() => import("@/pages/Onboarding"));
const OnboardingHubPage = lazy(() => import("@/pages/OnboardingHubPage"));

const ActivationAdminPage = lazy(() => import("@/pages/ActivationAdminPage"));
const WeeklyDashboard = lazy(() => import("@/pages/dashboard/DashboardEntry"));
const CommandCenter = lazy(() => import("@/pages/CommandCenter"));
const Settings = lazy(() => import("@/pages/Settings"));
const ObjectsHomePage = lazy(() => import("@/pages/ObjectsHomePage"));
const ObjectListPage = lazy(() => import("@/pages/ObjectListPage"));
const ObjectDetailPage = lazy(() => import("@/pages/ObjectDetailPage"));
const DataModelPage = lazy(() => import("@/pages/DataModelPage"));
const WorkspaceTagsPage = lazy(() => import("@/pages/WorkspaceTagsPage"));
const VisualDataModelPage = lazy(() => import("@/pages/VisualDataModelPage"));
const IntelligencePage = lazy(() => import("@/pages/IntelligencePage"));
const ContextOSPage = lazy(() => import("@/pages/ContextOSPage"));
const RevenueOverviewPage = lazy(() => import("@/pages/RevenueOverviewPage"));
const TasksPage = lazy(() => import("@/pages/TasksPage"));
const AlertsPage = lazy(() => import("@/pages/AlertsPage"));
const ImpactMapPage = lazy(() => import("@/pages/ImpactMapPage"));
const SystemHealthPage = lazy(() => import("@/pages/SystemHealthPage"));
const DependenciesPage = lazy(() => import("@/pages/dashboard/system/DependenciesPage"));
const EventMapPage = lazy(() => import("@/pages/EventMapPage"));
const EventMatrixPage = lazy(() => import("@/pages/EventMatrixPage"));
const EventTestsPage = lazy(() => import("@/pages/EventTestsPage"));
const RevenueRadarPage = lazy(() => import("@/pages/RevenueRadarPage"));
const SponsorsManagement = lazy(() => import("@/pages/SponsorsManagement"));
const VisionPage = lazy(() => import("@/pages/VisionPage"));
const KernelMonitorPage = lazy(() => import("@/pages/KernelMonitorPage"));
const GenerateLandingImages = lazy(() => import("@/pages/GenerateLandingImages"));
const ProposalView = lazy(() => import("@/pages/ProposalView"));
const PricingPage = lazy(() => import("@/pages/PricingPage"));
const ChangelogPage = lazy(() => import("@/pages/ChangelogPage"));
const GDPRBackofficePage = lazy(() => import("@/modules/growth-seo/pages/GDPRBackofficePage"));
const BlogDashboard = lazy(() => import("@/pages/dashboard/blog/index"));
const CreditHistoryPage = lazy(() => import("@/pages/CreditHistoryPage"));
const BillingIntegrationsPage = lazy(() => import("@/pages/settings/BillingIntegrationsPage"));
const BillingSyncPage = lazy(() => import("@/pages/settings/BillingSyncPage"));

export function DashboardCoreRoutes() {
  return (
    <>
      {/* Main Routes */}
      <Route path="/" element={<FastCRMLanding />} />
      <Route path="/fastcrm" element={<FastCRMLanding />} />
      <Route path="/fastcrm-whatsapp-sales" element={<FastCRMWhatsAppSalesLanding />} />
      <Route path="/admin/generate-landing-images" element={<GenerateLandingImages />} />
      <Route path="/pricing" element={<PricingPage />} />
      <Route path="/changelog" element={<ChangelogPage />} />
      <Route path="/proposal/:id" element={<ProposalView />} />
      <Route path="/login" element={<Login />} />
      <Route path="/signup" element={<Signup />} />
      <Route path="/auth" element={<Auth />} />
      <Route path="/.lovable/oauth/consent" element={<OAuthConsentPage />} />
      <Route path="/forgot-password" element={<ForgotPassword />} />
      <Route path="/onboarding" element={<Onboarding />} />
      
      <Route path="/dashboard/onboarding" element={<OnboardingHubPage />} />
      <Route path="/dashboard/admin/activation" element={<ActivationAdminPage />} />
      <Route path="/dashboards" element={<Navigate to="/dashboard" replace />} />
      <Route path="/dashboards/*" element={<Navigate to="/dashboard" replace />} />
      <Route path="/dashboard" element={<WeeklyDashboard />} />
      <Route path="/dashboard/command-center" element={<CommandCenter />} />
      <Route path="/dashboard/objects" element={<Navigate to="/objects" replace />} />

      {/* Objects MVP routes */}
      <Route path="/objects" element={<ObjectsHomePage />} />
      <Route path="/objects/:type" element={<ObjectListPage />} />
      <Route path="/objects/:type/:id" element={<ObjectDetailPage />} />
      <Route path="/dashboard/intelligence" element={<IntelligencePage />} />
      <Route path="/dashboard/context-os" element={<ContextOSPage />} />
      <Route path="/dashboard/revenue" element={<RevenueOverviewPage />} />
      <Route path="/dashboard/ask" element={<Navigate to="/dashboard/command-center" replace />} />
      <Route path="/dashboard/tasks" element={<TasksPage />} />
      <Route path="/dashboard/alerts" element={<AlertsPage />} />
      <Route path="/dashboard/impact-map" element={<ImpactMapPage />} />
      <Route path="/dashboard/system/health" element={<SystemHealthPage />} />
      <Route path="/dashboard/system/events" element={<EventMapPage />} />
      <Route path="/dashboard/system/event-matrix" element={<EventMatrixPage />} />
      <Route path="/dashboard/system/event-tests" element={<EventTestsPage />} />
      <Route path="/dashboard/system/dependencies" element={<DependenciesPage />} />
      <Route path="/dashboard/revenue-radar" element={<RevenueRadarPage />} />
      <Route path="/dashboard/kernel" element={<KernelMonitorPage />} />
      <Route path="/dashboard/sponsors" element={<SponsorsManagement />} />
      <Route path="/dashboard/metodo-vision" element={<VisionPage />} />
      <Route path="/dashboard/community" element={<Navigate to="/club/fastclub" replace />} />
      <Route path="/dashboard/blog" element={<BlogDashboard />} />
      <Route path="/dashboard/credits" element={<CreditHistoryPage />} />
      <Route path="/settings/credits" element={<CreditHistoryPage />} />

      {/* Settings */}
      <Route path="/dashboard/settings" element={<Navigate to="/settings" replace />} />
      <Route path="/dashboard/settings/:section" element={<Navigate to="/settings" replace />} />
      <Route path="/settings" element={<Settings />} />
      <Route path="/settings/data-model" element={<DataModelPage />} />
      <Route path="/settings/tags" element={<WorkspaceTagsPage />} />
      <Route path="/settings/billing-integrations" element={<BillingIntegrationsPage />} />
      <Route path="/dashboard/settings/billing-integrations" element={<BillingIntegrationsPage />} />
      <Route path="/settings/billing-integrations/sync" element={<BillingSyncPage />} />
      <Route path="/dashboard/settings/billing-integrations/sync" element={<BillingSyncPage />} />
      <Route path="/platform/data" element={<VisualDataModelPage />} />
      <Route path="/settings/:section" element={<Settings />} />
      <Route path="/settings/rgpd" element={<GDPRBackofficePage />} />
    </>
  );
}
