import { useLeadsKPIs } from "@/hooks/useSmartLeads";
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
        title="Leads Hoje"
        value={kpis.receivedToday}
        icon={<Users className="w-4 h-4" />}
        description="Novos leads recebidos"
      />
      <KPICard
        title="Leads Quentes"
        value={kpis.hotLeads}
        icon={<Flame className="w-4 h-4" />}
        variant={kpis.hotLeads > 0 ? "destructive" : "default"}
        description="Prontos para converter"
      />
      <KPICard
        title="Sem Resposta >24h"
        value={kpis.noResponseOver24h}
        icon={<Clock className="w-4 h-4" />}
        variant={kpis.noResponseOver24h > 0 ? "warning" : "default"}
        description="Precisam de atenção"
      />
      <KPICard
        title="Tempo Médio"
        value={kpis.avgResponseTimeHours > 0 ? `${kpis.avgResponseTimeHours}h` : "—"}
        icon={<Timer className="w-4 h-4" />}
        description="Resposta média"
      />
      <KPICard
        title="Conversões"
        value={kpis.conversionsThisWeek}
        icon={<TrendingUp className="w-4 h-4" />}
        variant="success"
        description="Esta semana"
      />
      <KPICard
        title="Pipeline"
        value={formatCurrency(kpis.totalPipelineValue)}
        icon={<Euro className="w-4 h-4" />}
        variant="primary"
        description="Valor total"
      />
    </KPIGrid>
  );
}