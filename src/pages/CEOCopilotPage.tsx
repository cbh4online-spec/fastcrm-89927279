import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { PageHeader } from "@/components/common/PageHeader";
import { Brain, Briefcase, ShieldAlert, TrendingUp } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

// Tab panels
import { CEODailyBriefTab } from "@/components/ceo-copilot/CEODailyBriefTab";
import { CEOWeeklyStrategyTab } from "@/components/ceo-copilot/CEOWeeklyStrategyTab";
import { CEOPipelineHealthTab } from "@/components/ceo-copilot/CEOPipelineHealthTab";
import { CEOGrowthInsightsTab } from "@/components/ceo-copilot/CEOGrowthInsightsTab";
import { CEOCopilotExport } from "@/components/ceo-copilot/CEOCopilotExport";

// Hooks for export data
import { useDailyBrief } from "@/hooks/useDailyBrief";
import { useWeeklyStrategy } from "@/hooks/useWeeklyStrategy";
import { usePipelineRiskReport } from "@/hooks/usePipelineRiskReport";
import { usePipelineRiskAnalysis } from "@/hooks/useRevenueIntelligenceDashboard";
import { useGrowthInsights } from "@/hooks/useGrowthInsights";
import { useWorkspace } from "@/contexts/WorkspaceContext";

export default function CEOCopilotPage() {
  const { todaysBrief } = useDailyBrief();
  const { strategy } = useWeeklyStrategy();
  const { report } = usePipelineRiskReport();
  const { buckets } = usePipelineRiskAnalysis();
  const { topCustomers, topSellers, needMatches, summary, aiAnalysis } = useGrowthInsights({ autoRefresh: false });
  const { currentWorkspace } = useWorkspace();

  return (
    <DashboardLayout>
    <div className="space-y-6 p-4 md:p-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <PageHeader
          title="AI CEO Copilot"
          description="Inteligencia executiva centralizada — briefs, estrategia, risco e crescimento"
        />
        <CEOCopilotExport
          dailyBrief={todaysBrief}
          strategy={strategy}
          pipelineReport={report}
          workspaceName={currentWorkspace?.name}
          pipelineBuckets={buckets}
          growthData={{
            topCustomers,
            topSellers,
            needMatches,
            summary,
            aiAnalysis,
          }}
        />
      </div>

      <Tabs defaultValue="daily" className="space-y-6">
        <TabsList className="bg-muted/50 border border-border/50 p-1 h-auto flex-wrap">
          <TabsTrigger value="daily" className="gap-2 data-[state=active]:bg-background">
            <Brain className="h-4 w-4" />
            Daily Brief
          </TabsTrigger>
          <TabsTrigger value="weekly" className="gap-2 data-[state=active]:bg-background">
            <Briefcase className="h-4 w-4" />
            Weekly Strategy
          </TabsTrigger>
          <TabsTrigger value="pipeline" className="gap-2 data-[state=active]:bg-background">
            <ShieldAlert className="h-4 w-4" />
            Pipeline Health
          </TabsTrigger>
          <TabsTrigger value="growth" className="gap-2 data-[state=active]:bg-background">
            <TrendingUp className="h-4 w-4" />
            Growth Insights
          </TabsTrigger>
        </TabsList>

        <TabsContent value="daily">
          <CEODailyBriefTab />
        </TabsContent>
        <TabsContent value="weekly">
          <CEOWeeklyStrategyTab />
        </TabsContent>
        <TabsContent value="pipeline">
          <CEOPipelineHealthTab />
        </TabsContent>
        <TabsContent value="growth">
          <CEOGrowthInsightsTab />
        </TabsContent>
      </Tabs>
    </div>
    </DashboardLayout>
  );
}
