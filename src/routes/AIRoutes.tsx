import { lazy } from "react";
import { Route, Navigate } from "react-router-dom";

const AIAssistants = lazy(() => import("@/pages/AIAssistants"));
const ConversationalEngine = lazy(() => import("@/pages/ConversationalEngine"));
const AIEmployeesPage = lazy(() => import("@/pages/AIEmployeesPage"));
const AIEmployeeNewPage = lazy(() => import("@/pages/AIEmployeeNewPage"));
const AIEmployeeDetailPage = lazy(() => import("@/pages/AIEmployeeDetailPage"));
const AISalesCoachPage = lazy(() => import("@/pages/AISalesCoachPage"));
const AIAgentsPage = lazy(() => import("@/pages/AIAgentsPage"));
const AIAgentJobDetailPage = lazy(() => import("@/pages/AIAgentJobDetailPage"));
const AIAgentExecutionsPage = lazy(() => import("@/pages/AIAgentExecutionsPage"));
const AIDocumentOCRPage = lazy(() => import("@/pages/AIDocumentOCRPage"));
const IMOAIPage = lazy(() => import("@/pages/IMOAIPage"));
const AISettingsPage = lazy(() => import("@/pages/AISettingsPage"));
const AIUsagePage = lazy(() => import("@/pages/AIUsagePage"));
const AIOperationsCenterPage = lazy(() => import("@/pages/AIOperationsCenterPage"));
const CEOCopilotPage = lazy(() => import("@/pages/CEOCopilotPage"));
const KnowledgeBase = lazy(() => import("@/pages/KnowledgeBase"));
const AISuggestionsPage = lazy(() => import("@/pages/AISuggestionsPage"));
const AgentOperationsPage = lazy(() => import("@/pages/AgentOperationsPage"));
const OptimizationCenterPage = lazy(() => import("@/pages/OptimizationCenterPage"));
const ActionExecutionsPage = lazy(() => import("@/pages/ActionExecutionsPage"));
const ObjectiveCenterPage = lazy(() => import("@/pages/ObjectiveCenterPage"));
const WorkspaceOpsPage = lazy(() => import("@/pages/WorkspaceOpsPage"));
const MemoryCenterPage = lazy(() => import("@/pages/MemoryCenterPage"));
const ForecastCenterPage = lazy(() => import("@/pages/ForecastCenterPage"));
const StrategyCenterPage = lazy(() => import("@/pages/StrategyCenterPage"));
const BoardCenterPage = lazy(() => import("@/pages/BoardCenterPage"));
const PortfolioCenterPage = lazy(() => import("@/pages/PortfolioCenterPage"));
const LedgerCenterPage = lazy(() => import("@/pages/LedgerCenterPage"));
const ControlTowerPage = lazy(() => import("@/pages/ControlTowerPage"));

export function AIRoutes() {
  return (
    <>
      <Route path="/dashboard/knowledge" element={<KnowledgeBase />} />
      <Route path="/dashboard/knowledge-base" element={<Navigate to="/dashboard/ai-assistants" replace />} />
      <Route path="/dashboard/ai-profiles" element={<Navigate to="/dashboard/ai-assistants" replace />} />
      <Route path="/dashboard/ai-assistants" element={<AIAssistants />} />
      <Route path="/dashboard/conversational-engine" element={<ConversationalEngine />} />
      <Route path="/dashboard/ai-employees" element={<AIEmployeesPage />} />
      <Route path="/dashboard/ai-employees/new" element={<AIEmployeeNewPage />} />
      <Route path="/dashboard/ai-employees/:botId" element={<AIEmployeeDetailPage />} />
      <Route path="/dashboard/ai-employees/:botId/analytics" element={<AIEmployeeDetailPage />} />
      <Route path="/dashboard/ai-suggestions" element={<AISuggestionsPage />} />
      <Route path="/dashboard/ai-sales-coach" element={<AISalesCoachPage />} />
      <Route path="/dashboard/ai-agents" element={<AIAgentsPage />} />
      <Route path="/dashboard/ai-agents/executions" element={<AIAgentExecutionsPage />} />
      <Route path="/dashboard/ai-agents/:id" element={<AIAgentJobDetailPage />} />
      <Route path="/dashboard/ai-document-ocr" element={<AIDocumentOCRPage />} />
      <Route path="/dashboard/imo-ai" element={<IMOAIPage />} />
      <Route path="/dashboard/ai-settings" element={<AISettingsPage />} />
      <Route path="/dashboard/ai-usage" element={<AIUsagePage />} />
      <Route path="/dashboard/ai-operations" element={<AIOperationsCenterPage />} />
      <Route path="/dashboard/ceo-copilot" element={<CEOCopilotPage />} />
      <Route path="/dashboard/agent-ops" element={<AgentOperationsPage />} />
      <Route path="/dashboard/optimization" element={<OptimizationCenterPage />} />
      <Route path="/dashboard/actions" element={<ActionExecutionsPage />} />
      <Route path="/dashboard/objectives" element={<ObjectiveCenterPage />} />
      <Route path="/dashboard/workspace-ops" element={<WorkspaceOpsPage />} />
      <Route path="/dashboard/memory" element={<MemoryCenterPage />} />
      <Route path="/dashboard/forecast" element={<ForecastCenterPage />} />
      <Route path="/dashboard/strategy" element={<StrategyCenterPage />} />
      <Route path="/dashboard/board" element={<BoardCenterPage />} />
      <Route path="/dashboard/portfolio" element={<PortfolioCenterPage />} />
      <Route path="/dashboard/ledger" element={<LedgerCenterPage />} />
      <Route path="/dashboard/control-tower" element={<ControlTowerPage />} />
    </>
  );
}
