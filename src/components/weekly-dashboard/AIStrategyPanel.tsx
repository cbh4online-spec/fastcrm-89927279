import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Brain, AlertTriangle, Zap, Target, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { WeeklyStrategy } from "@/hooks/useWeeklyStrategy";
import { cn } from "@/lib/utils";

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
  onGenerate: () => void;
}

export function AIStrategyPanel({ strategy, isLoading, onGenerate }: Props) {
  if (!strategy && !isLoading) {
    return (
      <Card>
        <CardContent className="flex flex-col items-center justify-center py-12 gap-4">
          <Brain className="h-10 w-10 text-muted-foreground" />
          <p className="text-sm text-muted-foreground text-center">
            Gere uma análise estratégica com IA para esta semana
          </p>
          <Button onClick={onGenerate} disabled={isLoading}>
            <Brain className="h-4 w-4 mr-2" />
            Gerar Estratégia
          </Button>
        </CardContent>
      </Card>
    );
  }

  if (isLoading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-16">
          <Loader2 className="h-6 w-6 animate-spin text-primary mr-2" />
          <span className="text-sm text-muted-foreground">A analisar performance...</span>
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
            Resumo Estratégico
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-foreground leading-relaxed">{strategy!.summary}</p>
        </CardContent>
      </Card>

      {/* Gap Analysis */}
      {strategy!.gap_analysis.length > 0 && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Target className="h-4 w-4 text-primary" />
              Análise de Gap
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {strategy!.gap_analysis.map((g, i) => (
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

      {/* Risk Alerts */}
      {strategy!.risk_alerts.length > 0 && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 text-destructive" />
              Alertas de Risco
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="space-y-1.5">
              {strategy!.risk_alerts.map((r, i) => (
                <li key={i} className="text-sm text-muted-foreground flex gap-2">
                  <span className="text-destructive">•</span> {r}
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      )}

      {/* Recommendations */}
      {strategy!.recommendations.length > 0 && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Zap className="h-4 w-4 text-warning" />
              Recomendações
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {strategy!.recommendations.map((r, i) => (
              <div key={i} className="flex items-start gap-2">
                <Badge className={cn("text-[10px] shrink-0 mt-0.5", priorityColors[r.priority])}>
                  {r.priority}
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

      {/* Quick Wins */}
      {strategy!.quick_wins.length > 0 && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">⚡ Quick Wins</CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="space-y-1">
              {strategy!.quick_wins.map((w, i) => (
                <li key={i} className="text-sm text-muted-foreground">• {w}</li>
              ))}
            </ul>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
