import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Brain,
  AlertTriangle,
  Lightbulb,
  CheckCircle2,
  Info,
  ArrowRight,
  RefreshCw,
} from "lucide-react";
import { AIKPIAnalysis, KPIInsight } from "@/types/kpis";
import { cn } from "@/lib/utils";
import { useNavigate } from "react-router-dom";

interface KPIAIInsightsPanelProps {
  analysis: AIKPIAnalysis | null;
  isLoading?: boolean;
  onRefresh?: () => void;
}

function InsightIcon({ type }: { type: KPIInsight["type"] }) {
  switch (type) {
    case "warning":
      return <AlertTriangle className="h-4 w-4 text-amber-500" />;
    case "opportunity":
      return <Lightbulb className="h-4 w-4 text-blue-500" />;
    case "success":
      return <CheckCircle2 className="h-4 w-4 text-green-500" />;
    default:
      return <Info className="h-4 w-4 text-muted-foreground" />;
  }
}

function InsightCard({ insight }: { insight: KPIInsight }) {
  const navigate = useNavigate();

  const priorityColors = {
    high: "border-l-red-500 bg-red-50/50 dark:bg-red-900/10",
    medium: "border-l-amber-500 bg-amber-50/50 dark:bg-amber-900/10",
    low: "border-l-blue-500 bg-blue-50/50 dark:bg-blue-900/10",
  };

  return (
    <div
      className={cn(
        "border-l-4 rounded-r-lg p-3 space-y-2",
        priorityColors[insight.priority]
      )}
    >
      <div className="flex items-start gap-2">
        <InsightIcon type={insight.type} />
        <div className="flex-1 min-w-0">
          <p className="font-medium text-sm">{insight.title}</p>
          <p className="text-xs text-muted-foreground mt-0.5">
            {insight.description}
          </p>
        </div>
        <Badge
          variant="outline"
          className={cn(
            "text-xs shrink-0",
            insight.priority === "high" && "border-red-300 text-red-700",
            insight.priority === "medium" && "border-amber-300 text-amber-700",
            insight.priority === "low" && "border-blue-300 text-blue-700"
          )}
        >
          {insight.priority === "high" && "Urgente"}
          {insight.priority === "medium" && "Atenção"}
          {insight.priority === "low" && "Info"}
        </Badge>
      </div>

      {insight.suggestion && (
        <p className="text-xs text-muted-foreground bg-muted/50 rounded p-2">
          💡 {insight.suggestion}
        </p>
      )}

      {insight.actionRoute && insight.actionLabel && (
        <Button
          variant="ghost"
          size="sm"
          className="h-7 text-xs p-0 hover:bg-transparent"
          onClick={() => navigate(insight.actionRoute!)}
        >
          {insight.actionLabel}
          <ArrowRight className="h-3 w-3 ml-1" />
        </Button>
      )}
    </div>
  );
}

export function KPIAIInsightsPanel({
  analysis,
  isLoading,
  onRefresh,
}: KPIAIInsightsPanelProps) {
  if (isLoading) {
    return (
      <Card>
        <CardHeader className="pb-2">
          <div className="flex items-center gap-2">
            <Skeleton className="h-5 w-5 rounded" />
            <Skeleton className="h-5 w-32" />
          </div>
        </CardHeader>
        <CardContent className="space-y-3">
          <Skeleton className="h-16 w-full" />
          <Skeleton className="h-20 w-full" />
          <Skeleton className="h-16 w-full" />
        </CardContent>
      </Card>
    );
  }

  if (!analysis) {
    return (
      <Card className="border-dashed">
        <CardContent className="flex flex-col items-center justify-center py-8 text-center">
          <Brain className="h-10 w-10 text-muted-foreground/50 mb-3" />
          <p className="text-muted-foreground">
            Ainda a analisar os teus dados...
          </p>
          <p className="text-sm text-muted-foreground/70 mt-1">
            Os insights aparecerão automaticamente.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Brain className="h-5 w-5 text-primary" />
            <CardTitle className="text-base">Insights IA</CardTitle>
          </div>
          {onRefresh && (
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8"
              onClick={onRefresh}
            >
              <RefreshCw className="h-4 w-4" />
            </Button>
          )}
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Summary */}
        {analysis.summary && (
          <div className="p-3 rounded-lg bg-primary/5 border border-primary/20">
            <p className="text-sm">{analysis.summary}</p>
          </div>
        )}

        {/* Insights */}
        {analysis.insights.length > 0 && (
          <div className="space-y-3">
            {analysis.insights.map((insight) => (
              <InsightCard key={insight.id} insight={insight} />
            ))}
          </div>
        )}

        {/* Risk Alerts */}
        {analysis.riskAlerts.length > 0 && (
          <div className="space-y-2">
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
              Alertas de Risco
            </p>
            {analysis.riskAlerts.map((alert, i) => (
              <div
                key={i}
                className="flex items-start gap-2 text-sm text-red-700 dark:text-red-400 bg-red-50 dark:bg-red-900/20 p-2 rounded"
              >
                <AlertTriangle className="h-4 w-4 mt-0.5 shrink-0" />
                <p>{alert}</p>
              </div>
            ))}
          </div>
        )}

        {/* Recommendations */}
        {analysis.recommendations.length > 0 && (
          <div className="space-y-2">
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
              Recomendações
            </p>
            <ul className="space-y-1">
              {analysis.recommendations.map((rec, i) => (
                <li
                  key={i}
                  className="flex items-start gap-2 text-sm text-muted-foreground"
                >
                  <CheckCircle2 className="h-4 w-4 mt-0.5 text-green-500 shrink-0" />
                  <p>{rec}</p>
                </li>
              ))}
            </ul>
          </div>
        )}

        {analysis.insights.length === 0 &&
          analysis.recommendations.length === 0 && (
            <p className="text-sm text-muted-foreground text-center py-4">
              Tudo em ordem! Sem alertas ou sugestões no momento.
            </p>
          )}
      </CardContent>
    </Card>
  );
}
