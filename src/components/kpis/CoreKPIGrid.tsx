import { useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { 
  Users, 
  Target, 
  TrendingUp, 
  Clock, 
  AlertTriangle,
  CheckCircle2,
  Zap,
  DollarSign,
  Timer,
  BarChart3,
} from "lucide-react";
import { KPICard } from "./KPICard";
import { CoreKPIs, TrendDirection } from "@/types/kpis";
import { Skeleton } from "@/components/ui/skeleton";

interface CoreKPIGridProps {
  kpis: CoreKPIs | null;
  isLoading?: boolean;
  compact?: boolean;
}

interface KPIConfig {
  id: string;
  label: string;
  value: number;
  format: "number" | "currency" | "percentage" | "time" | "days";
  trend?: TrendDirection;
  icon: React.ReactNode;
  description: string;
  route?: string;
  category: "leads" | "opportunities" | "efficiency";
  highlight?: boolean;
}

export function CoreKPIGrid({ kpis, isLoading, compact }: CoreKPIGridProps) {
  const navigate = useNavigate();

  const kpiConfigs = useMemo<KPIConfig[]>(() => {
    if (!kpis) return [];

    return [
      // Lead KPIs
      {
        id: "leads-today",
        label: "Leads hoje",
        value: kpis.leads.leadsToday,
        format: "number",
        trend: kpis.leads.leadsTrend,
        icon: <Users className="h-4 w-4" />,
        description: "Leads recebidos hoje",
        route: "/dashboard/leads?filter=today",
        category: "leads",
      },
      {
        id: "leads-week",
        label: "Leads esta semana",
        value: kpis.leads.leadsThisWeek,
        format: "number",
        trend: kpis.leads.leadsTrend,
        icon: <Target className="h-4 w-4" />,
        description: "Leads recebidos esta semana",
        route: "/dashboard/leads",
        category: "leads",
      },
      {
        id: "lead-conversion",
        label: "Taxa Lead → Oportunidade",
        value: kpis.leads.leadToOpportunityRate,
        format: "percentage",
        icon: <TrendingUp className="h-4 w-4" />,
        description: "Percentagem de leads convertidos em oportunidades",
        category: "leads",
      },
      {
        id: "response-time",
        label: "Tempo médio resposta",
        value: kpis.leads.avgResponseTimeHours,
        format: "time",
        icon: <Clock className="h-4 w-4" />,
        description: "Tempo médio para primeira resposta",
        highlight: kpis.leads.avgResponseTimeHours > 24,
        category: "leads",
      },
      
      // Opportunity KPIs
      {
        id: "active-opportunities",
        label: "Oportunidades ativas",
        value: kpis.opportunities.activeOpportunities,
        format: "number",
        trend: kpis.opportunities.opportunitiesTrend,
        icon: <Target className="h-4 w-4" />,
        description: "Número de oportunidades em aberto",
        route: "/dashboard/opportunities",
        category: "opportunities",
      },
      {
        id: "pipeline-value",
        label: "Valor em pipeline",
        value: kpis.opportunities.totalPipelineValue,
        format: "currency",
        icon: <DollarSign className="h-4 w-4" />,
        description: "Valor total das oportunidades ativas",
        route: "/dashboard/opportunities",
        category: "opportunities",
        highlight: true,
      },
      {
        id: "weighted-value",
        label: "Valor ponderado",
        value: kpis.opportunities.weightedValue,
        format: "currency",
        icon: <BarChart3 className="h-4 w-4" />,
        description: "Valor × probabilidade de fecho",
        category: "opportunities",
        highlight: true,
      },
      {
        id: "close-rate",
        label: "Taxa de fecho",
        value: kpis.opportunities.closeRate,
        format: "percentage",
        icon: <CheckCircle2 className="h-4 w-4" />,
        description: "Percentagem de oportunidades ganhas vs fechadas",
        category: "opportunities",
      },
      {
        id: "avg-close-time",
        label: "Tempo médio fecho",
        value: kpis.opportunities.avgCloseTimeDays,
        format: "days",
        icon: <Timer className="h-4 w-4" />,
        description: "Dias médios até fechar um negócio",
        category: "opportunities",
      },
      
      // Efficiency KPIs
      {
        id: "stale-opportunities",
        label: "Oportunidades paradas",
        value: kpis.efficiency.staleOpportunities,
        format: "number",
        icon: <AlertTriangle className="h-4 w-4" />,
        description: "Sem atividade há mais de 7 dias",
        route: "/dashboard/opportunities?filter=stale",
        category: "efficiency",
        highlight: kpis.efficiency.staleOpportunities > 0,
      },
      {
        id: "overdue-followups",
        label: "Follow-ups em atraso",
        value: kpis.efficiency.overdueFollowups,
        format: "number",
        icon: <Clock className="h-4 w-4" />,
        description: "Tarefas pendentes já ultrapassadas",
        category: "efficiency",
        highlight: kpis.efficiency.overdueFollowups > 0,
      },
      {
        id: "active-automations",
        label: "Automações ativas",
        value: kpis.efficiency.activeAutomations,
        format: "number",
        icon: <Zap className="h-4 w-4" />,
        description: "Workflows a funcionar automaticamente",
        route: "/dashboard/automations",
        category: "efficiency",
      },
    ];
  }, [kpis]);

  if (isLoading) {
    return (
      <div className="grid gap-4 grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6">
        {Array.from({ length: 12 }).map((_, i) => (
          <Skeleton key={i} className="h-24 rounded-lg" />
        ))}
      </div>
    );
  }

  if (!kpis) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        <p>Sem dados disponíveis</p>
      </div>
    );
  }

  // Group by category
  const leadKPIs = kpiConfigs.filter(k => k.category === "leads");
  const opportunityKPIs = kpiConfigs.filter(k => k.category === "opportunities");
  const efficiencyKPIs = kpiConfigs.filter(k => k.category === "efficiency");

  return (
    <div className="space-y-6">
      {/* Leads Section */}
      <div>
        <h3 className="text-sm font-medium text-muted-foreground mb-3">Leads</h3>
        <div className="grid gap-3 grid-cols-2 md:grid-cols-4">
          {leadKPIs.map((kpi) => (
            <KPICard
              key={kpi.id}
              label={kpi.label}
              value={kpi.value}
              format={kpi.format}
              trend={kpi.trend}
              icon={kpi.icon}
              description={kpi.description}
              highlight={kpi.highlight}
              compact={compact}
              onClick={kpi.route ? () => navigate(kpi.route!) : undefined}
            />
          ))}
        </div>
      </div>

      {/* Opportunities Section */}
      <div>
        <h3 className="text-sm font-medium text-muted-foreground mb-3">Oportunidades</h3>
        <div className="grid gap-3 grid-cols-2 md:grid-cols-5">
          {opportunityKPIs.map((kpi) => (
            <KPICard
              key={kpi.id}
              label={kpi.label}
              value={kpi.value}
              format={kpi.format}
              trend={kpi.trend}
              icon={kpi.icon}
              description={kpi.description}
              highlight={kpi.highlight}
              compact={compact}
              onClick={kpi.route ? () => navigate(kpi.route!) : undefined}
            />
          ))}
        </div>
      </div>

      {/* Efficiency Section */}
      <div>
        <h3 className="text-sm font-medium text-muted-foreground mb-3">Eficiência</h3>
        <div className="grid gap-3 grid-cols-2 md:grid-cols-3">
          {efficiencyKPIs.map((kpi) => (
            <KPICard
              key={kpi.id}
              label={kpi.label}
              value={kpi.value}
              format={kpi.format}
              trend={kpi.trend}
              icon={kpi.icon}
              description={kpi.description}
              highlight={kpi.highlight}
              compact={compact}
              onClick={kpi.route ? () => navigate(kpi.route!) : undefined}
            />
          ))}
        </div>
      </div>
    </div>
  );
}
