import { useWorkspace } from "@/contexts/WorkspaceContext";
import { useSellerAnalytics } from "@/hooks/useSellerAnalytics";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import {
  TrendingUp, DollarSign, ShoppingBag, Star, Zap, Package, BarChart3, Loader2
} from "lucide-react";

export default function C2CSellerDashboard() {
  const { currentWorkspace } = useWorkspace();
  const { data: analytics, isLoading, error } = useSellerAnalytics(currentWorkspace?.id);

  if (isLoading) {
    return (
      <div className="p-8 flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (error || !analytics) {
    return (
      <div className="p-8 text-center text-muted-foreground">
        <p>Não foi possível carregar analytics. Verifica se és um vendedor aprovado.</p>
      </div>
    );
  }

  const kpis = [
    { label: "Vendas Totais", value: analytics.totalSales, icon: ShoppingBag, color: "text-blue-600" },
    { label: "Receita Total", value: `${analytics.totalRevenue.toFixed(2)}€`, icon: DollarSign, color: "text-green-600" },
    { label: "Ganhos Líquidos", value: `${analytics.sellerEarnings.toFixed(2)}€`, icon: TrendingUp, color: "text-emerald-600" },
    { label: "Comissões Pagas", value: `${analytics.totalCommissions.toFixed(2)}€`, icon: BarChart3, color: "text-orange-600" },
    { label: "Rating Médio", value: analytics.avgRating > 0 ? `${analytics.avgRating.toFixed(1)} ⭐` : "—", icon: Star, color: "text-amber-600" },
    { label: "Avaliações", value: analytics.totalReviews, icon: Star, color: "text-purple-600" },
  ];

  return (
    <div className="p-6 max-w-6xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">
            {analytics.isSuperAdminView ? "Analytics do Marketplace" : "Dashboard do Vendedor"}
          </h1>
          <p className="text-muted-foreground">
            {analytics.isSuperAdminView
              ? `Visão agregada de ${analytics.totalSellers || 0} vendedores`
              : "Visão geral da tua performance no marketplace"}
          </p>
        </div>
        <div className="flex gap-2">
          <Badge variant="outline" className="gap-1">
            <Package className="h-3 w-3" /> {analytics.activeListings} ativos
          </Badge>
          <Badge variant="outline" className="gap-1">
            <ShoppingBag className="h-3 w-3" /> {analytics.soldListings} vendidos
          </Badge>
          {analytics.activeBoosts > 0 && (
            <Badge className="gap-1 bg-amber-500">
              <Zap className="h-3 w-3" /> {analytics.activeBoosts} boost(s)
            </Badge>
          )}
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
        {kpis.map((kpi) => {
          const Icon = kpi.icon;
          return (
            <Card key={kpi.label}>
              <CardContent className="pt-4 pb-3 px-4">
                <div className="flex items-center gap-2 mb-1">
                  <Icon className={`h-4 w-4 ${kpi.color}`} />
                  <span className="text-xs text-muted-foreground">{kpi.label}</span>
                </div>
                <p className="text-xl font-bold">{kpi.value}</p>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Monthly Sales Chart */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Vendas Mensais (últimos 6 meses)</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={analytics.monthlySales}>
                <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
                <XAxis dataKey="month" className="text-xs" />
                <YAxis className="text-xs" />
                <Tooltip
                  formatter={(value: number, name: string) =>
                    name === "revenue" ? [`${value.toFixed(2)}€`, "Receita"] : [value, "Vendas"]
                  }
                />
                <Bar dataKey="sales" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} name="Vendas" />
                <Bar dataKey="revenue" fill="hsl(var(--primary) / 0.4)" radius={[4, 4, 0, 0]} name="Receita" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
