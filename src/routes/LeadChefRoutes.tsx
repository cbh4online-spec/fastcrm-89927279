import { lazy } from "react";
import { Route, Navigate } from "react-router-dom";

const LeadChefTodayPage = lazy(() => import("@/pages/leadchef/LeadChefTodayPage"));
const LeadChefLeadsPage = lazy(() => import("@/pages/leadchef/LeadChefLeadsPage"));
const LeadChefLeadDetailPage = lazy(() => import("@/pages/leadchef/LeadChefLeadDetailPage"));
const LeadChefAgendaPage = lazy(() => import("@/pages/leadchef/LeadChefAgendaPage"));
const LeadChefClientesPage = lazy(() => import("@/pages/leadchef/LeadChefClientesPage"));
const LeadChefClienteDetailPage = lazy(() => import("@/pages/leadchef/LeadChefClienteDetailPage"));
const LeadChefReferenciasPage = lazy(() => import("@/pages/leadchef/LeadChefReferenciasPage"));
const LeadChefReferenciaDetailPage = lazy(() => import("@/pages/leadchef/LeadChefReferenciaDetailPage"));
const LeadChefObjetivosPage = lazy(() => import("@/pages/leadchef/LeadChefObjetivosPage"));
const LeadChefEquipaPage = lazy(() => import("@/pages/leadchef/LeadChefEquipaPage"));
const LeadChefAgentDetailPage = lazy(() => import("@/pages/leadchef/LeadChefAgentDetailPage"));
const LeadChefPermissoesPage = lazy(() => import("@/pages/leadchef/LeadChefPermissoesPage"));
const LeadChefTemplatesPage = lazy(() => import("@/pages/leadchef/LeadChefTemplatesPage"));
const LeadChefAutomacoesPage = lazy(() => import("@/pages/leadchef/LeadChefAutomacoesPage"));
const LeadChefSettingsPage = lazy(() => import("@/pages/leadchef/LeadChefSettingsPage"));

export function LeadChefRoutes() {
  return (
    <>
      <Route path="/dashboard/leadchef" element={<Navigate to="/dashboard/leadchef/today" replace />} />
      <Route path="/dashboard/leadchef/today" element={<LeadChefTodayPage />} />
      <Route path="/dashboard/leadchef/leads" element={<LeadChefLeadsPage />} />
      <Route path="/dashboard/leadchef/leads/:leadId" element={<LeadChefLeadDetailPage />} />
      <Route path="/dashboard/leadchef/agenda" element={<LeadChefAgendaPage />} />
      <Route path="/dashboard/leadchef/clientes" element={<LeadChefClientesPage />} />
      <Route path="/dashboard/leadchef/clientes/:leadId" element={<LeadChefClienteDetailPage />} />
      <Route path="/dashboard/leadchef/referencias" element={<LeadChefReferenciasPage />} />
      <Route path="/dashboard/leadchef/referencias/:referralId" element={<LeadChefReferenciaDetailPage />} />
      <Route path="/dashboard/leadchef/objetivos" element={<LeadChefObjetivosPage />} />
      <Route path="/dashboard/leadchef/equipa" element={<LeadChefEquipaPage />} />
      <Route path="/dashboard/leadchef/equipa/:userId" element={<LeadChefAgentDetailPage />} />
      <Route path="/dashboard/leadchef/permissoes" element={<LeadChefPermissoesPage />} />
      <Route path="/dashboard/leadchef/templates" element={<LeadChefTemplatesPage />} />
      <Route path="/dashboard/leadchef/automacoes" element={<LeadChefAutomacoesPage />} />
      <Route path="/dashboard/leadchef/ferramentas" element={<LeadChefSettingsPage />} />
      <Route path="/dashboard/leadchef/importar" element={<Navigate to="/dashboard/leadchef/ferramentas?tab=importar" replace />} />
      <Route path="/dashboard/leadchef/exportar" element={<Navigate to="/dashboard/leadchef/ferramentas?tab=exportar" replace />} />
      <Route path="/dashboard/leadchef/integracoes" element={<Navigate to="/dashboard/leadchef/ferramentas?tab=integracoes" replace />} />
      <Route path="/dashboard/leadchef/auditoria" element={<Navigate to="/dashboard/leadchef/ferramentas?tab=auditoria" replace />} />
    </>
  );
}
