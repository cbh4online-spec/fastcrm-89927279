import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useOpportunities } from "@/hooks/useOpportunities";
import { useMemo, useState } from "react";
import { format, subDays, isWithinInterval, startOfDay, endOfDay } from "date-fns";
import { pt } from "date-fns/locale";
import { Calendar } from "lucide-react";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from "recharts";

interface OpportunitySummaryChartProps {
  isLoading?: boolean;
}

export function OpportunitySummaryChart({ isLoading = false }: OpportunitySummaryChartProps) {
  const { data: opportunities, isLoading: opportunitiesLoading } = useOpportunities();
  const [days] = useState(9);

  const loading = isLoading || opportunitiesLoading;

  const { chartData, dateRange } = useMemo(() => {
    const now = new Date();
    const data = [];
    const endDate = now;
    const startDate = subDays(now, days - 1);

    for (let i = 0; i < days; i++) {
      const date = subDays(now, days - 1 - i);
      const dayStart = startOfDay(date);
      const dayEnd = endOfDay(date);

      const wonValue = opportunities
        ?.filter((o: any) => 
          o.status === "won" && 
          o.updated_at &&
          isWithinInterval(new Date(o.updated_at), { start: dayStart, end: dayEnd })
        )
        .reduce((sum: number, o: any) => sum + (o.value || 0), 0) || 0;

      const lostValue = opportunities
        ?.filter((o: any) => 
          o.status === "lost" && 
          o.updated_at &&
          isWithinInterval(new Date(o.updated_at), { start: dayStart, end: dayEnd })
        )
        .reduce((sum: number, o: any) => sum + (o.value || 0), 0) || 0;

      data.push({
        name: format(date, "d MMM", { locale: pt }),
        won: wonValue,
        lost: lostValue,
      });
    }

    return {
      chartData: data,
      dateRange: `${format(startDate, "d MMM yyyy", { locale: pt })} - ${format(endDate, "d MMM yyyy", { locale: pt })}`,
    };
  }, [opportunities, days]);

  const formatCurrency = (value: number) => {
    if (value >= 1000) return `€${(value / 1000).toFixed(0)}K`;
    return `€${value}`;
  };

  if (loading) {
    return (
      <Card className="border shadow-sm">
        <CardHeader className="pb-3 px-5 pt-5">
          <Skeleton className="h-5 w-40" />
        </CardHeader>
        <CardContent className="px-5 pb-5">
          <Skeleton className="h-64 w-full" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border shadow-sm">
      <CardHeader className="pb-2 px-5 pt-5">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <CardTitle className="text-base font-semibold">Resumo de Oportunidades</CardTitle>
            <span className="text-xs text-muted-foreground">Últimos {days} dias</span>
          </div>
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-1.5">
                <div className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
                <span className="text-xs text-muted-foreground">Ganhas</span>
              </div>
              <div className="flex items-center gap-1.5">
                <div className="w-2.5 h-2.5 rounded-full bg-slate-400" />
                <span className="text-xs text-muted-foreground">Perdidas</span>
              </div>
            </div>
            <Button variant="outline" size="sm" className="h-7 text-xs gap-1.5 text-primary border-primary/30">
              <Calendar className="h-3.5 w-3.5" />
              {dateRange}
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent className="px-5 pb-5">
        <div className="h-64">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={chartData} margin={{ top: 20, right: 20, left: 0, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
              <XAxis
                dataKey="name"
                axisLine={false}
                tickLine={false}
                tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }}
              />
              <YAxis
                axisLine={false}
                tickLine={false}
                tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }}
                tickFormatter={(value) => formatCurrency(value)}
              />
              <Tooltip
                contentStyle={{
                  backgroundColor: "hsl(var(--card))",
                  border: "1px solid hsl(var(--border))",
                  borderRadius: "8px",
                  fontSize: "12px",
                  boxShadow: "0 4px 12px rgba(0,0,0,0.1)",
                }}
                formatter={(value: number, name: string) => [
                  formatCurrency(value),
                  name === "won" ? "Ganhas" : "Perdidas",
                ]}
                labelStyle={{ fontWeight: 600 }}
              />
              <Line
                type="monotone"
                dataKey="won"
                stroke="hsl(142 76% 36%)"
                strokeWidth={2}
                dot={{ r: 4, fill: "hsl(142 76% 36%)", strokeWidth: 0 }}
                activeDot={{ r: 6, fill: "hsl(142 76% 36%)" }}
                name="won"
              />
              <Line
                type="monotone"
                dataKey="lost"
                stroke="hsl(var(--muted-foreground))"
                strokeWidth={2}
                dot={{ r: 4, fill: "hsl(var(--muted-foreground))", strokeWidth: 0 }}
                activeDot={{ r: 6, fill: "hsl(var(--muted-foreground))" }}
                name="lost"
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
}
