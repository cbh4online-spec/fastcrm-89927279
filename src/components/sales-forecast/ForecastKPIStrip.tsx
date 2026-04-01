import { Card, CardContent } from "@/components/ui/card";
import { TrendingUp, DollarSign, Target, BarChart3, Percent } from "lucide-react";
import type { ForecastKPIs } from "@/hooks/useSalesForecast";

interface Props {
  kpis: ForecastKPIs;
}

function fmt(value: number): string {
  if (value >= 1_000_000) return `€${(value / 1_000_000).toFixed(1)}M`;
  if (value >= 1_000) return `€${(value / 1_000).toFixed(1)}K`;
  return `€${value.toFixed(0)}`;
}

const items = [
  { key: "totalPipeline" as const, label: "Pipeline Total", icon: DollarSign, format: fmt },
  { key: "weightedForecast" as const, label: "Forecast Ponderado", icon: TrendingUp, format: fmt },
  { key: "bestCase" as const, label: "Best Case", icon: Target, format: fmt },
  { key: "activeDeals" as const, label: "Deals Ativos", icon: BarChart3, format: (v: number) => String(v) },
  { key: "avgWinRate" as const, label: "Win Rate Médio", icon: Percent, format: (v: number) => `${v.toFixed(1)}%` },
];

export function ForecastKPIStrip({ kpis }: Props) {
  return (
    <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
      {items.map(({ key, label, icon: Icon, format: formatFn }) => (
        <Card key={key} className="border">
          <CardContent className="p-4 flex items-start gap-3">
            <div className="rounded-lg bg-primary/10 p-2">
              <Icon className="h-4 w-4 text-primary" />
            </div>
            <div className="min-w-0">
              <p className="text-xs text-muted-foreground truncate">{label}</p>
              <p className="text-lg font-bold text-foreground">{formatFn(kpis[key])}</p>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
