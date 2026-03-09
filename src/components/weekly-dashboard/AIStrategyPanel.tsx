import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Brain, AlertTriangle, Zap, Target, Loader2, Lightbulb, Star } from "lucide-react";
import { WeeklyStrategy } from "@/hooks/useWeeklyStrategy";
import { cn } from "@/lib/utils";
import { Skeleton } from "@/components/ui/skeleton";

const statusColors = {
  on_track: "bg-success/10 text-success border-success/20",
  at_risk: "bg-warning/10 text-warning border-warning/20",
  behind: "bg-destructive/10 text-destructive border-destructive/20",
};

const priorityColors = {
  high: "bg-destructive/10 text-destructive",
  medium: "bg-warning/10 text-warning",
  low: "bg-muted text-muted-foreground",
};

interface Props {
  strategy: WeeklyStrategy | null;
  isLoading: boolean;
}

export function AIStrategyPanel({ strategy, isLoading }: Props) {
  if (isLoading || !strategy) {
    return (
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium flex items-center gap-2">
            <Brain className="h-4 w-4 text-primary" />
            Estratégia Semanal IA
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {isLoading ? (
            <>
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-5/6" />
              <Skeleton className="h-20 w-full" />
              <Skeleton className="h-16 w-full" />
            </>
          ) : (
            <div className="flex flex-col items-center justify-center py-8 gap-2">
              <Brain className="h-8 w-8 text-muted-foreground" />
              <p className="text-xs text-muted-foreground">A carregar estratégia...</p>
            </div>
          )}
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {/* Summary */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium flex items-center gap-2">
            <Brain className="h-4 w-4 text-primary" />
            Estratégia Semanal IA
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-foreground leading-relaxed">{strategy.summary}</p>
        </CardContent>
      </Card>

      {/* Week Priorities (from recommendations top 3) */}
      {strategy.recommendations.length > 0 && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Star className="h-4 w-4 text-warning" />
              Prioridades da Semana
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {strategy.recommendations.slice(0, 3).map((r, i) => (
              <div key={i} className="flex items-start gap-2">
                <Badge className={cn("text-[10px] shrink-0 mt-0.5", priorityColors[r.priority])}>
                  {i + 1}
                </Badge>
                <div>
                  <p className="text-sm font-medium">{r.action}</p>
                  <p className="text-xs text-muted-foreground">{r.impact}</p>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {/* Today Actions (from quick_wins top 3) */}
      {strategy.quick_wins.length > 0 && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Zap className="h-4 w-4 text-primary" />
              Ações para Hoje
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="space-y-1.5">
              {strategy.quick_wins.slice(0, 3).map((w, i) => (
                <li key={i} className="text-sm text-muted-foreground flex gap-2">
                  <span className="text-primary font-medium">{i + 1}.</span> {w}
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      )}

      {/* Gap Analysis */}
      {strategy.gap_analysis.length > 0 && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Target className="h-4 w-4 text-primary" />
              Análise de Gap
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {strategy.gap_analysis.map((g, i) => (
              <div key={i} className={cn("p-3 rounded-lg border", statusColors[g.status])}>
                <div className="flex items-center justify-between mb-1">
                  <span className="text-sm font-medium capitalize">{g.metric}</span>
                  <Badge variant="outline" className="text-[10px]">
                    {g.actual}/{g.target} ({g.gap_pct > 0 ? "-" : "+"}{Math.abs(g.gap_pct)}%)
                  </Badge>
                </div>
                <p className="text-xs opacity-80">{g.required_action}</p>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {/* Risk + Opportunity */}
      {strategy.risk_alerts.length > 0 && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 text-destructive" />
              Risco Principal
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">{strategy.risk_alerts[0]}</p>
          </CardContent>
        </Card>
      )}

      {strategy.risk_alerts.length > 1 && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Lightbulb className="h-4 w-4 text-warning" />
              Oportunidade Escondida
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">{strategy.risk_alerts[1]}</p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
