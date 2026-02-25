import { useIntelligencePanel } from "@/hooks/useIntelligencePanel";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Activity, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { useTranslation } from "react-i18next";

export function PipelineHealthCard() {
  const { t } = useTranslation('dashboard');
  const { data, isLoading } = useIntelligencePanel();

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

  const score = Math.round(data.avg_health_score);
  const label = score >= 70 ? t('healthy') : score >= 40 ? t('atRisk') : t('critical');
  const color = score >= 70 ? "text-emerald-600" : score >= 40 ? "text-yellow-600" : "text-destructive";
  const dist = data.health_distribution;
  const momentum = data.portfolio_momentum;

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium flex items-center gap-2">
          <Activity className="h-4 w-4" />
          {t('pipelineHealth')}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-baseline gap-2">
          <span className={cn("text-3xl font-bold", color)}>{score}%</span>
          <Badge variant={score >= 70 ? "default" : score >= 40 ? "secondary" : "destructive"} className="text-[10px]">
            {label}
          </Badge>
        </div>

        <div className="grid grid-cols-3 gap-2 text-center">
          {[
            { label: t('healthy'), value: dist.HEALTHY, dotColor: "bg-emerald-500" },
            { label: t('watch'), value: dist.WATCH, dotColor: "bg-yellow-500" },
            { label: t('atRisk'), value: dist.AT_RISK, dotColor: "bg-destructive" },
          ].map((item) => (
            <div key={item.label}>
              <div className={cn("w-2 h-2 rounded-full mx-auto mb-1", item.dotColor)} />
              <p className="text-sm font-semibold">{item.value}</p>
              <p className="text-[10px] text-muted-foreground">{item.label}</p>
            </div>
          ))}
        </div>

        <div className="pt-2 border-t border-border/30 space-y-1.5">
          <p className="text-[10px] font-medium text-muted-foreground uppercase tracking-wide">{t('dataQuality')}</p>
          <div className="flex justify-between text-xs">
            <span className="text-muted-foreground">{t('completeness')}</span>
            <span className="font-medium">{Math.round(data.data_quality.avg_completeness)}%</span>
          </div>
          <div className="flex justify-between text-xs">
            <span className="text-muted-foreground">{t('missingValue')}</span>
            <span className="font-medium">{data.data_quality.deals_missing_value}</span>
          </div>
          <div className="flex justify-between text-xs">
            <span className="text-muted-foreground">{t('missingCloseDate')}</span>
            <span className="font-medium">{data.data_quality.deals_missing_close_date}</span>
          </div>
        </div>

        {momentum && (
          <div className="pt-2 border-t border-border/30 space-y-1.5">
            <p className="text-[10px] font-medium text-muted-foreground uppercase tracking-wide">{t('momentum')}</p>
            <div className="flex justify-between text-xs">
              <span className="text-muted-foreground">{t('active7d')}</span>
              <span className="font-medium text-emerald-600">{momentum.deals_with_recent_activity}</span>
            </div>
            <div className="flex justify-between text-xs">
              <span className="text-muted-foreground">{t('stale')}</span>
              <span className="font-medium text-destructive">{momentum.deals_stale}</span>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
