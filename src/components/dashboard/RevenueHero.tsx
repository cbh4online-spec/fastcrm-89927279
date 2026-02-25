import { useRevenueForecast, formatCurrency } from "@/hooks/useRevenueForecast";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { TrendingUp, TrendingDown, Loader2, ShieldCheck, AlertTriangle } from "lucide-react";
import { cn } from "@/lib/utils";
import { useTranslation } from "react-i18next";

export function RevenueHero() {
  const { t } = useTranslation('dashboard');
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
          <p className="text-sm text-muted-foreground">{t('noForecastAvailable')}</p>
        </CardContent>
      </Card>
    );
  }

  const fc = (latestForecast as any).forecast_confidence as number | undefined;
  const healthAdj = (latestForecast as any).health_adjusted_expected as number | undefined;
  const stageWeighted = (latestForecast as any).stage_weighted as number | undefined;

  const confLabel = fc != null && fc > 0
    ? fc >= 70
      ? { text: t('highConfidence'), color: "text-emerald-600 border-emerald-200" }
      : fc >= 40
      ? { text: t('mediumConfidence'), color: "text-yellow-600 border-yellow-200" }
      : { text: t('lowConfidence'), color: "text-destructive border-destructive/30" }
    : null;

  const lowConfidence = fc != null && fc < 60;

  return (
    <Card className="bg-gradient-to-br from-primary/5 via-background to-violet-500/5 border-primary/10">
      <CardContent className="pt-6">
        <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-4">
          <div>
            <p className="text-sm text-muted-foreground mb-1">{t('revenueForecast')}</p>
            <div className="flex items-baseline gap-3 flex-wrap">
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
              {confLabel && (
                <Badge variant="outline" className={cn("text-xs gap-1", confLabel.color)}>
                  <ShieldCheck className="h-3 w-3" />
                  {confLabel.text}
                </Badge>
              )}
              {lowConfidence && (
                <Badge variant="outline" className="text-xs gap-1 text-destructive border-destructive/30">
                  <AlertTriangle className="h-3 w-3" />
                  {t('insufficientData')}
                </Badge>
              )}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              {t('expectedCase')} • {latestForecast.opportunity_count} {t('opportunities')}
              {healthAdj != null && healthAdj > 0 && (
                <span className="ml-2">• {t('riskAdjusted')}: {formatCurrency(healthAdj)}</span>
              )}
            </p>
          </div>

          <div className="flex gap-6">
            <div className="text-right">
              <p className="text-xs text-muted-foreground">{t('stageWeighted')}</p>
              <p className="text-lg font-semibold text-primary">
                {formatCurrency(stageWeighted ?? 0)}
              </p>
            </div>
            <div className="text-right">
              <p className="text-xs text-muted-foreground">{t('riskAdjusted')}</p>
              <p className="text-lg font-semibold text-emerald-600">
                {formatCurrency(healthAdj ?? 0)}
              </p>
            </div>
            <div className="text-right">
              <p className="text-xs text-muted-foreground">{t('gross')}</p>
              <p className="text-lg font-semibold text-muted-foreground">
                {formatCurrency(latestForecast.best_case)}
              </p>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
