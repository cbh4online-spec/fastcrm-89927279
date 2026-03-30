import { lazy } from "react";
import { Route } from "react-router-dom";

const HelpdeskDashboard = lazy(() => import("@/pages/dashboard/helpdesk/HelpdeskDashboard"));
const HelpdeskTicketsList = lazy(() => import("@/pages/dashboard/helpdesk/HelpdeskTicketsList"));
const HelpdeskTicketDetail = lazy(() => import("@/pages/dashboard/helpdesk/HelpdeskTicketDetail"));
const HelpdeskCannedResponses = lazy(() => import("@/pages/dashboard/helpdesk/HelpdeskCannedResponses"));
const HelpdeskSLAPolicies = lazy(() => import("@/pages/dashboard/helpdesk/HelpdeskSLAPolicies"));
const HelpdeskAutomations = lazy(() => import("@/pages/dashboard/helpdesk/HelpdeskAutomations"));
const HelpdeskKnowledgeBase = lazy(() => import("@/pages/dashboard/helpdesk/HelpdeskKnowledgeBase"));
const HelpdeskCSAT = lazy(() => import("@/pages/dashboard/helpdesk/HelpdeskCSAT"));

export function HelpdeskRoutes() {
  return (
    <>
      <Route path="/dashboard/helpdesk" element={<HelpdeskDashboard />} />
      <Route path="/dashboard/helpdesk/tickets" element={<HelpdeskTicketsList />} />
      <Route path="/dashboard/helpdesk/tickets/:id" element={<HelpdeskTicketDetail />} />
      <Route path="/dashboard/helpdesk/canned-responses" element={<HelpdeskCannedResponses />} />
      <Route path="/dashboard/helpdesk/sla-policies" element={<HelpdeskSLAPolicies />} />
      <Route path="/dashboard/helpdesk/automations" element={<HelpdeskAutomations />} />
      <Route path="/dashboard/helpdesk/knowledge-base" element={<HelpdeskKnowledgeBase />} />
      <Route path="/dashboard/helpdesk/csat" element={<HelpdeskCSAT />} />
    </>
  );
}
