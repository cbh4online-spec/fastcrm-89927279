import { cn } from "@/lib/utils";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import type { AdaptiveGoal, GoalStatus } from "@/data/adaptiveDashboardMock";

const statusConfig: Record<GoalStatus, { color: string; bg: string; label: string }> = {
  exceeded: { color: 'text-success', bg: 'bg-success', label: 'Superado' },
  on_track: { color: 'text-success', bg: 'bg-success', label: 'No ritmo' },
  at_risk: { color: 'text-warning', bg: 'bg-warning', label: 'Em risco' },
  behind: { color: 'text-destructive', bg: 'bg-destructive', label: 'Atrasado' },
};

function formatGoalValue(value: number, format: string): string {
  switch (format) {
    case 'currency': return `€${value.toLocaleString('pt-PT')}`;
    case 'percentage': return `${value}%`;
    default: return value.toLocaleString('pt-PT');
  }
}

interface GoalProgressBarProps {
  goal: AdaptiveGoal;
  textSizeClass?: string;
  className?: string;
}

export function GoalProgressBar({ goal, textSizeClass = 'text-base', className }: GoalProgressBarProps) {
  const pct = Math.min((goal.current / goal.target) * 100, 100);
  const projectedPct = Math.min((goal.projectedEnd / goal.target) * 100, 120);
  const gap = goal.target - goal.current;
  const config = statusConfig[goal.status];

  return (
    <Card className={cn("", className)}>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className={cn("text-sm font-medium", textSizeClass === 'text-lg' && 'text-base')}>
            {goal.label}
          </CardTitle>
          <span className={cn("text-xs font-semibold px-2 py-0.5 rounded-full", config.color, `${config.bg}/10`)}>
            {config.label}
          </span>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="flex items-end justify-between">
          <span className={cn("font-bold", textSizeClass === 'text-lg' ? 'text-2xl' : 'text-xl')}>
            {formatGoalValue(goal.current, goal.format)}
          </span>
          <span className="text-sm text-muted-foreground">
            / {formatGoalValue(goal.target, goal.format)}
          </span>
        </div>

        <div className="relative">
          <Progress value={pct} className="h-3" />
          {projectedPct > pct && projectedPct <= 100 && (
            <div
              className="absolute top-0 h-3 bg-primary/20 rounded-r-full"
              style={{ left: `${pct}%`, width: `${projectedPct - pct}%` }}
            />
          )}
        </div>

        <div className="grid grid-cols-3 gap-2 text-xs">
          <div>
            <p className="text-muted-foreground">Gap</p>
            <p className="font-semibold text-foreground">{formatGoalValue(gap, goal.format)}</p>
          </div>
          <div>
            <p className="text-muted-foreground">Projeção</p>
            <p className={cn("font-semibold", goal.projectedEnd >= goal.target ? 'text-success' : 'text-warning')}>
              {formatGoalValue(goal.projectedEnd, goal.format)}
            </p>
          </div>
          <div>
            <p className="text-muted-foreground">Dias rest.</p>
            <p className="font-semibold text-foreground">{goal.daysRemaining}d</p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

interface GoalProgressListProps {
  goals: AdaptiveGoal[];
  textSizeClass?: string;
}

export function GoalProgressList({ goals, textSizeClass }: GoalProgressListProps) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
      {goals.map(goal => (
        <GoalProgressBar key={goal.id} goal={goal} textSizeClass={textSizeClass} />
      ))}
    </div>
  );
}
