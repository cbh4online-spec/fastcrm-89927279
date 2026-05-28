import { lazy } from "react";
import { Route } from "react-router-dom";

const ReportsOverview = lazy(() => import("@/pages/ReportsOverview"));
const ReportsForecasts = lazy(() => import("@/pages/ReportsForecasts"));
const ReportsConsumption = lazy(() => import("@/pages/ReportsConsumption"));
const ReportsRetention = lazy(() => import("@/pages/ReportsRetention"));
const ReportsKPIs = lazy(() => import("@/pages/ReportsKPIs"));
const ReportsGrowth = lazy(() => import("@/pages/ReportsGrowth"));
const ReportsSales = lazy(() => import("@/pages/ReportsSales"));
const ReportsDashboards = lazy(() => import("@/pages/ReportsDashboards"));
const ReportDashboardView = lazy(() => import("@/pages/ReportDashboardView"));
const ReportsGoals = lazy(() => import("@/pages/ReportsGoals"));
const ReportsFinancial = lazy(() => import("@/pages/ReportsFinancial"));

export function ReportsRoutes() {
  return (
    <>
      <Route path="/dashboard/reports" element={<ReportsOverview />} />
      <Route path="/dashboard/reports/forecasts" element={<ReportsForecasts />} />
      <Route path="/dashboard/reports/consumption" element={<ReportsConsumption />} />
      <Route path="/dashboard/reports/retention" element={<ReportsRetention />} />
      <Route path="/dashboard/reports/kpis" element={<ReportsKPIs />} />
      <Route path="/dashboard/reports/growth" element={<ReportsGrowth />} />
      <Route path="/dashboard/reports/sales" element={<ReportsSales />} />
      <Route path="/dashboard/reports/financial" element={<ReportsFinancial />} />
      <Route path="/dashboard/reports/goals" element={<ReportsGoals />} />
      <Route path="/dashboard/reports/dashboards" element={<ReportsDashboards />} />
      <Route path="/dashboard/reports/dashboards/:id" element={<ReportDashboardView />} />
    </>
  );
}
