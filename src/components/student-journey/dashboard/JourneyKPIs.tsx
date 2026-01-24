import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import { 
  Users, GraduationCap, TrendingUp, Pause, 
  Crown, UserCheck, Clock, Target 
} from "lucide-react";
import type { JourneyFunnelStats } from "@/types/sjJourney";
import { JOURNEY_TIMING_CONFIG } from "@/types/sjJourney";

interface JourneyKPIsProps {
  stats: JourneyFunnelStats;
  totalProfiles: number;
  isLoading?: boolean;
}

export function JourneyKPIs({ stats, totalProfiles, isLoading }: JourneyKPIsProps) {
  const kpis = [
    {
      label: "Alunos Ativos",
      value: stats.active_student,
      subtext: "Em formação",
      icon: Users,
      color: "text-green-600",
      bgColor: "bg-green-100 dark:bg-green-900/30"
    },
    {
      label: "Concluídos Ativos",
      value: stats.completed_active,
      subtext: "Prontos para ativação!",
      icon: GraduationCap,
      color: "text-emerald-600",
      bgColor: "bg-emerald-100 dark:bg-emerald-900/30",
      highlight: true
    },
    {
      label: "Elegíveis Progressão",
      value: stats.eligible_progression,
      subtext: `Após ${JOURNEY_TIMING_CONFIG.coolingPeriodDays}d de reflexão`,
      icon: TrendingUp,
      color: "text-amber-600",
      bgColor: "bg-amber-100 dark:bg-amber-900/30",
      highlight: true
    },
    {
      label: "Alumni Estratégico",
      value: stats.strategic_alumni,
      subtext: "Alto valor",
      icon: Crown,
      color: "text-violet-600",
      bgColor: "bg-violet-100 dark:bg-violet-900/30"
    },
    {
      label: "Inativos",
      value: stats.inactive,
      subtext: `>${JOURNEY_TIMING_CONFIG.churnThresholdDays}d sem atividade`,
      icon: Pause,
      color: "text-gray-600",
      bgColor: "bg-gray-100 dark:bg-gray-800/50",
      warning: stats.inactive > 0
    },
    {
      label: "Para Ativar",
      value: stats.activationCandidates,
      subtext: "Oportunidades imediatas",
      icon: Target,
      color: "text-primary",
      bgColor: "bg-primary/10",
      highlight: true
    },
    {
      label: "Prontos p/ Contacto",
      value: stats.readyForContact,
      subtext: "Ação imediata",
      icon: UserCheck,
      color: "text-blue-600",
      bgColor: "bg-blue-100 dark:bg-blue-900/30"
    },
    {
      label: "Em Risco",
      value: stats.atRisk,
      subtext: "Requerem atenção",
      icon: Clock,
      color: "text-red-600",
      bgColor: "bg-red-100 dark:bg-red-900/30",
      warning: stats.atRisk > 0
    }
  ];

  if (isLoading) {
    return (
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-8 gap-3">
        {Array.from({ length: 8 }).map((_, i) => (
          <Card key={i}>
            <CardContent className="p-4">
              <Skeleton className="h-10 w-10 rounded-lg mb-2" />
              <Skeleton className="h-8 w-16 mb-1" />
              <Skeleton className="h-4 w-24" />
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-8 gap-3">
      {kpis.map((kpi, idx) => (
        <Card 
          key={idx} 
          className={cn(
            "transition-all hover:shadow-md",
            kpi.highlight && "ring-2 ring-primary/20",
            kpi.warning && kpi.value > 0 && "ring-2 ring-red-200 dark:ring-red-900/50"
          )}
        >
          <CardContent className="p-4">
            <div className={cn("h-10 w-10 rounded-lg flex items-center justify-center mb-2", kpi.bgColor)}>
              <kpi.icon className={cn("h-5 w-5", kpi.color)} />
            </div>
            <p className={cn("text-2xl font-bold", kpi.color)}>{kpi.value}</p>
            <p className="text-xs font-medium text-foreground">{kpi.label}</p>
            <p className="text-xs text-muted-foreground truncate">{kpi.subtext}</p>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
