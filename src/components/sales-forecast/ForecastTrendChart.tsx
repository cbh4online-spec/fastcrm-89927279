import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, Legend } from "recharts";
import { TrendingUp } from "lucide-react";
import type { ForecastTrendPoint } from "@/hooks/useSalesForecast";

interface Props {
  data: ForecastTrendPoint[];
}

function fmt(value: number): string {
  if (value >= 1_000_000) return `€${(value / 1_000_000).toFixed(1)}M`;
  if (value >= 1_000) return `€${(value / 1_000).toFixed(1)}K`;
  return `€${value.toFixed(0)}`;
}

export function ForecastTrendChart({ data }: Props) {
  if (data.length === 0) return null;

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (!active || !payload?.length) return null;
    return (
      <div className="bg-popover border border-border rounded-lg shadow-lg p-3 text-sm space-y-1">
        <p className="font-semibold">{label}</p>
        {payload.map((p: any) => (
          <p key={p.dataKey} style={{ color: p.color }}>
            {p.dataKey === "total_value" ? "Total" : "Ponderado"}: {fmt(p.value)}
          </p>
        ))}
      </div>
    );
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base flex items-center gap-2">
          <TrendingUp className="h-4 w-4 text-primary" />
          Evolução do Forecast (6 meses)
        </CardTitle>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={280}>
          <LineChart data={data} margin={{ top: 5, right: 20, left: 10, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
            <XAxis dataKey="month" tick={{ fontSize: 12 }} />
            <YAxis tickFormatter={fmt} tick={{ fontSize: 12 }} />
            <Tooltip content={<CustomTooltip />} />
            <Legend formatter={(v: string) => (v === "total_value" ? "Pipeline Total" : "Forecast Ponderado")} />
            <Line
              type="monotone"
              dataKey="total_value"
              stroke="hsl(var(--muted-foreground))"
              strokeWidth={1.5}
              strokeDasharray="5 5"
              dot={{ r: 3 }}
            />
            <Line
              type="monotone"
              dataKey="weighted_value"
              stroke="hsl(var(--primary))"
              strokeWidth={2}
              dot={{ r: 4 }}
            />
          </LineChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}
