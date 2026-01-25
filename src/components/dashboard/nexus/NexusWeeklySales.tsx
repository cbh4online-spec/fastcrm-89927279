import { NexusSummaryCard } from "./NexusSummaryCard";
import { useInvoices } from "@/hooks/useInvoices";
import { useMemo } from "react";
import { format, startOfWeek, endOfWeek, eachDayOfInterval } from "date-fns";
import { pt } from "date-fns/locale";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";

interface NexusWeeklySalesProps {
  isLoading?: boolean;
}

export function NexusWeeklySales({ isLoading = false }: NexusWeeklySalesProps) {
  const { data: paidInvoices, isLoading: invoicesLoading } = useInvoices({ status: "paid" });

  const loading = isLoading || invoicesLoading;

  const { chartData, dateRange, summaryItems } = useMemo(() => {
    const now = new Date();
    const weekStart = startOfWeek(now, { weekStartsOn: 1 });
    const weekEnd = endOfWeek(now, { weekStartsOn: 1 });
    const days = eachDayOfInterval({ start: weekStart, end: weekEnd });

    let totalWeek = 0;
    let maxDay = 0;

    const data = days.map((day) => {
      const dayValue = paidInvoices
        ?.filter((inv: any) => {
          if (!inv.paid_at) return false;
          const paidDate = new Date(inv.paid_at);
          return (
            paidDate.getDate() === day.getDate() &&
            paidDate.getMonth() === day.getMonth() &&
            paidDate.getFullYear() === day.getFullYear()
          );
        })
        .reduce((sum: number, inv: any) => sum + (inv.total || 0), 0) || 0;

      totalWeek += dayValue;
      if (dayValue > maxDay) maxDay = dayValue;

      return {
        name: format(day, "EEE", { locale: pt }).replace(".", "").toUpperCase(),
        value: dayValue,
        fullDate: format(day, "d MMM", { locale: pt }),
      };
    });

    const formatCurrency = (value: number) => {
      if (value >= 1000) return `€${(value / 1000).toFixed(1)}K`;
      return `€${value}`;
    };

    return {
      chartData: data,
      dateRange: `${format(weekStart, "dd/MM")} - ${format(weekEnd, "dd/MM")}`,
      summaryItems: [
        { label: "Total Semana", value: formatCurrency(totalWeek) },
        { label: "Melhor Dia", value: formatCurrency(maxDay) },
      ],
    };
  }, [paidInvoices]);

  const formatCurrency = (value: number) => {
    return `€${value}`;
  };

  return (
    <NexusSummaryCard
      title="Vendas da Semana"
      dateRange={dateRange}
      items={summaryItems}
      isLoading={loading}
    >
      <div className="h-48 mt-2">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={chartData} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
            <defs>
              <linearGradient id="nexus-bar-gradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="hsl(271 91% 65%)" stopOpacity={1} />
                <stop offset="100%" stopColor="hsl(271 91% 65%)" stopOpacity={0.6} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
            <XAxis
              dataKey="name"
              axisLine={false}
              tickLine={false}
              tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }}
            />
            <YAxis
              axisLine={false}
              tickLine={false}
              tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }}
              tickFormatter={(value) => `€${value}`}
            />
            <Tooltip
              contentStyle={{
                backgroundColor: "hsl(var(--card))",
                border: "1px solid hsl(var(--border))",
                borderRadius: "12px",
                fontSize: "12px",
                boxShadow: "0 4px 20px rgba(0,0,0,0.1)",
              }}
              formatter={(value: number) => [formatCurrency(value), "Vendas"]}
              labelFormatter={(_, payload) => payload[0]?.payload?.fullDate || ""}
            />
            <Bar
              dataKey="value"
              fill="url(#nexus-bar-gradient)"
              radius={[6, 6, 0, 0]}
              barSize={28}
            />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </NexusSummaryCard>
  );
}
