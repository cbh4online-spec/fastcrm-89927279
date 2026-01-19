import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useState, useMemo } from "react";
import {
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Area,
  AreaChart,
} from "recharts";
import { TrendingUp, TrendingDown, BarChart3 } from "lucide-react";
import { useInvoices } from "@/hooks/useInvoices";
import { useOpportunities } from "@/hooks/useOpportunities";
import { format, subMonths, startOfMonth, endOfMonth, isWithinInterval, subDays, startOfYear } from "date-fns";
import { pt } from "date-fns/locale";

interface RevenueWidgetProps {
  isLoading?: boolean;
}

export function RevenueWidget({ isLoading = false }: RevenueWidgetProps) {
  const [period, setPeriod] = useState("last-6-months");
  const { data: paidInvoices, isLoading: paidLoading } = useInvoices({ status: "paid" });
  const { data: allInvoices, isLoading: allLoading } = useInvoices();
  const { data: opportunities, isLoading: opportunitiesLoading } = useOpportunities();

  const formatCurrency = (value: number) => {
    if (value >= 1000000) return `€${(value / 1000000).toFixed(1)}M`;
    if (value >= 1000) return `€${(value / 1000).toFixed(0)}K`;
    return `€${value.toFixed(2)}`;
  };

  const { data, totalRevenue, pendingRevenue, totalSales, growthPercent } = useMemo(() => {
    const now = new Date();
    let months: Date[] = [];
    let previousStart: Date;
    let previousEnd: Date;
    
    if (period === "this-month") {
      months = [now];
      previousStart = startOfMonth(subMonths(now, 1));
      previousEnd = endOfMonth(subMonths(now, 1));
    } else if (period === "last-6-months") {
      months = Array.from({ length: 6 }, (_, i) => subMonths(now, 5 - i));
      previousStart = startOfMonth(subMonths(now, 11));
      previousEnd = endOfMonth(subMonths(now, 6));
    } else {
      // this-year
      const monthCount = now.getMonth() + 1;
      months = Array.from({ length: monthCount }, (_, i) => new Date(now.getFullYear(), i, 1));
      previousStart = startOfYear(subMonths(now, 12));
      previousEnd = endOfMonth(subMonths(startOfYear(now), 1));
    }

    const paid = paidInvoices || [];
    const all = allInvoices || [];
    const pending = all.filter(inv => inv.status === "sent" || inv.status === "draft" || inv.status === "overdue");
    const wonOpportunities = (opportunities || []).filter(o => o.status === "won");

    const chartData = months.map(month => {
      const monthStart = startOfMonth(month);
      const monthEnd = endOfMonth(month);
      
      // Revenue from paid invoices
      const monthRevenue = paid
        .filter(inv => inv.paid_at && isWithinInterval(new Date(inv.paid_at), { start: monthStart, end: monthEnd }))
        .reduce((sum, inv) => sum + (inv.total || 0), 0);
      
      // Pending revenue (sent/draft invoices by issue date)
      const monthPending = pending
        .filter(inv => inv.issue_date && isWithinInterval(new Date(inv.issue_date), { start: monthStart, end: monthEnd }))
        .reduce((sum, inv) => sum + (inv.total || 0), 0);
      
      // Sales from won opportunities
      const monthSales = wonOpportunities
        .filter(opp => opp.updated_at && isWithinInterval(new Date(opp.updated_at), { start: monthStart, end: monthEnd }))
        .reduce((sum, opp) => sum + (opp.value || 0), 0);

      return {
        name: format(month, "MMM", { locale: pt }),
        revenue: monthRevenue,
        pending: monthPending,
        sales: monthSales,
      };
    });

    const totalRev = chartData.reduce((sum, item) => sum + item.revenue, 0);
    const totalPending = chartData.reduce((sum, item) => sum + item.pending, 0);
    const totalSls = chartData.reduce((sum, item) => sum + item.sales, 0);
    
    const prevRevenue = paid
      .filter(inv => inv.paid_at && isWithinInterval(new Date(inv.paid_at), { start: previousStart, end: previousEnd }))
      .reduce((sum, inv) => sum + (inv.total || 0), 0);

    const growth = prevRevenue > 0 ? Math.round(((totalRev - prevRevenue) / prevRevenue) * 100) : (totalRev > 0 ? 100 : 0);

    return {
      data: chartData,
      totalRevenue: totalRev,
      pendingRevenue: totalPending,
      totalSales: totalSls,
      growthPercent: growth,
    };
  }, [paidInvoices, allInvoices, opportunities, period]);

  const loading = isLoading || paidLoading || allLoading || opportunitiesLoading;

  if (loading) {
    return (
      <Card className="border-0 shadow-lg">
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <Skeleton className="h-5 w-24" />
            <Skeleton className="h-8 w-32" />
          </div>
        </CardHeader>
        <CardContent>
          <Skeleton className="h-48 w-full" />
        </CardContent>
      </Card>
    );
  }

  if (data.every(d => d.revenue === 0 && d.pending === 0 && d.sales === 0)) {
    return (
      <Card className="border-0 shadow-lg bg-card">
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <CardTitle className="text-base font-semibold">Receita</CardTitle>
            <Select value={period} onValueChange={setPeriod}>
              <SelectTrigger className="w-[140px] h-8 text-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="this-month">Este mês</SelectItem>
                <SelectItem value="last-6-months">Últimos 6 meses</SelectItem>
                <SelectItem value="this-year">Este ano</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <BarChart3 className="w-10 h-10 text-muted-foreground/30 mb-3" />
            <p className="text-sm text-muted-foreground">Sem dados de receita</p>
            <p className="text-xs text-muted-foreground/70 mt-1">Os dados aparecerão aqui</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border-0 shadow-lg bg-card">
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base font-semibold">Receita</CardTitle>
          <Select value={period} onValueChange={setPeriod}>
            <SelectTrigger className="w-[140px] h-8 text-xs">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="this-month">Este mês</SelectItem>
              <SelectItem value="last-6-months">Últimos 6 meses</SelectItem>
              <SelectItem value="this-year">Este ano</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </CardHeader>
      <CardContent className="pt-0">
        {/* Summary Stats */}
        <div className="flex items-center gap-6 mb-4">
          <div>
            <p className="text-2xl font-bold">{formatCurrency(totalRevenue)}</p>
            <div className="flex items-center gap-1 text-xs">
              {growthPercent >= 0 ? (
                <>
                  <TrendingUp className="w-3 h-3 text-emerald-500" />
                  <span className="text-emerald-500">+{growthPercent}%</span>
                </>
              ) : (
                <>
                  <TrendingDown className="w-3 h-3 text-red-500" />
                  <span className="text-red-500">{growthPercent}%</span>
                </>
              )}
              <span className="text-muted-foreground">recebido</span>
            </div>
          </div>
          {pendingRevenue > 0 && (
            <div className="border-l pl-4 border-border">
              <p className="text-lg font-semibold text-amber-600">{formatCurrency(pendingRevenue)}</p>
              <p className="text-xs text-muted-foreground">pendente</p>
            </div>
          )}
        </div>

        {/* Chart */}
        <div className="h-40">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={data} margin={{ top: 5, right: 5, left: -20, bottom: 0 }}>
              <defs>
                <linearGradient id="revenueGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0} />
                </linearGradient>
                <linearGradient id="salesGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="hsl(142 76% 36%)" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="hsl(142 76% 36%)" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
              <XAxis 
                dataKey="name" 
                axisLine={false} 
                tickLine={false} 
                tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }}
              />
              <YAxis 
                axisLine={false} 
                tickLine={false} 
                tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }}
                tickFormatter={(value) => formatCurrency(value)}
              />
              <Tooltip 
                contentStyle={{ 
                  backgroundColor: 'hsl(var(--card))',
                  border: '1px solid hsl(var(--border))',
                  borderRadius: '8px',
                  fontSize: '12px'
                }}
                formatter={(value: number) => [formatCurrency(value), '']}
              />
              <Area
                type="monotone"
                dataKey="revenue"
                stroke="hsl(var(--primary))"
                strokeWidth={2}
                fill="url(#revenueGradient)"
                name="Receita"
              />
              <Area
                type="monotone"
                dataKey="sales"
                stroke="hsl(142 76% 36%)"
                strokeWidth={2}
                fill="url(#salesGradient)"
                name="Vendas"
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        {/* Legend */}
        <div className="flex items-center justify-center gap-4 mt-3">
          <div className="flex items-center gap-1.5">
            <div className="w-2.5 h-2.5 rounded-full bg-primary" />
            <span className="text-xs text-muted-foreground">Receita</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
            <span className="text-xs text-muted-foreground">Vendas</span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
