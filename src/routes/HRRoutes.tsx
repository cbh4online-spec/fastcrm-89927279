import { lazy } from "react";
import { Route } from "react-router-dom";

// HR module pages
const HRDashboardPage = lazy(() => import("@/pages/dashboard/hr/HRDashboardPage"));
const HREmployeesPage = lazy(() => import("@/pages/dashboard/hr/HREmployeesPage"));
const HREmployeeDetailPage = lazy(() => import("@/pages/dashboard/hr/HREmployeeDetailPage"));
const HRDepartmentsPage = lazy(() => import("@/pages/dashboard/hr/HRDepartmentsPage"));
const HRPositionsPage = lazy(() => import("@/pages/dashboard/hr/HRPositionsPage"));
const HRTimeTrackingPage = lazy(() => import("@/pages/dashboard/hr/HRTimeTrackingPage"));
const HRSchedulesPage = lazy(() => import("@/pages/dashboard/hr/HRSchedulesPage"));
const HRAbsencesPage = lazy(() => import("@/pages/dashboard/hr/HRAbsencesPage"));
const HRKioskPage = lazy(() => import("@/pages/dashboard/hr/HRKioskPage"));
const HRSettingsPage = lazy(() => import("@/pages/dashboard/hr/HRSettingsPage"));
const HROnboardingPage = lazy(() => import("@/pages/dashboard/hr/HROnboardingPage"));

// Recruitment pages
const RecruitmentDashboardPage = lazy(() => import("@/pages/dashboard/hr/recruitment/RecruitmentDashboardPage"));
const JobOpeningsPage = lazy(() => import("@/pages/dashboard/hr/recruitment/JobOpeningsPage"));
const JobOpeningDetailPage = lazy(() => import("@/pages/dashboard/hr/recruitment/JobOpeningDetailPage"));
const CandidatesPage = lazy(() => import("@/pages/dashboard/hr/recruitment/CandidatesPage"));
const CandidateDetailPage = lazy(() => import("@/pages/dashboard/hr/recruitment/CandidateDetailPage"));
const InterviewsPage = lazy(() => import("@/pages/dashboard/hr/recruitment/InterviewsPage"));

// Performance & OKRs pages
const HROKRsPage = lazy(() => import("@/pages/dashboard/hr/HROKRsPage"));
const HRFeedbackPage = lazy(() => import("@/pages/dashboard/hr/HRFeedbackPage"));
const HRCheckinsPage = lazy(() => import("@/pages/dashboard/hr/HRCheckinsPage"));
const HRPerformanceReviewsPage = lazy(() => import("@/pages/dashboard/hr/HRPerformanceReviewsPage"));

export function HRRoutes() {
  return (
    <>
      {/* HR module routes */}
      <Route path="/dashboard/hr" element={<HRDashboardPage />} />
      <Route path="/dashboard/hr/employees" element={<HREmployeesPage />} />
      <Route path="/dashboard/hr/employees/:id" element={<HREmployeeDetailPage />} />
      <Route path="/dashboard/hr/departments" element={<HRDepartmentsPage />} />
      <Route path="/dashboard/hr/positions" element={<HRPositionsPage />} />
      <Route path="/dashboard/hr/time-tracking" element={<HRTimeTrackingPage />} />
      <Route path="/dashboard/hr/schedules" element={<HRSchedulesPage />} />
      <Route path="/dashboard/hr/absences" element={<HRAbsencesPage />} />
      <Route path="/dashboard/hr/kiosk" element={<HRKioskPage />} />
      <Route path="/dashboard/hr/settings" element={<HRSettingsPage />} />
      <Route path="/dashboard/hr/onboarding" element={<HROnboardingPage />} />

      {/* Recruitment routes */}
      <Route path="/dashboard/hr/recruitment" element={<RecruitmentDashboardPage />} />
      <Route path="/dashboard/hr/recruitment/jobs" element={<JobOpeningsPage />} />
      <Route path="/dashboard/hr/recruitment/jobs/:id" element={<JobOpeningDetailPage />} />
      <Route path="/dashboard/hr/recruitment/candidates" element={<CandidatesPage />} />
      <Route path="/dashboard/hr/recruitment/candidates/:id" element={<CandidateDetailPage />} />
      <Route path="/dashboard/hr/recruitment/interviews" element={<InterviewsPage />} />

      {/* Performance & OKRs routes */}
      <Route path="/dashboard/hr/okrs" element={<HROKRsPage />} />
      <Route path="/dashboard/hr/feedback" element={<HRFeedbackPage />} />
      <Route path="/dashboard/hr/checkins" element={<HRCheckinsPage />} />
      <Route path="/dashboard/hr/reviews" element={<HRPerformanceReviewsPage />} />
    </>
  );
}
