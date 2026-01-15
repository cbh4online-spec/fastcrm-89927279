import { useState, useCallback } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { TooltipProvider } from "@/components/ui/tooltip";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { RefreshCw, BarChart3, Settings2 } from "lucide-react";
import { useKPIs, useKPIAIAnalysis } from "@/hooks/useKPIs";
import { CoreKPIGrid } from "./CoreKPIGrid";
import { IndustryKPICards } from "./IndustryKPICards";
import { ForecastSection } from "./ForecastSection";
import { PipelineHealthCard } from "./PipelineHealthCard";
import { KPIAIInsightsPanel } from "./KPIAIInsightsPanel";
import { PeriodComparisonCard } from "./PeriodComparisonCard";

type ViewPeriod = "today" | "week" | "month" | "quarter";

export function KPIsModule() {
  const queryClient = useQueryClient();
  const [period, setPeriod] = useState<ViewPeriod>("week");
  const [isRefreshing, setIsRefreshing] = useState(false);

  const {
    coreKPIs,
    industryKPIs,
    industryType,
    forecast,
    pipelineAnalysis,
    periodComparison,
    isLoading,
  } = useKPIs();

  const { data: aiAnalysis, isLoading: aiLoading, refetch: refetchAI } = useKPIAIAnalysis(
    coreKPIs,
    industryType
  );

  const handleRefresh = useCallback(async () => {
    setIsRefreshing(true);
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: ["leads"] }),
      queryClient.invalidateQueries({ queryKey: ["opportunities-enhanced"] }),
      queryClient.invalidateQueries({ queryKey: ["pipeline-stages-enhanced"] }),
      queryClient.invalidateQueries({ queryKey: ["conversations"] }),
      queryClient.invalidateQueries({ queryKey: ["automation-rules"] }),
      queryClient.invalidateQueries({ queryKey: ["proposals"] }),
      queryClient.invalidateQueries({ queryKey: ["tasks"] }),
      refetchAI(),
    ]);
    setIsRefreshing(false);
  }, [queryClient, refetchAI]);

  return (
    <TooltipProvider delayDuration={300}>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">KPIs & Previsões</h1>
            <p className="text-muted-foreground">
              Visão em tempo real do desempenho do teu negócio
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Select value={period} onValueChange={(v) => setPeriod(v as ViewPeriod)}>
              <SelectTrigger className="w-[140px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="today">Hoje</SelectItem>
                <SelectItem value="week">Esta semana</SelectItem>
                <SelectItem value="month">Este mês</SelectItem>
                <SelectItem value="quarter">Trimestre</SelectItem>
              </SelectContent>
            </Select>
            <Button
              variant="outline"
              size="icon"
              onClick={handleRefresh}
              disabled={isRefreshing}
            >
              <RefreshCw className={`h-4 w-4 ${isRefreshing ? "animate-spin" : ""}`} />
            </Button>
          </div>
        </div>

        {/* Industry badge */}
        {industryType !== "general" && (
          <div className="flex items-center gap-2">
            <Badge variant="outline" className="gap-1">
              <BarChart3 className="h-3 w-3" />
              Métricas adaptadas: {industryType}
            </Badge>
            <span className="text-xs text-muted-foreground">
              A IA ajustou os KPIs ao teu tipo de negócio
            </span>
          </div>
        )}

        {/* Core KPIs */}
        <CoreKPIGrid kpis={coreKPIs} isLoading={isLoading} />

        {/* Industry-specific KPIs */}
        <IndustryKPICards
          industryType={industryType}
          kpis={industryKPIs}
          isLoading={isLoading}
        />

        {/* Main content grid */}
        <div className="grid gap-6 lg:grid-cols-3">
          {/* Left column - Forecasts and Pipeline */}
          <div className="lg:col-span-2 space-y-6">
            <ForecastSection forecast={forecast} isLoading={isLoading} />
            <PeriodComparisonCard comparison={periodComparison} isLoading={isLoading} />
          </div>

          {/* Right column - AI Insights and Pipeline Health */}
          <div className="space-y-6">
            <KPIAIInsightsPanel
              analysis={aiAnalysis}
              isLoading={aiLoading}
              onRefresh={() => refetchAI()}
            />
            <PipelineHealthCard analysis={pipelineAnalysis} isLoading={isLoading} />
          </div>
        </div>
      </div>
    </TooltipProvider>
  );
}
