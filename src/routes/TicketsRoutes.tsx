import { lazy } from "react";
import { Route } from "react-router-dom";

const TicketsList = lazy(() => import("@/pages/dashboard/tickets/TicketsList"));
const TicketDetail = lazy(() => import("@/pages/dashboard/tickets/TicketDetail"));
const TicketsDashboard = lazy(() => import("@/pages/dashboard/tickets/TicketsDashboard"));
const TicketsSettings = lazy(() => import("@/pages/dashboard/tickets/TicketsSettings"));

export function TicketsRoutes() {
  return (
    <>
      <Route path="/dashboard/tickets" element={<TicketsList />} />
      <Route path="/dashboard/tickets/:id" element={<TicketDetail />} />
      <Route path="/dashboard/tickets/dashboard" element={<TicketsDashboard />} />
      <Route path="/dashboard/tickets/settings" element={<TicketsSettings />} />
    </>
  );
}
