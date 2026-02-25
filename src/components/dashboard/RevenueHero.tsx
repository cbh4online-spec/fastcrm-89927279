import { useRevenueForecast, formatCurrency } from "@/hooks/useRevenueForecast";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { TrendingUp, TrendingDown, Loader2, ShieldCheck } from "lucide-react";
import { cn } from "@/lib/utils";

function confidenceLabel(score: number) {
  if (score >= 70) return { text: "Alta confiança", color: "text-emerald-600 border-emerald-200" };
  if (score >= 40) return { text: "Média confiança", color: "text-yellow-600 border-yellow-200" };
  return { text: "Baixa confiança", color: "text-destructive border-destructive/30" };
}

export function RevenueHero() {
  const { latestForecast, trend, isLoading } = useRevenueForecast();

  if (isLoading) {
    return (
      <Card className="bg-gradient-to-br from-primary/5 via-background to-violet-500/5 border-primary/10">
        <CardContent className="flex items-center justify-center py-12">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }

  if (!latestForecast) {
    return (
      <Card className="bg-gradient-to-br from-primary/5 via-background to-violet-500/5 border-primary/10">
        <CardContent className="py-8 text-center">
          <p className="text-sm text-muted-foreground">No revenue forecast available yet.</p>
        </CardContent>
      </Card>
    );
  }

  const fc = (latestForecast as any).forecast_confidence as number | undefined;
  const healthAdj = (latestForecast as any).health_adjusted_expected as number | undefined;
  const conf = fc != null && fc > 0 ? confidenceLabel(fc) : null;

  return (
    <Card className="bg-gradient-to-br from-primary/5 via-background to-violet-500/5 border-primary/10">
      <CardContent className="pt-6">
        <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-4">
          <div>
            <p className="text-sm text-muted-foreground mb-1">Revenue Forecast</p>
            <div className="flex items-baseline gap-3">
              <span className="text-4xl font-bold tracking-tight">
                {formatCurrency(latestForecast.expected_case)}
              </span>
              {trend !== null && (
                <Badge variant="outline" className={cn(
                  "text-xs",
                  trend >= 0 ? "text-emerald-600 border-emerald-200" : "text-destructive border-destructive/30"
                )}>
                  {trend >= 0 ? <TrendingUp className="h-3 w-3 mr-0.5" /> : <TrendingDown className="h-3 w-3 mr-0.5" />}
                  {trend > 0 ? "+" : ""}{trend}%
                </Badge>
              )}
              {conf && (
                <Badge variant="outline" className={cn("text-xs gap-1", conf.color)}>
                  <ShieldCheck className="h-3 w-3" />
                  {conf.text}
                </Badge>
              )}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              Expected case • {latestForecast.opportunity_count} opportunities
              {healthAdj != null && healthAdj > 0 && (
                <span className="ml-2">• Risk-adjusted: {formatCurrency(healthAdj)}</span>
              )}
            </p>
          </div>

          <div className="flex gap-6">
            <div className="text-right">
              <p className="text-xs text-muted-foreground">Best</p>
              <p className="text-lg font-semibold text-emerald-600">{formatCurrency(latestForecast.best_case)}</p>
            </div>
            <div className="text-right">
              <p className="text-xs text-muted-foreground">Worst</p>
              <p className="text-lg font-semibold text-destructive">{formatCurrency(latestForecast.worst_case)}</p>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
