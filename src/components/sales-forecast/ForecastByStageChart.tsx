import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell, Legend } from "recharts";
import { BarChart3 } from "lucide-react";
import type { ForecastByStage } from "@/hooks/useSalesForecast";

interface Props {
  data: ForecastByStage[];
}

function fmt(value: number): string {
  if (value >= 1_000_000) return `€${(value / 1_000_000).toFixed(1)}M`;
  if (value >= 1_000) return `€${(value / 1_000).toFixed(1)}K`;
  return `€${value.toFixed(0)}`;
}

export function ForecastByStageChart({ data }: Props) {
  if (data.length === 0) {
    return (
      <Card>
        <CardHeader><CardTitle className="text-base">Forecast por Etapa</CardTitle></CardHeader>
        <CardContent>
          <div className="flex items-center justify-center h-[200px] text-muted-foreground text-sm">
            Sem dados para o período selecionado
          </div>
        </CardContent>
      </Card>
    );
  }

  const CustomTooltip = ({ active, payload }: any) => {
    if (!active || !payload?.length) return null;
    const item = payload[0]?.payload as ForecastByStage;
    if (!item) return null;
    return (
      <div className="bg-popover border border-border rounded-lg shadow-lg p-3 text-sm space-y-1">
        <p className="font-semibold">{item.stage_name}</p>
        <p className="text-muted-foreground">Probabilidade: {item.probability}%</p>
        <p>Total: {fmt(item.total_value)}</p>
        <p className="font-medium">Ponderado: {fmt(item.weighted_value)}</p>
        <p className="text-muted-foreground">{item.deal_count} negócios</p>
      </div>
    );
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base flex items-center gap-2">
          <BarChart3 className="h-4 w-4 text-primary" />
          Forecast por Etapa
        </CardTitle>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={Math.max(200, data.length * 56 + 40)}>
          <BarChart data={data} layout="vertical" margin={{ top: 0, right: 20, left: 10, bottom: 0 }}>
            <XAxis type="number" tickFormatter={fmt} tick={{ fontSize: 12 }} />
            <YAxis type="category" dataKey="stage_name" width={110} tick={{ fontSize: 12 }} />
            <Tooltip content={<CustomTooltip />} />
            <Legend formatter={(v: string) => (v === "total_value" ? "Total" : "Ponderado")} />
            <Bar dataKey="total_value" name="total_value" radius={[0, 4, 4, 0]} barSize={14}>
              {data.map((entry, i) => (
                <Cell key={i} fill={entry.stage_color} fillOpacity={0.25} />
              ))}
            </Bar>
            <Bar dataKey="weighted_value" name="weighted_value" radius={[0, 4, 4, 0]} barSize={14}>
              {data.map((entry, i) => (
                <Cell key={i} fill={entry.stage_color} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}
