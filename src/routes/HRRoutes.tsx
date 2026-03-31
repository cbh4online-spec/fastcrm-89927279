import { lazy } from "react";
import { Route } from "react-router-dom";

const TimeClockPage = lazy(() => import("@/pages/dashboard/hr/TimeClockPage"));
const SessionTimePage = lazy(() => import("@/pages/dashboard/hr/SessionTimePage"));
const LeavePage = lazy(() => import("@/pages/dashboard/hr/LeavePage"));
const MyTimePage = lazy(() => import("@/pages/dashboard/hr/MyTimePage"));

// New HR module pages
const HRDashboardPage = lazy(() => import("@/pages/dashboard/hr/HRDashboardPage"));
const HREmployeesPage = lazy(() => import("@/pages/dashboard/hr/HREmployeesPage"));
const HREmployeeDetailPage = lazy(() => import("@/pages/dashboard/hr/HREmployeeDetailPage"));
const HRTimeTrackingPage = lazy(() => import("@/pages/dashboard/hr/HRTimeTrackingPage"));
const HRSchedulesPage = lazy(() => import("@/pages/dashboard/hr/HRSchedulesPage"));
const HRAbsencesPage = lazy(() => import("@/pages/dashboard/hr/HRAbsencesPage"));
const HRKioskPage = lazy(() => import("@/pages/dashboard/hr/HRKioskPage"));

export function HRRoutes() {
  return (
    <>
      {/* Legacy HR routes */}
      <Route path="/dashboard/hr/time-clock" element={<TimeClockPage />} />
      <Route path="/dashboard/hr/session-time" element={<SessionTimePage />} />
      <Route path="/dashboard/hr/leave" element={<LeavePage />} />
      <Route path="/dashboard/hr/my-time" element={<MyTimePage />} />

      {/* New HR module routes */}
      <Route path="/dashboard/hr" element={<HRDashboardPage />} />
      <Route path="/dashboard/hr/employees" element={<HREmployeesPage />} />
      <Route path="/dashboard/hr/employees/:id" element={<HREmployeeDetailPage />} />
      <Route path="/dashboard/hr/time-tracking" element={<HRTimeTrackingPage />} />
      <Route path="/dashboard/hr/schedules" element={<HRSchedulesPage />} />
      <Route path="/dashboard/hr/absences" element={<HRAbsencesPage />} />
      <Route path="/dashboard/hr/kiosk" element={<HRKioskPage />} />
    </>
  );
}
