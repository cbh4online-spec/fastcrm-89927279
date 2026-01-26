import { Card, CardContent } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { GoalProgressSparkline } from "./GoalProgressSparkline";
import type { GoalWithRealProgress, GoalRealStatus, TrendDirection } from "@/hooks/useGoalsVsResults";
import { 
  TrendingUp, 
  TrendingDown, 
  CheckCircle2, 
  AlertTriangle,
  Target,
  Minus,
  Calendar,
  BarChart3
} from "lucide-react";
import { cn } from "@/lib/utils";

interface GoalComparisonCardProps {
  goalData: GoalWithRealProgress;
}

const STATUS_CONFIG: Record<GoalRealStatus, { 
  label: string; 
  color: string; 
  bgColor: string;
  icon: typeof TrendingUp;
}> = {
  completed: { 
    label: 'Concluída', 
    color: 'text-emerald-600', 
    bgColor: 'bg-emerald-500/10',
    icon: CheckCircle2 
  },
  ahead: { 
    label: 'Acima', 
    color: 'text-blue-600', 
    bgColor: 'bg-blue-500/10',
    icon: TrendingUp 
  },
  on_track: { 
    label: 'No Prazo', 
    color: 'text-primary', 
    bgColor: 'bg-primary/10',
    icon: Target 
  },
  at_risk: { 
    label: 'Em Risco', 
    color: 'text-amber-600', 
    bgColor: 'bg-amber-500/10',
    icon: AlertTriangle 
  },
  behind: { 
    label: 'Atrasada', 
    color: 'text-destructive', 
    bgColor: 'bg-destructive/10',
    icon: TrendingDown 
  },
};

const PERIOD_LABELS: Record<string, string> = {
  daily: 'Diária',
  weekly: 'Semanal',
  monthly: 'Mensal',
  quarterly: 'Trimestral',
  semiannual: 'Semestral',
  annual: 'Anual',
};

const TREND_CONFIG: Record<TrendDirection, { icon: typeof TrendingUp; color: string; label: string }> = {
  up: { icon: TrendingUp, color: 'text-emerald-600', label: 'Em Alta' },
  down: { icon: TrendingDown, color: 'text-destructive', label: 'Em Baixa' },
  stable: { icon: Minus, color: 'text-muted-foreground', label: 'Estável' },
};

function formatValue(value: number, unit?: string): string {
  if (unit?.toLowerCase().includes('euro') || unit?.toLowerCase().includes('fatura') || unit === '€ (Euro)') {
    return `${value.toLocaleString('pt-PT', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}€`;
  }
  return value.toLocaleString('pt-PT', { minimumFractionDigits: 0, maximumFractionDigits: 1 });
}

export function GoalComparisonCard({ goalData }: GoalComparisonCardProps) {
  const { 
    goal, 
    realValue, 
    targetValue, 
    realProgress, 
    status, 
    historicalData,
    averageValue7d,
    averageValue30d,
    averageWeekly4w,
    projectedValue,
    projectedProgress,
    trendDirection,
    daysElapsed,
    totalDays
  } = goalData;
  
  const statusConfig = STATUS_CONFIG[status] || STATUS_CONFIG.on_track;
  const StatusIcon = statusConfig.icon;
  const trendConfig = TREND_CONFIG[trendDirection] || TREND_CONFIG.stable;
  const TrendIcon = trendConfig.icon;

  const isDaily = goal.period === 'daily';
  const isWeekly = goal.period === 'weekly';
  const showContext = isDaily || isWeekly;

  // Calculate trend percentage
  let trendPercent = 0;
  if (isDaily && averageValue30d > 0) {
    trendPercent = ((averageValue7d - averageValue30d) / averageValue30d) * 100;
  } else if (isWeekly && averageWeekly4w > 0) {
    trendPercent = ((realValue - averageWeekly4w) / averageWeekly4w) * 100;
  }

  return (
    <Card className="overflow-hidden hover:shadow-md transition-shadow">
      <CardContent className="p-4">
        {/* Header */}
        <div className="flex items-center justify-between gap-2 mb-3">
          <div className="flex items-center gap-2">
            <Badge variant="outline" className="text-xs font-normal">
              {PERIOD_LABELS[goal.period] || goal.period}
            </Badge>
            <Badge 
              variant="outline" 
              className={cn("text-xs font-normal", statusConfig.color, statusConfig.bgColor)}
            >
              <StatusIcon className="w-3 h-3 mr-1" />
              {statusConfig.label}
            </Badge>
          </div>
          {showContext && (
            <Badge 
              variant="outline" 
              className={cn("text-xs font-normal", trendConfig.color)}
            >
              <TrendIcon className="w-3 h-3 mr-1" />
              {trendPercent > 0 ? '+' : ''}{trendPercent.toFixed(0)}%
            </Badge>
          )}
        </div>

        <h4 className="font-medium text-foreground truncate mb-3">
          {goal.title}
        </h4>

        <div className="grid grid-cols-2 gap-4">
          {/* Left: Current Period Progress */}
          <div className="space-y-2">
            <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <Calendar className="w-3.5 h-3.5" />
              <span>{isDaily ? 'Hoje' : isWeekly ? `Esta Semana (${daysElapsed}/${totalDays} dias)` : 'Período Atual'}</span>
            </div>
            
            <div className="bg-muted/50 rounded-lg p-3">
              <div className="text-2xl font-bold text-foreground">
                {formatValue(realValue, goal.unit)}
              </div>
              <div className="text-xs text-muted-foreground mt-1">
                de {formatValue(targetValue, goal.unit)}
              </div>
              <Progress 
                value={realProgress} 
                className="h-1.5 mt-2"
              />
              <div className="text-xs font-medium text-right mt-1">
                {realProgress.toFixed(0)}%
              </div>
            </div>
          </div>

          {/* Right: Context Info */}
          <div className="space-y-2">
            <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <BarChart3 className="w-3.5 h-3.5" />
              <span>{isDaily ? 'Contexto' : isWeekly ? 'Projeção' : 'Histórico'}</span>
            </div>
            
            {showContext ? (
              <div className="bg-muted/50 rounded-lg p-3 space-y-2">
                {isDaily ? (
                  <>
                    <div className="flex justify-between text-xs">
                      <span className="text-muted-foreground">Média 7d:</span>
                      <span className="font-medium">{formatValue(averageValue7d, goal.unit)}</span>
                    </div>
                    <div className="flex justify-between text-xs">
                      <span className="text-muted-foreground">Média 30d:</span>
                      <span className="font-medium">{formatValue(averageValue30d, goal.unit)}</span>
                    </div>
                    <div className="flex justify-between text-xs pt-1 border-t border-border/50">
                      <span className="text-muted-foreground">Tendência:</span>
                      <span className={cn("font-medium flex items-center gap-1", trendConfig.color)}>
                        <TrendIcon className="w-3 h-3" />
                        {trendConfig.label}
                      </span>
                    </div>
                  </>
                ) : (
                  <>
                    <div className="flex justify-between text-xs">
                      <span className="text-muted-foreground">Projeção:</span>
                      <span className="font-medium">{formatValue(projectedValue, goal.unit)}</span>
                    </div>
                    <div className="flex justify-between text-xs">
                      <span className="text-muted-foreground">Média 4 sem:</span>
                      <span className="font-medium">{formatValue(averageWeekly4w, goal.unit)}</span>
                    </div>
                    <div className="flex justify-between text-xs pt-1 border-t border-border/50">
                      <span className="text-muted-foreground">Progresso Proj.:</span>
                      <span className={cn(
                        "font-medium",
                        projectedProgress >= 100 ? "text-emerald-600" : 
                        projectedProgress >= 80 ? "text-primary" : "text-amber-600"
                      )}>
                        {projectedProgress.toFixed(0)}%
                      </span>
                    </div>
                  </>
                )}
              </div>
            ) : (
              <div className="w-full h-[76px]">
                <GoalProgressSparkline 
                  data={historicalData} 
                  targetValue={targetValue}
                  height={76}
                />
              </div>
            )}
          </div>
        </div>

        {/* Sparkline for daily/weekly - smaller below */}
        {showContext && historicalData.length > 0 && (
          <div className="mt-3 pt-3 border-t border-border/50">
            <GoalProgressSparkline 
              data={historicalData} 
              targetValue={targetValue}
              height={40}
            />
          </div>
        )}
      </CardContent>
    </Card>
  );
}
