import { lazy } from "react";
import { Route } from "react-router-dom";
import { CapabilityGuard } from "@/components/guards/CapabilityGuard";

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
const TalentSearchPage = lazy(() => import("@/pages/dashboard/hr/recruitment/TalentSearchPage"));
const RecruitmentAnalyticsPage = lazy(() => import("@/pages/dashboard/hr/recruitment/RecruitmentAnalyticsPage"));

// Performance & OKRs pages
const HROKRsPage = lazy(() => import("@/pages/dashboard/hr/HROKRsPage"));
const HRFeedbackPage = lazy(() => import("@/pages/dashboard/hr/HRFeedbackPage"));
const HRCheckinsPage = lazy(() => import("@/pages/dashboard/hr/HRCheckinsPage"));
const HRPerformanceReviewsPage = lazy(() => import("@/pages/dashboard/hr/HRPerformanceReviewsPage"));

export function HRRoutes() {
  return (
    <>
      {/* HR module routes */}
      <Route path="/dashboard/hr" element={<CapabilityGuard need="hr.access"><HRDashboardPage /></CapabilityGuard>} />
      <Route path="/dashboard/hr/employees" element={<CapabilityGuard need="hr.access"><HREmployeesPage /></CapabilityGuard>} />
      <Route path="/dashboard/hr/employees/:id" element={<CapabilityGuard need="hr.access"><HREmployeeDetailPage /></CapabilityGuard>} />
      <Route path="/dashboard/hr/departments" element={<CapabilityGuard need="hr.access"><HRDepartmentsPage /></CapabilityGuard>} />
      <Route path="/dashboard/hr/positions" element={<CapabilityGuard need="hr.access"><HRPositionsPage /></CapabilityGuard>} />
      <Route path="/dashboard/hr/time-tracking" element={<CapabilityGuard need="hr.access"><HRTimeTrackingPage /></CapabilityGuard>} />
      <Route path="/dashboard/hr/schedules" element={<CapabilityGuard need="hr.access"><HRSchedulesPage /></CapabilityGuard>} />
      <Route path="/dashboard/hr/absences" element={<CapabilityGuard need="hr.access"><HRAbsencesPage /></CapabilityGuard>} />
      <Route path="/dashboard/hr/kiosk" element={<CapabilityGuard need="hr.access"><HRKioskPage /></CapabilityGuard>} />
      <Route path="/dashboard/hr/settings" element={<CapabilityGuard need="hr.access"><HRSettingsPage /></CapabilityGuard>} />
      <Route path="/dashboard/hr/onboarding" element={<CapabilityGuard need="hr.access"><HROnboardingPage /></CapabilityGuard>} />

      {/* Recruitment routes */}
      <Route path="/dashboard/hr/recruitment" element={<CapabilityGuard need="hr.access"><RecruitmentDashboardPage /></CapabilityGuard>} />
      <Route path="/dashboard/hr/recruitment/jobs" element={<CapabilityGuard need="hr.access"><JobOpeningsPage /></CapabilityGuard>} />
      <Route path="/dashboard/hr/recruitment/jobs/:id" element={<CapabilityGuard need="hr.access"><JobOpeningDetailPage /></CapabilityGuard>} />
      <Route path="/dashboard/hr/recruitment/candidates" element={<CapabilityGuard need="hr.access"><CandidatesPage /></CapabilityGuard>} />
      <Route path="/dashboard/hr/recruitment/candidates/:id" element={<CapabilityGuard need="hr.access"><CandidateDetailPage /></CapabilityGuard>} />
      <Route path="/dashboard/hr/recruitment/interviews" element={<CapabilityGuard need="hr.access"><InterviewsPage /></CapabilityGuard>} />
      <Route path="/dashboard/hr/recruitment/talent-search" element={<CapabilityGuard need="hr.access"><TalentSearchPage /></CapabilityGuard>} />
      <Route path="/dashboard/hr/recruitment/analytics" element={<CapabilityGuard need="hr.access"><RecruitmentAnalyticsPage /></CapabilityGuard>} />

      {/* Performance & OKRs routes */}
      <Route path="/dashboard/hr/okrs" element={<CapabilityGuard need="hr.access"><HROKRsPage /></CapabilityGuard>} />
      <Route path="/dashboard/hr/feedback" element={<CapabilityGuard need="hr.access"><HRFeedbackPage /></CapabilityGuard>} />
      <Route path="/dashboard/hr/checkins" element={<CapabilityGuard need="hr.access"><HRCheckinsPage /></CapabilityGuard>} />
      <Route path="/dashboard/hr/reviews" element={<CapabilityGuard need="hr.access"><HRPerformanceReviewsPage /></CapabilityGuard>} />
    </>
  );
}
