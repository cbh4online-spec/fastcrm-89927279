import { useState } from "react";
import { Helmet } from "react-helmet-async";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { useStoreAnalytics } from "@/hooks/useStoreAnalytics";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar } from "recharts";
import { TrendingUp, TrendingDown, DollarSign, ShoppingBag, Package, Clock, ArrowUpRight, ArrowDownRight } from "lucide-react";
import { format, parseISO } from "date-fns";
import { pt } from "date-fns/locale";
import { cn } from "@/lib/utils";

const statusLabels: Record<string, { label: string; variant: "default" | "secondary" | "destructive" | "outline" }> = {
  pending: { label: "Pendente", variant: "outline" },
  paid: { label: "Pago", variant: "default" },
  processing: { label: "Em processamento", variant: "secondary" },
  shipped: { label: "Enviado", variant: "secondary" },
  delivered: { label: "Entregue", variant: "default" },
  cancelled: { label: "Cancelado", variant: "destructive" },
};

export default function StoreAnalyticsPage() {
  const [period, setPeriod] = useState(30);
  const { kpis, dailyRevenue, topProducts, recentOrders } = useStoreAnalytics(period);

  const kpiData = kpis.data;
  const isLoading = kpis.isLoading;

  return (
    <DashboardLayout>
      <Helmet>
        <title>Analytics da Loja | FastCRM</title>
      </Helmet>

      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-foreground">Analytics da Loja</h1>
            <p className="text-muted-foreground text-sm">Métricas de desempenho e vendas</p>
          </div>
          <Select value={String(period)} onValueChange={(v) => setPeriod(Number(v))}>
            <SelectTrigger className="w-[160px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="7">Últimos 7 dias</SelectItem>
              <SelectItem value="30">Últimos 30 dias</SelectItem>
              <SelectItem value="90">Últimos 90 dias</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* KPI Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <KPICard
            title="Receita Total"
            value={kpiData ? `€${kpiData.totalRevenue.toFixed(2)}` : "—"}
            change={kpiData?.revenueChange}
            icon={DollarSign}
            loading={isLoading}
          />
          <KPICard
            title="Encomendas"
            value={kpiData ? String(kpiData.totalOrders) : "—"}
            change={kpiData?.ordersChange}
            icon={ShoppingBag}
            loading={isLoading}
          />
          <KPICard
            title="Ticket Médio"
            value={kpiData ? `€${kpiData.averageOrderValue.toFixed(2)}` : "—"}
            icon={Package}
            loading={isLoading}
          />
          <KPICard
            title="Pendentes"
            value={kpiData ? String(kpiData.pendingOrders) : "—"}
            icon={Clock}
            loading={isLoading}
            neutral
          />
        </div>

        {/* Charts Row */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Revenue Chart */}
          <Card className="lg:col-span-2">
            <CardHeader>
              <CardTitle className="text-base">Receita Diária</CardTitle>
            </CardHeader>
            <CardContent>
              {dailyRevenue.isLoading ? (
                <Skeleton className="h-[300px] w-full" />
              ) : (
                <ResponsiveContainer width="100%" height={300}>
                  <AreaChart data={dailyRevenue.data || []}>
                    <defs>
                      <linearGradient id="revGradient" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.3} />
                        <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                    <XAxis
                      dataKey="date"
                      tickFormatter={(d) => format(parseISO(d), "dd/MM", { locale: pt })}
                      className="text-xs fill-muted-foreground"
                      tick={{ fontSize: 11 }}
                    />
                    <YAxis
                      tickFormatter={(v) => `€${v}`}
                      className="text-xs fill-muted-foreground"
                      tick={{ fontSize: 11 }}
                      width={60}
                    />
                    <Tooltip
                      content={({ active, payload }) => {
                        if (!active || !payload?.length) return null;
                        const d = payload[0].payload;
                        return (
                          <div className="bg-popover border rounded-lg p-3 shadow-lg text-sm">
                            <p className="font-medium">{format(parseISO(d.date), "dd MMMM yyyy", { locale: pt })}</p>
                            <p className="text-primary font-semibold">€{d.revenue.toFixed(2)}</p>
                            <p className="text-muted-foreground">{d.orders} encomenda{d.orders !== 1 ? "s" : ""}</p>
                          </div>
                        );
                      }}
                    />
                    <Area
                      type="monotone"
                      dataKey="revenue"
                      stroke="hsl(var(--primary))"
                      strokeWidth={2}
                      fill="url(#revGradient)"
                    />
                  </AreaChart>
                </ResponsiveContainer>
              )}
            </CardContent>
          </Card>

          {/* Top Products */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Produtos Mais Vendidos</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {topProducts.isLoading ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <div key={i} className="flex items-center gap-3">
                    <Skeleton className="h-10 w-10 rounded" />
                    <div className="flex-1 space-y-1">
                      <Skeleton className="h-3 w-3/4" />
                      <Skeleton className="h-3 w-1/2" />
                    </div>
                  </div>
                ))
              ) : (topProducts.data || []).length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-8">Sem dados de vendas</p>
              ) : (
                (topProducts.data || []).map((p, i) => (
                  <div key={p.productId + i} className="flex items-center gap-3">
                    <div className="relative flex-shrink-0">
                      {p.image ? (
                        <img src={p.image} alt={p.name} className="h-10 w-10 rounded object-cover" />
                      ) : (
                        <div className="h-10 w-10 rounded bg-muted flex items-center justify-center">
                          <Package className="h-4 w-4 text-muted-foreground" />
                        </div>
                      )}
                      <span className="absolute -top-1 -left-1 bg-primary text-primary-foreground text-[10px] font-bold rounded-full h-4 w-4 flex items-center justify-center">
                        {i + 1}
                      </span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{p.name}</p>
                      <p className="text-xs text-muted-foreground">
                        {p.totalQuantity} un. · €{p.totalRevenue.toFixed(2)}
                      </p>
                    </div>
                  </div>
                ))
              )}
            </CardContent>
          </Card>
        </div>

        {/* Recent Orders */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Encomendas Recentes</CardTitle>
          </CardHeader>
          <CardContent>
            {recentOrders.isLoading ? (
              <div className="space-y-3">
                {Array.from({ length: 5 }).map((_, i) => (
                  <Skeleton key={i} className="h-12 w-full" />
                ))}
              </div>
            ) : (recentOrders.data || []).length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-8">Sem encomendas</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b text-left text-muted-foreground">
                      <th className="py-2 pr-4 font-medium">Encomenda</th>
                      <th className="py-2 pr-4 font-medium">Cliente</th>
                      <th className="py-2 pr-4 font-medium">Total</th>
                      <th className="py-2 pr-4 font-medium">Estado</th>
                      <th className="py-2 font-medium">Data</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(recentOrders.data || []).map((order) => {
                      const st = statusLabels[order.status] || { label: order.status, variant: "outline" as const };
                      return (
                        <tr key={order.id} className="border-b last:border-0 hover:bg-muted/50 transition-colors">
                          <td className="py-3 pr-4 font-mono text-xs">{order.order_number}</td>
                          <td className="py-3 pr-4">
                            <p className="font-medium">{order.customer_name || "—"}</p>
                            <p className="text-xs text-muted-foreground">{order.customer_email}</p>
                          </td>
                          <td className="py-3 pr-4 font-semibold">€{order.total.toFixed(2)}</td>
                          <td className="py-3 pr-4">
                            <Badge variant={st.variant} className="text-xs">
                              {st.label}
                            </Badge>
                          </td>
                          <td className="py-3 text-muted-foreground text-xs">
                            {format(new Date(order.created_at), "dd/MM/yy HH:mm", { locale: pt })}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}

function KPICard({
  title,
  value,
  change,
  icon: Icon,
  loading,
  neutral,
}: {
  title: string;
  value: string;
  change?: number;
  icon: React.ComponentType<{ className?: string }>;
  loading?: boolean;
  neutral?: boolean;
}) {
  if (loading) {
    return (
      <Card>
        <CardContent className="p-5">
          <Skeleton className="h-4 w-24 mb-3" />
          <Skeleton className="h-8 w-32" />
        </CardContent>
      </Card>
    );
  }

  const isPositive = (change ?? 0) >= 0;

  return (
    <Card>
      <CardContent className="p-5">
        <div className="flex items-center justify-between mb-2">
          <p className="text-sm text-muted-foreground">{title}</p>
          <div className="h-8 w-8 rounded-lg bg-primary/10 flex items-center justify-center">
            <Icon className="h-4 w-4 text-primary" />
          </div>
        </div>
        <p className="text-2xl font-bold">{value}</p>
        {change !== undefined && !neutral && (
          <div className={cn("flex items-center gap-1 mt-1 text-xs font-medium", isPositive ? "text-primary" : "text-destructive")}>
            {isPositive ? <ArrowUpRight className="h-3 w-3" /> : <ArrowDownRight className="h-3 w-3" />}
            {Math.abs(change).toFixed(1)}% vs período anterior
          </div>
        )}
      </CardContent>
    </Card>
  );
}
