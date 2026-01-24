import { Card, CardContent } from "@/components/ui/card";
import { 
  Users, 
  TrendingUp, 
  Target, 
  Zap, 
  DollarSign, 
  Clock,
  UserPlus,
  Award
} from "lucide-react";
import { cn } from "@/lib/utils";
import type { GrowthMetrics } from "@/types/sjActivation";

interface ActivationKPIsProps {
  metrics: GrowthMetrics;
  isLoading?: boolean;
}

export function ActivationKPIs({ metrics, isLoading }: ActivationKPIsProps) {
  const kpis = [
    {
      label: "Alumni Total",
      value: metrics.totalAlumni,
      icon: Award,
      color: "text-emerald-600",
      bgColor: "bg-emerald-100 dark:bg-emerald-900/30",
      description: "Base instalada"
    },
    {
      label: "Prontos p/ Progressão",
      value: metrics.alumniReadyForProgression,
      icon: TrendingUp,
      color: "text-green-600",
      bgColor: "bg-green-100 dark:bg-green-900/30",
      description: "Ativar agora"
    },
    {
      label: "Leads Ativos",
      value: metrics.totalLeads,
      icon: UserPlus,
      color: "text-purple-600",
      bgColor: "bg-purple-100 dark:bg-purple-900/30",
      description: "A qualificar"
    },
    {
      label: "Novos (7d)",
      value: metrics.newLeadsThisWeek,
      icon: Zap,
      color: "text-cyan-600",
      bgColor: "bg-cyan-100 dark:bg-cyan-900/30",
      description: "Esta semana"
    },
    {
      label: "Taxa Conversão",
      value: `${metrics.leadConversionRate}%`,
      icon: Target,
      color: "text-blue-600",
      bgColor: "bg-blue-100 dark:bg-blue-900/30",
      description: "Lead → Inscrito"
    },
    {
      label: "Adormecidos",
      value: metrics.alumniDormant,
      icon: Clock,
      color: "text-amber-600",
      bgColor: "bg-amber-100 dark:bg-amber-900/30",
      description: ">60 dias"
    },
    {
      label: "Média Cursos/Alumni",
      value: metrics.averageCoursesPerAlumni,
      icon: Users,
      color: "text-indigo-600",
      bgColor: "bg-indigo-100 dark:bg-indigo-900/30",
      description: "Recompra"
    },
    {
      label: "Pipeline",
      value: `€${(metrics.pipelineValue / 1000).toFixed(1)}k`,
      icon: DollarSign,
      color: "text-emerald-600",
      bgColor: "bg-emerald-100 dark:bg-emerald-900/30",
      description: "Valor potencial"
    },
  ];

  if (isLoading) {
    return (
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-8 gap-3">
        {[...Array(8)].map((_, i) => (
          <Card key={i} className="animate-pulse">
            <CardContent className="pt-4 pb-4">
              <div className="h-16 bg-muted rounded" />
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-8 gap-3">
      {kpis.map((kpi, idx) => (
        <Card key={idx} className="hover:shadow-md transition-shadow">
          <CardContent className="pt-3 pb-3">
            <div className="flex flex-col gap-1">
              <div className={cn("h-8 w-8 rounded-lg flex items-center justify-center", kpi.bgColor)}>
                <kpi.icon className={cn("h-4 w-4", kpi.color)} />
              </div>
              <div>
                <p className="text-xl font-bold leading-tight">{kpi.value}</p>
                <p className="text-xs text-muted-foreground truncate">{kpi.label}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
