import { useTranslation } from "react-i18next";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell, Legend } from "recharts";
import { TrendingUp } from "lucide-react";
import type { DealForecastStage } from "@/hooks/useSalesPerformance";

interface Props {
  data?: DealForecastStage[];
  isLoading: boolean;
}

function formatCurrency(value: number): string {
  if (value >= 1_000_000) return `€${(value / 1_000_000).toFixed(1)}M`;
  if (value >= 1_000) return `€${(value / 1_000).toFixed(1)}K`;
  return `€${value.toFixed(0)}`;
}

export function DealForecastChart({ data, isLoading }: Props) {
  const { t } = useTranslation("reports");

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <Skeleton className="h-5 w-48" />
          <Skeleton className="h-4 w-72 mt-1" />
        </CardHeader>
        <CardContent>
          <Skeleton className="h-[300px] w-full" />
        </CardContent>
      </Card>
    );
  }

  if (!data || data.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">{t("deal_forecast_chart")}</CardTitle>
          <CardDescription>{t("deal_forecast_subtitle")}</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center h-[200px] text-muted-foreground text-sm">
            {t("no_data")}
          </div>
        </CardContent>
      </Card>
    );
  }

  const totalWeighted = data.reduce((s, d) => s + d.weighted_value, 0);

  const CustomTooltip = ({ active, payload }: any) => {
    if (!active || !payload?.length) return null;
    const item = payload[0]?.payload as DealForecastStage;
    if (!item) return null;
    return (
      <div className="bg-popover border border-border rounded-lg shadow-lg p-3 text-sm space-y-1">
        <p className="font-semibold">{item.stage_name}</p>
        <p className="text-muted-foreground">{t("deal_forecast_probability")}: {item.probability}%</p>
        <p>{t("deal_forecast_total")}: {formatCurrency(item.total_value)}</p>
        <p className="font-medium">{t("deal_forecast_weighted")}: {formatCurrency(item.weighted_value)}</p>
        <p className="text-muted-foreground">{item.deal_count} {t("deal_forecast_deals")}</p>
      </div>
    );
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg flex items-center gap-2">
          <TrendingUp className="h-5 w-5 text-primary" />
          {t("deal_forecast_chart")}
        </CardTitle>
        <CardDescription>{t("deal_forecast_subtitle")}</CardDescription>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={Math.max(200, data.length * 60 + 40)}>
          <BarChart data={data} layout="vertical" margin={{ top: 0, right: 20, left: 10, bottom: 0 }}>
            <XAxis type="number" tickFormatter={formatCurrency} tick={{ fontSize: 12 }} className="text-muted-foreground" />
            <YAxis
              type="category"
              dataKey="stage_name"
              width={110}
              tick={{ fontSize: 12 }}
              className="text-muted-foreground"
            />
            <Tooltip content={<CustomTooltip />} />
            <Legend
              formatter={(value: string) =>
                value === "total_value" ? t("deal_forecast_total") : t("deal_forecast_weighted")
              }
            />
            <Bar dataKey="total_value" name="total_value" radius={[0, 4, 4, 0]} barSize={16}>
              {data.map((entry, i) => (
                <Cell key={i} fill={entry.stage_color} fillOpacity={0.25} />
              ))}
            </Bar>
            <Bar dataKey="weighted_value" name="weighted_value" radius={[0, 4, 4, 0]} barSize={16}>
              {data.map((entry, i) => (
                <Cell key={i} fill={entry.stage_color} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </CardContent>
      <CardFooter className="text-sm text-muted-foreground border-t pt-4">
        {t("deal_forecast_total_weighted")}: <span className="font-semibold text-foreground ml-1">{formatCurrency(totalWeighted)}</span>
      </CardFooter>
    </Card>
  );
}
