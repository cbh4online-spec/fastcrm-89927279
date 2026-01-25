import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useInvoices } from "@/hooks/useInvoices";
import { useMemo } from "react";
import { format, startOfWeek, endOfWeek, subDays, isWithinInterval, eachDayOfInterval } from "date-fns";
import { pt } from "date-fns/locale";
import { Calendar } from "lucide-react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";

interface WeeklySalesChartProps {
  isLoading?: boolean;
}

export function WeeklySalesChart({ isLoading = false }: WeeklySalesChartProps) {
  const { data: paidInvoices, isLoading: invoicesLoading } = useInvoices({ status: "paid" });

  const loading = isLoading || invoicesLoading;

  const { chartData, dateRange } = useMemo(() => {
    const now = new Date();
    const weekStart = startOfWeek(now, { weekStartsOn: 1 });
    const weekEnd = endOfWeek(now, { weekStartsOn: 1 });
    const days = eachDayOfInterval({ start: weekStart, end: weekEnd });

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

      return {
        name: format(day, "EEE", { locale: pt }).replace(".", ""),
        value: dayValue,
      };
    });

    return {
      chartData: data,
      dateRange: `${format(weekStart, "dd/MM/yyyy")} - ${format(weekEnd, "dd/MM/yyyy")}`,
    };
  }, [paidInvoices]);

  const formatCurrency = (value: number) => {
    return `€${value}`;
  };

  if (loading) {
    return (
      <Card className="border shadow-sm">
        <CardHeader className="pb-3 px-5 pt-5">
          <Skeleton className="h-5 w-32" />
        </CardHeader>
        <CardContent className="px-5 pb-5">
          <Skeleton className="h-48 w-full" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border shadow-sm">
      <CardHeader className="pb-2 px-5 pt-5">
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-base font-semibold">Resumo de Vendas</CardTitle>
            <p className="text-xs text-muted-foreground">Esta semana</p>
          </div>
          <Button variant="outline" size="sm" className="h-7 text-xs gap-1.5 text-primary border-primary/30">
            <Calendar className="h-3.5 w-3.5" />
            {dateRange}
          </Button>
        </div>
      </CardHeader>
      <CardContent className="px-5 pb-5">
        <div className="h-48">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={chartData} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
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
                tickFormatter={(value) => `€${value}`}
              />
              <Tooltip
                contentStyle={{
                  backgroundColor: "hsl(var(--card))",
                  border: "1px solid hsl(var(--border))",
                  borderRadius: "8px",
                  fontSize: "12px",
                }}
                formatter={(value: number) => [formatCurrency(value), "Vendas"]}
              />
              <Bar
                dataKey="value"
                fill="hsl(271 91% 65%)"
                radius={[4, 4, 0, 0]}
                barSize={32}
              />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
}
