import { DollarSign, Users, Briefcase, Calendar } from "lucide-react";
import { cn } from "@/lib/utils";
import { WeeklyMetric, MetricStatus } from "@/hooks/useWeeklyPerformance";
import { formatCurrency } from "@/lib/formatters";
import { Skeleton } from "@/components/ui/skeleton";

interface Props {
  metrics: WeeklyMetric[];
  pipelineValue: number;
  isLoading: boolean;
}

const KPI_CONFIG: Record<string, {
  label: string;
  icon: typeof DollarSign;
  formatValue: (v: number) => string;
}> = {
  revenue: { label: "Vendas Fechadas", icon: DollarSign, formatValue: (v) => formatCurrency(v) },
  leads: { label: "Leads Qualificados", icon: Users, formatValue: (v) => v.toString() },
  pipeline: { label: "Negócios em Pipeline", icon: Briefcase, formatValue: (v) => formatCurrency(v) },
  meetings: { label: "Reuniões Realizadas", icon: Calendar, formatValue: (v) => v.toString() },
};

function getQuarterWeeksRemaining() {
  const now = new Date();
  const quarter = Math.ceil((now.getMonth() + 1) / 3);
  const quarterEnd = new Date(now.getFullYear(), quarter * 3, 0);
  const msRemaining = quarterEnd.getTime() - now.getTime();
  return Math.max(Math.ceil(msRemaining / (7 * 24 * 60 * 60 * 1000)), 1);
}

function getQuarterWeeksElapsed() {
  const now = new Date();
  const quarter = Math.ceil((now.getMonth() + 1) / 3);
  const quarterStart = new Date(now.getFullYear(), (quarter - 1) * 3, 1);
  const msElapsed = now.getTime() - quarterStart.getTime();
  return Math.max(Math.ceil(msElapsed / (7 * 24 * 60 * 60 * 1000)), 1);
}

const statusStyles: Record<MetricStatus, { border: string; badge: string; badgeText: string; text: string }> = {
  green: { border: "border-t-success", badge: "bg-success/10 text-success", badgeText: "Saudável", text: "text-success" },
  yellow: { border: "border-t-warning", badge: "bg-warning/10 text-warning", badgeText: "Atenção", text: "text-warning" },
  red: { border: "border-t-destructive", badge: "bg-destructive/10 text-destructive", badgeText: "Crítico", text: "text-destructive" },
};

export function PremiumKPICards({ metrics, pipelineValue, isLoading }: Props) {
  if (isLoading) {
    return (
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} className="h-32 rounded-xl" />
        ))}
      </div>
    );
  }

  const weeksElapsed = getQuarterWeeksElapsed();
  const weeksRemaining = getQuarterWeeksRemaining();
  const totalWeeks = weeksElapsed + weeksRemaining;

  const kpis = [
    { key: "revenue", metric: metrics.find((m) => m.key === "revenue") },
    { key: "leads", metric: metrics.find((m) => m.key === "leads") },
    { key: "pipeline", metric: null, pipelineValue },
    { key: "meetings", metric: metrics.find((m) => m.key === "meetings") },
  ];

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
      {kpis.map(({ key, metric, pipelineValue: pv }) => {
        const config = KPI_CONFIG[key];
        if (!config) return null;

        const Icon = config.icon;

        // Pipeline is special — no target, just value
        if (key === "pipeline") {
          const value = pv ?? 0;
          return (
            <div key={key} className="rounded-xl border border-border/60 border-t-2 border-t-primary bg-card p-4 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-medium text-muted-foreground">{config.label}</span>
                <div className="p-1.5 rounded-lg bg-primary/10">
                  <Icon className="h-3.5 w-3.5 text-primary" />
                </div>
              </div>
              <p className="text-xl font-bold text-foreground">{config.formatValue(value)}</p>
              <p className="text-[10px] text-muted-foreground">Valor total em pipeline aberto</p>
            </div>
          );
        }

        if (!metric) return null;

        const style = statusStyles[metric.status];
        const vsTarget = metric.target > 0 ? metric.pct : null;
        
        // Quarter projection: (actual / weeksElapsed) * totalWeeks
        const weeklyRate = weeksElapsed > 0 ? metric.actual / weeksElapsed : 0;
        const projection = Math.round(weeklyRate * totalWeeks);

        return (
          <div key={key} className={cn(
            "rounded-xl border border-border/60 border-t-2 bg-card p-4 space-y-2",
            style.border
          )}>
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-medium text-muted-foreground">{config.label}</span>
              <div className={cn("p-1.5 rounded-lg", style.badge.split(" ")[0])}>
                <Icon className={cn("h-3.5 w-3.5", style.text)} />
              </div>
            </div>
            <div className="flex items-baseline gap-2">
              <p className="text-xl font-bold text-foreground">{config.formatValue(metric.actual)}</p>
              {vsTarget !== null && (
                <span className={cn("text-xs font-semibold", style.text)}>
                  {vsTarget}%
                </span>
              )}
            </div>
            <div className="space-y-0.5">
              {vsTarget !== null && (
                <p className="text-[10px] text-muted-foreground">
                  vs meta: {config.formatValue(metric.target)}
                </p>
              )}
              {metric.format === "currency" && projection > 0 && (
                <p className="text-[10px] text-muted-foreground">
                  Projeção trimestral: {config.formatValue(projection)}
                </p>
              )}
            </div>
            <div className={cn("inline-flex px-1.5 py-0.5 rounded text-[9px] font-semibold", style.badge)}>
              {style.badgeText}
            </div>
          </div>
        );
      })}
    </div>
  );
}
