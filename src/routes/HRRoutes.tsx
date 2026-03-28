import { lazy } from "react";
import { Route } from "react-router-dom";

const TimeClockPage = lazy(() => import("@/pages/dashboard/hr/TimeClockPage"));
const SessionTimePage = lazy(() => import("@/pages/dashboard/hr/SessionTimePage"));
const LeavePage = lazy(() => import("@/pages/dashboard/hr/LeavePage"));
const MyTimePage = lazy(() => import("@/pages/dashboard/hr/MyTimePage"));

export function HRRoutes() {
  return (
    <>
      <Route path="/dashboard/hr/time-clock" element={<TimeClockPage />} />
      <Route path="/dashboard/hr/session-time" element={<SessionTimePage />} />
      <Route path="/dashboard/hr/leave" element={<LeavePage />} />
      <Route path="/dashboard/hr/my-time" element={<MyTimePage />} />
    </>
  );
}
