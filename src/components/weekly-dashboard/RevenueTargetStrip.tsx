import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Target, TrendingUp, BarChart3, AlertTriangle, Crosshair } from "lucide-react";
import { cn } from "@/lib/utils";
import { formatCurrency } from "@/lib/formatters";
import { WeeklyMetric } from "@/hooks/useWeeklyPerformance";
import { Skeleton } from "@/components/ui/skeleton";

interface Props {
  metrics: WeeklyMetric[];
  pipelineValue: number;
  isLoading: boolean;
}

const WIN_RATE = 0.3;

export function RevenueTargetStrip({ metrics, pipelineValue, isLoading }: Props) {
  if (isLoading) {
    return (
      <Card>
        <CardContent className="py-5 space-y-4">
          <Skeleton className="h-5 w-48" />
          <Skeleton className="h-6 w-full" />
          <div className="grid grid-cols-4 gap-3">
            {Array.from({ length: 4 }).map((_, i) => (
              <Skeleton key={i} className="h-16" />
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  const revenueMetric = metrics.find((m) => m.key === "revenue");
  const target = revenueMetric?.target ?? 0;
  const closed = revenueMetric?.actual ?? 0;
  const likelyPipeline = pipelineValue * WIN_RATE;
  const gap = Math.max(target - closed - likelyPipeline, 0);
  const probability = target > 0 ? Math.min(((closed + likelyPipeline) / target) * 100, 100) : 0;
  const probRounded = Math.round(probability);

  // Stacked bar percentages
  const closedPct = target > 0 ? Math.min((closed / target) * 100, 100) : 0;
  const probPct = target > 0 ? Math.min((likelyPipeline / target) * 100, 100 - closedPct) : 0;
  const gapPct = Math.max(100 - closedPct - probPct, 0);

  const statusColor = probRounded >= 80 ? "text-success" : probRounded >= 50 ? "text-warning" : "text-destructive";
  const statusLabel = probRounded >= 80 ? "Alcançável" : probRounded >= 50 ? "Em Risco" : "Crítico";
  const statusBadge = probRounded >= 80 ? "default" : probRounded >= 50 ? "secondary" : "destructive";

  const cards = [
    { label: "Meta Semanal", value: formatCurrency(target), icon: Target, color: "text-primary", bg: "bg-primary/10" },
    { label: "Receita Fechada", value: formatCurrency(closed), icon: TrendingUp, color: "text-success", bg: "bg-success/10", sub: target > 0 ? `${Math.round(closedPct)}% da meta` : undefined },
    { label: "Pipeline Provável", value: formatCurrency(likelyPipeline), icon: BarChart3, color: "text-chart-2", bg: "bg-chart-2/10", sub: `${formatCurrency(pipelineValue)} × ${Math.round(WIN_RATE * 100)}%` },
    { label: "Gap Restante", value: formatCurrency(gap), icon: AlertTriangle, color: statusColor, bg: probRounded >= 80 ? "bg-success/10" : probRounded >= 50 ? "bg-warning/10" : "bg-destructive/10", sub: `${probRounded}% probabilidade` },
  ];

  return (
    <Card>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm font-medium flex items-center gap-2">
            <Crosshair className="h-4 w-4 text-primary" />
            WAR ROOM — Situação Semanal
          </CardTitle>
          <Badge variant={statusBadge as any} className="text-[10px]">{statusLabel}</Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Stacked Progress Bar */}
        <div className="space-y-1.5">
          <div className="flex justify-between text-[10px] text-muted-foreground">
            <span>Progresso para meta</span>
            <span className={statusColor}>{probRounded}%</span>
          </div>
          <div className="h-4 w-full rounded-full bg-muted/50 overflow-hidden flex">
            {closedPct > 0 && (
              <div
                className="h-full bg-success transition-all duration-500 flex items-center justify-center"
                style={{ width: `${closedPct}%` }}
              >
                {closedPct > 12 && <span className="text-[9px] font-bold text-success-foreground">Fechado</span>}
              </div>
            )}
            {probPct > 0 && (
              <div
                className="h-full bg-chart-2/60 transition-all duration-500 flex items-center justify-center"
                style={{ width: `${probPct}%` }}
              >
                {probPct > 12 && <span className="text-[9px] font-bold text-foreground/70">Provável</span>}
              </div>
            )}
            {gapPct > 0 && (
              <div
                className="h-full bg-destructive/20 transition-all duration-500 flex items-center justify-center"
                style={{ width: `${gapPct}%` }}
              >
                {gapPct > 12 && <span className="text-[9px] font-bold text-destructive">Gap</span>}
              </div>
            )}
          </div>
          <div className="flex gap-3 text-[10px] text-muted-foreground">
            <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-sm bg-success" /> Fechado {Math.round(closedPct)}%</span>
            <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-sm bg-chart-2/60" /> Provável {Math.round(probPct)}%</span>
            <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-sm bg-destructive/20" /> Gap {Math.round(gapPct)}%</span>
          </div>
        </div>

        {/* Metric Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          {cards.map((c) => {
            const Icon = c.icon;
            return (
              <div key={c.label} className="rounded-lg border border-border/50 p-3">
                <div className="flex items-center justify-between mb-1.5">
                  <span className="text-[10px] font-medium text-muted-foreground">{c.label}</span>
                  <div className={cn("p-1 rounded-md", c.bg)}>
                    <Icon className={cn("h-3 w-3", c.color)} />
                  </div>
                </div>
                <p className={cn("text-lg font-bold", c.color === "text-chart-2" ? "text-foreground" : c.color)}>{c.value}</p>
                {c.sub && <p className="text-[10px] text-muted-foreground mt-0.5">{c.sub}</p>}
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}
