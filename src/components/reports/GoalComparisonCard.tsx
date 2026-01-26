import { Card, CardContent } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { GoalProgressSparkline } from "./GoalProgressSparkline";
import type { GoalWithRealProgress, GoalRealStatus } from "@/hooks/useGoalsVsResults";
import { 
  TrendingUp, 
  TrendingDown, 
  CheckCircle2, 
  AlertTriangle,
  Clock,
  Target
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

export function GoalComparisonCard({ goalData }: GoalComparisonCardProps) {
  const { goal, realValue, manualValue, targetValue, realProgress, variance, status, historicalData } = goalData;
  const statusConfig = STATUS_CONFIG[status];
  const StatusIcon = statusConfig.icon;

  const variancePercent = targetValue > 0 ? ((variance / targetValue) * 100).toFixed(0) : '0';
  const isPositiveVariance = variance >= 0;

  return (
    <Card className="overflow-hidden hover:shadow-md transition-shadow">
      <CardContent className="p-4">
        <div className="flex items-start justify-between gap-4">
          {/* Left: Goal Info */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
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
            
            <h4 className="font-medium text-foreground truncate mb-2">
              {goal.title}
            </h4>

            {/* Progress Bar */}
            <div className="space-y-1">
              <div className="flex items-center justify-between text-xs">
                <span className="text-muted-foreground">
                  Real: <span className="font-medium text-foreground">{realValue}</span> / {targetValue} {goal.unit}
                </span>
                <span className="font-medium">{realProgress.toFixed(0)}%</span>
              </div>
              <Progress 
                value={realProgress} 
                className="h-2"
              />
            </div>

            {/* Comparison with Manual */}
            <div className="flex items-center gap-2 mt-2 text-xs">
              <span className="text-muted-foreground">Manual: {manualValue}</span>
              <span className={cn(
                "flex items-center gap-1",
                isPositiveVariance ? "text-emerald-600" : "text-destructive"
              )}>
                {isPositiveVariance ? (
                  <TrendingUp className="w-3 h-3" />
                ) : (
                  <TrendingDown className="w-3 h-3" />
                )}
                {isPositiveVariance ? '+' : ''}{variancePercent}%
              </span>
            </div>
          </div>

          {/* Right: Sparkline */}
          <div className="w-24 flex-shrink-0">
            <GoalProgressSparkline 
              data={historicalData} 
              targetValue={targetValue}
              height={50}
            />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
