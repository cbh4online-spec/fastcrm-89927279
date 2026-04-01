import { motion } from "framer-motion";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  ComposedChart, Line, Legend,
} from "recharts";
import { DollarSign, ShoppingBag, Package, ShoppingCart, Percent, Users } from "lucide-react";
import { format, parseISO } from "date-fns";
import { pt } from "date-fns/locale";
import { KPICard } from "./KPICard";
import { DualTooltip, fadeIn, statusLabels } from "./AnalyticsChartHelpers";

interface StoreOverviewTabProps {
  kpiData: any;
  isLoading: boolean;
  dailyRevenue: { data: any[] | undefined; isLoading: boolean };
  topProducts: { data: any[] | undefined; isLoading: boolean };
  recentOrders: { data: any[] | undefined; isLoading: boolean };
}

export function StoreOverviewTab({ kpiData, isLoading, dailyRevenue, topProducts, recentOrders }: StoreOverviewTabProps) {
  return (
    <div className="space-y-6">
      <motion.div {...fadeIn} className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
        <KPICard title="Receita" value={kpiData ? `€${kpiData.totalRevenue.toFixed(2)}` : "—"} change={kpiData?.revenueChange} icon={DollarSign} loading={isLoading} />
        <KPICard title="Encomendas" value={kpiData ? String(kpiData.totalOrders) : "—"} change={kpiData?.ordersChange} icon={ShoppingBag} loading={isLoading} />
        <KPICard title="Unidades" value={kpiData ? String(kpiData.totalUnits) : "—"} icon={Package} loading={isLoading} />
        <KPICard title="Ticket Médio" value={kpiData ? `€${kpiData.averageOrderValue.toFixed(2)}` : "—"} icon={ShoppingCart} loading={isLoading} />
        <KPICard title="Conversão" value={kpiData ? `${kpiData.conversionRate.toFixed(1)}%` : "—"} icon={Percent} loading={isLoading} />
        <KPICard title="Clientes" value={kpiData ? String(kpiData.uniqueCustomers) : "—"} icon={Users} loading={isLoading} />
      </motion.div>

      <motion.div {...fadeIn} transition={{ delay: 0.1 }}>
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Receita & Encomendas</CardTitle>
          </CardHeader>
          <CardContent>
            {dailyRevenue.isLoading ? (
              <Skeleton className="h-[320px] w-full" />
            ) : (
              <ResponsiveContainer width="100%" height={320}>
                <ComposedChart data={dailyRevenue.data || []}>
                  <defs>
                    <linearGradient id="revGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.25} />
                      <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                  <XAxis dataKey="date" tickFormatter={(d) => format(parseISO(d), "dd/MM")} tick={{ fontSize: 11 }} className="fill-muted-foreground" />
                  <YAxis yAxisId="revenue" tickFormatter={(v) => `€${v}`} tick={{ fontSize: 11 }} className="fill-muted-foreground" width={65} />
                  <YAxis yAxisId="orders" orientation="right" tick={{ fontSize: 11 }} className="fill-muted-foreground" width={40} />
                  <Tooltip content={<DualTooltip />} />
                  <Legend />
                  <Area yAxisId="revenue" type="monotone" dataKey="revenue" name="Receita" stroke="hsl(var(--primary))" strokeWidth={2} fill="url(#revGrad)" />
                  <Line yAxisId="orders" type="monotone" dataKey="orders" name="Encomendas" stroke="hsl(var(--warning))" strokeWidth={2} dot={false} />
                </ComposedChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>
      </motion.div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <motion.div {...fadeIn} transition={{ delay: 0.15 }}>
          <Card className="h-full">
            <CardHeader>
              <CardTitle className="text-base">Top Produtos</CardTitle>
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
                <p className="text-sm text-muted-foreground text-center py-8">Sem dados</p>
              ) : (
                (topProducts.data || []).slice(0, 5).map((p: any, i: number) => (
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
        </motion.div>

        <motion.div {...fadeIn} transition={{ delay: 0.2 }} className="lg:col-span-2">
          <Card className="h-full">
            <CardHeader>
              <CardTitle className="text-base">Encomendas Recentes</CardTitle>
            </CardHeader>
            <CardContent>
              <RecentOrdersTable orders={recentOrders.data || []} isLoading={recentOrders.isLoading} />
            </CardContent>
          </Card>
        </motion.div>
      </div>
    </div>
  );
}

function RecentOrdersTable({ orders, isLoading }: { orders: any[]; isLoading: boolean }) {
  if (isLoading) {
    return <div className="space-y-3">{Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-12 w-full" />)}</div>;
  }
  if (orders.length === 0) {
    return <p className="text-sm text-muted-foreground text-center py-8">Sem encomendas</p>;
  }
  return (
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
          {orders.map((order: any) => {
            const st = statusLabels[order.status] || { label: order.status, variant: "outline" as const };
            return (
              <tr key={order.id} className="border-b last:border-0 hover:bg-muted/50 transition-colors">
                <td className="py-3 pr-4 font-mono text-xs">{order.order_number}</td>
                <td className="py-3 pr-4">
                  <p className="font-medium">{order.customer_name || "—"}</p>
                  <p className="text-xs text-muted-foreground">{order.customer_email}</p>
                </td>
                <td className="py-3 pr-4 font-semibold">€{order.total?.toFixed(2)}</td>
                <td className="py-3 pr-4">
                  <Badge variant={st.variant} className="text-xs">{st.label}</Badge>
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
  );
}
