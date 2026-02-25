import { useTranslation } from "react-i18next";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import type { StageDurationData } from "@/hooks/useSalesPerformance";

interface Props {
  data?: StageDurationData[];
  isLoading: boolean;
}

function getHeatColor(ratio: number): string {
  if (ratio <= 0.5) return "hsl(142 71% 45%)";   // green
  if (ratio <= 1.0) return "hsl(38 92% 50%)";     // amber
  return "hsl(0 84% 60%)";                         // red
}

function getHeatBg(ratio: number): string {
  if (ratio <= 0.5) return "hsl(142 71% 45% / 0.15)";
  if (ratio <= 1.0) return "hsl(38 92% 50% / 0.15)";
  return "hsl(0 84% 60% / 0.15)";
}

export function StageDurationHeatmap({ data, isLoading }: Props) {
  const { t } = useTranslation("reports");

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <Skeleton className="h-6 w-48" />
          <Skeleton className="h-4 w-64 mt-1" />
        </CardHeader>
        <CardContent className="space-y-4">
          {Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={i} className="h-10 w-full" />
          ))}
        </CardContent>
      </Card>
    );
  }

  if (!data || data.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">{t("stage_duration_heatmap")}</CardTitle>
          <CardDescription>{t("stage_duration_subtitle")}</CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">{t("no_data")}</p>
        </CardContent>
      </Card>
    );
  }

  const maxAvg = Math.max(...data.map((d) => d.avg_days), 1);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">{t("stage_duration_heatmap")}</CardTitle>
        <CardDescription>{t("stage_duration_subtitle")}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        <TooltipProvider delayDuration={200}>
          {data.map((stage) => {
            const barWidth = Math.max((stage.avg_days / maxAvg) * 100, 4);
            const color = getHeatColor(stage.heat_ratio);
            const bg = getHeatBg(stage.heat_ratio);

            return (
              <Tooltip key={stage.stage_name}>
                <TooltipTrigger asChild>
                  <div className="flex items-center gap-3 group cursor-default">
                    <span className="text-sm font-medium w-28 truncate shrink-0">
                      {stage.stage_name}
                    </span>
                    <div className="flex-1 h-8 rounded-md overflow-hidden" style={{ background: bg }}>
                      <div
                        className="h-full rounded-md transition-all duration-500"
                        style={{
                          width: `${barWidth}%`,
                          backgroundColor: color,
                        }}
                      />
                    </div>
                    <span className="text-sm text-muted-foreground whitespace-nowrap w-32 text-right shrink-0">
                      {stage.avg_days.toFixed(1)}d {t("stage_avg_days")} ({stage.deal_count} {t("stage_deals_count")})
                    </span>
                  </div>
                </TooltipTrigger>
                <TooltipContent side="top" className="text-xs space-y-1">
                  <p className="font-semibold">{stage.stage_name}</p>
                  <p>Min: {stage.min_days.toFixed(1)}d · Max: {stage.max_days.toFixed(1)}d</p>
                  <p>{t("stage_expected")}: {stage.expected_days}d</p>
                  <p>{stage.deal_count} {t("stage_deals_count")}</p>
                </TooltipContent>
              </Tooltip>
            );
          })}
        </TooltipProvider>

        {/* Legend */}
        <div className="flex items-center gap-4 pt-3 border-t text-xs text-muted-foreground">
          <div className="flex items-center gap-1.5">
            <span className="w-3 h-3 rounded-full" style={{ backgroundColor: "hsl(142 71% 45%)" }} />
            {t("stage_under_expected")}
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-3 h-3 rounded-full" style={{ backgroundColor: "hsl(38 92% 50%)" }} />
            {t("stage_on_track")}
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-3 h-3 rounded-full" style={{ backgroundColor: "hsl(0 84% 60%)" }} />
            {t("stage_over_expected")}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
