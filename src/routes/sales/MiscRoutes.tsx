import { lazy } from "react";
import { Route, Navigate } from "react-router-dom";

const SchedulingPage = lazy(() => import("@/pages/SchedulingPage"));
const MeetingTranscriptPage = lazy(() => import("@/pages/MeetingTranscriptPage"));
const EventsManagementPage = lazy(() => import("@/components/events/EventsManagementPage"));
const EventDetailPage = lazy(() => import("@/components/events/EventDetailPage"));
const FeedPage = lazy(() => import("@/pages/FeedPage"));
const ProductivityPage = lazy(() => import("@/pages/ProductivityPage"));
const MemberPanelPage = lazy(() => import("@/pages/MemberPanelPage"));
const Profile = lazy(() => import("@/pages/Profile"));

export function SalesMiscRoutes() {
  return (
    <>
      <Route path="/dashboard/scheduling" element={<SchedulingPage />} />
      <Route path="/dashboard/calendars" element={<Navigate to="/dashboard/scheduling" replace />} />
      <Route path="/dashboard/meetings" element={<Navigate to="/dashboard/scheduling" replace />} />
      <Route path="/dashboard/services" element={<Navigate to="/dashboard/scheduling" replace />} />
      <Route path="/dashboard/availability" element={<Navigate to="/dashboard/scheduling" replace />} />
      <Route path="/dashboard/meetings/:meetingId/transcript" element={<MeetingTranscriptPage />} />
      <Route path="/dashboard/events" element={<EventsManagementPage />} />
      <Route path="/dashboard/events/:eventId" element={<EventDetailPage />} />
      <Route path="/dashboard/feed" element={<FeedPage />} />
      <Route path="/dashboard/productivity" element={<ProductivityPage />} />
      <Route path="/dashboard/member" element={<MemberPanelPage />} />
      <Route path="/dashboard/profile" element={<Profile />} />
    </>
  );
}
