import { useEffect } from "react";
import { CommandCenterHeader } from "@/components/command-center/CommandCenterHeader";
import { AIQuestionBox } from "@/components/command-center/AIQuestionBox";
import { KernelDecisionsCard } from "@/components/command-center/KernelDecisionsCard";
import { DriftAlertsCard } from "@/components/command-center/DriftAlertsCard";
import { TodayCard } from "@/components/command-center/TodayCard";
import { PipelineRiskCard } from "@/components/command-center/PipelineRiskCard";
import { KernelActionsCard } from "@/components/command-center/KernelActionsCard";
import { KernelLiveFeedCard } from "@/components/command-center/KernelLiveFeedCard";
import { StrategicBriefCard } from "@/components/command-center/StrategicBriefCard";
import { KernelDebugPanel } from "@/components/command-center/KernelDebugPanel";
import { useDailyBrief } from "@/hooks/useDailyBrief";
import { useKernelDecisions } from "@/hooks/useKernelDecisions";
import { DashboardLayout } from "@/components/layout/DashboardLayout";

export default function CommandCenter() {
  const { todaysBrief, generateDailyBrief } = useDailyBrief();
  const { openDecisions } = useKernelDecisions();

  // Auto-generate daily brief on mount if none exists today
  useEffect(() => {
    if (!todaysBrief) {
      generateDailyBrief();
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const metrics = todaysBrief?.key_metrics;

  return (
    <DashboardLayout>
      <div className="max-w-6xl mx-auto px-4 py-6 space-y-6">
        <CommandCenterHeader
          revenueToday={metrics?.revenue_today ?? null}
          hotLeadsCount={metrics?.leads_today ?? 0}
          pendingDecisions={openDecisions.length}
        />

        <AIQuestionBox />

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {/* Left column */}
          <div className="space-y-4">
            <KernelDecisionsCard delay={200} />
            <KernelActionsCard delay={300} />
            <DriftAlertsCard delay={400} />
            <KernelLiveFeedCard delay={500} />
          </div>
          {/* Right column */}
          <div className="space-y-4">
            <TodayCard delay={200} />
            <PipelineRiskCard delay={300} />
            <StrategicBriefCard delay={400} />
          </div>
        </div>

        <KernelDebugPanel />
      </div>
    </DashboardLayout>
  );
}