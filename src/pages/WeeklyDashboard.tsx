import { useEffect } from "react";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { CommandCenterHeader } from "@/components/command-center/CommandCenterHeader";
import { AIQuestionBox } from "@/components/command-center/AIQuestionBox";
import { WeeklyPerformanceStrip } from "@/components/weekly-dashboard/WeeklyPerformanceStrip";
import { AIStrategyPanel } from "@/components/weekly-dashboard/AIStrategyPanel";
import { WeeklyQuickActions } from "@/components/weekly-dashboard/WeeklyQuickActions";
import { TargetsSettingsSheet } from "@/components/weekly-dashboard/TargetsSettingsSheet";
import { DealsAtRiskList } from "@/components/dashboard/DealsAtRiskList";
import { DailyBriefWidget } from "@/components/dashboard/DailyBriefWidget";
import { PipelineHealthCard } from "@/components/dashboard/PipelineHealthCard";
import { AIActionSuggestions } from "@/components/dashboard/AIActionSuggestions";
import { useWeeklyPerformance } from "@/hooks/useWeeklyPerformance";
import { useWeeklyStrategy } from "@/hooks/useWeeklyStrategy";
import { useDailyBrief } from "@/hooks/useDailyBrief";
import { useKernelDecisions } from "@/hooks/useKernelDecisions";
import { Button } from "@/components/ui/button";
import { Brain, RefreshCw } from "lucide-react";

export default function WeeklyDashboard() {
  const { data, isLoading } = useWeeklyPerformance();
  const { strategy, isLoading: strategyLoading, generate } = useWeeklyStrategy();
  const { todaysBrief, generateDailyBrief } = useDailyBrief();
  const { openDecisions } = useKernelDecisions();

  const briefMetrics = todaysBrief?.key_metrics;

  // Auto-generate daily brief on mount if none exists today
  useEffect(() => {
    if (!todaysBrief) {
      generateDailyBrief();
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <DashboardLayout>
      <div className="max-w-6xl mx-auto px-4 py-6 space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-foreground">Weekly Revenue Brief</h1>
            <p className="text-sm text-muted-foreground">
              Semana {data?.weekLabel || "..."}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <TargetsSettingsSheet />
            <Button
              variant="default"
              size="sm"
              onClick={generate}
              disabled={strategyLoading}
              className="gap-2"
            >
              {strategyLoading ? (
                <RefreshCw className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <Brain className="h-3.5 w-3.5" />
              )}
              {strategy ? "Atualizar Estratégia" : "Gerar Estratégia"}
            </Button>
          </div>
        </div>

        {/* KPI Strip */}
        <WeeklyPerformanceStrip metrics={data?.metrics || []} isLoading={isLoading} />

        {/* Quick Actions */}
        <WeeklyQuickActions />

        {/* Two-column grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <div className="space-y-4">
            <AIStrategyPanel
              strategy={strategy}
              isLoading={strategyLoading}
              onGenerate={generate}
            />
          </div>
          <div className="space-y-4">
            <DealsAtRiskList />
            <PipelineHealthCard />
          </div>
        </div>

        {/* Existing widgets */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <AIActionSuggestions />
          <DailyBriefWidget />
        </div>
      </div>
    </DashboardLayout>
  );
}
