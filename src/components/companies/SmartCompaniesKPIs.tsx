import { useCompaniesKPIs } from "@/hooks/useSmartCompanies";
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
        title="Total Empresas"
        value={kpis.totalCompanies}
        icon={<Building2 className="w-4 h-4" />}
        description="Base de empresas"
        variant="primary"
      />
      <KPICard
        title="Empresas Quentes"
        value={kpis.hotCompanies}
        icon={<Flame className="w-4 h-4" />}
        description="Prontas para ação"
        variant={kpis.hotCompanies > 0 ? "destructive" : "default"}
      />
      <KPICard
        title="Sem Resposta >24h"
        value={kpis.noResponseOver24h}
        icon={<Clock className="w-4 h-4" />}
        description="Precisam de atenção"
        variant={kpis.noResponseOver24h > 0 ? "warning" : "default"}
      />
      <KPICard
        title="Clientes"
        value={kpis.clients}
        icon={<Users className="w-4 h-4" />}
        description="Empresas ativas"
        variant="success"
      />
      <KPICard
        title="Prospects"
        value={kpis.prospects}
        icon={<Briefcase className="w-4 h-4" />}
        description="Oportunidades"
      />
      <KPICard
        title="Pipeline"
        value={formatCurrency(kpis.totalPipelineValue)}
        icon={<Euro className="w-4 h-4" />}
        description="Valor estimado"
        variant="primary"
      />
    </KPIGrid>
  );
}
