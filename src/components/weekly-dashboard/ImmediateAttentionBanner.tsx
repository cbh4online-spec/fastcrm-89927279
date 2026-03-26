import { AlertTriangle, CheckCircle2, TrendingDown, ArrowRight } from "lucide-react";
import { cn } from "@/lib/utils";
import { WeeklyMetric } from "@/hooks/useWeeklyPerformance";
import { formatCurrency } from "@/lib/formatters";
import { Skeleton } from "@/components/ui/skeleton";

interface Props {
  metrics: WeeklyMetric[];
  isLoading: boolean;
}

function getQuarterWeeksRemaining() {
  const now = new Date();
  const quarter = Math.ceil((now.getMonth() + 1) / 3);
  const quarterEnd = new Date(now.getFullYear(), quarter * 3, 0);
  const msRemaining = quarterEnd.getTime() - now.getTime();
  return Math.max(Math.ceil(msRemaining / (7 * 24 * 60 * 60 * 1000)), 1);
}

export function ImmediateAttentionBanner({ metrics, isLoading }: Props) {
  if (isLoading) {
    return <Skeleton className="h-16 w-full rounded-lg" />;
  }

  const revenue = metrics.find((m) => m.key === "revenue");
  const leads = metrics.find((m) => m.key === "leads");
  const deals = metrics.find((m) => m.key === "deals");

  const alerts: { text: string; severity: "critical" | "warning" }[] = [];

  if (revenue && revenue.target > 0 && revenue.pct < 50) {
    const gap = revenue.target - revenue.actual;
    const weeksLeft = getQuarterWeeksRemaining();
    const perWeek = Math.ceil(gap / weeksLeft);
    alerts.push({
      text: `Vendas abaixo do ritmo — faltam ${formatCurrency(gap)}. Precisas de ${formatCurrency(perWeek)}/semana para atingir a meta.`,
      severity: revenue.pct < 25 ? "critical" : "warning",
    });
  }

  if (leads && leads.target > 0 && leads.pct < 50) {
    const gap = leads.target - leads.actual;
    alerts.push({
      text: `Leads abaixo da meta — faltam ${gap} leads esta semana.`,
      severity: leads.pct < 25 ? "critical" : "warning",
    });
  }

  if (deals && deals.target > 0 && deals.pct < 30) {
    alerts.push({
      text: `Nenhum negócio fechado ainda esta semana. Meta: ${deals.target}.`,
      severity: "warning",
    });
  }

  if (alerts.length === 0) {
    return (
      <div className="flex items-center gap-3 rounded-lg border border-success/30 bg-success/5 px-4 py-3">
        <CheckCircle2 className="h-4.5 w-4.5 text-success shrink-0" />
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-foreground">Tudo no bom caminho</p>
          <p className="text-xs text-muted-foreground">As métricas estão dentro dos objectivos semanais.</p>
        </div>
      </div>
    );
  }

  const hasCritical = alerts.some((a) => a.severity === "critical");

  return (
    <div className={cn(
      "rounded-lg border-l-4 px-4 py-3 space-y-2",
      hasCritical
        ? "border-l-destructive bg-destructive/5 border border-destructive/20"
        : "border-l-warning bg-warning/5 border border-warning/20"
    )}>
      <div className="flex items-start gap-2.5">
        {hasCritical ? (
          <AlertTriangle className="h-4 w-4 text-destructive shrink-0 mt-0.5" />
        ) : (
          <TrendingDown className="h-4 w-4 text-warning shrink-0 mt-0.5" />
        )}
        <div className="flex-1 min-w-0 space-y-1.5">
          <p className="text-xs font-semibold uppercase tracking-wider text-foreground">
            Atenção imediata
          </p>
          {alerts.map((alert, i) => (
            <p key={i} className="text-sm text-foreground/90">{alert.text}</p>
          ))}
        </div>
      </div>
      <div className="flex justify-end">
        <button
          onClick={() => {
            const el = document.getElementById("today-action-plan");
            el?.scrollIntoView({ behavior: "smooth", block: "start" });
          }}
          className="flex items-center gap-1 text-xs font-medium text-primary hover:text-primary/80 transition-colors"
        >
          Ver plano de ação <ArrowRight className="h-3 w-3" />
        </button>
      </div>
    </div>
  );
}
