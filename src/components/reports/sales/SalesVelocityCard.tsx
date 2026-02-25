import { useTranslation } from "react-i18next";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Zap } from "lucide-react";
import type { SalesVelocity } from "@/hooks/useSalesPerformance";

function formatCurrency(value: number): string {
  if (value >= 1_000_000) return `€${(value / 1_000_000).toFixed(1)}M`;
  if (value >= 1_000) return `€${(value / 1_000).toFixed(1)}K`;
  return `€${value.toFixed(0)}`;
}

interface Props {
  data: SalesVelocity | undefined;
  isLoading: boolean;
}

export function SalesVelocityCard({ data, isLoading }: Props) {
  const { t } = useTranslation("reports");

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-base flex items-center gap-2">
          <Zap className="h-4 w-4 text-warning" />
          {t("sales_velocity")}
        </CardTitle>
        <CardDescription className="text-xs">{t("velocity_formula")}</CardDescription>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <Skeleton className="h-[180px]" />
        ) : !data ? (
          <div className="text-center py-8 text-muted-foreground text-sm">{t("no_data")}</div>
        ) : (
          <div className="space-y-4">
            <div className="text-center">
              <p className="text-4xl font-bold text-primary">
                {formatCurrency(data.velocity)}
              </p>
              <p className="text-xs text-muted-foreground mt-1">{t("velocity_per_day")}</p>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="rounded-lg bg-muted/50 p-3 text-center">
                <p className="text-lg font-semibold">{data.deals}</p>
                <p className="text-xs text-muted-foreground">{t("deals")}</p>
              </div>
              <div className="rounded-lg bg-muted/50 p-3 text-center">
                <p className="text-lg font-semibold">{formatCurrency(data.avgValue)}</p>
                <p className="text-xs text-muted-foreground">{t("avg_value")}</p>
              </div>
              <div className="rounded-lg bg-muted/50 p-3 text-center">
                <p className="text-lg font-semibold">{data.winRate.toFixed(1)}%</p>
                <p className="text-xs text-muted-foreground">{t("win_rate")}</p>
              </div>
              <div className="rounded-lg bg-muted/50 p-3 text-center">
                <p className="text-lg font-semibold">{data.avgCycleDays}d</p>
                <p className="text-xs text-muted-foreground">{t("cycle_days")}</p>
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
