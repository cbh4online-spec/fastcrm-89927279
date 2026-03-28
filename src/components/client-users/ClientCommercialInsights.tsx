import { useClientAnalytics } from "@/hooks/useClientAnalytics";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Trophy,
  TrendingUp,
  DollarSign,
  BarChart3,
  Package,
} from "lucide-react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";

export function ClientCommercialInsights() {
  const { data, isLoading } = useClientAnalytics();

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="grid gap-4 md:grid-cols-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <Card key={i}><CardContent className="pt-6"><Skeleton className="h-20 w-full" /></CardContent></Card>
          ))}
        </div>
      </div>
    );
  }

  if (!data) return null;

  const avgOrderValue = data.totalOrders > 0
    ? data.totalRevenue / data.totalOrders
    : 0;

  const avgPerClient = data.activeClients > 0
    ? data.totalRevenue / data.activeClients
    : 0;

  return (
    <div className="space-y-6">
      {/* Commercial KPIs */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card className="bg-gradient-to-br from-primary/10 to-primary/5">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Receita Total</CardTitle>
            <div className="p-2 rounded-xl bg-primary/10">
              <DollarSign className="h-4 w-4 text-primary" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">€{(data.totalRevenue / 1000).toFixed(1)}k</div>
            <p className="text-xs text-muted-foreground mt-1">{data.totalOrders} encomendas totais</p>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-blue-500/10 to-blue-600/5">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Ticket Médio</CardTitle>
            <div className="p-2 rounded-xl bg-blue-100 dark:bg-blue-900/30">
              <BarChart3 className="h-4 w-4 text-blue-600 dark:text-blue-400" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">€{avgOrderValue.toFixed(0)}</div>
            <p className="text-xs text-muted-foreground mt-1">por encomenda</p>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-green-500/10 to-green-600/5">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Valor / Cliente</CardTitle>
            <div className="p-2 rounded-xl bg-green-100 dark:bg-green-900/30">
              <TrendingUp className="h-4 w-4 text-green-600 dark:text-green-400" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">€{avgPerClient.toFixed(0)}</div>
            <p className="text-xs text-muted-foreground mt-1">média por cliente ativo</p>
          </CardContent>
        </Card>
      </div>

      {/* Revenue by Week */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BarChart3 className="h-5 w-5 text-primary" />
            Receita Semanal
          </CardTitle>
          <CardDescription>Evolução da receita nas últimas 12 semanas</CardDescription>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={280}>
            <BarChart data={data.weeklyActivity}>
              <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
              <XAxis dataKey="week" className="text-xs" />
              <YAxis className="text-xs" tickFormatter={(v) => `€${v}`} />
              <Tooltip
                formatter={(v: number) => [`€${v.toFixed(2)}`, "Receita"]}
                contentStyle={{ borderRadius: "8px", border: "1px solid hsl(var(--border))" }}
              />
              <Bar dataKey="revenue" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* Full Client Ranking Table */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Trophy className="h-5 w-5 text-gold" />
            Ranking Completo de Clientes
          </CardTitle>
          <CardDescription>Ordenado por volume total de compras</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {data.clientRankings.map((c, i) => (
              <div
                key={c.id}
                className="flex items-center justify-between p-3 rounded-lg border bg-card hover:bg-muted/50 transition-colors"
              >
                <div className="flex items-center gap-3">
                  <span className={`
                    w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold
                    ${i === 0 ? "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400" :
                      i === 1 ? "bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-300" :
                      i === 2 ? "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400" :
                      "bg-muted text-muted-foreground"}
                  `}>
                    {i + 1}
                  </span>
                  <div>
                    <p className="font-medium text-sm">{c.name}</p>
                    <p className="text-xs text-muted-foreground">{c.email}</p>
                  </div>
                </div>
                <div className="flex items-center gap-4 text-right">
                  <div>
                    <p className="font-semibold text-sm">€{c.totalValue.toFixed(0)}</p>
                    <p className="text-xs text-muted-foreground">{c.totalOrders} encomendas</p>
                  </div>
                  <Badge
                    variant="outline"
                    className={
                      c.status === "active"
                        ? "border-green-300 text-green-700 dark:text-green-400"
                        : c.status === "suspended"
                        ? "border-destructive/30 text-destructive"
                        : "border-warning/30 text-warning"
                    }
                  >
                    {c.status === "active" ? "Ativo" : c.status === "suspended" ? "Suspenso" : "Pendente"}
                  </Badge>
                </div>
              </div>
            ))}
            {data.clientRankings.length === 0 && (
              <div className="text-center py-8 text-muted-foreground">
                <Package className="h-8 w-8 mx-auto mb-2 opacity-50" />
                Sem dados de clientes
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
