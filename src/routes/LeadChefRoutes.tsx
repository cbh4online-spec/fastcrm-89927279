import { lazy } from "react";
import { Route, Navigate } from "react-router-dom";

const LeadChefTodayPage = lazy(() => import("@/pages/leadchef/LeadChefTodayPage"));
const LeadChefLeadsPage = lazy(() => import("@/pages/leadchef/LeadChefLeadsPage"));
const LeadChefAgendaPage = lazy(() => import("@/pages/leadchef/LeadChefAgendaPage"));
const LeadChefClientesPage = lazy(() => import("@/pages/leadchef/LeadChefClientesPage"));
const LeadChefObjetivosPage = lazy(() => import("@/pages/leadchef/LeadChefObjetivosPage"));

export function LeadChefRoutes() {
  return (
    <>
      <Route path="/dashboard/leadchef" element={<Navigate to="/dashboard/leadchef/today" replace />} />
      <Route path="/dashboard/leadchef/today" element={<LeadChefTodayPage />} />
      <Route path="/dashboard/leadchef/leads" element={<LeadChefLeadsPage />} />
      <Route path="/dashboard/leadchef/agenda" element={<LeadChefAgendaPage />} />
      <Route path="/dashboard/leadchef/clientes" element={<LeadChefClientesPage />} />
      <Route path="/dashboard/leadchef/objetivos" element={<LeadChefObjetivosPage />} />
    </>
  );
}
