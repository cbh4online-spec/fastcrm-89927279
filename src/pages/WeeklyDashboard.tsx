import { useState } from "react";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { CommandCenterHeader } from "@/components/command-center/CommandCenterHeader";
import { AIQuestionBox } from "@/components/command-center/AIQuestionBox";
import { RevenueTargetStrip } from "@/components/weekly-dashboard/RevenueTargetStrip";
import { ExecutionRequirements } from "@/components/weekly-dashboard/ExecutionRequirements";
import { ContextAwareQuickActions } from "@/components/weekly-dashboard/ContextAwareQuickActions";
import { PriorityDealsTable } from "@/components/weekly-dashboard/PriorityDealsTable";
import { TodayActionPlan } from "@/components/weekly-dashboard/TodayActionPlan";
import { AIStrategyPanel } from "@/components/weekly-dashboard/AIStrategyPanel";
import { DealsAtRiskList } from "@/components/dashboard/DealsAtRiskList";
import { DailyBriefWidget } from "@/components/dashboard/DailyBriefWidget";
import { PipelineHealthCard } from "@/components/dashboard/PipelineHealthCard";
import { useWeeklyPerformance } from "@/hooks/useWeeklyPerformance";
import { useWeeklyStrategy } from "@/hooks/useWeeklyStrategy";
import { useWorkspace } from "@/contexts/WorkspaceContext";
import { useDailyBrief } from "@/hooks/useDailyBrief";
import { useKernelDecisions } from "@/hooks/useKernelDecisions";
import { useAdaptiveDashboard } from "@/hooks/useAdaptiveDashboard";
import { AdaptiveProfileSetup } from "@/components/adaptive-dashboard/AdaptiveProfileSetup";
import { AdaptiveDashboardGestor } from "@/components/adaptive-dashboard/AdaptiveDashboardGestor";
import { Button } from "@/components/ui/button";
import { RefreshCw, Crosshair } from "lucide-react";
import { useTranslation } from "react-i18next";
import { WarRoomBriefingExport } from "@/components/weekly-dashboard/WarRoomBriefingExport";

export default function WeeklyDashboard() {
  const { t } = useTranslation("dashboard");
  const { data, isLoading } = useWeeklyPerformance();
  const { strategy, isLoading: strategyLoading, generate } = useWeeklyStrategy();
  const { todaysBrief } = useDailyBrief();
  const weekLabel = data?.weekLabel || "...";
  const { currentWorkspace } = useWorkspace();
  const { openDecisions } = useKernelDecisions();
  const { needsSetup, salesFunction, layoutConfig, isLoading: adaptiveLoading } = useAdaptiveDashboard();
  const [setupDismissed, setSetupDismissed] = useState(false);

  const briefMetrics = todaysBrief?.key_metrics;

  // Show adaptive dashboard for gestor function (others fallback to war-room)
  const showAdaptive = !adaptiveLoading && !needsSetup && salesFunction !== null;

  return (
    <DashboardLayout>
      {/* Profile setup gate */}
      <AdaptiveProfileSetup
        open={!!needsSetup && !setupDismissed}
        onComplete={() => setSetupDismissed(true)}
      />

      <div className="max-w-6xl mx-auto px-4 py-6 space-y-6">
        {/* Greeting Header */}
        <CommandCenterHeader
          revenueToday={briefMetrics?.revenue_today ?? null}
          hotLeadsCount={briefMetrics?.leads_today ?? 0}
          pendingDecisions={openDecisions.length}
        />

        {/* AI Command Input */}
        <AIQuestionBox />

        {/* Adaptive Dashboard Section */}
        {showAdaptive && (
          <AdaptiveDashboardGestor layoutConfig={layoutConfig} />
        )}

        {/* WAR ROOM Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Crosshair className="h-5 w-5 text-primary" />
            <div>
              <h2 className="text-lg font-semibold text-foreground">{t("warRoom")}</h2>
              <p className="text-sm text-muted-foreground">
                {t("warRoomSubtitle", { week: data?.weekLabel || "..." })}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
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
              {t("refresh")}
            </Button>
          </div>
        </div>

        {/* SECTION 1 — Weekly Situation Engine */}
        <RevenueTargetStrip
          metrics={data?.metrics || []}
          pipelineValue={data?.pipelineValue ?? 0}
          isLoading={isLoading}
        />

        {/* SECTION 2 — Execution Requirements */}
        <ExecutionRequirements
          metrics={data?.metrics || []}
          pipelineValue={data?.pipelineValue ?? 0}
          isLoading={isLoading}
        />

        {/* SECTION 7 — Smart Quick Actions */}
        <ContextAwareQuickActions />

        {/* SECTIONS 3+4 — Priority Deals + Today Actions */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <PriorityDealsTable />
          <TodayActionPlan />
        </div>

        {/* SECTIONS 5+6 — Deals at Risk + Pipeline Health + AI Strategy */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          <DealsAtRiskList />
          <PipelineHealthCard />
          <AIStrategyPanel
            strategy={strategy}
            isLoading={strategyLoading}
          />
        </div>

        {/* SECTION 8 — Executive Daily Brief (full width) */}
        <DailyBriefWidget />
      </div>
    </DashboardLayout>
  );
}
