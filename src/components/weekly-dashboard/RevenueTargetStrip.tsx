import { Card, CardContent } from "@/components/ui/card";
import { Target, TrendingUp, BarChart3, AlertTriangle } from "lucide-react";
import { cn } from "@/lib/utils";
import { formatCurrency, formatPercent } from "@/lib/formatters";
import { WeeklyMetric } from "@/hooks/useWeeklyPerformance";
import { Skeleton } from "@/components/ui/skeleton";

interface Props {
  metrics: WeeklyMetric[];
  pipelineValue: number;
  isLoading: boolean;
}

const WIN_RATE = 0.3; // avg win rate assumption

export function RevenueTargetStrip({ metrics, pipelineValue, isLoading }: Props) {
  if (isLoading) {
    return (
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {Array.from({ length: 4 }).map((_, i) => (
          <Card key={i}>
            <CardContent className="py-4 space-y-2">
              <Skeleton className="h-3 w-20" />
              <Skeleton className="h-7 w-28" />
              <Skeleton className="h-3 w-16" />
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  const revenueMetric = metrics.find((m) => m.key === "revenue");
  const target = revenueMetric?.target ?? 0;
  const closed = revenueMetric?.actual ?? 0;
  const likelyPipeline = pipelineValue * WIN_RATE;
  const gap = Math.max(target - closed, 0);
  const probability = target > 0 ? Math.min(((closed + likelyPipeline) / target) * 100, 100) : 0;
  const probRounded = Math.round(probability);

  const probColor = probRounded >= 80 ? "text-success" : probRounded >= 50 ? "text-warning" : "text-destructive";
  const probBg = probRounded >= 80 ? "bg-success/10" : probRounded >= 50 ? "bg-warning/10" : "bg-destructive/10";

  const cards = [
    {
      label: "Meta Semanal",
      value: formatCurrency(target),
      icon: <Target className="h-4 w-4" />,
      color: "text-primary",
      bg: "bg-primary/10",
    },
    {
      label: "Receita Fechada",
      value: formatCurrency(closed),
      icon: <TrendingUp className="h-4 w-4" />,
      color: "text-success",
      bg: "bg-success/10",
      sub: target > 0 ? `${Math.round((closed / target) * 100)}% da meta` : undefined,
    },
    {
      label: "Pipeline Provável",
      value: formatCurrency(likelyPipeline),
      icon: <BarChart3 className="h-4 w-4" />,
      color: "text-muted-foreground",
      bg: "bg-muted",
      sub: `${formatCurrency(pipelineValue)} total × ${Math.round(WIN_RATE * 100)}% win rate`,
    },
    {
      label: "Gap Restante",
      value: formatCurrency(gap),
      icon: <AlertTriangle className="h-4 w-4" />,
      color: probColor,
      bg: probBg,
      sub: `${probRounded}% probabilidade de atingir`,
    },
  ];

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
      {cards.map((c) => (
        <Card key={c.label}>
          <CardContent className="py-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-medium text-muted-foreground">{c.label}</span>
              <div className={cn("p-1.5 rounded-md", c.bg, c.color)}>
                {c.icon}
              </div>
            </div>
            <p className={cn("text-xl font-bold", c.color === "text-muted-foreground" ? "text-foreground" : c.color)}>
              {c.value}
            </p>
            {c.sub && (
              <p className="text-[11px] text-muted-foreground mt-1">{c.sub}</p>
            )}
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
