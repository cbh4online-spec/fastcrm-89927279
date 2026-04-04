import { useStoreAnalytics } from "@/hooks/useStoreAnalytics";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import { DollarSign, ShoppingCart, TrendingUp, Users, Package, AlertTriangle, ArrowUp, ArrowDown } from "lucide-react";

interface StoreSalesAnalyticsProps {
  workspaceId: string;
}

export function StoreSalesAnalytics({ workspaceId }: StoreSalesAnalyticsProps) {
  const analytics = useStoreAnalytics();

  const { kpis, dailyRevenue, topProducts, checkoutFunnel } = analytics;

  const kpisData = kpis.data;
  const isLoading = kpis.isLoading;

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map((i) => (
            <Skeleton key={i} className="h-28 rounded-xl" />
          ))}
        </div>
        <Skeleton className="h-[300px] rounded-xl" />
      </div>
    );
  }

  const kpiCards = [
    {
      label: "Revenue Total",
      value: `€${(kpisData?.totalRevenue ?? 0).toFixed(2)}`,
      change: kpisData?.revenueChange,
      icon: DollarSign,
      color: "text-green-600",
      bgColor: "bg-green-50",
    },
    {
      label: "Encomendas",
      value: String(kpisData?.totalOrders ?? 0),
      change: kpisData?.ordersChange,
      icon: ShoppingCart,
      color: "text-blue-600",
      bgColor: "bg-blue-50",
    },
    {
      label: "AOV",
      value: `€${(kpisData?.averageOrderValue ?? 0).toFixed(2)}`,
      icon: TrendingUp,
      color: "text-purple-600",
      bgColor: "bg-purple-50",
    },
    {
      label: "Taxa Conversão",
      value: `${(kpisData?.conversionRate ?? 0).toFixed(1)}%`,
      icon: Users,
      color: "text-orange-600",
      bgColor: "bg-orange-50",
    },
  ];

  const funnelData = checkoutFunnel.data;

  return (
    <div className="space-y-6">
      <h3 className="text-lg font-semibold">Analytics da Loja</h3>

      {/* KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {kpiCards.map((kpi) => (
          <Card key={kpi.label} className="border shadow-sm">
            <CardContent className="pt-4 pb-4 px-4">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-xs font-medium text-muted-foreground">{kpi.label}</p>
                  <p className="text-2xl font-bold mt-1">{kpi.value}</p>
                  {kpi.change != null && kpi.change !== 0 && (
                    <div className={`flex items-center gap-0.5 text-xs mt-1 ${kpi.change > 0 ? "text-green-600" : "text-destructive"}`}>
                      {kpi.change > 0 ? <ArrowUp className="h-3 w-3" /> : <ArrowDown className="h-3 w-3" />}
                      {Math.abs(kpi.change).toFixed(1)}%
                    </div>
                  )}
                </div>
                <div className={`h-9 w-9 rounded-lg ${kpi.bgColor} flex items-center justify-center`}>
                  <kpi.icon className={`h-4 w-4 ${kpi.color}`} />
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Funnel */}
      {funnelData && (
        <div className="grid md:grid-cols-4 gap-4">
          <Card>
            <CardContent className="pt-4 pb-4 text-center">
              <p className="text-xl font-bold">{funnelData.pageViews}</p>
              <p className="text-xs text-muted-foreground">Visitas</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4 pb-4 text-center">
              <p className="text-xl font-bold">{funnelData.checkoutsStarted}</p>
              <p className="text-xs text-muted-foreground">Checkouts</p>
              <p className="text-[10px] text-muted-foreground">{funnelData.cartToCheckoutRate.toFixed(1)}% do carrinho</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4 pb-4 text-center">
              <p className="text-xl font-bold">{funnelData.ordersPaid}</p>
              <p className="text-xs text-muted-foreground">Pagos</p>
              <p className="text-[10px] text-muted-foreground">{funnelData.checkoutToPayRate.toFixed(1)}% do checkout</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4 pb-4 text-center">
              <p className="text-xl font-bold">{funnelData.overallConversion.toFixed(1)}%</p>
              <p className="text-xs text-muted-foreground">Conversão Global</p>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Revenue Chart */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Receita Diária</CardTitle>
        </CardHeader>
        <CardContent>
          {dailyRevenue.data && dailyRevenue.data.length > 0 ? (
            <ResponsiveContainer width="100%" height={280}>
              <LineChart data={dailyRevenue.data}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                <XAxis dataKey="date" tick={{ fontSize: 11 }} className="text-muted-foreground" />
                <YAxis tick={{ fontSize: 11 }} className="text-muted-foreground" />
                <Tooltip
                  formatter={(value: number) => [`€${value.toFixed(2)}`, "Receita"]}
                  contentStyle={{ borderRadius: "8px", border: "1px solid hsl(var(--border))" }}
                />
                <Line type="monotone" dataKey="revenue" stroke="hsl(var(--primary))" strokeWidth={2} dot={false} />
              </LineChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-[280px] flex items-center justify-center text-muted-foreground text-sm">
              Sem dados para o período selecionado
            </div>
          )}
        </CardContent>
      </Card>

      {/* Top Products */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Top Produtos por Receita</CardTitle>
        </CardHeader>
        <CardContent>
          {topProducts.data && topProducts.data.length > 0 ? (
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={topProducts.data.slice(0, 10)} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                <XAxis type="number" tick={{ fontSize: 11 }} />
                <YAxis type="category" dataKey="name" width={120} tick={{ fontSize: 11 }} />
                <Tooltip
                  formatter={(value: number) => [`€${value.toFixed(2)}`, "Receita"]}
                  contentStyle={{ borderRadius: "8px", border: "1px solid hsl(var(--border))" }}
                />
                <Bar dataKey="totalRevenue" fill="hsl(var(--primary))" radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-[200px] flex items-center justify-center text-muted-foreground text-sm">
              Sem vendas no período selecionado
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
