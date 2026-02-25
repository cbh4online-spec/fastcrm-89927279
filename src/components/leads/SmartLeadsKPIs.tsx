import { useLeadsKPIs } from "@/hooks/useSmartLeads";
import { useTranslation } from "react-i18next";
import { 
  Users, 
  Flame, 
  Clock, 
  Timer, 
  TrendingUp,
  Euro
} from "lucide-react";
// Design System imports
import { KPICard, KPIGrid, KPIGridSkeleton } from "@/components/design-system";

export function SmartLeadsKPIs() {
  const { t } = useTranslation('crm');
  const { data: kpis, isLoading } = useLeadsKPIs();

  if (isLoading) {
    return <KPIGridSkeleton count={6} />;
  }

  if (!kpis) return null;

  const formatCurrency = (value: number) => {
    if (value >= 1000000) return `€${(value / 1000000).toFixed(1)}M`;
    if (value >= 1000) return `€${(value / 1000).toFixed(1)}K`;
    return `€${value}`;
  };

  return (
    <KPIGrid columns={4} className="grid-cols-2 md:grid-cols-3 lg:grid-cols-6">
      <KPICard
        title={t('kpiLeadsToday')}
        value={kpis.receivedToday}
        icon={<Users className="w-4 h-4" />}
        description={t('kpiLeadsTodayDesc')}
      />
      <KPICard
        title={t('kpiHotLeads')}
        value={kpis.hotLeads}
        icon={<Flame className="w-4 h-4" />}
        variant={kpis.hotLeads > 0 ? "destructive" : "default"}
        description={t('kpiHotLeadsDesc')}
      />
      <KPICard
        title={t('kpiNoResponse24h')}
        value={kpis.noResponseOver24h}
        icon={<Clock className="w-4 h-4" />}
        variant={kpis.noResponseOver24h > 0 ? "warning" : "default"}
        description={t('kpiNoResponse24hDesc')}
      />
      <KPICard
        title={t('kpiAvgTime')}
        value={kpis.avgResponseTimeHours > 0 ? `${kpis.avgResponseTimeHours}h` : "—"}
        icon={<Timer className="w-4 h-4" />}
        description={t('kpiAvgTimeDesc')}
      />
      <KPICard
        title={t('kpiConversions')}
        value={kpis.conversionsThisWeek}
        icon={<TrendingUp className="w-4 h-4" />}
        variant="success"
        description={t('kpiConversionsDesc')}
      />
      <KPICard
        title={t('kpiPipeline')}
        value={formatCurrency(kpis.totalPipelineValue)}
        icon={<Euro className="w-4 h-4" />}
        variant="primary"
        description={t('kpiPipelineDesc')}
      />
    </KPIGrid>
  );
}
