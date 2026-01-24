import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { cn } from "@/lib/utils";
import { 
  GraduationCap, Clock, TrendingUp, Award,
  Calendar, Target
} from "lucide-react";
import { format, parseISO } from "date-fns";
import { pt } from "date-fns/locale";
import type { JourneyProfile } from "@/types/sjJourney";
import { JOURNEY_STATE_CONFIG, JOURNEY_TIMING_CONFIG } from "@/types/sjJourney";

interface JourneyProgressCardProps {
  journeyProfile: JourneyProfile | undefined;
}

export function JourneyProgressCard({ journeyProfile }: JourneyProgressCardProps) {
  if (!journeyProfile) {
    return null;
  }

  const { 
    currentState, 
    completedEnrollments, 
    activeEnrollments,
    daysSinceLastCompletion,
    daysSinceLastActivity,
    daysInCurrentState,
    activationScore
  } = journeyProfile;

  const stateConfig = JOURNEY_STATE_CONFIG[currentState];

  // Calculate progression readiness
  const coolingProgress = daysSinceLastCompletion !== null
    ? Math.min((daysSinceLastCompletion / JOURNEY_TIMING_CONFIG.coolingPeriodDays) * 100, 100)
    : 0;
  const isPastCooling = daysSinceLastCompletion !== null && 
    daysSinceLastCompletion >= JOURNEY_TIMING_CONFIG.coolingPeriodDays;

  const stats = [
    {
      label: "Cursos Completados",
      value: completedEnrollments,
      icon: GraduationCap,
      color: "text-emerald-600"
    },
    {
      label: "Em Progresso",
      value: activeEnrollments,
      icon: TrendingUp,
      color: "text-blue-600"
    },
    {
      label: "Dias no Estado",
      value: daysInCurrentState,
      icon: Clock,
      color: "text-gray-600"
    },
    {
      label: "Score Ativação",
      value: `${activationScore}%`,
      icon: Target,
      color: activationScore >= 80 ? "text-emerald-600" : 
             activationScore >= 60 ? "text-amber-600" : "text-gray-600"
    }
  ];

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base flex items-center gap-2">
          <Award className="h-4 w-4 text-primary" />
          Progresso na Jornada
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Current State */}
        <div className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
          <div>
            <p className="text-xs text-muted-foreground">Estado Atual</p>
            <p className={cn("font-semibold", stateConfig.color)}>{stateConfig.label}</p>
          </div>
          <Badge className={cn(stateConfig.bgColor, stateConfig.color, "border-0")}>
            {daysInCurrentState}d
          </Badge>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-2 gap-3">
          {stats.map((stat, idx) => (
            <div key={idx} className="p-3 rounded-lg border">
              <div className="flex items-center gap-2 mb-1">
                <stat.icon className={cn("h-4 w-4", stat.color)} />
                <span className="text-xs text-muted-foreground">{stat.label}</span>
              </div>
              <p className={cn("text-xl font-bold", stat.color)}>{stat.value}</p>
            </div>
          ))}
        </div>

        {/* Cooling Period Progress (for completed profiles) */}
        {daysSinceLastCompletion !== null && completedEnrollments > 0 && (
          <div className="space-y-2 p-3 rounded-lg bg-muted/30">
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">Período de Reflexão</span>
              <span className={cn(
                "font-medium",
                isPastCooling ? "text-emerald-600" : "text-amber-600"
              )}>
                {isPastCooling ? "✓ Completo" : `${daysSinceLastCompletion}/${JOURNEY_TIMING_CONFIG.coolingPeriodDays}d`}
              </span>
            </div>
            <Progress 
              value={coolingProgress} 
              className={cn(
                "h-2",
                isPastCooling && "[&>div]:bg-emerald-500"
              )}
            />
            <p className="text-xs text-muted-foreground">
              {isPastCooling 
                ? "Pronto para nova proposta de formação!" 
                : `Aguardar ${JOURNEY_TIMING_CONFIG.coolingPeriodDays - (daysSinceLastCompletion || 0)} dias antes de abordar.`}
            </p>
          </div>
        )}

        {/* Inactivity Warning */}
        {daysSinceLastActivity > JOURNEY_TIMING_CONFIG.inactivityThresholdDays - 14 && (
          <div className="p-3 rounded-lg bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800">
            <div className="flex items-center gap-2 text-amber-600">
              <Clock className="h-4 w-4" />
              <span className="text-sm font-medium">
                {daysSinceLastActivity}d sem atividade
              </span>
            </div>
            <p className="text-xs text-amber-600/80 mt-1">
              Risco de transição para inativo em {JOURNEY_TIMING_CONFIG.churnThresholdDays - daysSinceLastActivity}d
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
