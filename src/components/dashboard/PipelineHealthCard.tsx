import { useIntelligencePanel } from "@/hooks/useIntelligencePanel";
import { useWeeklyPerformance } from "@/hooks/useWeeklyPerformance";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Activity, Loader2, TrendingDown, Shield, AlertTriangle, HelpCircle } from "lucide-react";
import { cn } from "@/lib/utils";
import { formatCurrency } from "@/lib/formatters";
import { useTranslation } from "react-i18next";
import { TFunction } from "i18next";

/**
 * Pipeline Health Score Configuration
 * 
 * Weights define how much each factor contributes to the final score (0-100):
 * - STALLED_WEIGHT (40): High stagnation ratio penalizes heavily — stalled deals block revenue.
 * - MISSING_DATA_WEIGHT (30): Missing close dates reduce forecast reliability.
 * - COVERAGE_WEIGHT (30): Pipeline coverage vs target — 3x+ coverage is healthy.
 * 
 * Formula: score = 100 - (stalledRatio × STALLED_WEIGHT) - (missingDataRatio × MISSING_DATA_WEIGHT) + (normalizedCoverage × COVERAGE_WEIGHT)
 * Coverage is normalized: min(coverageRatio, 3) / 3 so that 3x = full bonus.
 * Result is clamped to 0-100.
 * 
 * Future: These weights can be read from workspace settings for customization.
 */
export const HEALTH_SCORE_WEIGHTS = {
  STALLED_WEIGHT: 40,
  MISSING_DATA_WEIGHT: 30,
  COVERAGE_WEIGHT: 30,
  COVERAGE_MAX: 3, // 3x coverage = max bonus
} as const;

function computeHealthScore(
  coverageRatio: number,
  stalledRatio: number,
  missingDataRatio: number
): number {
  const { STALLED_WEIGHT, MISSING_DATA_WEIGHT, COVERAGE_WEIGHT, COVERAGE_MAX } = HEALTH_SCORE_WEIGHTS;
  const raw = 100
    - (stalledRatio * STALLED_WEIGHT)
    - (missingDataRatio * MISSING_DATA_WEIGHT)
    + (Math.min(coverageRatio, COVERAGE_MAX) / COVERAGE_MAX * COVERAGE_WEIGHT);
  return Math.max(0, Math.min(100, Math.round(raw)));
}

function getBusinessExplanation(
  t: TFunction,
  score: number,
  stalledRatio: number,
  missingDataRatio: number,
  coverageRatio: number
): { text: string; action: string } {
  if (score >= 70) return {
    text: t('healthyPipeline', { coverage: coverageRatio.toFixed(1) }),
    action: t('healthyAction'),
  };
  if (score >= 40) {
    const reasons: string[] = [];
    if (stalledRatio > 0.3) reasons.push(t('riskReasonStalled', { pct: Math.round(stalledRatio * 100) }));
    if (missingDataRatio > 0.2) reasons.push(t('riskReasonMissing', { pct: Math.round(missingDataRatio * 100) }));
    if (coverageRatio < 2) reasons.push(t('riskReasonCoverage', { ratio: coverageRatio.toFixed(1) }));
    return {
      text: t('riskPipeline', { reasons: reasons.join(", ") || t('riskPipelineFallback') }),
      action: t('riskAction'),
    };
  }
  return {
    text: t('criticalPipeline', { pct: Math.round(stalledRatio * 100) }),
    action: t('criticalAction'),
  };
}

export function PipelineHealthCard() {
  const { t } = useTranslation('dashboard');
  const { data, isLoading } = useIntelligencePanel();
  const { data: weeklyData } = useWeeklyPerformance();

  if (isLoading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-8">
          <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }

  if (!data) {
    return (
      <Card>
        <CardContent className="py-6 text-center text-sm text-muted-foreground">
          {t('noDataAvailable')}
        </CardContent>
      </Card>
    );
  }

  const dist = data.health_distribution;
  const totalDeals = data.total_open || 1;
  const pipelineValue = weeklyData?.pipelineValue ?? 0;
  const weeklyTarget = weeklyData?.metrics.find((m) => m.key === "revenue")?.target ?? 0;
  const monthlyTarget = weeklyTarget * 4;

  const coverageRatio = monthlyTarget > 0 ? pipelineValue / monthlyTarget : 0;
  const stalledRatio = data.portfolio_momentum
    ? data.portfolio_momentum.deals_stale / totalDeals
    : (dist.AT_RISK + dist.WATCH) / totalDeals;
  const missingDataRatio = data.data_quality.deals_missing_close_date / totalDeals;

  const score = computeHealthScore(coverageRatio, stalledRatio, missingDataRatio);
  const label = score >= 70 ? t('healthy') : score >= 40 ? t('atRisk') : t('critical');
  const color = score >= 70 ? "text-success" : score >= 40 ? "text-warning" : "text-destructive";

  const explanation = getBusinessExplanation(t, score, stalledRatio, missingDataRatio, coverageRatio);
  const atRiskCount = dist.AT_RISK + dist.WATCH;
  const avgDealValue = totalDeals > 0 ? pipelineValue / totalDeals : 0;
  const revenueAtRisk = atRiskCount * avgDealValue;
  const targetImpactPct = weeklyTarget > 0 ? Math.round((revenueAtRisk / weeklyTarget) * 100) : 0;

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium flex items-center gap-2">
          <Activity className="h-4 w-4" />
          {t('pipelineHealth')}
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <HelpCircle className="h-3.5 w-3.5 text-muted-foreground cursor-help" />
              </TooltipTrigger>
              <TooltipContent side="top" className="max-w-xs text-xs">
                {t('healthScoreTooltip')}
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {/* Score */}
        <div className="flex items-baseline gap-2">
          <span className={cn("text-3xl font-bold", color)}>{score}%</span>
          <Badge variant={score >= 70 ? "default" : score >= 40 ? "secondary" : "destructive"} className="text-[10px]">
            {label}
          </Badge>
        </div>

        {/* Business explanation */}
        <p className="text-xs text-muted-foreground leading-relaxed">{explanation.text}</p>

        {/* Key ratios */}
        <div className="grid grid-cols-3 gap-2 text-center">
          {[
            { label: t('coverageLabel'), value: `${coverageRatio.toFixed(1)}x`, good: coverageRatio >= 3 },
            { label: t('stagnationLabel'), value: `${Math.round(stalledRatio * 100)}%`, good: stalledRatio < 0.2 },
            { label: t('dataLabel'), value: `${Math.round((1 - missingDataRatio) * 100)}%`, good: missingDataRatio < 0.1 },
          ].map((item) => (
            <div key={item.label}>
              <p className={cn("text-sm font-semibold", item.good ? "text-success" : "text-destructive")}>{item.value}</p>
              <p className="text-[10px] text-muted-foreground">{item.label}</p>
            </div>
          ))}
        </div>

        {/* Distribution */}
        <div className="grid grid-cols-3 gap-2 text-center pt-2 border-t border-border/30">
          {[
            { label: t('healthy'), value: dist.HEALTHY, dotColor: "bg-success" },
            { label: t('watch'), value: dist.WATCH, dotColor: "bg-warning" },
            { label: t('atRisk'), value: dist.AT_RISK, dotColor: "bg-destructive" },
          ].map((item) => (
            <div key={item.label}>
              <div className={cn("w-2 h-2 rounded-full mx-auto mb-1", item.dotColor)} />
              <p className="text-sm font-semibold">{item.value}</p>
              <p className="text-[10px] text-muted-foreground">{item.label}</p>
            </div>
          ))}
        </div>

        {/* Revenue impact */}
        {revenueAtRisk > 0 && (
          <div className="pt-2 border-t border-border/30 space-y-1.5">
            <div className="flex items-center gap-1.5">
              <TrendingDown className="h-3 w-3 text-destructive" />
              <p className="text-[10px] font-medium text-muted-foreground uppercase tracking-wide">{t('revenueImpact')}</p>
            </div>
            <div className="flex justify-between text-xs">
              <span className="text-muted-foreground">{t('valueAtRisk')}</span>
              <span className="font-medium text-destructive">{formatCurrency(revenueAtRisk)}</span>
            </div>
            {targetImpactPct > 0 && (
              <div className="flex justify-between text-xs">
                <span className="text-muted-foreground">{t('weeklyTargetPct')}</span>
                <span className="font-medium text-destructive">{targetImpactPct}%</span>
              </div>
            )}
          </div>
        )}

        {/* Recommended action */}
        <div className="pt-2 border-t border-border/30">
          <div className="flex items-start gap-1.5">
            <Shield className="h-3 w-3 text-primary shrink-0 mt-0.5" />
            <p className="text-xs text-muted-foreground">{explanation.action}</p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
