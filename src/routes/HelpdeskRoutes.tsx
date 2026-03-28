import { lazy } from "react";
import { Route } from "react-router-dom";

const HelpdeskDashboard = lazy(() => import("@/pages/dashboard/helpdesk/HelpdeskDashboard"));
const HelpdeskTicketsList = lazy(() => import("@/pages/dashboard/helpdesk/HelpdeskTicketsList"));
const HelpdeskTicketDetail = lazy(() => import("@/pages/dashboard/helpdesk/HelpdeskTicketDetail"));
const HelpdeskCannedResponses = lazy(() => import("@/pages/dashboard/helpdesk/HelpdeskCannedResponses"));

export function HelpdeskRoutes() {
  return (
    <>
      <Route path="/dashboard/helpdesk" element={<HelpdeskDashboard />} />
      <Route path="/dashboard/helpdesk/tickets" element={<HelpdeskTicketsList />} />
      <Route path="/dashboard/helpdesk/tickets/:id" element={<HelpdeskTicketDetail />} />
      <Route path="/dashboard/helpdesk/canned-responses" element={<HelpdeskCannedResponses />} />
    </>
  );
}
