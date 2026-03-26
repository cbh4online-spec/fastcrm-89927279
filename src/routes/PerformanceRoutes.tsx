import { lazy } from "react";
import { Route } from "react-router-dom";

const PerformanceDashboardPage = lazy(() => import("@/pages/performance/PerformanceDashboardPage"));
const PerformanceGoalsPage = lazy(() => import("@/pages/performance/PerformanceGoalsPage"));
const PerformanceLeaderboardPage = lazy(() => import("@/pages/performance/PerformanceLeaderboardPage"));
const PerformanceChallengesPage = lazy(() => import("@/pages/performance/PerformanceChallengesPage"));
const PerformanceRecognitionPage = lazy(() => import("@/pages/performance/PerformanceRecognitionPage"));
const PerformanceTVModePage = lazy(() => import("@/pages/performance/PerformanceTVModePage"));
const PerformanceSettingsPage = lazy(() => import("@/pages/performance/PerformanceSettingsPage"));

export function PerformanceRoutes() {
  return (
    <>
      <Route path="/dashboard/performance" element={<PerformanceDashboardPage />} />
      <Route path="/dashboard/performance/goals" element={<PerformanceGoalsPage />} />
      <Route path="/dashboard/performance/leaderboard" element={<PerformanceLeaderboardPage />} />
      <Route path="/dashboard/performance/challenges" element={<PerformanceChallengesPage />} />
      <Route path="/dashboard/performance/recognition" element={<PerformanceRecognitionPage />} />
      <Route path="/dashboard/performance/tv-mode" element={<PerformanceTVModePage />} />
      <Route path="/dashboard/performance/settings" element={<PerformanceSettingsPage />} />
    </>
  );
}
