import { useState } from "react";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { useOperationalDashboard, useDashboardAIInsights } from "@/hooks/useOperationalDashboard";
import { DashboardHeader } from "@/components/dashboard/DashboardHeader";
import { OperationalKPICards } from "@/components/dashboard/OperationalKPICards";
import { DashboardAIInsightsPanel } from "@/components/dashboard/DashboardAIInsightsPanel";
import { DashboardNextActionsPanel } from "@/components/dashboard/DashboardNextActionsPanel";
import { DashboardPipelineSummary } from "@/components/dashboard/DashboardPipelineSummary";
import { DashboardEfficiencyBlock } from "@/components/dashboard/DashboardEfficiencyBlock";
import { DashboardSmartAlerts } from "@/components/dashboard/DashboardSmartAlerts";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Users, HeadsetIcon, BarChart3 } from "lucide-react";
import { useUserRole } from "@/hooks/useUserRole";

type ViewPreset = "sales" | "support" | "manager";

const viewPresets: Record<ViewPreset, { label: string; icon: React.ReactNode }> = {
  sales: { label: "Vendas", icon: <Users className="w-4 h-4" /> },
  support: { label: "Suporte", icon: <HeadsetIcon className="w-4 h-4" /> },
  manager: { label: "Gestor", icon: <BarChart3 className="w-4 h-4" /> },
};

export default function Dashboard() {
  const { isAdmin, isSuperAdmin } = useUserRole();
  const [activeView, setActiveView] = useState<ViewPreset>(() => {
    // Default view based on user role
    if (isAdmin || isSuperAdmin) return "manager";
    return "sales";
  });

  const {
    kpis,
    pipelineSummary,
    efficiencyMetrics,
    userName,
    workspaceName,
    recentLeadNames,
    topOpportunity,
    isLoading,
  } = useOperationalDashboard();

  const {
    data: aiInsights,
    isLoading: aiLoading,
    refetch: refetchAI,
    isFetching: isRefreshingAI,
  } = useDashboardAIInsights(kpis, userName, workspaceName);

  // Get greeting and status from AI or fallback
  const greeting = aiInsights?.greeting || `Olá, ${userName}!`;
  const dayStatus = aiInsights?.dayStatus || "A carregar o resumo do dia...";
  const insights = aiInsights?.insights || [];
  const nextActions = aiInsights?.nextActions || [];

  return (
    <DashboardLayout>
      <ScrollArea className="h-[calc(100vh-5rem)]">
        <div className="space-y-6 pb-8">
          {/* Header Inteligente */}
          <DashboardHeader
            greeting={greeting}
            dayStatus={dayStatus}
            isLoading={isLoading || aiLoading}
          />

          {/* Vistas por Função */}
          <Tabs value={activeView} onValueChange={(v) => setActiveView(v as ViewPreset)}>
            <TabsList>
              {Object.entries(viewPresets).map(([key, preset]) => (
                <TabsTrigger key={key} value={key} className="gap-2">
                  {preset.icon}
                  {preset.label}
                </TabsTrigger>
              ))}
            </TabsList>
          </Tabs>

          {/* KPIs Operacionais */}
          <section>
            <h2 className="text-sm font-medium text-muted-foreground uppercase tracking-wider mb-3">
              Status Rápido
            </h2>
            <OperationalKPICards data={kpis} isLoading={isLoading} />
          </section>

          {/* Layout em grid para Insights e Ações */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Insights da IA */}
            <section>
              <DashboardAIInsightsPanel
                data={aiInsights}
                isLoading={aiLoading}
                onRefresh={() => refetchAI()}
                isRefreshing={isRefreshingAI}
              />
            </section>

            {/* Próximas Ações */}
            <section>
              <DashboardNextActionsPanel
                actions={nextActions}
                isLoading={aiLoading}
              />
            </section>
          </div>

          {/* Alertas Inteligentes (se existirem) */}
          <section>
            <h2 className="text-sm font-medium text-muted-foreground uppercase tracking-wider mb-3">
              Alertas
            </h2>
            <DashboardSmartAlerts maxAlerts={3} />
          </section>

          {/* Pipeline Resumido (visível para Vendas e Gestor) */}
          {(activeView === "sales" || activeView === "manager") && (
            <section>
              <DashboardPipelineSummary
                data={pipelineSummary}
                isLoading={isLoading}
              />
            </section>
          )}

          {/* Eficiência PARE (visível para Gestor) */}
          {activeView === "manager" && (
            <section>
              <DashboardEfficiencyBlock
                data={efficiencyMetrics}
                isLoading={isLoading}
              />
            </section>
          )}
        </div>
      </ScrollArea>
    </DashboardLayout>
  );
}
