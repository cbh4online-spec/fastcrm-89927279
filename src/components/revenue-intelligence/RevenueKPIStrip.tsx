import { TrendingUp, AlertTriangle, Target, BarChart3, ShieldCheck, Flame } from "lucide-react";
import { KPICard, KPIGrid } from "@/components/design-system/KPICard";
import { KPIGridSkeleton } from "@/components/design-system/LoadingState";
import { useRevenueForecast, formatCurrency } from "@/hooks/useRevenueForecast";
import { usePipelineRiskAnalysis } from "@/hooks/useRevenueIntelligenceDashboard";

export function RevenueKPIStrip() {
  const { latestForecast, trend, isLoading: forecastLoading } = useRevenueForecast();
  const { buckets, isLoading: riskLoading } = usePipelineRiskAnalysis();

  const isLoading = forecastLoading || riskLoading;

  if (isLoading) return <KPIGridSkeleton count={6} />;

  const totalPipeline = buckets.reduce((s, b) => s + b.total_value, 0);
  const totalDeals = buckets.reduce((s, b) => s + b.count, 0);
  const hotDeals = buckets.find((b) => b.category === "hot")?.count || 0;
  const atRiskValue = buckets
    .filter((b) => b.category === "uncertain" || b.category === "low")
    .reduce((s, b) => s + b.total_value, 0);

  return (
    <KPIGrid columns={3}>
      <KPICard
        title="Receita Esperada"
        value={latestForecast ? formatCurrency(latestForecast.expected_case) : "—"}
        icon={<Target className="h-4 w-4" />}
        description={trend != null ? `${trend > 0 ? "+" : ""}${trend}% vs anterior` : undefined}
        variant="primary"
      />
      <KPICard
        title="Pipeline Total"
        value={formatCurrency(totalPipeline)}
        icon={<BarChart3 className="h-4 w-4" />}
        description={`${totalDeals} oportunidades ativas`}
      />
      <KPICard
        title="Deals Hot"
        value={hotDeals}
        icon={<Flame className="h-4 w-4" />}
        variant={hotDeals > 0 ? "destructive" : "default"}
        description="Alta probabilidade de fecho"
      />
      <KPICard
        title="Forecast 30d"
        value={latestForecast ? formatCurrency(latestForecast.forecast_30) : "—"}
        icon={<TrendingUp className="h-4 w-4" />}
        variant="success"
      />
      <KPICard
        title="Em Risco"
        value={formatCurrency(atRiskValue)}
        icon={<AlertTriangle className="h-4 w-4" />}
        variant={atRiskValue > 0 ? "warning" : "default"}
        description="Deals uncertain + low"
      />
      <KPICard
        title="Confiança"
        value={latestForecast ? `${Math.round(latestForecast.confidence_avg)}%` : "—"}
        icon={<ShieldCheck className="h-4 w-4" />}
        variant={latestForecast && latestForecast.confidence_avg >= 60 ? "success" : "warning"}
      />
    </KPIGrid>
  );
}
