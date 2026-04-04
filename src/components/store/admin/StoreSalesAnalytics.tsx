import { useStoreAnalytics } from "@/hooks/useStoreAnalytics";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import { DollarSign, ShoppingCart, TrendingUp, Users, Package, AlertTriangle } from "lucide-react";
import { useState } from "react";

interface StoreSalesAnalyticsProps {
  workspaceId: string;
}

export function StoreSalesAnalytics({ workspaceId }: StoreSalesAnalyticsProps) {
  const [period, setPeriod] = useState(30);
  const { data, isLoading } = useStoreAnalytics(workspaceId, period);

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

  const kpis = [
    {
      label: "Revenue Total",
      value: `€${data.totalRevenue.toFixed(2)}`,
      icon: DollarSign,
      color: "text-green-600",
      bgColor: "bg-green-50",
    },
    {
      label: "Encomendas",
      value: data.totalOrders.toString(),
      icon: ShoppingCart,
      color: "text-blue-600",
      bgColor: "bg-blue-50",
    },
    {
      label: "AOV",
      value: `€${data.averageOrderValue.toFixed(2)}`,
      icon: TrendingUp,
      color: "text-purple-600",
      bgColor: "bg-purple-50",
      subtitle: "Valor Médio por Encomenda",
    },
    {
      label: "Taxa Conversão",
      value: `${data.conversionRate.toFixed(1)}%`,
      icon: Users,
      color: "text-orange-600",
      bgColor: "bg-orange-50",
      subtitle: "Visitantes → Compras",
    },
  ];

  const recoveryRate = (data.abandonedCarts + data.completedCarts) > 0
    ? (data.completedCarts / (data.abandonedCarts + data.completedCarts) * 100).toFixed(1)
    : "0";

  return (
    <div className="space-y-6">
      {/* Period selector */}
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold">Analytics da Loja</h3>
        <Select value={String(period)} onValueChange={(v) => setPeriod(Number(v))}>
          <SelectTrigger className="w-[140px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="7">Últimos 7 dias</SelectItem>
            <SelectItem value="30">Últimos 30 dias</SelectItem>
            <SelectItem value="90">Últimos 90 dias</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {kpis.map((kpi) => (
          <Card key={kpi.label} className="border shadow-sm">
            <CardContent className="pt-4 pb-4 px-4">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-xs font-medium text-muted-foreground">{kpi.label}</p>
                  <p className="text-2xl font-bold mt-1">{kpi.value}</p>
                  {kpi.subtitle && (
                    <p className="text-[10px] text-muted-foreground mt-0.5">{kpi.subtitle}</p>
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

      {/* Abandoned vs Completed */}
      <div className="grid md:grid-cols-2 gap-4">
        <Card>
          <CardContent className="pt-4 pb-4 px-4 flex items-center gap-4">
            <div className="h-12 w-12 rounded-xl bg-destructive/10 flex items-center justify-center">
              <AlertTriangle className="h-6 w-6 text-destructive" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Carrinhos Abandonados</p>
              <p className="text-xl font-bold">{data.abandonedCarts}</p>
            </div>
            <Badge variant="secondary" className="ml-auto">
              {recoveryRate}% conversão
            </Badge>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 pb-4 px-4 flex items-center gap-4">
            <div className="h-12 w-12 rounded-xl bg-green-50 flex items-center justify-center">
              <Package className="h-6 w-6 text-green-600" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Encomendas Completas</p>
              <p className="text-xl font-bold">{data.completedCarts}</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Revenue Chart */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Receita Diária</CardTitle>
        </CardHeader>
        <CardContent>
          {data.revenueByDay.length > 0 ? (
            <ResponsiveContainer width="100%" height={280}>
              <LineChart data={data.revenueByDay}>
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
          {data.topProducts.length > 0 ? (
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={data.topProducts} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                <XAxis type="number" tick={{ fontSize: 11 }} />
                <YAxis type="category" dataKey="name" width={120} tick={{ fontSize: 11 }} />
                <Tooltip
                  formatter={(value: number) => [`€${value.toFixed(2)}`, "Receita"]}
                  contentStyle={{ borderRadius: "8px", border: "1px solid hsl(var(--border))" }}
                />
                <Bar dataKey="revenue" fill="hsl(var(--primary))" radius={[0, 4, 4, 0]} />
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
