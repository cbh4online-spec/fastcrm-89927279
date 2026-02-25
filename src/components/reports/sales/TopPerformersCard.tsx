import { useTranslation } from "react-i18next";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Medal } from "lucide-react";
import type { TopPerformer } from "@/hooks/useSalesPerformance";

function formatCurrency(value: number): string {
  if (value >= 1_000_000) return `€${(value / 1_000_000).toFixed(1)}M`;
  if (value >= 1_000) return `€${(value / 1_000).toFixed(1)}K`;
  return `€${value.toFixed(0)}`;
}

interface Props {
  data: TopPerformer[] | undefined;
  isLoading: boolean;
}

export function TopPerformersCard({ data, isLoading }: Props) {
  const { t } = useTranslation("reports");
  const maxValue = Math.max(...(data || []).map((p) => p.won_value), 1);

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-base flex items-center gap-2">
          <Medal className="h-4 w-4 text-warning" />
          {t("top_performers")}
        </CardTitle>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <Skeleton className="h-[180px]" />
        ) : !data?.length ? (
          <div className="text-center py-8 text-muted-foreground text-sm">{t("no_data")}</div>
        ) : (
          <div className="space-y-3">
            {data.map((performer, i) => (
              <div key={performer.owner_id} className="flex items-center gap-3">
                <span className="text-xs font-bold text-muted-foreground w-4">{i + 1}</span>
                <Avatar className="h-7 w-7">
                  <AvatarFallback className="text-xs bg-primary/10 text-primary">
                    {performer.name.split(" ").map((n) => n[0]).join("").slice(0, 2)}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between">
                    <p className="text-sm font-medium truncate">{performer.name}</p>
                    <p className="text-sm font-semibold ml-2">{formatCurrency(performer.won_value)}</p>
                  </div>
                  <div className="flex items-center gap-2 mt-1">
                    <div className="flex-1 h-1.5 rounded-full bg-muted overflow-hidden">
                      <div
                        className="h-full rounded-full bg-primary transition-all duration-500"
                        style={{ width: `${(performer.won_value / maxValue) * 100}%` }}
                      />
                    </div>
                    <span className="text-[10px] text-muted-foreground whitespace-nowrap">
                      {performer.deal_count} {t("deals_won")}
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
