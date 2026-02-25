import { useRevenueForecast } from "@/hooks/useRevenueForecast";
import { useIntelligencePanel } from "@/hooks/useIntelligencePanel";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ShieldCheck, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

export function ForecastConfidenceCard() {
  const { latestForecast, isLoading: forecastLoading } = useRevenueForecast();
  const { data: intel, isLoading: intelLoading } = useIntelligencePanel();

  const isLoading = forecastLoading || intelLoading;

  if (isLoading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-8">
          <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }

  const fc = (latestForecast as any)?.forecast_confidence as number | undefined;
  const confidence = fc ?? 0;
  const color = confidence >= 70 ? "text-emerald-600" : confidence >= 40 ? "text-yellow-600" : "text-destructive";
  const barColor = confidence >= 70 ? "bg-emerald-500" : confidence >= 40 ? "bg-yellow-500" : "bg-destructive";

  const message = confidence >= 70
    ? "Your forecast is well-supported by data."
    : confidence >= 40
    ? "Some deals lack data — forecast has moderate confidence."
    : "Many deals are missing data or at risk — forecast may be unreliable.";

  const benchmarks = intel?.stage_benchmarks?.filter(
    (b) => b.avg_days !== null && b.expected_days > 0 && (b.avg_days ?? 0) > b.expected_days * 1.5
  ) || [];

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium flex items-center gap-2">
          <ShieldCheck className="h-4 w-4 text-primary" />
          Is My Forecast Realistic?
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {/* Score bar */}
        <div className="space-y-1.5">
          <div className="flex items-baseline justify-between">
            <span className={cn("text-2xl font-bold", color)}>{confidence}</span>
            <span className="text-[10px] text-muted-foreground">/ 100</span>
          </div>
          <div className="h-1.5 rounded-full bg-muted">
            <div className={cn("h-full rounded-full transition-all duration-500", barColor)} style={{ width: `${Math.min(confidence, 100)}%` }} />
          </div>
        </div>

        <p className="text-xs text-muted-foreground">{message}</p>

        {/* Data quality breakdown */}
        {intel?.data_quality && (
          <div className="space-y-1 pt-1">
            {intel.data_quality.deals_missing_value > 0 && (
              <p className="text-xs text-muted-foreground">
                • <span className="text-foreground font-medium">{intel.data_quality.deals_missing_value}</span> deals without value
              </p>
            )}
            {intel.data_quality.deals_missing_close_date > 0 && (
              <p className="text-xs text-muted-foreground">
                • <span className="text-foreground font-medium">{intel.data_quality.deals_missing_close_date}</span> deals without close date
              </p>
            )}
            {intel.health_distribution.AT_RISK > 0 && (
              <p className="text-xs text-muted-foreground">
                • <span className="text-foreground font-medium">{intel.health_distribution.AT_RISK}</span> deals at risk
              </p>
            )}
          </div>
        )}

        {/* Stage bottlenecks */}
        {benchmarks.length > 0 && (
          <div className="pt-2 border-t border-border/30 space-y-1">
            <p className="text-[10px] font-medium text-muted-foreground uppercase tracking-wide">Slow Stages</p>
            {benchmarks.slice(0, 3).map((b) => (
              <div key={b.stage_id} className="flex justify-between text-xs">
                <span className="text-muted-foreground truncate">{b.stage_name}</span>
                <span className="font-medium text-yellow-600">
                  {Math.round(b.avg_days!)}d / {b.expected_days}d expected
                </span>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
