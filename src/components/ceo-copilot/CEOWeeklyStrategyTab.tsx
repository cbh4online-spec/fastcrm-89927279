import { useWeeklyStrategy } from "@/hooks/useWeeklyStrategy";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { RefreshCw, Target, AlertTriangle, Lightbulb, Zap } from "lucide-react";
import { cn } from "@/lib/utils";

const statusColors: Record<string, string> = {
  on_track: "bg-emerald-500/10 text-emerald-600 border-emerald-500/20",
  at_risk: "bg-amber-500/10 text-amber-600 border-amber-500/20",
  behind: "bg-destructive/10 text-destructive border-destructive/20",
};

const priorityColors: Record<string, string> = {
  high: "bg-destructive/10 text-destructive",
  medium: "bg-amber-500/10 text-amber-600",
  low: "bg-muted text-muted-foreground",
};

export function CEOWeeklyStrategyTab() {
  const { strategy, isLoading, generate } = useWeeklyStrategy();

  if (!strategy && !isLoading) {
    return (
      <Card>
        <CardContent className="flex flex-col items-center justify-center py-12 gap-4">
          <Target className="h-12 w-12 text-muted-foreground/50" />
          <p className="text-muted-foreground">Gere a estratégia semanal com IA</p>
          <Button onClick={generate}>
            <Zap className="h-4 w-4 mr-2" />
            Gerar Estratégia Semanal
          </Button>
        </CardContent>
      </Card>
    );
  }

  if (isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-32 rounded-xl" />
        <Skeleton className="h-48 rounded-xl" />
        <Skeleton className="h-32 rounded-xl" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Summary */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-semibold">Resumo Semanal</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-foreground leading-relaxed">{strategy!.summary}</p>
        </CardContent>
      </Card>

      {/* Gap Analysis */}
      {strategy!.gap_analysis.length > 0 && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold flex items-center gap-2">
              <Target className="h-4 w-4 text-primary" />
              Gap Analysis
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-muted-foreground text-xs border-b">
                    <th className="text-left py-2 font-medium">Métrica</th>
                    <th className="text-right py-2 font-medium">Actual</th>
                    <th className="text-right py-2 font-medium">Target</th>
                    <th className="text-right py-2 font-medium">Gap</th>
                    <th className="text-center py-2 font-medium">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {strategy!.gap_analysis.map((g, i) => (
                    <tr key={i} className="border-b border-border/50">
                      <td className="py-2.5 font-medium text-foreground">{g.metric}</td>
                      <td className="py-2.5 text-right text-foreground">{g.actual.toLocaleString("pt-PT")}</td>
                      <td className="py-2.5 text-right text-muted-foreground">{g.target.toLocaleString("pt-PT")}</td>
                      <td className="py-2.5 text-right font-semibold">
                        <span className={g.gap_pct < 0 ? "text-destructive" : "text-emerald-600"}>
                          {g.gap_pct > 0 ? "+" : ""}{g.gap_pct}%
                        </span>
                      </td>
                      <td className="py-2.5 text-center">
                        <Badge variant="outline" className={cn("text-[10px]", statusColors[g.status])}>
                          {g.status === "on_track" ? "On Track" : g.status === "at_risk" ? "At Risk" : "Behind"}
                        </Badge>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Risk Alerts */}
        {strategy!.risk_alerts.length > 0 && (
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-semibold flex items-center gap-2">
                <AlertTriangle className="h-4 w-4 text-amber-500" />
                Alertas de Risco
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ul className="space-y-2">
                {strategy!.risk_alerts.map((alert, i) => (
                  <li key={i} className="flex items-start gap-2 text-sm">
                    <span className="w-1.5 h-1.5 rounded-full bg-amber-500 mt-1.5 shrink-0" />
                    <span className="text-foreground">{alert}</span>
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>
        )}

        {/* Quick Wins */}
        {strategy!.quick_wins.length > 0 && (
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-semibold flex items-center gap-2">
                <Zap className="h-4 w-4 text-primary" />
                Quick Wins
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ul className="space-y-2">
                {strategy!.quick_wins.map((win, i) => (
                  <li key={i} className="flex items-start gap-2 text-sm">
                    <span className="w-1.5 h-1.5 rounded-full bg-primary mt-1.5 shrink-0" />
                    <span className="text-foreground">{win}</span>
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Recommendations */}
      {strategy!.recommendations.length > 0 && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold flex items-center gap-2">
              <Lightbulb className="h-4 w-4 text-amber-500" />
              Recomendações
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {strategy!.recommendations.map((rec, i) => (
                <div key={i} className="flex items-start gap-3 p-3 rounded-lg bg-muted/30">
                  <Badge className={cn("text-[10px] shrink-0", priorityColors[rec.priority])}>
                    {rec.priority}
                  </Badge>
                  <div>
                    <p className="text-sm font-medium text-foreground">{rec.action}</p>
                    <p className="text-xs text-muted-foreground mt-0.5">{rec.impact}</p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      <div className="flex justify-end">
        <Button variant="outline" onClick={generate} disabled={isLoading} size="sm">
          <RefreshCw className={cn("h-4 w-4 mr-2", isLoading && "animate-spin")} />
          Regenerar Estratégia
        </Button>
      </div>
    </div>
  );
}
