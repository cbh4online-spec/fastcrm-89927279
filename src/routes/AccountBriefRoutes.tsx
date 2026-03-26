import { lazy } from "react";
import { Route } from "react-router-dom";

const AccountBriefDashboardPage = lazy(() => import("@/pages/AccountBriefDashboardPage"));
const AccountBriefOnboardingPage = lazy(() => import("@/pages/AccountBriefOnboardingPage"));
const AccountBriefAccountsPage = lazy(() => import("@/pages/AccountBriefAccountsPage"));
const AccountBriefAccountDetailPage = lazy(() => import("@/pages/AccountBriefAccountDetailPage"));
const AccountBriefAnalysisPage = lazy(() => import("@/pages/AccountBriefAnalysisPage"));
const AccountBriefSettingsPage = lazy(() => import("@/pages/AccountBriefSettingsPage"));
const AccountBriefAdminPage = lazy(() => import("@/pages/AccountBriefAdminPage"));
const AccountBriefWatchlistPage = lazy(() => import("@/pages/AccountBriefWatchlistPage"));
const AccountBriefAlertsPage = lazy(() => import("@/pages/AccountBriefAlertsPage"));
const AccountBriefSegmentsPage = lazy(() => import("@/pages/AccountBriefSegmentsPage"));
const AccountBriefComparePage = lazy(() => import("@/pages/AccountBriefComparePage"));
const AccountBriefNotificationsPage = lazy(() => import("@/pages/AccountBriefNotificationsPage"));
const AccountBriefBatchOpsPage = lazy(() => import("@/pages/AccountBriefBatchOpsPage"));
const AccountBriefKPIsPage = lazy(() => import("@/pages/AccountBriefKPIsPage"));
const AccountBriefScoreAdminPage = lazy(() => import("@/pages/AccountBriefScoreAdminPage"));
const AccountBriefTrialDemoPage = lazy(() => import("@/pages/AccountBriefTrialDemoPage"));
const AccountBriefHealthPage = lazy(() => import("@/pages/AccountBriefHealthPage"));

export function AccountBriefRoutes() {
  return (
    <>
      <Route path="/dashboard/account-brief" element={<AccountBriefDashboardPage />} />
      <Route path="/dashboard/account-brief/onboarding" element={<AccountBriefOnboardingPage />} />
      <Route path="/dashboard/account-brief/accounts" element={<AccountBriefAccountsPage />} />
      <Route path="/dashboard/account-brief/accounts/:id" element={<AccountBriefAccountDetailPage />} />
      <Route path="/dashboard/account-brief/analysis" element={<AccountBriefAnalysisPage />} />
      <Route path="/dashboard/account-brief/settings" element={<AccountBriefSettingsPage />} />
      <Route path="/dashboard/account-brief/watchlist" element={<AccountBriefWatchlistPage />} />
      <Route path="/dashboard/account-brief/alerts" element={<AccountBriefAlertsPage />} />
      <Route path="/dashboard/account-brief/segments" element={<AccountBriefSegmentsPage />} />
      <Route path="/dashboard/account-brief/compare" element={<AccountBriefComparePage />} />
      <Route path="/dashboard/account-brief/notifications" element={<AccountBriefNotificationsPage />} />
      <Route path="/dashboard/account-brief/batch" element={<AccountBriefBatchOpsPage />} />
      <Route path="/dashboard/account-brief/kpis" element={<AccountBriefKPIsPage />} />
      <Route path="/dashboard/account-brief/score-admin" element={<AccountBriefScoreAdminPage />} />
      <Route path="/dashboard/account-brief/trial-demo" element={<AccountBriefTrialDemoPage />} />
      <Route path="/dashboard/account-brief/health" element={<AccountBriefHealthPage />} />
      <Route path="/dashboard/admin/account-brief" element={<AccountBriefAdminPage />} />
    </>
  );
}
