import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { useWorkspace } from "@/contexts/WorkspaceContext";
import { useDashboardData } from "@/hooks/useDashboardData";
import { useToggleTaskStatus } from "@/hooks/useTasks";
import { DashboardKPICards } from "@/components/dashboard/DashboardKPICards";
import { DashboardAIInsights } from "@/components/dashboard/DashboardAIInsights";
import { DashboardNextActions } from "@/components/dashboard/DashboardNextActions";
import { DashboardPipelineSnapshot } from "@/components/dashboard/DashboardPipelineSnapshot";
import { DashboardQuickNav } from "@/components/dashboard/DashboardQuickNav";

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
      <div className="space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-2xl font-bold text-foreground">
            Bem-vindo! 👋
          </h1>
          <p className="text-muted-foreground">
            Centro de comando do {currentWorkspace?.name}
          </p>
        </div>

        {/* Top KPIs */}
        <DashboardKPICards data={kpiData} isLoading={isLoading} />

        {/* Main Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left Column - AI Insights + Next Actions */}
          <div className="lg:col-span-2 space-y-6">
            <DashboardAIInsights
              leadsWithoutResponse={insightsData?.leadsWithoutResponse || 0}
              proposalsViewed={insightsData?.proposalsViewed || 0}
              highProbabilityOpportunities={insightsData?.highProbabilityOpportunities || 0}
              overdueFollowUps={insightsData?.overdueFollowUps || 0}
              unansweredMessages={insightsData?.unansweredMessages || 0}
            />
            
            <DashboardNextActions
              tasks={nextActions}
              overdueCount={overdueTaskCount}
              isLoading={isLoading}
              onCompleteTask={handleCompleteTask}
            />
          </div>

          {/* Right Column - Pipeline + Quick Nav */}
          <div className="space-y-6">
            <DashboardPipelineSnapshot
              stages={pipelineStages}
              totalValue={pipelineTotalValue}
              isLoading={isLoading}
            />
            
            <DashboardQuickNav />
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
