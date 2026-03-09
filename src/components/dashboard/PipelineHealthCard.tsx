import { useIntelligencePanel } from "@/hooks/useIntelligencePanel";
import { useWeeklyPerformance } from "@/hooks/useWeeklyPerformance";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Activity, Loader2, TrendingDown, Shield } from "lucide-react";
import { cn } from "@/lib/utils";
import { formatCurrency } from "@/lib/formatters";
import { useTranslation } from "react-i18next";

function getBusinessExplanation(score: number): { text: string; action: string } {
  if (score >= 70) return {
    text: "Pipeline saudável — a maioria dos deals está a progredir normalmente.",
    action: "Manter cadência de follow-ups e focar em fechar deals maduros.",
  };
  if (score >= 40) return {
    text: "Pipeline em risco — vários deals estão estagnados ou com dados incompletos.",
    action: "Priorizar contacto com deals parados e preencher dados em falta.",
  };
  return {
    text: "Pipeline crítico — a maioria dos deals precisa de intervenção imediata.",
    action: "Requalificar pipeline: remover deals mortos e focar nos viáveis.",
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

  const score = Math.round(data.avg_health_score);
  const label = score >= 70 ? t('healthy') : score >= 40 ? t('atRisk') : t('critical');
  const color = score >= 70 ? "text-success" : score >= 40 ? "text-warning" : "text-destructive";
  const dist = data.health_distribution;

  // Business logic
  const explanation = getBusinessExplanation(score);
  const atRiskCount = dist.AT_RISK + dist.WATCH;
  const avgDealValue = data.total_open > 0 ? (weeklyData?.pipelineValue ?? 0) / data.total_open : 0;
  const revenueAtRisk = atRiskCount * avgDealValue;
  const weeklyTarget = weeklyData?.metrics.find((m) => m.key === "revenue")?.target ?? 0;
  const targetImpactPct = weeklyTarget > 0 ? Math.round((revenueAtRisk / weeklyTarget) * 100) : 0;

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium flex items-center gap-2">
          <Activity className="h-4 w-4" />
          {t('pipelineHealth')}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {/* Score + Label */}
        <div className="flex items-baseline gap-2">
          <span className={cn("text-3xl font-bold", color)}>{score}%</span>
          <Badge variant={score >= 70 ? "default" : score >= 40 ? "secondary" : "destructive"} className="text-[10px]">
            {label}
          </Badge>
        </div>

        {/* Business explanation */}
        <p className="text-xs text-muted-foreground leading-relaxed">{explanation.text}</p>

        {/* Distribution */}
        <div className="grid grid-cols-3 gap-2 text-center">
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
              <p className="text-[10px] font-medium text-muted-foreground uppercase tracking-wide">Impacto em Receita</p>
            </div>
            <div className="flex justify-between text-xs">
              <span className="text-muted-foreground">Valor em risco</span>
              <span className="font-medium text-destructive">{formatCurrency(revenueAtRisk)}</span>
            </div>
            {targetImpactPct > 0 && (
              <div className="flex justify-between text-xs">
                <span className="text-muted-foreground">% da meta semanal</span>
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
