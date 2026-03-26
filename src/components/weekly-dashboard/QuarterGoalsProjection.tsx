import { Target, TrendingUp, AlertTriangle } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { cn } from "@/lib/utils";
import { WeeklyMetric } from "@/hooks/useWeeklyPerformance";
import { formatCurrency } from "@/lib/formatters";
import { Skeleton } from "@/components/ui/skeleton";

interface Props {
  metrics: WeeklyMetric[];
  isLoading: boolean;
}

function getQuarterInfo() {
  const now = new Date();
  const quarter = Math.ceil((now.getMonth() + 1) / 3);
  const quarterStart = new Date(now.getFullYear(), (quarter - 1) * 3, 1);
  const quarterEnd = new Date(now.getFullYear(), quarter * 3, 0);
  const totalDays = Math.ceil((quarterEnd.getTime() - quarterStart.getTime()) / 86400000) + 1;
  const elapsed = Math.ceil((now.getTime() - quarterStart.getTime()) / 86400000);
  const weeksElapsed = Math.max(Math.ceil(elapsed / 7), 1);
  const weeksTotal = Math.ceil(totalDays / 7);
  const weeksRemaining = Math.max(weeksTotal - weeksElapsed, 1);
  return { quarter, weeksElapsed, weeksTotal, weeksRemaining };
}

type GoalStatus = "exceeded" | "on_track" | "attention" | "at_risk";

function getGoalStatus(pct: number, projectedPct: number): GoalStatus {
  if (pct >= 100) return "exceeded";
  if (projectedPct >= 90) return "on_track";
  if (projectedPct >= 60) return "attention";
  return "at_risk";
}

const STATUS_CONFIG: Record<GoalStatus, { label: string; color: string; bg: string }> = {
  exceeded: { label: "Meta superada", color: "text-success", bg: "bg-success/10" },
  on_track: { label: "No caminho", color: "text-success", bg: "bg-success/10" },
  attention: { label: "Atenção", color: "text-warning", bg: "bg-warning/10" },
  at_risk: { label: "Em risco", color: "text-destructive", bg: "bg-destructive/10" },
};

const GOAL_KEYS = ["revenue", "deals", "leads", "meetings"];
const GOAL_LABELS: Record<string, string> = {
  revenue: "Receita",
  deals: "Negócios Fechados",
  leads: "Leads",
  meetings: "Reuniões",
};

export function QuarterGoalsProjection({ metrics, isLoading }: Props) {
  if (isLoading) {
    return (
      <Card>
        <CardContent className="py-5">
          <Skeleton className="h-5 w-48 mb-4" />
          <div className="space-y-4">
            {Array.from({ length: 4 }).map((_, i) => (
              <Skeleton key={i} className="h-12 w-full" />
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  const { quarter, weeksElapsed, weeksTotal, weeksRemaining } = getQuarterInfo();

  const goals = GOAL_KEYS.map((key) => {
    const m = metrics.find((x) => x.key === key);
    if (!m || m.target <= 0) return null;

    // Quarterly target = weekly target × total weeks in quarter
    const quarterlyTarget = m.target * weeksTotal;
    // Quarterly actual = current week actual (cumulative not available, so project)
    const quarterlyActual = m.actual * weeksElapsed; // rough approximation
    const pct = quarterlyTarget > 0 ? Math.round((quarterlyActual / quarterlyTarget) * 100) : 0;
    
    // Projection
    const weeklyRate = weeksElapsed > 0 ? quarterlyActual / weeksElapsed : 0;
    const projected = Math.round(weeklyRate * weeksTotal);
    const projectedPct = quarterlyTarget > 0 ? Math.round((projected / quarterlyTarget) * 100) : 0;
    
    // Weekly needed to hit target
    const gap = Math.max(quarterlyTarget - quarterlyActual, 0);
    const weeklyNeeded = weeksRemaining > 0 ? Math.ceil(gap / weeksRemaining) : 0;
    
    const status = getGoalStatus(pct, projectedPct);
    const isCurrency = m.format === "currency";
    const fmt = isCurrency ? formatCurrency : (v: number) => v.toString();

    return { key, label: GOAL_LABELS[key], pct, projected, projectedPct, weeklyNeeded, quarterlyTarget, quarterlyActual, status, fmt, isCurrency };
  }).filter(Boolean) as NonNullable<ReturnType<typeof Array.prototype.map>[number]>[];

  if (goals.length === 0) {
    return null;
  }

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium flex items-center gap-2">
          <Target className="h-4 w-4 text-primary" />
          Metas do Trimestre com Projeções
          <span className="text-[10px] text-muted-foreground font-normal ml-auto">
            Q{quarter} · Semana {weeksElapsed}/{weeksTotal}
          </span>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {(goals as any[]).map((goal: any) => {
          const sc = STATUS_CONFIG[goal.status as GoalStatus];
          return (
            <div key={goal.key} className="space-y-1.5">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-medium text-foreground">{goal.label}</span>
                  <span className={cn("text-[9px] font-semibold px-1.5 py-0.5 rounded", sc.bg, sc.color)}>
                    {sc.label}
                  </span>
                </div>
                <span className="text-xs text-muted-foreground">
                  {goal.fmt(goal.quarterlyActual)} / {goal.fmt(goal.quarterlyTarget)}
                </span>
              </div>
              <div className="relative">
                <Progress
                  value={Math.min(goal.pct, 100)}
                  className={cn(
                    "h-2.5",
                    goal.status === "exceeded" && "[&>div]:bg-success",
                    goal.status === "on_track" && "[&>div]:bg-success",
                    goal.status === "attention" && "[&>div]:bg-warning",
                    goal.status === "at_risk" && "[&>div]:bg-destructive"
                  )}
                />
                {/* Projection marker */}
                {goal.projectedPct < 100 && goal.projectedPct > goal.pct && (
                  <div
                    className="absolute top-0 h-2.5 border-r-2 border-dashed border-muted-foreground/40"
                    style={{ left: `${Math.min(goal.projectedPct, 100)}%` }}
                  />
                )}
              </div>
              <div className="flex items-center justify-between text-[10px] text-muted-foreground">
                <span>
                  Projeção: {goal.fmt(goal.projected)} ({goal.projectedPct}%)
                </span>
                {goal.weeklyNeeded > 0 && (
                  <span className={cn("font-medium", sc.color)}>
                    Precisas de {goal.fmt(goal.weeklyNeeded)}/semana
                  </span>
                )}
              </div>
            </div>
          );
        })}
      </CardContent>
    </Card>
  );
}
