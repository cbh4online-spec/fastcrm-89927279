import { useState } from "react";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { PremiumDashboardHeader } from "@/components/weekly-dashboard/PremiumDashboardHeader";
import { PremiumAISection } from "@/components/weekly-dashboard/PremiumAISection";
import { ImmediateAttentionBanner } from "@/components/weekly-dashboard/ImmediateAttentionBanner";
import { PremiumKPICards } from "@/components/weekly-dashboard/PremiumKPICards";
import { RevenueTargetStrip } from "@/components/weekly-dashboard/RevenueTargetStrip";
import { QuarterGoalsProjection } from "@/components/weekly-dashboard/QuarterGoalsProjection";
import { PriorityDealsTable } from "@/components/weekly-dashboard/PriorityDealsTable";
import { TodayActionPlan } from "@/components/weekly-dashboard/TodayActionPlan";
import { QuickAccessFooter } from "@/components/weekly-dashboard/QuickAccessFooter";
import { useWeeklyPerformance } from "@/hooks/useWeeklyPerformance";
import { useWeeklyStrategy } from "@/hooks/useWeeklyStrategy";
import { useWorkspace } from "@/contexts/WorkspaceContext";
import { useDailyBrief } from "@/hooks/useDailyBrief";
import { useKernelDecisions } from "@/hooks/useKernelDecisions";
import { useAdaptiveDashboard } from "@/hooks/useAdaptiveDashboard";
import { AdaptiveProfileSetup } from "@/components/adaptive-dashboard/AdaptiveProfileSetup";
import { Button } from "@/components/ui/button";
import { RefreshCw, Lightbulb } from "lucide-react";
import { WarRoomBriefingExport } from "@/components/weekly-dashboard/WarRoomBriefingExport";

export default function WeeklyDashboard() {
  const { data, isLoading } = useWeeklyPerformance();
  const { strategy, isLoading: strategyLoading, generate } = useWeeklyStrategy();
  const { todaysBrief } = useDailyBrief();
  const weekLabel = data?.weekLabel || "...";
  const { currentWorkspace } = useWorkspace();
  const { openDecisions } = useKernelDecisions();
  const { needsSetup, isLoading: adaptiveLoading } = useAdaptiveDashboard();
  const [setupDismissed, setSetupDismissed] = useState(false);

  const briefMetrics = todaysBrief?.key_metrics;

  return (
    <DashboardLayout>
      {/* Profile setup gate */}
      <AdaptiveProfileSetup
        open={!!needsSetup && !setupDismissed}
        onComplete={() => setSetupDismissed(true)}
      />

      <div className="max-w-6xl mx-auto px-4 py-6 space-y-6">
        {/* 1. Executive Header */}
        <PremiumDashboardHeader
          revenueToday={briefMetrics?.revenue_today ?? null}
          hotLeadsCount={briefMetrics?.leads_today ?? 0}
          pendingDecisions={openDecisions.length}
        />

        {/* 2. Assistente de Vendas IA */}
        <PremiumAISection />

        {/* 3. Alertas Imediatos */}
        <ImmediateAttentionBanner
          metrics={data?.metrics || []}
          isLoading={isLoading}
        />

        {/* 4. KPI Cards Principais */}
        <PremiumKPICards
          metrics={data?.metrics || []}
          pipelineValue={data?.pipelineValue ?? 0}
          isLoading={isLoading}
        />

        {/* 5. War Room — Situação Semanal */}
        <div className="space-y-0">
          <RevenueTargetStrip
            metrics={data?.metrics || []}
            pipelineValue={data?.pipelineValue ?? 0}
            isLoading={isLoading}
          />
          <div className="flex items-center justify-end gap-2 pt-2">
            <WarRoomBriefingExport
              metrics={data?.metrics || []}
              pipelineValue={data?.pipelineValue ?? 0}
              weekLabel={weekLabel}
              todaysBrief={todaysBrief}
              strategy={strategy}
              workspaceName={currentWorkspace?.name}
              workspaceLogoUrl={currentWorkspace?.logo_url}
            />
            <Button
              variant="ghost"
              size="sm"
              onClick={generate}
              disabled={strategyLoading}
              className="gap-1.5"
            >
              <RefreshCw className={`h-3.5 w-3.5 ${strategyLoading ? "animate-spin" : ""}`} />
              Atualizar
            </Button>
          </div>
        </div>
        <div className="space-y-4" id="today-action-plan">
          <div className="flex items-center gap-2 px-1">
            <Lightbulb className="h-4 w-4 text-primary" />
            <h3 className="text-sm font-semibold text-foreground">Oportunidades e Ações</h3>
          </div>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <PriorityDealsTable />
            <TodayActionPlan />
          </div>
        </div>

        {/* 8. Metas do Trimestre */}
        <QuarterGoalsProjection
          metrics={data?.metrics || []}
          isLoading={isLoading}
        />


        {/* 11. Acesso Rápido */}
        <QuickAccessFooter />



      </div>
    </DashboardLayout>
  );
}
