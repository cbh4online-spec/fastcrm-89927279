import { useWorkspace } from "@/contexts/WorkspaceContext";
import { useMarketplaceKPIs, useWeeklyTrends, useTopListings } from "@/hooks/useMarketplaceAnalytics";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line, Legend } from "recharts";
import { Eye, ShoppingBag, TrendingUp, DollarSign, Package, BarChart3, ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";

function KPICard({ icon: Icon, label, value, sub, color }: {
  icon: any; label: string; value: string | number; sub?: string; color: string;
}) {
  return (
    <Card>
      <CardContent className="p-5">
        <div className="flex items-start justify-between">
          <div className="space-y-1">
            <p className="text-sm text-muted-foreground">{label}</p>
            <p className="text-2xl font-bold">{value}</p>
            {sub && <p className="text-xs text-muted-foreground">{sub}</p>}
          </div>
          <div className={`p-2.5 rounded-xl ${color}`}>
            <Icon className="h-5 w-5" />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

export default function C2CMarketplaceAnalytics() {
  const navigate = useNavigate();
  const { currentWorkspace } = useWorkspace();
  const workspaceId = currentWorkspace?.id;

  const { data: kpis, isLoading: kpisLoading } = useMarketplaceKPIs(workspaceId);
  const { data: trends = [], isLoading: trendsLoading } = useWeeklyTrends(workspaceId);
  const { data: topListings = [], isLoading: topLoading } = useTopListings(workspaceId);

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-6 space-y-6">
        {/* Header */}
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={() => navigate("/dashboard/c2c")}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <h1 className="text-2xl font-bold">Analytics do Marketplace</h1>
            <p className="text-sm text-muted-foreground">Métricas reais de tráfego, vendas e engagement</p>
          </div>
        </div>

        {/* KPIs */}
        {kpisLoading ? (
          <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
            {Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-28 rounded-xl" />)}
          </div>
        ) : kpis ? (
          <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
            <KPICard icon={Package} label="Anúncios Ativos" value={kpis.activeListings} color="bg-primary/10 text-primary" />
            <KPICard icon={ShoppingBag} label="Vendidos" value={kpis.soldListings} color="bg-green-500/10 text-green-500" />
            <KPICard icon={Eye} label="Visualizações" value={kpis.totalViews.toLocaleString("pt-PT")} color="bg-blue-500/10 text-blue-500" />
            <KPICard icon={TrendingUp} label="Encomendas" value={kpis.totalOrders} sub="Este mês" color="bg-amber-500/10 text-amber-500" />
            <KPICard icon={DollarSign} label="Receita Mensal" value={`€${kpis.monthRevenue.toLocaleString("pt-PT", { minimumFractionDigits: 0 })}`} color="bg-emerald-500/10 text-emerald-500" />
            <KPICard icon={BarChart3} label="Taxa Conversão" value={`${kpis.conversionRate}%`} sub="Views → Ofertas" color="bg-purple-500/10 text-purple-500" />
          </div>
        ) : null}

        {/* Trends Chart */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5 text-primary" />
              Tendência Semanal
            </CardTitle>
          </CardHeader>
          <CardContent>
            {trendsLoading ? (
              <Skeleton className="h-72 w-full" />
            ) : trends.length > 0 ? (
              <ResponsiveContainer width="100%" height={300}>
                <LineChart data={trends}>
                  <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
                  <XAxis dataKey="week" tick={{ fontSize: 11 }} />
                  <YAxis tick={{ fontSize: 11 }} />
                  <Tooltip />
                  <Legend />
                  <Line type="monotone" dataKey="listings" name="Novos Anúncios" stroke="hsl(var(--primary))" strokeWidth={2} dot={{ r: 3 }} />
                  <Line type="monotone" dataKey="sales" name="Vendas" stroke="#22c55e" strokeWidth={2} dot={{ r: 3 }} />
                </LineChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-72 flex items-center justify-center text-muted-foreground">
                Sem dados suficientes para mostrar tendências
              </div>
            )}
          </CardContent>
        </Card>

        {/* Top Listings */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Eye className="h-5 w-5 text-primary" />
              Top Anúncios (mais vistos)
            </CardTitle>
          </CardHeader>
          <CardContent>
            {topLoading ? (
              <div className="space-y-3">
                {Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-14 rounded-lg" />)}
              </div>
            ) : topListings.length > 0 ? (
              <div className="space-y-2">
                {topListings.map((listing, i) => (
                  <div
                    key={listing.id}
                    className="flex items-center gap-3 p-3 rounded-lg hover:bg-muted/50 transition-colors cursor-pointer"
                    onClick={() => navigate(`/dashboard/c2c/${listing.id}`)}
                  >
                    <span className="text-sm font-bold text-muted-foreground w-6">#{i + 1}</span>
                    {listing.photos?.[0] ? (
                      <img src={listing.photos[0]} alt="" className="w-10 h-10 rounded-lg object-cover" />
                    ) : (
                      <div className="w-10 h-10 rounded-lg bg-muted flex items-center justify-center">
                        <Package className="h-4 w-4 text-muted-foreground" />
                      </div>
                    )}
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{listing.title}</p>
                      <p className="text-xs text-muted-foreground">€{listing.price.toFixed(0)}</p>
                    </div>
                    <div className="flex items-center gap-1 text-sm text-muted-foreground">
                      <Eye className="h-3.5 w-3.5" />
                      {listing.views_count}
                    </div>
                    <Badge variant={listing.status === "active" ? "default" : "secondary"} className="text-[10px]">
                      {listing.status === "active" ? "Ativo" : listing.status === "sold" ? "Vendido" : listing.status}
                    </Badge>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground text-center py-8">Nenhum anúncio encontrado</p>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
