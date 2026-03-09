import { useEffect, useRef } from "react";
import { PageHeader } from "@/components/common/PageHeader";
import { Brain, Briefcase, ShieldAlert, TrendingUp, Sparkles } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

// Tab panels
import { CEODailyBriefTab } from "@/components/ceo-copilot/CEODailyBriefTab";
import { CEOWeeklyStrategyTab } from "@/components/ceo-copilot/CEOWeeklyStrategyTab";
import { CEOPipelineHealthTab } from "@/components/ceo-copilot/CEOPipelineHealthTab";
import { CEOGrowthInsightsTab } from "@/components/ceo-copilot/CEOGrowthInsightsTab";

export default function CEOCopilotPage() {
  return (
    <div className="space-y-6 p-4 md:p-6">
      <PageHeader
        title="AI CEO Copilot"
        description="Inteligência executiva centralizada — briefs, estratégia, risco e crescimento"
      />

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
  );
}
