import { usePipelineRiskReport } from "@/hooks/usePipelineRiskReport";
import { usePipelineRiskAnalysis } from "@/hooks/useRevenueIntelligenceDashboard";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { ShieldAlert, RefreshCw, AlertTriangle, TrendingDown, Clock, Brain } from "lucide-react";
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from "recharts";
import { cn } from "@/lib/utils";

function formatCurrency(value: number): string {
  if (value >= 1_000_000) return `€${(value / 1_000_000).toFixed(1)}M`;
  if (value >= 1_000) return `€${(value / 1_000).toFixed(1)}K`;
  return `€${value.toFixed(0)}`;
}

const riskLevelConfig = {
  low: { label: "Baixo", color: "bg-emerald-500/10 text-emerald-600" },
  medium: { label: "Médio", color: "bg-amber-500/10 text-amber-600" },
  high: { label: "Alto", color: "bg-orange-500/10 text-orange-600" },
  critical: { label: "Crítico", color: "bg-destructive/10 text-destructive" },
};

const urgencyColors = {
  immediate: "bg-destructive/10 text-destructive",
  this_week: "bg-amber-500/10 text-amber-600",
  monitor: "bg-muted text-muted-foreground",
};

const categoryConfig = {
  hot: { label: "Hot", color: "hsl(0 84% 60%)" },
  likely: { label: "Likely", color: "hsl(142 76% 36%)" },
  uncertain: { label: "Uncertain", color: "hsl(38 92% 50%)" },
  low: { label: "Low", color: "hsl(215 16% 47%)" },
};

export function CEOPipelineHealthTab() {
  const { report, isLoading: reportLoading, generate } = usePipelineRiskReport();
  const { buckets, isLoading: bucketsLoading } = usePipelineRiskAnalysis();

  const chartData = buckets
    .filter((b) => b.count > 0)
    .map((b) => ({
      name: categoryConfig[b.category].label,
      value: b.total_value,
      fill: categoryConfig[b.category].color,
    }));

  const totalValue = buckets.reduce((s, b) => s + b.total_value, 0);
  const totalDeals = buckets.reduce((s, b) => s + b.count, 0);

  return (
    <div className="space-y-6">
      {/* Risk Buckets Overview */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold flex items-center gap-2">
              <ShieldAlert className="h-4 w-4 text-amber-500" />
              Pipeline por Risco
            </CardTitle>
          </CardHeader>
          <CardContent>
            {bucketsLoading ? (
              <Skeleton className="h-[160px]" />
            ) : totalDeals === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-8">Sem deals ativos</p>
            ) : (
              <div className="flex items-center gap-4">
                <div className="w-[140px] h-[140px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie data={chartData} cx="50%" cy="50%" innerRadius={40} outerRadius={65} paddingAngle={2} dataKey="value">
                        {chartData.map((entry, i) => (
                          <Cell key={i} fill={entry.fill} />
                        ))}
                      </Pie>
                      <Tooltip formatter={(v: number) => formatCurrency(v)} />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
                <div className="space-y-1">
                  <p className="text-2xl font-bold text-foreground">{formatCurrency(totalValue)}</p>
                  <p className="text-xs text-muted-foreground">{totalDeals} deals ativos</p>
                  <div className="grid grid-cols-2 gap-2 mt-2">
                    {buckets.map((b) => (
                      <div key={b.category} className="flex items-center gap-1.5">
                        <span className="w-2 h-2 rounded-full" style={{ backgroundColor: categoryConfig[b.category].color }} />
                        <span className="text-xs text-muted-foreground">{categoryConfig[b.category].label}: {b.count}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* AI Risk Level */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold flex items-center gap-2">
              <Brain className="h-4 w-4 text-violet-500" />
              AI Risk Assessment
            </CardTitle>
          </CardHeader>
          <CardContent>
            {!report ? (
              <div className="flex flex-col items-center justify-center py-8 gap-3">
                <p className="text-sm text-muted-foreground">Analise o pipeline com IA</p>
                <Button onClick={generate} disabled={reportLoading} size="sm">
                  <RefreshCw className={cn("h-4 w-4 mr-2", reportLoading && "animate-spin")} />
                  Analisar Riscos
                </Button>
              </div>
            ) : reportLoading ? (
              <Skeleton className="h-[140px]" />
            ) : report.ai_assessment ? (
              <div className="space-y-3">
                <Badge className={cn("text-xs", riskLevelConfig[report.ai_assessment.risk_level].color)}>
                  Risco {riskLevelConfig[report.ai_assessment.risk_level].label}
                </Badge>
                <p className="text-sm text-foreground">{report.ai_assessment.summary}</p>
                <div className="flex gap-4 text-xs text-muted-foreground">
                  <span>Pipeline: {formatCurrency(report.total_pipeline)}</span>
                  <span>Em risco: {formatCurrency(report.at_risk_value)}</span>
                </div>
              </div>
            ) : (
              <p className="text-sm text-muted-foreground text-center py-4">Dados insuficientes para análise</p>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Stalled & Low Prob deals */}
      {report && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Stalled Deals */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-semibold flex items-center gap-2">
                <Clock className="h-4 w-4 text-amber-500" />
                Deals Estagnados ({report.stalled_deals.length})
              </CardTitle>
            </CardHeader>
            <CardContent>
              {report.stalled_deals.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-4">Nenhum deal estagnado 🎉</p>
              ) : (
                <div className="space-y-2">
                  {report.stalled_deals.slice(0, 5).map((deal) => (
                    <div key={deal.id} className="flex items-center justify-between p-2 rounded-lg bg-muted/30">
                      <div className="min-w-0">
                        <p className="text-sm font-medium truncate text-foreground">{deal.title}</p>
                        <p className="text-xs text-muted-foreground">{deal.days_stalled} dias sem atividade</p>
                      </div>
                      <span className="text-sm font-semibold text-foreground shrink-0 ml-2">{formatCurrency(deal.value || 0)}</span>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Low Probability */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-semibold flex items-center gap-2">
                <TrendingDown className="h-4 w-4 text-destructive" />
                Baixa Probabilidade ({report.low_prob_deals.length})
              </CardTitle>
            </CardHeader>
            <CardContent>
              {report.low_prob_deals.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-4">Nenhum deal de baixa probabilidade</p>
              ) : (
                <div className="space-y-2">
                  {report.low_prob_deals.slice(0, 5).map((deal) => (
                    <div key={deal.id} className="flex items-center justify-between p-2 rounded-lg bg-muted/30">
                      <div className="min-w-0">
                        <p className="text-sm font-medium truncate text-foreground">{deal.title}</p>
                        <p className="text-xs text-muted-foreground">Probabilidade: {deal.probability}%</p>
                      </div>
                      <span className="text-sm font-semibold text-foreground shrink-0 ml-2">{formatCurrency(deal.value || 0)}</span>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      )}

      {/* AI Actions & Patterns */}
      {report?.ai_assessment && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {report.ai_assessment.critical_actions.length > 0 && (
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-semibold flex items-center gap-2">
                  <AlertTriangle className="h-4 w-4 text-destructive" />
                  Ações Críticas
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {report.ai_assessment.critical_actions.map((a, i) => (
                    <div key={i} className="p-2.5 rounded-lg bg-muted/30 space-y-1">
                      <div className="flex items-center gap-2">
                        <Badge className={cn("text-[10px]", urgencyColors[a.urgency])}>
                          {a.urgency === "immediate" ? "Imediato" : a.urgency === "this_week" ? "Esta Semana" : "Monitorar"}
                        </Badge>
                        <span className="text-xs font-medium text-foreground">{a.deal_title}</span>
                      </div>
                      <p className="text-xs text-muted-foreground">{a.action}</p>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {report.ai_assessment.recommendations.length > 0 && (
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-semibold flex items-center gap-2">
                  <Brain className="h-4 w-4 text-violet-500" />
                  Recomendações AI
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ul className="space-y-2">
                  {report.ai_assessment.recommendations.map((rec, i) => (
                    <li key={i} className="flex items-start gap-2 text-sm">
                      <span className="w-1.5 h-1.5 rounded-full bg-violet-500 mt-1.5 shrink-0" />
                      <span className="text-foreground">{rec}</span>
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          )}
        </div>
      )}

      {/* Regenerate */}
      <div className="flex justify-end">
        <Button variant="outline" onClick={generate} disabled={reportLoading} size="sm">
          <RefreshCw className={cn("h-4 w-4 mr-2", reportLoading && "animate-spin")} />
          {report ? "Reanalisar Pipeline" : "Analisar Pipeline"}
        </Button>
      </div>
    </div>
  );
}
