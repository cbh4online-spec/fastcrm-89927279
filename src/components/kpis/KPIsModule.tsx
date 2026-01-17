import { useState, useCallback, useMemo } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { TooltipProvider } from "@/components/ui/tooltip";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { 
  RefreshCw, 
  BarChart3, 
  TrendingUp, 
  Users, 
  Target,
  Zap,
  Brain 
} from "lucide-react";
import { useKPIs, useKPIAIAnalysis } from "@/hooks/useKPIs";
import { PageHeader } from "@/components/common/PageHeader";
import { Toolbar } from "@/components/common/Toolbar";
import { CoreKPIGrid } from "./CoreKPIGrid";
import { IndustryKPICards } from "./IndustryKPICards";
import { ForecastSection } from "./ForecastSection";
import { PipelineHealthCard } from "./PipelineHealthCard";
import { KPIAIInsightsPanel } from "./KPIAIInsightsPanel";
import { PeriodComparisonCard } from "./PeriodComparisonCard";

type ViewPeriod = "today" | "week" | "month" | "quarter";
type ActiveTab = "overview" | "forecasts" | "ai";

const pageTabs = [
  { id: "overview", label: "Visão Geral", icon: <BarChart3 className="h-4 w-4" /> },
  { id: "forecasts", label: "Previsões", icon: <TrendingUp className="h-4 w-4" /> },
  { id: "ai", label: "Insights IA", icon: <Brain className="h-4 w-4" /> },
];

export function KPIsModule() {
  const queryClient = useQueryClient();
  const [period, setPeriod] = useState<ViewPeriod>("week");
  const [activeTab, setActiveTab] = useState<ActiveTab>("overview");
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

  // Quick stats for header KPIs
  const quickStats = useMemo(() => {
    if (!coreKPIs) {
      return { leads: 0, opportunities: 0, pipelineValue: 0, closeRate: 0 };
    }
    return {
      leads: coreKPIs.leads.leadsThisMonth,
      opportunities: coreKPIs.opportunities.activeOpportunities,
      pipelineValue: coreKPIs.opportunities.totalPipelineValue,
      closeRate: coreKPIs.opportunities.closeRate,
    };
  }, [coreKPIs]);

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

  const formatCurrency = (value: number) => {
    if (value >= 1000000) return `€${(value / 1000000).toFixed(1)}M`;
    if (value >= 1000) return `€${(value / 1000).toFixed(0)}K`;
    return `€${value.toFixed(0)}`;
  };

  return (
    <TooltipProvider delayDuration={300}>
      <div className="space-y-4">
        {/* Page Header */}
        <PageHeader
          title="KPIs & Previsões"
          description="Visão em tempo real do desempenho do teu negócio"
          tabs={pageTabs}
          activeTab={activeTab}
          onTabChange={(tab) => setActiveTab(tab as ActiveTab)}
        />

        {/* Quick KPIs Row */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <Card className="hover:border-primary/50 transition-colors">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-muted-foreground">Leads Mês</p>
                  {isLoading ? (
                    <Skeleton className="h-7 w-16 mt-1" />
                  ) : (
                    <p className="text-2xl font-bold">{quickStats.leads}</p>
                  )}
                </div>
                <div className="h-10 w-10 rounded-full bg-blue-500/10 flex items-center justify-center">
                  <Users className="h-5 w-5 text-blue-500" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="hover:border-primary/50 transition-colors">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-muted-foreground">Oportunidades</p>
                  {isLoading ? (
                    <Skeleton className="h-7 w-16 mt-1" />
                  ) : (
                    <p className="text-2xl font-bold">{quickStats.opportunities}</p>
                  )}
                </div>
                <div className="h-10 w-10 rounded-full bg-green-500/10 flex items-center justify-center">
                  <Target className="h-5 w-5 text-green-500" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="hover:border-primary/50 transition-colors">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-muted-foreground">Pipeline</p>
                  {isLoading ? (
                    <Skeleton className="h-7 w-20 mt-1" />
                  ) : (
                    <p className="text-2xl font-bold">{formatCurrency(quickStats.pipelineValue)}</p>
                  )}
                </div>
                <div className="h-10 w-10 rounded-full bg-purple-500/10 flex items-center justify-center">
                  <TrendingUp className="h-5 w-5 text-purple-500" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="hover:border-primary/50 transition-colors">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-muted-foreground">Taxa Fecho</p>
                  {isLoading ? (
                    <Skeleton className="h-7 w-14 mt-1" />
                  ) : (
                    <p className="text-2xl font-bold">{quickStats.closeRate.toFixed(0)}%</p>
                  )}
                </div>
                <div className="h-10 w-10 rounded-full bg-yellow-500/10 flex items-center justify-center">
                  <Zap className="h-5 w-5 text-yellow-500" />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Toolbar */}
        <Toolbar
          showFilters={false}
          leftActions={
            <div className="flex items-center gap-2">
              <Select value={period} onValueChange={(v) => setPeriod(v as ViewPeriod)}>
                <SelectTrigger className="w-[140px] h-8 text-sm">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="today">Hoje</SelectItem>
                  <SelectItem value="week">Esta semana</SelectItem>
                  <SelectItem value="month">Este mês</SelectItem>
                  <SelectItem value="quarter">Trimestre</SelectItem>
                </SelectContent>
              </Select>

              {industryType !== "general" && (
                <Badge variant="outline" className="gap-1 hidden sm:flex">
                  <BarChart3 className="h-3 w-3" />
                  {industryType}
                </Badge>
              )}
            </div>
          }
          rightActions={
            <Button
              variant="outline"
              size="sm"
              onClick={handleRefresh}
              disabled={isRefreshing}
            >
              <RefreshCw className={`h-4 w-4 mr-2 ${isRefreshing ? "animate-spin" : ""}`} />
              Atualizar
            </Button>
          }
        />

        {/* Tab Content */}
        {activeTab === "overview" && (
          <div className="space-y-6">
            {/* Core KPIs */}
            <CoreKPIGrid kpis={coreKPIs} isLoading={isLoading} />

            {/* Industry-specific KPIs */}
            <IndustryKPICards
              industryType={industryType}
              kpis={industryKPIs}
              isLoading={isLoading}
            />

            {/* Pipeline Health */}
            <PipelineHealthCard analysis={pipelineAnalysis} isLoading={isLoading} />
          </div>
        )}

        {activeTab === "forecasts" && (
          <div className="grid gap-6 lg:grid-cols-2">
            <ForecastSection forecast={forecast} isLoading={isLoading} />
            <PeriodComparisonCard comparison={periodComparison} isLoading={isLoading} />
          </div>
        )}

        {activeTab === "ai" && (
          <div className="grid gap-6 lg:grid-cols-3">
            <div className="lg:col-span-2">
              <KPIAIInsightsPanel
                analysis={aiAnalysis}
                isLoading={aiLoading}
                onRefresh={() => refetchAI()}
              />
            </div>
            <div>
              <PipelineHealthCard analysis={pipelineAnalysis} isLoading={isLoading} />
            </div>
          </div>
        )}
      </div>
    </TooltipProvider>
  );
}
