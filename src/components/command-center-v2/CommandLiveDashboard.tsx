import { useWeeklyPerformance } from "@/hooks/useWeeklyPerformance";
import { useDailyBrief } from "@/hooks/useDailyBrief";
import { Card, CardContent } from "@/components/ui/card";
import { TrendingUp, TrendingDown, Users, Target, AlertTriangle, Zap } from "lucide-react";
import { cn } from "@/lib/utils";
import { Skeleton } from "@/components/ui/skeleton";

interface MiniKPI {
  label: string;
  value: string;
  icon: any;
  trend?: "up" | "down" | "neutral";
  status?: "green" | "yellow" | "red" | "neutral";
}

export function CommandLiveDashboard() {
  const { data: performance, isLoading: perfLoading } = useWeeklyPerformance();
  const { briefs, isLoading: briefLoading } = useDailyBrief();

  const latestBrief = briefs?.[0];
  const km = latestBrief?.key_metrics;
  const metrics = performance?.metrics;

  const isLoading = perfLoading || briefLoading;

  if (isLoading) {
    return (
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2">
        {Array.from({ length: 6 }).map((_, i) => (
          <Skeleton key={i} className="h-20 rounded-xl" />
        ))}
      </div>
    );
  }

  // Derive KPIs from real data
  const leadsMetric = metrics?.find(m => m.key === "leads");
  const revenueMetric = metrics?.find(m => m.key === "revenue");
  const dealsMetric = metrics?.find(m => m.key === "deals_won");
  const pipelineValue = performance?.pipelineValue || 0;

  const kpis: MiniKPI[] = [
    {
      label: "Leads Semana",
      value: String(leadsMetric?.actual ?? km?.leads_today ?? 0),
      icon: Users,
      status: leadsMetric?.status || "neutral",
      trend: leadsMetric ? (leadsMetric.pct >= 80 ? "up" : leadsMetric.pct < 50 ? "down" : "neutral") : undefined,
    },
    {
      label: "Pipeline",
      value: pipelineValue > 0 ? `€${(pipelineValue / 1000).toFixed(0)}k` : "€0",
      icon: Target,
      status: "green",
    },
    {
      label: "Receita Semana",
      value: revenueMetric ? `€${(revenueMetric.actual / 1000).toFixed(1)}k` : "€0",
      icon: TrendingUp,
      status: revenueMetric?.status || "neutral",
      trend: revenueMetric ? (revenueMetric.pct >= 80 ? "up" : "down") : undefined,
    },
    {
      label: "Deals Ganhos",
      value: String(dealsMetric?.actual ?? km?.deals_won ?? 0),
      icon: Zap,
      status: dealsMetric?.status || "neutral",
    },
    {
      label: "Deals Stalled",
      value: String(km?.deals_stalled ?? 0),
      icon: AlertTriangle,
      status: (km?.deals_stalled ?? 0) > 2 ? "red" : (km?.deals_stalled ?? 0) > 0 ? "yellow" : "green",
    },
    {
      label: "Tarefas Pend.",
      value: String(km?.tasks_pending ?? 0),
      icon: Target,
      status: (km?.tasks_pending ?? 0) > 5 ? "red" : (km?.tasks_pending ?? 0) > 2 ? "yellow" : "green",
    },
  ];

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2">
      {kpis.map((kpi, i) => {
        const Icon = kpi.icon;
        const statusColor = kpi.status === "green"
          ? "text-emerald-500"
          : kpi.status === "red"
          ? "text-destructive"
          : kpi.status === "yellow"
          ? "text-amber-500"
          : "text-muted-foreground";

        return (
          <Card key={i} className="border-border/40 bg-muted/20">
            <CardContent className="p-3 space-y-1">
              <div className="flex items-center justify-between">
                <Icon className={cn("h-3.5 w-3.5", statusColor)} />
                {kpi.trend === "up" && <TrendingUp className="h-3 w-3 text-emerald-500" />}
                {kpi.trend === "down" && <TrendingDown className="h-3 w-3 text-destructive" />}
              </div>
              <p className="text-lg font-bold text-foreground leading-none">{kpi.value}</p>
              <p className="text-[10px] text-muted-foreground leading-tight">{kpi.label}</p>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
