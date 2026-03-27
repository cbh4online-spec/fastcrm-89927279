import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { TrendingUp, TrendingDown, Minus, BarChart3, Loader2 } from "lucide-react";
import { useCalculatedMetrics } from "@/hooks/useCalculatedMetrics";
import { cn } from "@/lib/utils";

export function MetricWidgets() {
  const { data: metrics, isLoading } = useCalculatedMetrics();

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!metrics || metrics.length === 0) return null;

  return (
    <div className="space-y-3">
      <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
        <BarChart3 className="h-4 w-4" />
        Métricas do Pipeline
      </h3>
      <div className="grid gap-3 grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {metrics.map((m) => (
          <MetricCard key={m.metric_id} metric={m} />
        ))}
      </div>
    </div>
  );
}

function MetricCard({ metric }: { metric: import("@/hooks/useCalculatedMetrics").CalculatedMetric }) {
  const pctTarget = metric.pct_of_target ?? 0;
  const pctChange = metric.pct_change;
  const isAboveTarget = pctTarget >= 100;
  const isNearTarget = pctTarget >= 70;

  return (
    <Card className="relative overflow-hidden">
      <CardHeader className="pb-1 pt-3 px-4">
        <div className="flex items-center justify-between">
          <CardTitle className="text-xs font-medium text-muted-foreground truncate">
            {metric.metric_name}
          </CardTitle>
          {pctChange !== null && (
            <Badge
              variant="outline"
              className={cn(
                "text-[10px] gap-0.5 px-1.5 py-0",
                pctChange > 0 ? "text-emerald-600 border-emerald-200" :
                pctChange < 0 ? "text-destructive border-destructive/30" :
                "text-muted-foreground"
              )}
            >
              {pctChange > 0 ? <TrendingUp className="h-2.5 w-2.5" /> :
               pctChange < 0 ? <TrendingDown className="h-2.5 w-2.5" /> :
               <Minus className="h-2.5 w-2.5" />}
              {Math.abs(pctChange)}%
            </Badge>
          )}
        </div>
      </CardHeader>
      <CardContent className="px-4 pb-3 space-y-2">
        <div className="flex items-baseline gap-1.5">
          <span className="text-2xl font-bold text-foreground">
            {formatValue(metric.current_value, metric.unit)}
          </span>
          {metric.unit && !["€", "%"].includes(metric.unit) && (
            <span className="text-xs text-muted-foreground">{metric.unit}</span>
          )}
        </div>
        {metric.target_value != null && (
          <div className="space-y-1">
            <Progress
              value={Math.min(pctTarget, 100)}
              className={cn(
                "h-1.5",
                isAboveTarget ? "[&>div]:bg-emerald-500" :
                isNearTarget ? "[&>div]:bg-amber-500" :
                "[&>div]:bg-destructive"
              )}
            />
            <div className="flex items-center justify-between text-[10px] text-muted-foreground">
              <span>Meta: {formatValue(metric.target_value, metric.unit)}</span>
              <span className={cn(
                "font-medium",
                isAboveTarget ? "text-emerald-600" :
                isNearTarget ? "text-amber-600" :
                "text-destructive"
              )}>
                {pctTarget.toFixed(0)}%
              </span>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function formatValue(value: number, unit?: string): string {
  if (unit === "€") return `€${value.toLocaleString("pt-PT", { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;
  if (unit === "%") return `${value.toFixed(1)}%`;
  if (unit === "dias" || unit === "days") return `${value.toFixed(1)}`;
  return value.toLocaleString("pt-PT", { maximumFractionDigits: 0 });
}
