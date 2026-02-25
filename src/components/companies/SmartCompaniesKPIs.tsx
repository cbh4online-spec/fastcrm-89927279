import { useCompaniesKPIs } from "@/hooks/useSmartCompanies";
import { useTranslation } from "react-i18next";
import { 
  Building2, 
  Flame, 
  Clock, 
  Users,
  Briefcase,
  Euro
} from "lucide-react";
import { KPICard, KPIGrid, KPIGridSkeleton } from "@/components/design-system";

export function SmartCompaniesKPIs() {
  const { t } = useTranslation('crm');
  const { data: kpis, isLoading } = useCompaniesKPIs();

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
    <KPIGrid columns={3}>
      <KPICard
        title={t('kpiTotalCompanies')}
        value={kpis.totalCompanies}
        icon={<Building2 className="w-4 h-4" />}
        description={t('kpiTotalCompaniesDesc')}
        variant="primary"
      />
      <KPICard
        title={t('kpiHotCompanies')}
        value={kpis.hotCompanies}
        icon={<Flame className="w-4 h-4" />}
        description={t('kpiHotCompaniesDesc')}
        variant={kpis.hotCompanies > 0 ? "destructive" : "default"}
      />
      <KPICard
        title={t('kpiNoResponseCompanies')}
        value={kpis.noResponseOver24h}
        icon={<Clock className="w-4 h-4" />}
        description={t('kpiNoResponseCompaniesDesc')}
        variant={kpis.noResponseOver24h > 0 ? "warning" : "default"}
      />
      <KPICard
        title={t('kpiClients')}
        value={kpis.clients}
        icon={<Users className="w-4 h-4" />}
        description={t('kpiClientsDesc')}
        variant="success"
      />
      <KPICard
        title={t('kpiProspects')}
        value={kpis.prospects}
        icon={<Briefcase className="w-4 h-4" />}
        description={t('kpiProspectsDesc')}
      />
      <KPICard
        title={t('kpiCompaniesPipeline')}
        value={formatCurrency(kpis.totalPipelineValue)}
        icon={<Euro className="w-4 h-4" />}
        description={t('kpiCompaniesPipelineDesc')}
        variant="primary"
      />
    </KPIGrid>
  );
}
