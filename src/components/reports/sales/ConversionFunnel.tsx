import { useTranslation } from "react-i18next";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import type { FunnelData, FunnelStage } from "@/hooks/useSalesPerformance";
import { ArrowRight, Filter } from "lucide-react";

interface Props {
  data: FunnelData | undefined;
  isLoading: boolean;
}

function FunnelRow({ stages, label }: { stages: FunnelStage[]; label: string }) {
  const maxCount = Math.max(...stages.map((s) => s.count), 1);

  return (
    <div className="space-y-2">
      <p className="text-xs font-medium text-muted-foreground">{label}</p>
      <div className="flex items-center gap-1">
        {stages.map((stage, i) => (
          <div key={stage.name} className="flex items-center gap-1 flex-1">
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between mb-1">
                <span className="text-xs font-medium truncate">{stage.name}</span>
                <span className="text-xs text-muted-foreground ml-1">{stage.count}</span>
              </div>
              <div className="h-8 rounded bg-muted overflow-hidden">
                <div
                  className="h-full rounded transition-all duration-500"
                  style={{
                    width: `${Math.max((stage.count / maxCount) * 100, 4)}%`,
                    backgroundColor: stage.color,
                  }}
                />
              </div>
              <span className="text-[10px] text-muted-foreground">{stage.percentage}%</span>
            </div>
            {i < stages.length - 1 && (
              <ArrowRight className="h-3 w-3 text-muted-foreground shrink-0" />
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

export function ConversionFunnel({ data, isLoading }: Props) {
  const { t } = useTranslation("reports");

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-base flex items-center gap-2">
          <Filter className="h-4 w-4 text-primary" />
          {t("conversion_funnel")}
        </CardTitle>
        <CardDescription>{t("vs_last_quarter")}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {isLoading ? (
          <Skeleton className="h-[200px]" />
        ) : !data?.current.length ? (
          <div className="flex items-center justify-center h-[200px] text-muted-foreground text-sm">
            {t("no_opportunities")}
          </div>
        ) : (
          <>
            <FunnelRow stages={data.current} label={t("this_quarter_label")} />
            <FunnelRow stages={data.previous} label={t("last_quarter_label")} />
          </>
        )}
      </CardContent>
    </Card>
  );
}
