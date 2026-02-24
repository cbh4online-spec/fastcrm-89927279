import { useIntelligencePanel } from "@/hooks/useIntelligencePanel";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { RefreshCw, AlertTriangle, CheckCircle2, Eye, ArrowRight, Database, Activity, Clock } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { cn } from "@/lib/utils";

export function IntelligenceOverviewPanel() {
  const { data, isLoading, refetch } = useIntelligencePanel();
  const navigate = useNavigate();

  if (isLoading) {
    return (
      <div className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-28 rounded-lg" />
          ))}
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Skeleton className="h-64 rounded-lg" />
          <Skeleton className="h-64 rounded-lg" />
        </div>
      </div>
    );
  }

  if (!data || data.total_open === 0) {
    return (
      <Card>
        <CardContent className="flex flex-col items-center justify-center py-12 text-center">
          <Database className="h-10 w-10 text-muted-foreground mb-3" />
          <p className="text-muted-foreground">Nenhuma oportunidade aberta encontrada.</p>
          <p className="text-xs text-muted-foreground mt-1">Crie oportunidades no pipeline para ver a análise.</p>
        </CardContent>
      </Card>
    );
  }

  const { health_distribution: dist, avg_health_score, top_risks, recommended_actions, data_quality, stage_benchmarks, portfolio_momentum } = data;

  const scoreColor = avg_health_score >= 80
    ? "text-emerald-600 dark:text-emerald-400"
    : avg_health_score >= 50
      ? "text-amber-600 dark:text-amber-400"
      : "text-destructive";

  return (
    <div className="space-y-4">
      {/* Header with refresh */}
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">
          {data.total_open} oportunidades abertas analisadas
        </p>
        <Button variant="ghost" size="sm" onClick={() => refetch()} className="gap-1.5">
          <RefreshCw className="h-3.5 w-3.5" />
          Atualizar
        </Button>
      </div>

      {/* Health distribution cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-6">
            <p className={`text-3xl font-bold ${scoreColor}`}>{avg_health_score}</p>
            <p className="text-xs text-muted-foreground mt-1">Score médio de saúde</p>
          </CardContent>
        </Card>

        <Card className="border-emerald-500/30 bg-emerald-500/5">
          <CardContent className="pt-6">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
              <span className="text-2xl font-bold text-emerald-600 dark:text-emerald-400">{dist.HEALTHY}</span>
            </div>
            <p className="text-xs text-muted-foreground mt-1">Saudáveis</p>
          </CardContent>
        </Card>

        <Card className="border-amber-500/30 bg-amber-500/5">
          <CardContent className="pt-6">
            <div className="flex items-center gap-2">
              <Eye className="h-5 w-5 text-amber-600 dark:text-amber-400" />
              <span className="text-2xl font-bold text-amber-600 dark:text-amber-400">{dist.WATCH}</span>
            </div>
            <p className="text-xs text-muted-foreground mt-1">Em observação</p>
          </CardContent>
        </Card>

        <Card className="border-destructive/30 bg-destructive/5">
          <CardContent className="pt-6">
            <div className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-destructive" />
              <span className="text-2xl font-bold text-destructive">{dist.AT_RISK}</span>
            </div>
            <p className="text-xs text-muted-foreground mt-1">Em risco</p>
          </CardContent>
        </Card>
      </div>

      {/* Portfolio Momentum */}
      {portfolio_momentum && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-2">
                <Activity className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
                <span className="text-2xl font-bold text-emerald-600 dark:text-emerald-400">{portfolio_momentum.deals_with_recent_activity}</span>
              </div>
              <p className="text-xs text-muted-foreground mt-1">Com atividade recente (7 dias)</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-2">
                <Clock className="h-5 w-5 text-amber-600 dark:text-amber-400" />
                <span className="text-2xl font-bold text-amber-600 dark:text-amber-400">{portfolio_momentum.deals_stale}</span>
              </div>
              <p className="text-xs text-muted-foreground mt-1">Sem atividade recente</p>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Stage Performance */}
      {stage_benchmarks && stage_benchmarks.length > 0 && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Performance por Estágio</CardTitle>
            <CardDescription>Tempo médio vs esperado por estágio</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {stage_benchmarks.filter(s => s.deals_count > 0).map((stage) => {
                const isOverExpected = stage.avg_days !== null && stage.avg_days > stage.expected_days;
                const isOverDouble = stage.avg_days !== null && stage.avg_days > stage.expected_days * 2;
                return (
                  <div key={stage.stage_id} className="space-y-1">
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-medium">{stage.stage_name}</span>
                      <span className="text-muted-foreground">
                        {stage.deals_count} deal{stage.deals_count !== 1 ? "s" : ""}
                      </span>
                    </div>
                    <div className="flex items-center gap-3 text-xs">
                      <div className="flex-1">
                        <div className="h-2 bg-muted rounded-full overflow-hidden">
                          <div
                            className={cn(
                              "h-full rounded-full transition-all",
                              isOverDouble ? "bg-red-500" : isOverExpected ? "bg-amber-500" : "bg-green-500"
                            )}
                            style={{
                              width: `${Math.min(100, ((stage.avg_days ?? 0) / (stage.expected_days * 2)) * 100)}%`,
                            }}
                          />
                        </div>
                      </div>
                      <span className={cn(
                        "w-16 text-right font-medium",
                        isOverDouble ? "text-red-600" : isOverExpected ? "text-amber-600" : "text-foreground"
                      )}>
                        {stage.avg_days ?? "—"}d / {stage.expected_days}d
                      </span>
                    </div>
                  </div>
                );
              })}
              {stage_benchmarks.filter(s => s.deals_count === 0).length > 0 && (
                <p className="text-xs text-muted-foreground pt-1">
                  {stage_benchmarks.filter(s => s.deals_count === 0).length} estágio(s) sem deals ativos
                </p>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Top risks + Recommended actions */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Principais Riscos</CardTitle>
            <CardDescription>Top 5 riscos no portfolio</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {top_risks.length === 0 ? (
              <p className="text-sm text-muted-foreground">Nenhum risco identificado 🎉</p>
            ) : (
              top_risks.map((risk, i) => (
                <div
                  key={i}
                  className="flex items-start gap-3 p-2 rounded-md hover:bg-muted/50 cursor-pointer transition-colors"
                  onClick={() => navigate(`/dashboard/opportunities/${risk.deal_id}`)}
                >
                  <Badge
                    variant={risk.severity === "HIGH" ? "destructive" : "secondary"}
                    className="mt-0.5 shrink-0 text-[10px]"
                  >
                    {risk.severity}
                  </Badge>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium truncate">{risk.deal_title}</p>
                    <p className="text-xs text-muted-foreground">{risk.reason}</p>
                  </div>
                  <span className="text-xs text-muted-foreground shrink-0">
                    Score {risk.health_score}
                  </span>
                </div>
              ))
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Ações Recomendadas</CardTitle>
            <CardDescription>Próximas ações prioritárias</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {recommended_actions.length === 0 ? (
              <p className="text-sm text-muted-foreground">Sem ações pendentes</p>
            ) : (
              recommended_actions.map((action, i) => (
                <div
                  key={i}
                  className="flex items-start gap-3 p-2 rounded-md hover:bg-muted/50 cursor-pointer transition-colors"
                  onClick={() => navigate(`/dashboard/opportunities/${action.deal_id}`)}
                >
                  <ArrowRight className="h-4 w-4 text-primary mt-0.5 shrink-0" />
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium truncate">{action.deal_title}</p>
                    <p className="text-xs text-muted-foreground">{action.action}</p>
                  </div>
                  <Badge variant="outline" className="shrink-0 text-[10px]">
                    {action.priority}
                  </Badge>
                </div>
              ))
            )}
          </CardContent>
        </Card>
      </div>

      {/* Data quality */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Qualidade dos Dados</CardTitle>
          <CardDescription>Completude média dos negócios abertos</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-4">
            <Progress value={data_quality.avg_completeness} className="flex-1" />
            <span className="text-sm font-medium w-12 text-right">{data_quality.avg_completeness}%</span>
          </div>
          <div className="flex gap-6 mt-3 text-xs text-muted-foreground">
            <span>{data_quality.deals_missing_value} sem valor definido</span>
            <span>{data_quality.deals_missing_close_date} sem data de fecho</span>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
