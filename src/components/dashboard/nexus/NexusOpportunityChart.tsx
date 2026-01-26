import { NexusSummaryCard } from "./NexusSummaryCard";
import { useOpportunities } from "@/hooks/useOpportunities";
import { useMemo } from "react";
import { format, differenceInDays, addDays, isWithinInterval, startOfDay, endOfDay } from "date-fns";
import { pt } from "date-fns/locale";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";

interface NexusOpportunityChartProps {
  isLoading?: boolean;
  periodStart?: Date;
  periodEnd?: Date;
  onDateChange?: (start: Date, end: Date) => void;
}

export function NexusOpportunityChart({ 
  isLoading = false, 
  periodStart,
  periodEnd,
  onDateChange,
}: NexusOpportunityChartProps) {
  const { data: opportunities, isLoading: opportunitiesLoading } = useOpportunities();

  const loading = isLoading || opportunitiesLoading;

  const { chartData, dateRange, summaryItems, periodLabel } = useMemo(() => {
    const now = new Date();
    const startDate = periodStart || addDays(now, -13);
    const endDate = periodEnd || now;
    const days = Math.max(1, differenceInDays(endDate, startDate) + 1);
    
    const data = [];
    let totalWon = 0;
    let totalLost = 0;

    // Determine if we should group by day or by week/month based on period length
    const groupByWeek = days > 31;
    const groupByMonth = days > 90;

    if (groupByMonth) {
      // Group by month for longer periods
      const monthsMap = new Map<string, { won: number; lost: number; label: string }>();
      
      opportunities?.forEach((o: any) => {
        if (!o.updated_at) return;
        const updateDate = new Date(o.updated_at);
        if (!isWithinInterval(updateDate, { start: startOfDay(startDate), end: endOfDay(endDate) })) return;
        
        const monthKey = format(updateDate, "yyyy-MM");
        const monthLabel = format(updateDate, "MMM yyyy", { locale: pt });
        
        if (!monthsMap.has(monthKey)) {
          monthsMap.set(monthKey, { won: 0, lost: 0, label: monthLabel });
        }
        
        const entry = monthsMap.get(monthKey)!;
        if (o.status === "won") {
          entry.won += o.value || 0;
          totalWon += o.value || 0;
        } else if (o.status === "lost") {
          entry.lost += o.value || 0;
          totalLost += o.value || 0;
        }
      });

      // Convert to array and sort
      Array.from(monthsMap.entries())
        .sort(([a], [b]) => a.localeCompare(b))
        .forEach(([_, value]) => {
          data.push({ name: value.label, won: value.won, lost: value.lost });
        });
    } else if (groupByWeek) {
      // Group by week for medium periods
      const weeksMap = new Map<string, { won: number; lost: number; label: string }>();
      
      opportunities?.forEach((o: any) => {
        if (!o.updated_at) return;
        const updateDate = new Date(o.updated_at);
        if (!isWithinInterval(updateDate, { start: startOfDay(startDate), end: endOfDay(endDate) })) return;
        
        const weekKey = format(updateDate, "yyyy-'W'ww");
        const weekLabel = `Sem ${format(updateDate, "w", { locale: pt })}`;
        
        if (!weeksMap.has(weekKey)) {
          weeksMap.set(weekKey, { won: 0, lost: 0, label: weekLabel });
        }
        
        const entry = weeksMap.get(weekKey)!;
        if (o.status === "won") {
          entry.won += o.value || 0;
          totalWon += o.value || 0;
        } else if (o.status === "lost") {
          entry.lost += o.value || 0;
          totalLost += o.value || 0;
        }
      });

      Array.from(weeksMap.entries())
        .sort(([a], [b]) => a.localeCompare(b))
        .forEach(([_, value]) => {
          data.push({ name: value.label, won: value.won, lost: value.lost });
        });
    } else {
      // Daily granularity for short periods
      for (let i = 0; i < days; i++) {
        const date = addDays(startDate, i);
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

        totalWon += wonValue;
        totalLost += lostValue;

        data.push({
          name: format(date, "d MMM", { locale: pt }),
          won: wonValue,
          lost: lostValue,
        });
      }
    }

    const formatCurrency = (value: number) => {
      if (value >= 1000000) return `€${(value / 1000000).toFixed(1)}M`;
      if (value >= 1000) return `€${(value / 1000).toFixed(1)}K`;
      return `€${value}`;
    };

    // Determine period label
    let label = `${days} dias`;
    if (days === 7) label = "7 dias";
    else if (days === 30 || days === 31) label = "30 dias";
    else if (days > 300) label = "Ano";

    return {
      chartData: data,
      dateRange: `${format(startDate, "d MMM", { locale: pt })} - ${format(endDate, "d MMM yyyy", { locale: pt })}`,
      summaryItems: [
        { label: "Ganhas", value: formatCurrency(totalWon), color: "hsl(142 76% 36%)" },
        { label: "Perdidas", value: formatCurrency(totalLost), color: "hsl(var(--muted-foreground))" },
      ],
      periodLabel: label,
    };
  }, [opportunities, periodStart, periodEnd]);

  const formatCurrency = (value: number) => {
    if (value >= 1000) return `€${(value / 1000).toFixed(0)}K`;
    return `€${value}`;
  };

  return (
    <NexusSummaryCard
      title="Resumo de Oportunidades"
      subtitle={periodLabel}
      dateRange={dateRange}
      items={summaryItems}
      isLoading={loading}
      onDateChange={onDateChange}
      periodStart={periodStart}
      periodEnd={periodEnd}
    >
      <div className="h-64 mt-2">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={chartData} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
            <defs>
              <linearGradient id="nexus-won-gradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="hsl(142 76% 36%)" stopOpacity={0.3} />
                <stop offset="100%" stopColor="hsl(142 76% 36%)" stopOpacity={0} />
              </linearGradient>
              <linearGradient id="nexus-lost-gradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="hsl(var(--muted-foreground))" stopOpacity={0.2} />
                <stop offset="100%" stopColor="hsl(var(--muted-foreground))" stopOpacity={0} />
              </linearGradient>
            </defs>
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
                borderRadius: "12px",
                fontSize: "12px",
                boxShadow: "0 4px 20px rgba(0,0,0,0.1)",
              }}
              formatter={(value: number, name: string) => [
                formatCurrency(value),
                name === "won" ? "Ganhas" : "Perdidas",
              ]}
              labelStyle={{ fontWeight: 600 }}
            />
            <Area
              type="monotone"
              dataKey="won"
              stroke="hsl(142 76% 36%)"
              strokeWidth={2}
              fill="url(#nexus-won-gradient)"
            />
            <Area
              type="monotone"
              dataKey="lost"
              stroke="hsl(var(--muted-foreground))"
              strokeWidth={2}
              fill="url(#nexus-lost-gradient)"
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </NexusSummaryCard>
  );
}
