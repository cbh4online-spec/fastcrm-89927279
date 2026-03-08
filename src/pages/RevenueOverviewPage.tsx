import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { RefreshCw, Zap } from "lucide-react";
import { RevenueIntelligenceCard } from "@/components/revenue/RevenueIntelligenceCard";
import { RevenueKPIStrip } from "@/components/revenue-intelligence/RevenueKPIStrip";
import { TopGrowthAccountsCard } from "@/components/revenue-intelligence/TopGrowthAccountsCard";
import { PipelineRiskCard } from "@/components/revenue-intelligence/PipelineRiskCard";
import { StageConversionCard } from "@/components/revenue-intelligence/StageConversionCard";
import { useGenerateRevenueForecast } from "@/hooks/useRevenueForecast";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

export default function RevenueOverviewPage() {
  const generate = useGenerateRevenueForecast();

  const handleGenerate = async () => {
    try {
      await generate.mutateAsync();
      toast.success("Forecast atualizado!");
    } catch {
      toast.error("Erro ao gerar forecast.");
    }
  };

  return (
    <DashboardLayout>
      <ScrollArea className="h-[calc(100vh-5rem)]">
        <div className="p-4 md:p-6 space-y-6">
          {/* Header */}
          <div className="flex items-center justify-between flex-wrap gap-3">
            <div className="space-y-1">
              <div className="flex items-center gap-3">
                <h1 className="text-2xl font-bold">Revenue Intelligence</h1>
                <Badge variant="outline" className="text-xs font-normal">Executive</Badge>
              </div>
              <p className="text-sm text-muted-foreground">
                Visão unificada de forecasts, risco de pipeline e top growth accounts.
              </p>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={handleGenerate}
              disabled={generate.isPending}
              className="gap-2"
            >
              <RefreshCw className={cn("h-4 w-4", generate.isPending && "animate-spin")} />
              Atualizar Forecast
            </Button>
          </div>

          {/* KPI Strip */}
          <RevenueKPIStrip />

          {/* Main Grid: Forecast + Risk */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <RevenueIntelligenceCard />
            <PipelineRiskCard />
          </div>

          {/* Stage Conversion */}
          <StageConversionCard />

          {/* Top Growth Accounts */}
          <TopGrowthAccountsCard />
        </div>
      </ScrollArea>
    </DashboardLayout>
  );
}
