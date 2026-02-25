import { useTranslation } from "react-i18next";
import { KPICard, KPIGrid } from "@/components/design-system/KPICard";
import { Skeleton } from "@/components/ui/skeleton";
import { DollarSign, Trophy, Target, Clock, FileText, Users } from "lucide-react";
import type { SalesKPI } from "@/hooks/useSalesPerformance";

const kpiIcons: Record<string, React.ReactNode> = {
  pipeline_value: <DollarSign className="h-4 w-4" />,
  won_revenue: <Trophy className="h-4 w-4" />,
  win_rate: <Target className="h-4 w-4" />,
  avg_cycle: <Clock className="h-4 w-4" />,
  proposal_conversion: <FileText className="h-4 w-4" />,
  mql_to_sql: <Users className="h-4 w-4" />,
};

const kpiVariants: Record<string, "default" | "primary" | "success" | "warning" | "destructive"> = {
  pipeline_value: "primary",
  won_revenue: "success",
  win_rate: "default",
  avg_cycle: "warning",
  proposal_conversion: "default",
  mql_to_sql: "default",
};

interface Props {
  kpis: SalesKPI[] | undefined;
  isLoading: boolean;
}

export function SalesKPIStrip({ kpis, isLoading }: Props) {
  const { t } = useTranslation("reports");

  if (isLoading) {
    return (
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
        {Array.from({ length: 6 }).map((_, i) => (
          <Skeleton key={i} className="h-[100px]" />
        ))}
      </div>
    );
  }

  return (
    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
      {kpis?.map((kpi) => (
        <KPICard
          key={kpi.label}
          title={t(kpi.label)}
          value={kpi.formatted}
          icon={kpiIcons[kpi.label]}
          variant={kpiVariants[kpi.label]}
          trend={kpi.trend !== 0 ? {
            value: kpi.trend,
            direction: kpi.trendDirection,
          } : undefined}
        />
      ))}
    </div>
  );
}
