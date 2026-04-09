import { useState } from "react";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useNavigate } from "react-router-dom";
import {
  TrendingUp, TrendingDown, Target, AlertTriangle, Zap,
  RefreshCw, ArrowRight, Shield, Flame, Activity, BarChart3,
  CheckCircle2, XCircle, Clock, DollarSign, Loader2, Rocket
} from "lucide-react";
import { cn } from "@/lib/utils";
import {
  useRevenueFlightSnapshot,
  useRevenueTarget,
  useDealProbabilityScores,
  useDealRiskSignals,
  useRevenueRecommendations,
  useRecomputeRevenueFlightControl,
  formatCurrency,
  getTargetStatus,
} from "@/hooks/useRevenueFlightControl";
import { usePipelineRiskAnalysis } from "@/hooks/useRevenueIntelligenceDashboard";
import { useGrowthInsights } from "@/hooks/useGrowthInsights";
import { useWorkspace } from "@/contexts/WorkspaceContext";
import { RFCExport } from "@/components/revenue-flight-control/RFCExport";

function RFCMainPage() {
  const navigate = useNavigate();
  const { data: snapshots, isLoading: snapshotsLoading } = useRevenueFlightSnapshot();
  const { data: target } = useRevenueTarget();
  const { data: dealScores, isLoading: dealsLoading } = useDealProbabilityScores();
  const { data: riskSignals } = useDealRiskSignals();
  const { data: recommendations } = useRevenueRecommendations();
  const recompute = useRecomputeRevenueFlightControl();
  const { buckets: pipelineBuckets } = usePipelineRiskAnalysis();
  const { topCustomers, topSellers, needMatches, summary: growthSummary, aiAnalysis } = useGrowthInsights({ autoRefresh: false });
  const { currentWorkspace } = useWorkspace();

  const latest = snapshots?.[0];
  const previous = snapshots?.[1];
  const status = latest ? getTargetStatus(latest.target_hit_probability) : null;

  const topDeals = (dealScores || [])
    .filter((d: any) => d.opportunities?.status && !["won", "lost"].includes(d.opportunities.status))
    .slice(0, 8);

  const criticalRisks = (riskSignals || []).filter((r: any) => r.severity === "critical" || r.severity === "high").slice(0, 6);
  const topRecs = (recommendations || []).slice(0, 5);

  const isLoading = snapshotsLoading || dealsLoading;

  if (isLoading) {
    return (
      <DashboardLayout>
        <div className="p-4 sm:p-6 space-y-4 sm:space-y-6">
          <Skeleton className="h-10 w-full max-w-[280px]" />
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
            {[1, 2, 3, 4].map(i => <Skeleton key={i} className="h-24 sm:h-32" />)}
          </div>
          <Skeleton className="h-48 sm:h-64" />
        </div>
      </DashboardLayout>
    );
  }

  if (!latest) {
    return (
      <DashboardLayout>
        <div className="p-4 sm:p-6 max-w-3xl mx-auto">
          <div className="text-center py-12 sm:py-20 space-y-4 sm:space-y-6">
            <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-2xl bg-primary/10 flex items-center justify-center mx-auto">
              <Rocket className="h-8 w-8 sm:h-10 sm:w-10 text-primary" />
            </div>
            <h1 className="text-2xl sm:text-3xl font-bold">Revenue Flight Control</h1>
            <p className="text-sm sm:text-base text-muted-foreground max-w-md mx-auto px-2">
              O motor de previsão de receita ainda não foi calculado. Clica abaixo para gerar o primeiro forecast com base no teu pipeline.
            </p>
            <Button size="lg" onClick={() => recompute.mutate()} disabled={recompute.isPending}>
              {recompute.isPending ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Zap className="h-4 w-4 mr-2" />}
              Calcular Forecast
            </Button>
            {!target && (
              <p className="text-xs text-muted-foreground mt-4 px-4">
                💡 Define um target mensal nas <button className="underline" onClick={() => navigate("/dashboard/revenue-flight-control/settings")}>configurações</button> para métricas mais precisas.
              </p>
            )}
          </div>
        </div>
      </DashboardLayout>
    );
  }

  const closedPct = latest.target_revenue > 0 ? (latest.closed_revenue / latest.target_revenue) * 100 : 0;
  const pipelinePct = latest.target_revenue > 0 ? (latest.weighted_pipeline / latest.target_revenue) * 100 : 0;
  const gapPct = Math.max(0, 100 - closedPct - pipelinePct);

  return (
    <DashboardLayout>
      <div className="p-4 sm:p-6 space-y-4 sm:space-y-6 max-w-[1400px] mx-auto">
        {/* Header */}
        <div className="space-y-3 sm:space-y-0 sm:flex sm:items-center sm:justify-between">
          <div className="min-w-0">
            <h1 className="text-lg sm:text-2xl font-bold flex items-center gap-2">
              <Rocket className="h-5 w-5 sm:h-6 sm:w-6 text-primary shrink-0" />
              <span className="truncate">Revenue Flight Control</span>
            </h1>
            <p className="text-xs sm:text-sm text-muted-foreground mt-0.5">Motor de previsão e aceleração de receita</p>
          </div>
          <div className="flex items-center gap-2 overflow-x-auto scrollbar-none">
            {status && (
              <Badge className={cn("text-xs sm:text-sm shrink-0", status.bg, status.color)}>
                {status.label}
              </Badge>
            )}
            <RFCExport
              snapshot={latest}
              target={target}
              topDeals={topDeals}
              riskSignals={riskSignals || []}
              recommendations={topRecs}
              workspaceName={currentWorkspace?.name}
              pipelineBuckets={pipelineBuckets}
              growthData={{
                topCustomers,
                topSellers,
                needMatches,
                summary: growthSummary,
                aiAnalysis,
              }}
            />
            <Button variant="outline" size="sm" onClick={() => recompute.mutate()} disabled={recompute.isPending} className="shrink-0">
              {recompute.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
            </Button>
          </div>
        </div>

        {/* Revenue Navigation Header */}
        <Card className="border-primary/20 bg-gradient-to-br from-primary/5 to-transparent">
          <CardContent className="pt-4 sm:pt-6 px-3 sm:px-6">
            <div className="grid grid-cols-2 gap-3 sm:gap-6 sm:grid-cols-3 md:grid-cols-5">
              <div>
                <p className="text-[10px] font-semibold tracking-widest uppercase text-muted-foreground">Target</p>
                <p className="text-lg sm:text-2xl font-bold">{formatCurrency(latest.target_revenue)}</p>
              </div>
              <div>
                <p className="text-[10px] font-semibold tracking-widest uppercase text-muted-foreground">Fechado</p>
                <p className="text-lg sm:text-2xl font-bold text-emerald-400">{formatCurrency(latest.closed_revenue)}</p>
              </div>
              <div>
                <p className="text-[10px] font-semibold tracking-widest uppercase text-muted-foreground">Most Likely</p>
                <p className="text-lg sm:text-2xl font-bold text-primary">{formatCurrency(latest.most_likely_revenue)}</p>
              </div>
              <div>
                <p className="text-[10px] font-semibold tracking-widest uppercase text-muted-foreground">Gap</p>
                <p className={cn("text-lg sm:text-2xl font-bold", latest.forecast_gap > 0 ? "text-red-400" : "text-emerald-400")}>
                  {latest.forecast_gap > 0 ? "-" : "+"}{formatCurrency(Math.abs(latest.forecast_gap))}
                </p>
              </div>
              <div>
                <p className="text-[10px] font-semibold tracking-widest uppercase text-muted-foreground">Hit Prob.</p>
                <p className={cn("text-lg sm:text-2xl font-bold", status?.color)}>
                  {Math.round(latest.target_hit_probability * 100)}%
                </p>
              </div>
            </div>

            {/* Forecast Bar */}
            <div className="mt-4 sm:mt-6">
              <div className="flex h-5 sm:h-6 rounded-full overflow-hidden bg-muted/30">
                <div
                  className="bg-emerald-500 transition-all duration-500"
                  style={{ width: `${Math.min(closedPct, 100)}%` }}
                  title={`Fechado: ${Math.round(closedPct)}%`}
                />
                <div
                  className="bg-primary/60 transition-all duration-500"
                  style={{ width: `${Math.min(pipelinePct, 100 - closedPct)}%` }}
                  title={`Pipeline: ${Math.round(pipelinePct)}%`}
                />
                {gapPct > 0 && (
                  <div
                    className="bg-red-500/30 transition-all duration-500"
                    style={{ width: `${gapPct}%` }}
                    title={`Gap: ${Math.round(gapPct)}%`}
                  />
                )}
              </div>
              <div className="flex justify-between text-[10px] text-muted-foreground mt-1">
                <span>Fechado ({Math.round(closedPct)}%)</span>
                <span>Pipeline ({Math.round(pipelinePct)}%)</span>
                {gapPct > 0 && <span>Gap ({Math.round(gapPct)}%)</span>}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Status Cards */}
        <div className="grid grid-cols-2 gap-3 sm:gap-4 md:grid-cols-4">
          <Card>
            <CardContent className="pt-3 sm:pt-4 px-3 sm:px-4">
              <div className="flex items-center justify-between">
                <p className="text-[10px] sm:text-xs text-muted-foreground">Best Case</p>
                <TrendingUp className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-emerald-400" />
              </div>
              <p className="text-base sm:text-xl font-bold mt-1">{formatCurrency(latest.best_case_revenue)}</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-3 sm:pt-4 px-3 sm:px-4">
              <div className="flex items-center justify-between">
                <p className="text-[10px] sm:text-xs text-muted-foreground">Most Likely</p>
                <Target className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-primary" />
              </div>
              <p className="text-base sm:text-xl font-bold mt-1">{formatCurrency(latest.most_likely_revenue)}</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-3 sm:pt-4 px-3 sm:px-4">
              <div className="flex items-center justify-between">
                <p className="text-[10px] sm:text-xs text-muted-foreground">Worst Case</p>
                <TrendingDown className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-red-400" />
              </div>
              <p className="text-base sm:text-xl font-bold mt-1">{formatCurrency(latest.worst_case_revenue)}</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-3 sm:pt-4 px-3 sm:px-4">
              <div className="flex items-center justify-between">
                <p className="text-[10px] sm:text-xs text-muted-foreground">Confiança</p>
                <Shield className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-amber-400" />
              </div>
              <p className="text-base sm:text-xl font-bold mt-1">{Math.round(latest.forecast_confidence)}%</p>
              {latest.forecast_confidence < 40 && (
                <p className="text-[10px] text-red-400 mt-1">Dados insuficientes</p>
              )}
            </CardContent>
          </Card>
        </div>

        <div className="grid grid-cols-1 gap-4 sm:gap-6 lg:grid-cols-3">
          {/* Deal Leaderboard */}
          <Card className="lg:col-span-2">
            <CardHeader className="flex flex-row items-center justify-between pb-2 sm:pb-3 px-3 sm:px-6">
              <CardTitle className="text-xs sm:text-sm font-semibold">Top Deals — Mais Prováveis</CardTitle>
              <Button variant="ghost" size="sm" className="h-8 text-xs" onClick={() => navigate("/dashboard/revenue-flight-control/deals")}>
                Ver todos <ArrowRight className="h-3 w-3 ml-1" />
              </Button>
            </CardHeader>
            <CardContent className="px-3 sm:px-6">
              {topDeals.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-8">Nenhum negócio analisado</p>
              ) : (
                <div className="space-y-2">
                  {topDeals.map((deal: any) => {
                    const opp = deal.opportunities;
                    return (
                      <div key={deal.id} className="p-2.5 sm:p-3 rounded-lg bg-muted/30 hover:bg-muted/50 transition-colors cursor-pointer active:scale-[0.98]"
                        onClick={() => navigate(`/dashboard/opportunities/${deal.opportunity_id}`)}
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div className="min-w-0 flex-1">
                            <p className="text-xs sm:text-sm font-medium truncate">{opp?.title}</p>
                            <p className="text-[10px] sm:text-xs text-muted-foreground truncate">
                              {opp?.companies?.name || "—"} • {opp?.pipeline_stages?.name || "—"}
                            </p>
                          </div>
                          <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
                            <span className="text-xs sm:text-sm font-semibold">{formatCurrency(opp?.value || 0)}</span>
                            <Badge variant="outline" className={cn(
                              "text-[10px] px-1.5",
                              deal.probability_score >= 70 ? "text-emerald-400 border-emerald-400/30" :
                              deal.probability_score >= 40 ? "text-amber-400 border-amber-400/30" :
                              "text-red-400 border-red-400/30"
                            )}>
                              {deal.probability_score}%
                            </Badge>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Risk Radar */}
          <Card>
            <CardHeader className="pb-2 sm:pb-3 px-3 sm:px-6">
              <CardTitle className="text-xs sm:text-sm font-semibold flex items-center gap-2">
                <AlertTriangle className="h-4 w-4 text-red-400" />
                Riscos do Forecast
              </CardTitle>
            </CardHeader>
            <CardContent className="px-3 sm:px-6">
              {criticalRisks.length === 0 ? (
                <div className="text-center py-6">
                  <CheckCircle2 className="h-8 w-8 text-emerald-400 mx-auto mb-2" />
                  <p className="text-sm text-muted-foreground">Sem riscos críticos</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {criticalRisks.map((risk: any) => (
                    <div key={risk.id} className="p-2.5 sm:p-3 rounded-lg bg-red-500/5 border border-red-500/10">
                      <div className="flex items-center gap-2 mb-1">
                        <Badge variant="outline" className={cn(
                          "text-[10px]",
                          risk.severity === "critical" ? "text-red-400 border-red-400/30" : "text-amber-400 border-amber-400/30"
                        )}>
                          {risk.severity}
                        </Badge>
                        <span className="text-[10px] text-muted-foreground truncate">{risk.signal_type}</span>
                      </div>
                      <p className="text-xs">{risk.reason}</p>
                      {risk.opportunities?.title && (
                        <p className="text-[10px] text-muted-foreground mt-1 truncate">
                          {risk.opportunities.title} • {formatCurrency(risk.opportunities.value || 0)}
                        </p>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Recommendations */}
        {topRecs.length > 0 && (
          <Card>
            <CardHeader className="pb-2 sm:pb-3 px-3 sm:px-6">
              <CardTitle className="text-xs sm:text-sm font-semibold flex items-center gap-2">
                <Zap className="h-4 w-4 text-primary" />
                Ações para Acelerar Receita
              </CardTitle>
            </CardHeader>
            <CardContent className="px-3 sm:px-6">
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {topRecs.map((rec: any) => (
                  <div key={rec.id} className="p-3 sm:p-4 rounded-lg border bg-muted/20 hover:bg-muted/40 transition-colors active:scale-[0.98]">
                    <div className="flex items-center gap-2 mb-2">
                      <Badge variant="outline" className={cn(
                        "text-[10px]",
                        rec.priority === "critical" ? "text-red-400 border-red-400/30" :
                        rec.priority === "high" ? "text-amber-400 border-amber-400/30" :
                        "text-muted-foreground"
                      )}>
                        {rec.priority}
                      </Badge>
                      <span className="text-[10px] text-muted-foreground truncate">{rec.recommendation_type}</span>
                    </div>
                    <p className="text-xs sm:text-sm font-medium">{rec.title}</p>
                    <p className="text-[10px] sm:text-xs text-muted-foreground mt-1 line-clamp-2">{rec.description}</p>
                    {rec.impact_estimate > 0 && (
                      <p className="text-[10px] sm:text-xs text-emerald-400 mt-2">
                        Impacto: {formatCurrency(rec.impact_estimate)}
                      </p>
                    )}
                    {rec.linked_entity_id && (
                      <Button variant="ghost" size="sm" className="mt-2 h-7 text-xs px-2" onClick={() => navigate(`/dashboard/opportunities/${rec.linked_entity_id}`)}>
                        Abrir <ArrowRight className="h-3 w-3 ml-1" />
                      </Button>
                    )}
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Navigation */}
        <div className="grid grid-cols-1 gap-3 sm:gap-4 sm:grid-cols-3">
          <Card className="cursor-pointer hover:border-primary/40 transition-colors active:scale-[0.98]" onClick={() => navigate("/dashboard/revenue-flight-control/deals")}>
            <CardContent className="pt-3 sm:pt-4 flex items-center gap-3 px-3 sm:px-4">
              <div className="p-2 rounded-lg bg-primary/10 shrink-0"><BarChart3 className="h-4 w-4 sm:h-5 sm:w-5 text-primary" /></div>
              <div className="min-w-0">
                <p className="text-xs sm:text-sm font-semibold">Deals Intelligence</p>
                <p className="text-[10px] sm:text-xs text-muted-foreground">Tabela completa com scores e filtros</p>
              </div>
            </CardContent>
          </Card>
          <Card className="cursor-pointer hover:border-primary/40 transition-colors active:scale-[0.98]" onClick={() => navigate("/dashboard/revenue-flight-control/forecast")}>
            <CardContent className="pt-3 sm:pt-4 flex items-center gap-3 px-3 sm:px-4">
              <div className="p-2 rounded-lg bg-emerald-500/10 shrink-0"><TrendingUp className="h-4 w-4 sm:h-5 sm:w-5 text-emerald-400" /></div>
              <div className="min-w-0">
                <p className="text-xs sm:text-sm font-semibold">Forecast Trends</p>
                <p className="text-[10px] sm:text-xs text-muted-foreground">Histórico e evolução do forecast</p>
              </div>
            </CardContent>
          </Card>
          <Card className="cursor-pointer hover:border-primary/40 transition-colors active:scale-[0.98]" onClick={() => navigate("/dashboard/revenue-flight-control/scenarios")}>
            <CardContent className="pt-3 sm:pt-4 flex items-center gap-3 px-3 sm:px-4">
              <div className="p-2 rounded-lg bg-amber-500/10 shrink-0"><Activity className="h-4 w-4 sm:h-5 sm:w-5 text-amber-400" /></div>
              <div className="min-w-0">
                <p className="text-xs sm:text-sm font-semibold">Scenario Planner</p>
                <p className="text-[10px] sm:text-xs text-muted-foreground">Simular cenários what-if</p>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </DashboardLayout>
  );
}

export default RFCMainPage;
