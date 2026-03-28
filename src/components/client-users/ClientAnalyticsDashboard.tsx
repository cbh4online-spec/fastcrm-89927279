import { useClientAnalytics } from "@/hooks/useClientAnalytics";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Users,
  UserCheck,
  UserX,
  Clock,
  TrendingUp,
  ShoppingCart,
  Activity,
  AlertTriangle,
} from "lucide-react";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  BarChart,
  Bar,
} from "recharts";

export function ClientAnalyticsDashboard() {
  const { data, isLoading } = useClientAnalytics();

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <Card key={i}><CardContent className="pt-6"><Skeleton className="h-16 w-full" /></CardContent></Card>
          ))}
        </div>
        <div className="grid gap-6 lg:grid-cols-2">
          <Card><CardContent className="pt-6"><Skeleton className="h-[280px] w-full" /></CardContent></Card>
          <Card><CardContent className="pt-6"><Skeleton className="h-[280px] w-full" /></CardContent></Card>
        </div>
      </div>
    );
  }

  if (!data) return null;

  const kpis = [
    {
      title: "Total Clientes",
      value: data.totalClients,
      sub: `${data.activationRate}% ativados`,
      icon: Users,
      gradient: "from-primary/10 to-primary/5",
      iconBg: "bg-primary/10",
      iconColor: "text-primary",
    },
    {
      title: "Clientes Activos",
      value: data.activeClients,
      sub: `${data.suspendedClients} suspensos`,
      icon: UserCheck,
      gradient: "from-green-500/10 to-green-600/5",
      iconBg: "bg-green-100 dark:bg-green-900/30",
      iconColor: "text-green-600 dark:text-green-400",
    },
    {
      title: "Encomendas (Mês)",
      value: data.monthlyOrders,
      sub: `€${data.monthlyRevenue.toFixed(0)} receita`,
      icon: ShoppingCart,
      gradient: "from-blue-500/10 to-blue-600/5",
      iconBg: "bg-blue-100 dark:bg-blue-900/30",
      iconColor: "text-blue-600 dark:text-blue-400",
    },
    {
      title: "Inativos",
      value: data.inactiveClients.length,
      sub: "sem compra há 30+ dias",
      icon: AlertTriangle,
      gradient: "from-destructive/10 to-destructive/5",
      iconBg: "bg-destructive/10",
      iconColor: "text-destructive",
    },
  ];

  return (
    <div className="space-y-6">
      {/* KPI Grid */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {kpis.map((kpi, i) => {
          const Icon = kpi.icon;
          return (
            <Card
              key={kpi.title}
              className={`bg-gradient-to-br ${kpi.gradient} border-border/50 transition-all hover:shadow-md`}
              style={{ animationDelay: `${i * 80}ms` }}
            >
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  {kpi.title}
                </CardTitle>
                <div className={`p-2 rounded-xl ${kpi.iconBg}`}>
                  <Icon className={`h-4 w-4 ${kpi.iconColor}`} />
                </div>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold tracking-tight">{kpi.value}</div>
                <p className="text-xs text-muted-foreground mt-1">{kpi.sub}</p>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Charts */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Weekly Activity */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Activity className="h-5 w-5 text-primary" />
              Atividade Semanal
            </CardTitle>
            <CardDescription>Encomendas e receita nas últimas 12 semanas</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={260}>
              <AreaChart data={data.weeklyActivity}>
                <defs>
                  <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                <XAxis dataKey="week" className="text-xs" />
                <YAxis className="text-xs" />
                <Tooltip
                  formatter={(v: number, name: string) => [
                    name === "revenue" ? `€${v.toFixed(0)}` : v,
                    name === "revenue" ? "Receita" : "Encomendas",
                  ]}
                  contentStyle={{ borderRadius: "8px", border: "1px solid hsl(var(--border))" }}
                />
                <Area
                  type="monotone"
                  dataKey="revenue"
                  stroke="hsl(var(--primary))"
                  fill="url(#colorRevenue)"
                  strokeWidth={2}
                />
              </AreaChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Top Clients */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5 text-primary" />
              Top 10 Clientes
            </CardTitle>
            <CardDescription>Ranking por volume total de compras</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={260}>
              <BarChart
                data={data.clientRankings.slice(0, 10)}
                layout="vertical"
                margin={{ left: 0 }}
              >
                <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                <XAxis type="number" className="text-xs" tickFormatter={(v) => `€${v}`} />
                <YAxis
                  type="category"
                  dataKey="name"
                  width={100}
                  className="text-xs"
                  tickFormatter={(v: string) => v.length > 14 ? v.slice(0, 12) + "…" : v}
                />
                <Tooltip
                  formatter={(v: number) => [`€${v.toFixed(2)}`, "Volume"]}
                  contentStyle={{ borderRadius: "8px", border: "1px solid hsl(var(--border))" }}
                />
                <Bar dataKey="totalValue" fill="hsl(var(--primary))" radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* Inactivity Alerts */}
      {data.inactiveClients.length > 0 && (
        <Card className="border-destructive/30">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-destructive">
              <AlertTriangle className="h-5 w-5" />
              Alertas de Inatividade
            </CardTitle>
            <CardDescription>
              Clientes ativos sem encomendas há mais de 30 dias
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {data.inactiveClients.slice(0, 10).map(c => (
                <div
                  key={c.id}
                  className="flex items-center justify-between p-3 rounded-lg bg-destructive/5 border border-destructive/10"
                >
                  <div>
                    <p className="font-medium text-sm">{c.name}</p>
                    <p className="text-xs text-muted-foreground">{c.email}</p>
                  </div>
                  <div className="flex items-center gap-3">
                    <Badge variant="outline" className="text-destructive border-destructive/30">
                      {c.daysSinceLastOrder === 999 ? "Nunca comprou" : `${c.daysSinceLastOrder}d inativo`}
                    </Badge>
                    {c.totalHistoricValue > 0 && (
                      <span className="text-xs text-muted-foreground">
                        Histórico: €{c.totalHistoricValue.toFixed(0)}
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
