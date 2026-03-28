import { lazy } from "react";
import { Route, Navigate } from "react-router-dom";

const FastCRMLanding = lazy(() => import("@/pages/FastCRMLanding"));
const Login = lazy(() => import("@/pages/Login"));
const Signup = lazy(() => import("@/pages/Signup"));
const Auth = lazy(() => import("@/pages/Auth"));
const ForgotPassword = lazy(() => import("@/pages/ForgotPassword"));
const Onboarding = lazy(() => import("@/pages/Onboarding"));
const WeeklyDashboard = lazy(() => import("@/pages/WeeklyDashboard"));
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
const KernelMonitorPage = lazy(() => import("@/pages/KernelMonitorPage"));
const GenerateLandingImages = lazy(() => import("@/pages/GenerateLandingImages"));
const ProposalView = lazy(() => import("@/pages/ProposalView"));

export function DashboardCoreRoutes() {
  return (
    <>
      {/* Main Routes */}
      <Route path="/" element={<FastCRMLanding />} />
      <Route path="/fastcrm" element={<FastCRMLanding />} />
      <Route path="/admin/generate-landing-images" element={<GenerateLandingImages />} />
      <Route path="/proposal/:id" element={<ProposalView />} />
      <Route path="/login" element={<Login />} />
      <Route path="/signup" element={<Signup />} />
      <Route path="/auth" element={<Auth />} />
      <Route path="/forgot-password" element={<ForgotPassword />} />
      <Route path="/onboarding" element={<Onboarding />} />
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

      {/* Settings */}
      <Route path="/dashboard/settings" element={<Navigate to="/settings" replace />} />
      <Route path="/dashboard/settings/:section" element={<Navigate to="/settings" replace />} />
      <Route path="/settings" element={<Settings />} />
      <Route path="/settings/data-model" element={<DataModelPage />} />
      <Route path="/settings/tags" element={<WorkspaceTagsPage />} />
      <Route path="/platform/data" element={<VisualDataModelPage />} />
      <Route path="/settings/:section" element={<Settings />} />
    </>
  );
}
