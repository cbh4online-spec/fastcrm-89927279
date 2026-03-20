import { useState, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid,
  Tooltip as RechartsTooltip, ResponsiveContainer, Legend, ReferenceLine
} from "recharts";
import { TrendingUp, Calendar, BarChart3 } from "lucide-react";
import { type TrendPoint, linearRegression } from "./statsHelpers";

interface Props {
  trendData: TrendPoint[];
}

export function StatsTrendsTab({ trendData }: Props) {
  const [showForecast, setShowForecast] = useState(false);

  const chartData = useMemo(() => {
    if (!showForecast || trendData.length < 3) return trendData;

    const recent = trendData.slice(-14);
    const regression = linearRegression(recent.map((d, i) => ({ x: i, y: d.visitantes })));

    const forecast: TrendPoint[] = [];
    for (let i = 1; i <= 7; i++) {
      const predicted = Math.max(0, Math.round(regression.slope * (recent.length + i) + regression.intercept));
      forecast.push({
        date: `+${i}d`,
        rawDate: "",
        visitantes: 0,
        conversões: 0,
        taxa: 0,
        forecast: predicted,
      } as any);
    }
    return [...trendData, ...forecast];
  }, [trendData, showForecast]);

  const summary = useMemo(() => {
    if (trendData.length === 0) return null;
    const bestDay = trendData.reduce((best, d) => d.visitantes > best.visitantes ? d : best, trendData[0]);
    const worstDay = trendData.reduce((worst, d) => d.visitantes < worst.visitantes ? d : worst, trendData[0]);
    const avgVisits = Math.round(trendData.reduce((s, d) => s + d.visitantes, 0) / trendData.length);
    const totalConv = trendData.reduce((s, d) => s + d.conversões, 0);

    // Find peak day
    let peakDay: string | null = null;
    const avg = avgVisits;
    for (const d of trendData) {
      if (d.visitantes > avg * 2.5 && d.visitantes > 5) { peakDay = d.date; break; }
    }

    return { bestDay, worstDay, avgVisits, totalConv, peakDay };
  }, [trendData]);

  return (
    <div className="space-y-4">
      <Card className="border-white/[0.08] rounded-xl">
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <CardTitle className="text-sm flex items-center gap-2">
              <TrendingUp className="h-4 w-4 text-amber-400" />
              Evolução Diária
            </CardTitle>
            <div className="flex items-center gap-2">
              <Switch id="forecast" checked={showForecast} onCheckedChange={setShowForecast} />
              <Label htmlFor="forecast" className="text-xs text-muted-foreground cursor-pointer">Previsão</Label>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {chartData.length > 0 ? (
            <ResponsiveContainer width="100%" height={320}>
              <LineChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" opacity={0.3} />
                <XAxis dataKey="date" tick={{ fontSize: 11 }} stroke="hsl(var(--muted-foreground))" />
                <YAxis yAxisId="left" tick={{ fontSize: 11 }} stroke="hsl(var(--muted-foreground))" />
                <YAxis yAxisId="right" orientation="right" tick={{ fontSize: 11 }} stroke="hsl(var(--muted-foreground))" unit="%" />
                <RechartsTooltip
                  contentStyle={{
                    background: "hsl(var(--card))",
                    border: "1px solid hsl(var(--border))",
                    borderRadius: 12,
                    fontSize: 12,
                  }}
                />
                <Line yAxisId="left" type="monotone" dataKey="visitantes" stroke="#F5A623" strokeWidth={2} dot={false} name="Visitantes" />
                <Line yAxisId="left" type="monotone" dataKey="conversões" stroke="#1D9E75" strokeWidth={2} dot={false} name="Conversões" />
                <Line yAxisId="right" type="monotone" dataKey="taxa" stroke="hsl(var(--muted-foreground))" strokeWidth={1} strokeDasharray="4 4" dot={false} name="Taxa %" />
                {showForecast && (
                  <Line yAxisId="left" type="monotone" dataKey="forecast" stroke="#F5A623" strokeWidth={2} strokeDasharray="6 3" dot={false} name="Previsão" />
                )}
                {summary?.peakDay && (
                  <ReferenceLine x={summary.peakDay} yAxisId="left" stroke="#F5A623" strokeDasharray="3 3" label={{ value: "Pico", position: "top", fontSize: 10, fill: "#F5A623" }} />
                )}
                <Legend />
              </LineChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-60 flex flex-col items-center justify-center text-muted-foreground gap-2">
              <BarChart3 className="h-10 w-10 opacity-40" />
              <p className="text-sm">Sem dados suficientes para tendências</p>
              <p className="text-xs">Os dados aparecem após as primeiras visitas</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Period Summary */}
      {summary && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Card className="border-white/[0.08] rounded-xl">
            <CardContent className="pt-4 pb-3">
              <p className="text-xs text-muted-foreground mb-1">Melhor Dia</p>
              <p className="text-lg font-bold tabular-nums">{summary.bestDay.visitantes}</p>
              <p className="text-xs text-muted-foreground">{summary.bestDay.date}</p>
            </CardContent>
          </Card>
          <Card className="border-white/[0.08] rounded-xl">
            <CardContent className="pt-4 pb-3">
              <p className="text-xs text-muted-foreground mb-1">Pior Dia</p>
              <p className="text-lg font-bold tabular-nums">{summary.worstDay.visitantes}</p>
              <p className="text-xs text-muted-foreground">{summary.worstDay.date}</p>
            </CardContent>
          </Card>
          <Card className="border-white/[0.08] rounded-xl">
            <CardContent className="pt-4 pb-3">
              <p className="text-xs text-muted-foreground mb-1">Média Diária</p>
              <p className="text-lg font-bold tabular-nums">{summary.avgVisits}</p>
              <p className="text-xs text-muted-foreground">visitantes/dia</p>
            </CardContent>
          </Card>
          <Card className="border-white/[0.08] rounded-xl">
            <CardContent className="pt-4 pb-3">
              <p className="text-xs text-muted-foreground mb-1">Total Conversões</p>
              <p className="text-lg font-bold tabular-nums text-emerald-400">{summary.totalConv}</p>
              <p className="text-xs text-muted-foreground">no período</p>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
