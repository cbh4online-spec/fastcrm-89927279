import { lazy } from "react";
import { Route } from "react-router-dom";
import { SJLayout } from "@/components/student-journey";

const SJDashboard = lazy(() => import("@/pages/student-journey/SJDashboard"));
const SJActivationDashboard = lazy(() => import("@/pages/student-journey/SJActivationDashboard"));
const SJProfiles = lazy(() => import("@/pages/student-journey/SJProfiles"));
const SJProfileDetail = lazy(() => import("@/pages/student-journey/SJProfileDetail"));
const SJCourses = lazy(() => import("@/pages/student-journey/SJCourses"));
const SJCohorts = lazy(() => import("@/pages/student-journey/SJCohorts"));
const SJCohortDetail = lazy(() => import("@/pages/student-journey/SJCohortDetail"));

export function StudentJourneyRoutes() {
  return (
    <>
      <Route path="/dashboard/student-journey" element={<SJLayout><SJDashboard /></SJLayout>} />
      <Route path="/dashboard/student-journey/activation" element={<SJLayout><SJActivationDashboard /></SJLayout>} />
      <Route path="/dashboard/student-journey/profiles" element={<SJLayout><SJProfiles /></SJLayout>} />
      <Route path="/dashboard/student-journey/profiles/:id" element={<SJLayout><SJProfileDetail /></SJLayout>} />
      <Route path="/dashboard/student-journey/courses" element={<SJLayout><SJCourses /></SJLayout>} />
      <Route path="/dashboard/student-journey/cohorts" element={<SJLayout><SJCohorts /></SJLayout>} />
      <Route path="/dashboard/student-journey/cohorts/:id" element={<SJLayout><SJCohortDetail /></SJLayout>} />
    </>
  );
}
