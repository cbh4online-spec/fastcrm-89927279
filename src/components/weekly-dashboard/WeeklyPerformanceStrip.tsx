import { Target, Handshake, BarChart3, Calendar, Users, FileText } from "lucide-react";
import { KPICard, KPIGrid } from "@/components/design-system/KPICard";
import { KPIGridSkeleton } from "@/components/design-system/LoadingState";
import { WeeklyMetric } from "@/hooks/useWeeklyPerformance";
import { Progress } from "@/components/ui/progress";
import { cn } from "@/lib/utils";

const iconMap: Record<string, React.ReactNode> = {
  revenue: <Target className="h-4 w-4" />,
  deals: <Handshake className="h-4 w-4" />,
  pipeline: <BarChart3 className="h-4 w-4" />,
  meetings: <Calendar className="h-4 w-4" />,
  leads: <Users className="h-4 w-4" />,
  proposals: <FileText className="h-4 w-4" />,
};

const statusVariant: Record<string, "success" | "warning" | "destructive"> = {
  green: "success",
  yellow: "warning",
  red: "destructive",
};

function formatValue(val: number, format: "number" | "currency") {
  if (format === "currency") {
    return new Intl.NumberFormat("pt-PT", { style: "currency", currency: "EUR", maximumFractionDigits: 0 }).format(val);
  }
  if (typeof val === "number" && val % 1 !== 0) return val.toFixed(1) + "x";
  return String(val);
}

interface Props {
  metrics: WeeklyMetric[];
  isLoading: boolean;
}

export function WeeklyPerformanceStrip({ metrics, isLoading }: Props) {
  if (isLoading) return <KPIGridSkeleton count={6} />;

  return (
    <KPIGrid columns={3}>
      {metrics.map((m) => (
        <div key={m.key} className="space-y-2">
          <KPICard
            title={m.label}
            value={formatValue(m.actual, m.format)}
            icon={iconMap[m.key]}
            variant={statusVariant[m.status]}
            description={m.target > 0 ? `Meta: ${formatValue(m.target, m.format)} (${m.pct}%)` : undefined}
          />
          {m.target > 0 && (
            <Progress
              value={Math.min(m.pct, 100)}
              className={cn(
                "h-1.5",
                m.status === "green" && "[&>div]:bg-success",
                m.status === "yellow" && "[&>div]:bg-warning",
                m.status === "red" && "[&>div]:bg-destructive"
              )}
            />
          )}
        </div>
      ))}
    </KPIGrid>
  );
}
