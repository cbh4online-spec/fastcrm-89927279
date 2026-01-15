import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { useWorkspace } from "@/contexts/WorkspaceContext";
import { useDashboardData } from "@/hooks/useDashboardData";
import { useToggleTaskStatus } from "@/hooks/useTasks";
import { DashboardKPICards } from "@/components/dashboard/DashboardKPICards";
import { DashboardAIInsights } from "@/components/dashboard/DashboardAIInsights";
import { DashboardNextActions } from "@/components/dashboard/DashboardNextActions";
import { DashboardPipelineSnapshot } from "@/components/dashboard/DashboardPipelineSnapshot";
import { DashboardSmartAlerts } from "@/components/dashboard/DashboardSmartAlerts";
import { ScrollArea } from "@/components/ui/scroll-area";

export default function Dashboard() {
  const { currentWorkspace } = useWorkspace();
  const {
    kpiData,
    insightsData,
    nextActions,
    overdueTaskCount,
    pipelineStages,
    pipelineTotalValue,
    isLoading,
  } = useDashboardData();

  const toggleTask = useToggleTaskStatus();

  const handleCompleteTask = (taskId: string) => {
    toggleTask.mutate({ id: taskId, currentStatus: "pending" });
  };

  return (
    <DashboardLayout>
      <ScrollArea className="h-[calc(100vh-5rem)]">
        <div className="space-y-6 pb-8">
          {/* Header */}
          <div>
            <h1 className="text-2xl font-bold text-foreground">
              Bem-vindo! 👋
            </h1>
            <p className="text-muted-foreground">
              Centro de comando do {currentWorkspace?.name}
            </p>
          </div>

          {/* ZONA 1: Status Rápido (KPIs vivos) */}
          <section>
            <h2 className="text-sm font-medium text-muted-foreground uppercase tracking-wider mb-3">
              Status Rápido
            </h2>
            <DashboardKPICards data={kpiData} isLoading={isLoading} />
          </section>

          {/* ZONA 2: Smart Alerts - Actionable Alerts */}
          <section>
            <h2 className="text-sm font-medium text-muted-foreground uppercase tracking-wider mb-3">
              Alertas Inteligentes
            </h2>
            <DashboardSmartAlerts maxAlerts={5} />
          </section>

          {/* ZONA 3: Alertas & Prioridades (AI-driven) */}
          <section>
            <h2 className="text-sm font-medium text-muted-foreground uppercase tracking-wider mb-3">
              Resumo & Prioridades
            </h2>
            <DashboardAIInsights
              leadsWithoutResponse={insightsData?.leadsWithoutResponse || 0}
              proposalsViewed={insightsData?.proposalsViewed || 0}
              highProbabilityOpportunities={insightsData?.highProbabilityOpportunities || 0}
              overdueFollowUps={insightsData?.overdueFollowUps || 0}
              unansweredMessages={insightsData?.unansweredMessages || 0}
            />
          </section>

          {/* ZONA 4: Ações Recomendadas (1-click) */}
          <section>
            <h2 className="text-sm font-medium text-muted-foreground uppercase tracking-wider mb-3">
              Ações Recomendadas
            </h2>
            <DashboardNextActions
              tasks={nextActions}
              overdueCount={overdueTaskCount}
              isLoading={isLoading}
              onCompleteTask={handleCompleteTask}
            />
          </section>

          {/* ZONA 5: Visão de Pipeline & Receita */}
          <section>
            <h2 className="text-sm font-medium text-muted-foreground uppercase tracking-wider mb-3">
              Pipeline & Receita
            </h2>
            <DashboardPipelineSnapshot
              stages={pipelineStages}
              totalValue={pipelineTotalValue}
              isLoading={isLoading}
            />
          </section>
        </div>
      </ScrollArea>
    </DashboardLayout>
  );
}
