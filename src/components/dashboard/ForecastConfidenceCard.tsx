import { useRevenueForecast, formatCurrency } from "@/hooks/useRevenueForecast";
import { useIntelligencePanel } from "@/hooks/useIntelligencePanel";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ShieldCheck, Loader2, AlertTriangle } from "lucide-react";
import { cn } from "@/lib/utils";
import { useTranslation } from "react-i18next";

export function ForecastConfidenceCard() {
  const { t } = useTranslation('dashboard');
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
    ? t('forecastWellSupported')
    : confidence >= 40
    ? t('forecastModerateConfidence')
    : t('forecastUnreliable');

  const benchmarks = intel?.stage_benchmarks?.filter(
    (b) => b.avg_days !== null && b.expected_days > 0 && (b.avg_days ?? 0) > b.expected_days * 1.5
  ) || [];

  const blockers: string[] = (latestForecast as any)?.blockers ?? [];

  const healthyRev = (latestForecast as any)?.healthy_revenue ?? 0;
  const watchRev = (latestForecast as any)?.watch_revenue ?? 0;
  const atRiskRev = (latestForecast as any)?.at_risk_revenue ?? 0;
  const totalRev = healthyRev + watchRev + atRiskRev;
  const healthyPct = totalRev > 0 ? (healthyRev / totalRev) * 100 : 0;
  const watchPct = totalRev > 0 ? (watchRev / totalRev) * 100 : 0;
  const atRiskPct = totalRev > 0 ? (atRiskRev / totalRev) * 100 : 0;

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium flex items-center gap-2">
          <ShieldCheck className="h-4 w-4 text-primary" />
          {t('isMyForecastRealistic')}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
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

        {totalRev > 0 && (
          <div className="space-y-1.5 pt-1">
            <p className="text-[10px] font-medium text-muted-foreground uppercase tracking-wide">{t('revenueByHealth')}</p>
            <div className="flex h-2 rounded-full overflow-hidden bg-muted">
              {healthyPct > 0 && <div className="bg-emerald-500 transition-all duration-500" style={{ width: `${healthyPct}%` }} />}
              {watchPct > 0 && <div className="bg-yellow-500 transition-all duration-500" style={{ width: `${watchPct}%` }} />}
              {atRiskPct > 0 && <div className="bg-destructive transition-all duration-500" style={{ width: `${atRiskPct}%` }} />}
            </div>
            <div className="flex justify-between text-[10px] text-muted-foreground">
              <span className="flex items-center gap-1">
                <span className="inline-block w-2 h-2 rounded-full bg-emerald-500" />
                {t('healthy')} {formatCurrency(healthyRev)}
              </span>
              <span className="flex items-center gap-1">
                <span className="inline-block w-2 h-2 rounded-full bg-yellow-500" />
                {t('watch')} {formatCurrency(watchRev)}
              </span>
              <span className="flex items-center gap-1">
                <span className="inline-block w-2 h-2 rounded-full bg-destructive" />
                {t('risk')} {formatCurrency(atRiskRev)}
              </span>
            </div>
          </div>
        )}

        {blockers.length > 0 && (
          <div className="pt-2 border-t border-border/30 space-y-1.5">
            <p className="text-[10px] font-medium text-muted-foreground uppercase tracking-wide">{t('forecastBlockers')}</p>
            {blockers.slice(0, 5).map((blocker, i) => (
              <div key={i} className="flex items-start gap-1.5 text-xs text-muted-foreground">
                <AlertTriangle className="h-3 w-3 mt-0.5 text-yellow-500 shrink-0" />
                <span>{blocker}</span>
              </div>
            ))}
          </div>
        )}

        {intel?.data_quality && (
          <div className="space-y-1 pt-1">
            {intel.data_quality.deals_missing_value > 0 && (
              <p className="text-xs text-muted-foreground">
                • <span className="text-foreground font-medium">{intel.data_quality.deals_missing_value}</span> {t('dealsWithoutValue')}
              </p>
            )}
            {intel.data_quality.deals_missing_close_date > 0 && (
              <p className="text-xs text-muted-foreground">
                • <span className="text-foreground font-medium">{intel.data_quality.deals_missing_close_date}</span> {t('dealsWithoutCloseDate')}
              </p>
            )}
            {intel.health_distribution.AT_RISK > 0 && (
              <p className="text-xs text-muted-foreground">
                • <span className="text-foreground font-medium">{intel.health_distribution.AT_RISK}</span> {t('dealsAtRiskLabel')}
              </p>
            )}
          </div>
        )}

        {benchmarks.length > 0 && (
          <div className="pt-2 border-t border-border/30 space-y-1">
            <p className="text-[10px] font-medium text-muted-foreground uppercase tracking-wide">{t('slowStages')}</p>
            {benchmarks.slice(0, 3).map((b) => (
              <div key={b.stage_id} className="flex justify-between text-xs">
                <span className="text-muted-foreground truncate">{b.stage_name}</span>
                <span className="font-medium text-yellow-600">
                  {t('dExpected', { avg: Math.round(b.avg_days!), expected: b.expected_days })}
                </span>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
