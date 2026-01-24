import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { 
  UserPlus, UserCheck, BookOpen, GraduationCap, 
  TrendingUp, Pause, Crown, ArrowRight 
} from "lucide-react";
import type { JourneyFunnelStats, JourneyState } from "@/types/sjJourney";
import { JOURNEY_STATE_CONFIG } from "@/types/sjJourney";

interface JourneyFunnelProps {
  stats: JourneyFunnelStats;
  onStateClick?: (state: JourneyState) => void;
}

const ICON_MAP: Record<string, React.ComponentType<{ className?: string }>> = {
  UserPlus,
  UserCheck,
  BookOpen,
  GraduationCap,
  TrendingUp,
  Pause,
  Crown
};

const FUNNEL_ORDER: JourneyState[] = [
  'external_lead',
  'new_student',
  'active_student',
  'completed_active',
  'eligible_progression',
  'strategic_alumni',
  'inactive'
];

export function JourneyFunnel({ stats, onStateClick }: JourneyFunnelProps) {
  const maxCount = Math.max(
    ...FUNNEL_ORDER.map(state => stats[state])
  );

  return (
    <Card>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg font-semibold">Funil da Jornada</CardTitle>
          <div className="flex gap-2">
            <Badge variant="outline" className="text-emerald-600 bg-emerald-50 dark:bg-emerald-900/30 border-emerald-300">
              {stats.activationCandidates} para ativar
            </Badge>
            <Badge variant="outline" className="text-amber-600 bg-amber-50 dark:bg-amber-900/30 border-amber-300">
              {stats.atRisk} em risco
            </Badge>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        {FUNNEL_ORDER.map((state, index) => {
          const config = JOURNEY_STATE_CONFIG[state];
          const count = stats[state];
          const percentage = maxCount > 0 ? (count / maxCount) * 100 : 0;
          const Icon = ICON_MAP[config.icon] || UserPlus;
          
          // Highlight activation candidates
          const isActivationState = state === 'completed_active' || state === 'eligible_progression';
          
          return (
            <div key={state} className="space-y-1">
              <div 
                className={cn(
                  "flex items-center justify-between p-3 rounded-lg transition-all cursor-pointer hover:shadow-md",
                  config.bgColor,
                  isActivationState && "ring-2 ring-emerald-400 ring-offset-2 dark:ring-offset-background"
                )}
                onClick={() => onStateClick?.(state)}
              >
                <div className="flex items-center gap-3">
                  <div className={cn(
                    "p-2 rounded-full bg-background/50",
                    config.color
                  )}>
                    <Icon className="h-4 w-4" />
                  </div>
                  <div>
                    <p className={cn("font-medium", config.color)}>
                      {config.label}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {config.description}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <span className={cn("text-2xl font-bold", config.color)}>
                    {count}
                  </span>
                  {!config.isTerminal && index < FUNNEL_ORDER.length - 2 && (
                    <ArrowRight className="h-4 w-4 text-muted-foreground" />
                  )}
                </div>
              </div>
              
              {/* Progress bar */}
              <div className="h-1 bg-muted rounded-full overflow-hidden mx-2">
                <div 
                  className={cn(
                    "h-full rounded-full transition-all duration-500",
                    state === 'inactive' ? 'bg-gray-400' :
                    state === 'strategic_alumni' ? 'bg-violet-500' :
                    isActivationState ? 'bg-emerald-500' : 'bg-primary/60'
                  )}
                  style={{ width: `${percentage}%` }}
                />
              </div>
            </div>
          );
        })}
        
        {/* Key insight */}
        <div className="mt-4 p-3 bg-muted/50 rounded-lg border border-dashed">
          <p className="text-sm text-muted-foreground">
            <span className="font-medium text-foreground">💡 Lembre-se:</span>{" "}
            "Concluído" não é o fim! É o momento ideal para ativar a próxima jornada.
          </p>
        </div>
      </CardContent>
    </Card>
  );
}
