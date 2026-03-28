import { Link } from "react-router-dom";
import { ClientLayout } from "@/components/client-portal/ClientLayout";
import { useClientAuth } from "@/hooks/client-portal/useClientAuth";
import { useClientOrders } from "@/hooks/client-portal/useClientOrders";
import { useClientTickets } from "@/hooks/client-portal/useClientTickets";
import { useClientContracts } from "@/hooks/client-portal/useClientContracts";
import { useClientInvoices } from "@/hooks/client-portal/useClientInvoices";
import { useClientApprovals } from "@/hooks/client-portal/useClientApprovals";
import { useClientPermissions } from "@/hooks/client-portal/useClientPermissions";
import { useCart } from "@/contexts/CartContext";
import { QuickReorderWidget } from "@/components/client-portal/QuickReorderWidget";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Package,
  ShoppingCart,
  FileText,
  Clock,
  ArrowRight,
  TrendingUp,
  AlertTriangle,
  HeadphonesIcon,
  Sparkles,
  BarChart3,
  Trophy,
  Stethoscope,
} from "lucide-react";
import { orderNoteStatusConfig } from "@/types/order-note";
import { formatDistanceToNow, format, subMonths, startOfMonth, endOfMonth, isWithinInterval } from "date-fns";
import { pt } from "date-fns/locale";
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import { useMemo } from "react";

export default function ClientDashboardPage() {
  const { clientUser } = useClientAuth();
  const { orders, loading: ordersLoading } = useClientOrders(clientUser?.id);
  const { itemCount, cart } = useCart();
  const { tickets, openCount: openTickets } = useClientTickets();
  const { expiringContracts } = useClientContracts();
  const { invoices, totalPending, totalOverdue } = useClientInvoices();
  const { pendingCount } = useClientApprovals();
  const { canViewFinancials, canApprove, canViewContracts, canCreateTickets } = useClientPermissions();

  const submittedOrders = orders.filter(o => o.status === 'submitted' || o.status === 'awaiting_approval').length;
  const approvedOrders = orders.filter(o => o.status === 'approved' || o.status === 'in_preparation').length;
  const totalSpent = orders
    .filter(o => o.status === 'invoiced')
    .reduce((sum, o) => sum + o.total_gross, 0);

  const monthlyData = useMemo(() => {
    const months = [];
    for (let i = 5; i >= 0; i--) {
      const date = subMonths(new Date(), i);
      const start = startOfMonth(date);
      const end = endOfMonth(date);
      const label = format(date, "MMM", { locale: pt });
      const monthOrders = orders.filter(o =>
        isWithinInterval(new Date(o.created_at), { start, end })
      );
      const total = monthOrders.reduce((s, o) => s + o.total_gross, 0);
      months.push({ name: label, valor: Math.round(total * 100) / 100, encomendas: monthOrders.length });
    }
    return months;
  }, [orders]);

  const topProducts = useMemo(() => {
    const productMap = new Map<string, { name: string; count: number; total: number }>();
    orders.forEach((order) => {
      (order.items || []).forEach((item: any) => {
        const key = item.product_id;
        const existing = productMap.get(key);
        if (existing) {
          existing.count += item.quantity;
          existing.total += item.total_price || 0;
        } else {
          productMap.set(key, { name: item.product_name || "Produto", count: item.quantity, total: item.total_price || 0 });
        }
      });
    });
    return Array.from(productMap.values())
      .sort((a, b) => b.count - a.count)
      .slice(0, 5);
  }, [orders]);

  const recentOrders = orders.slice(0, 5);

  const alerts: { type: "warning" | "info"; message: string; link?: string }[] = [];
  if (pendingCount > 0 && canApprove) {
    alerts.push({ type: "warning", message: `${pendingCount} aprovação(ões) pendente(s)`, link: "/client/approvals" });
  }
  if (expiringContracts.length > 0 && canViewContracts) {
    alerts.push({ type: "warning", message: `${expiringContracts.length} contrato(s) a expirar em breve`, link: "/client/contracts" });
  }
  if (totalOverdue > 0 && canViewFinancials) {
    alerts.push({ type: "warning", message: `${totalOverdue.toFixed(2)}€ em faturas vencidas`, link: "/client/invoices" });
  }
  if (openTickets > 0 && canCreateTickets) {
    alerts.push({ type: "info", message: `${openTickets} ticket(s) de suporte aberto(s)`, link: "/client/support" });
  }

  const kpiCards = [
    {
      title: "No Carrinho",
      value: itemCount,
      sub: `${cart.total_gross.toFixed(2)}€ total`,
      icon: ShoppingCart,
      gradient: "from-primary/10 via-transparent to-primary/5",
      iconBg: "bg-primary/10",
      iconColor: "text-primary",
      link: "/client/cart",
    },
    {
      title: "Pendentes",
      value: submittedOrders,
      sub: "encomendas aguardando",
      icon: Clock,
      gradient: "from-amber-500/10 via-transparent to-amber-600/5",
      iconBg: "bg-amber-100 dark:bg-amber-900/30",
      iconColor: "text-amber-600 dark:text-amber-400",
      link: "/client/orders",
    },
    {
      title: "Em Preparação",
      value: approvedOrders,
      sub: "encomendas aprovadas",
      icon: FileText,
      gradient: "from-blue-500/10 via-transparent to-blue-600/5",
      iconBg: "bg-blue-100 dark:bg-blue-900/30",
      iconColor: "text-blue-600 dark:text-blue-400",
      link: "/client/orders",
    },
    {
      title: "Total Faturado",
      value: `${totalSpent.toFixed(0)}€`,
      sub: "em encomendas",
      icon: TrendingUp,
      gradient: "from-green-500/10 via-transparent to-green-600/5",
      iconBg: "bg-green-100 dark:bg-green-900/30",
      iconColor: "text-green-600 dark:text-green-400",
      link: "/client/financial",
    },
  ];

  const quickActions = [
    { title: "Diagnóstico IA", desc: "Selecione a patologia e veja protocolos", icon: Stethoscope, link: "/client/diagnosis" },
    { title: "Catálogo", desc: "Consulte o catálogo técnico completo", icon: Package, link: "/client/catalog" },
    { title: "Carrinho", desc: "Reveja e finalize a sua encomenda", icon: ShoppingCart, link: "/client/cart", badge: itemCount },
    { title: "Rankings", desc: "Produtos mais comprados e re-encomenda", icon: Trophy, link: "/client/insights/rankings" },
  ];

  return (
    <ClientLayout>
      <div className="space-y-8">
        {/* Welcome Header — Premium */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">
              Olá, {clientUser?.name?.split(' ')[0]} 👋
            </h1>
            <p className="text-muted-foreground mt-1">
              Painel executivo do portal profissional
            </p>
          </div>
          <div className="flex gap-2">
            <Link to="/client/assistant">
              <Button variant="outline" className="border-primary/20 hover:bg-primary/5">
                <Sparkles className="h-4 w-4 mr-2 text-primary" /> Copilot IA
              </Button>
            </Link>
            <Link to="/client/catalog">
              <Button className="shadow-lg shadow-primary/20">
                <Package className="h-5 w-5 mr-2" /> Nova Encomenda
              </Button>
            </Link>
          </div>
        </div>

        {/* Alerts — Premium */}
        {alerts.length > 0 && (
          <div className="grid gap-2 sm:grid-cols-2">
            {alerts.map((alert, i) => (
              <Link key={i} to={alert.link || "#"}>
                <Card className={`
                  border-amber-200/60 hover:shadow-lg transition-all cursor-pointer
                  ${alert.type === "warning"
                    ? "bg-gradient-to-r from-amber-50 to-orange-50/50 dark:from-amber-950/20 dark:to-orange-950/10 dark:border-amber-800/40"
                    : "bg-gradient-to-r from-blue-50 to-sky-50/50 dark:from-blue-950/20 dark:to-sky-950/10 dark:border-blue-800/40"
                  }
                `}>
                  <CardContent className="flex items-center gap-3 py-3">
                    <div className={`p-1.5 rounded-lg ${alert.type === "warning" ? "bg-amber-100 dark:bg-amber-900/30" : "bg-blue-100 dark:bg-blue-900/30"}`}>
                      <AlertTriangle className={`h-3.5 w-3.5 ${alert.type === "warning" ? "text-amber-600 dark:text-amber-400" : "text-blue-600 dark:text-blue-400"}`} />
                    </div>
                    <span className="text-sm font-medium flex-1">{alert.message}</span>
                    <ArrowRight className="h-4 w-4 text-muted-foreground" />
                  </CardContent>
                </Card>
              </Link>
            ))}
          </div>
        )}

        {/* KPI Cards — Premium with gradients */}
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {kpiCards.map((kpi, i) => {
            const Icon = kpi.icon;
            return (
              <Link key={kpi.title} to={kpi.link}>
                <Card
                  className={`
                    bg-gradient-to-br ${kpi.gradient}
                    border-border/50 hover:shadow-lg hover:-translate-y-0.5
                    transition-all duration-300 cursor-pointer h-full
                  `}
                  style={{ animationDelay: `${i * 100}ms` }}
                >
                  <CardHeader className="flex flex-row items-center justify-between pb-2">
                    <CardTitle className="text-sm font-medium text-muted-foreground">
                      {kpi.title}
                    </CardTitle>
                    <div className={`p-2.5 rounded-xl ${kpi.iconBg}`}>
                      <Icon className={`h-4 w-4 ${kpi.iconColor}`} />
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="text-3xl font-bold tracking-tight">{kpi.value}</div>
                    <p className="text-xs text-muted-foreground mt-1">{kpi.sub}</p>
                  </CardContent>
                </Card>
              </Link>
            );
          })}
        </div>

        {/* Charts Row — Premium */}
        <div className="grid gap-6 lg:grid-cols-3">
          {/* Monthly Evolution */}
          <Card className="lg:col-span-2 border-border/50">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <div className="p-1.5 rounded-lg bg-primary/10">
                  <BarChart3 className="h-4 w-4 text-primary" />
                </div>
                Evolução Mensal
              </CardTitle>
              <CardDescription>Valor de encomendas nos últimos 6 meses</CardDescription>
            </CardHeader>
            <CardContent>
              {monthlyData.some(m => m.valor > 0) ? (
                <ResponsiveContainer width="100%" height={240}>
                  <AreaChart data={monthlyData}>
                    <defs>
                      <linearGradient id="portalGradient" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.3} />
                        <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                    <XAxis dataKey="name" className="text-xs" />
                    <YAxis className="text-xs" />
                    <Tooltip
                      formatter={(value: number) => [`${value.toFixed(2)}€`, "Valor"]}
                      contentStyle={{
                        borderRadius: "12px",
                        border: "1px solid hsl(var(--border))",
                        boxShadow: "var(--shadow-lg)",
                      }}
                    />
                    <Area
                      type="monotone"
                      dataKey="valor"
                      stroke="hsl(var(--primary))"
                      fill="url(#portalGradient)"
                      strokeWidth={2.5}
                    />
                  </AreaChart>
                </ResponsiveContainer>
              ) : (
                <div className="h-[240px] flex items-center justify-center text-muted-foreground">
                  Sem dados de encomendas
                </div>
              )}
            </CardContent>
          </Card>

          {/* Reorder Widget + Top Products */}
          <div className="space-y-4">
            <QuickReorderWidget />

            <Card className="border-border/50">
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2 text-base">
                  <div className="p-1.5 rounded-lg bg-primary/10">
                    <Package className="h-4 w-4 text-primary" />
                  </div>
                  Top Produtos
                </CardTitle>
              </CardHeader>
              <CardContent>
                {topProducts.length > 0 ? (
                  <div className="space-y-2.5">
                    {topProducts.map((p, i) => (
                      <div key={i} className="flex items-center justify-between">
                        <div className="flex items-center gap-2.5">
                          <span className={`
                            w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold
                            ${i === 0 ? "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400" :
                              i === 1 ? "bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-300" :
                              "bg-muted text-muted-foreground"}
                          `}>
                            {i + 1}
                          </span>
                          <span className="text-sm truncate max-w-[130px]">{p.name}</span>
                        </div>
                        <Badge variant="secondary" className="text-xs">{p.count} un.</Badge>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground text-center py-4">
                    Sem dados de produtos
                  </p>
                )}
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Quick Actions — Premium Cards */}
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {quickActions.map((action, i) => {
            const Icon = action.icon;
            return (
              <Link key={action.title} to={action.link}>
                <Card className="group hover:border-primary/30 hover:shadow-lg hover:-translate-y-0.5 transition-all duration-300 cursor-pointer h-full border-border/50">
                  <CardHeader className="pb-2">
                    <div className="flex items-center justify-between">
                      <div className="p-2.5 rounded-xl bg-primary/10 group-hover:bg-primary/15 transition-colors">
                        <Icon className="h-5 w-5 text-primary" />
                      </div>
                      {action.badge && action.badge > 0 && (
                        <Badge className="bg-primary text-primary-foreground">{action.badge}</Badge>
                      )}
                    </div>
                    <CardTitle className="text-base mt-3">{action.title}</CardTitle>
                    <CardDescription className="text-xs">{action.desc}</CardDescription>
                  </CardHeader>
                  <CardContent className="pt-0">
                    <span className="text-sm text-primary font-medium flex items-center gap-1 group-hover:gap-2 transition-all">
                      Abrir <ArrowRight className="h-3.5 w-3.5" />
                    </span>
                  </CardContent>
                </Card>
              </Link>
            );
          })}
        </div>

        {/* Recent Orders — Premium */}
        <Card className="border-border/50">
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle>Encomendas Recentes</CardTitle>
              <CardDescription>As suas últimas encomendas</CardDescription>
            </div>
            <Link to="/client/orders">
              <Button variant="outline" size="sm" className="border-primary/20">Ver todas</Button>
            </Link>
          </CardHeader>
          <CardContent>
            {ordersLoading ? (
              <div className="text-center py-8 text-muted-foreground">A carregar...</div>
            ) : recentOrders.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground">
                <div className="p-4 rounded-2xl bg-muted/50 w-fit mx-auto mb-4">
                  <FileText className="h-10 w-10 opacity-50" />
                </div>
                <p className="font-medium">Ainda não tem encomendas.</p>
                <p className="text-xs mt-1">Comece pelo catálogo ou diagnóstico.</p>
                <Link to="/client/catalog">
                  <Button className="mt-4 shadow-lg shadow-primary/20">Fazer primeira encomenda</Button>
                </Link>
              </div>
            ) : (
              <div className="space-y-2">
                {recentOrders.map((order) => {
                  const statusConfig = orderNoteStatusConfig[order.status];
                  return (
                    <Link key={order.id} to={`/client/orders/${order.id}`} className="block">
                      <div className="flex items-center justify-between p-3.5 rounded-xl border border-border/50 hover:bg-muted/30 hover:border-primary/20 transition-all">
                        <div className="flex items-center gap-4">
                          <div className="p-2 rounded-lg bg-muted/50">
                            <Package className="h-4 w-4 text-muted-foreground" />
                          </div>
                          <div>
                            <p className="font-medium">{order.order_number}</p>
                            <p className="text-xs text-muted-foreground">
                              {formatDistanceToNow(new Date(order.created_at), { addSuffix: true, locale: pt })}
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center gap-4">
                          <span className="font-semibold">{order.total_gross.toFixed(2)}€</span>
                          <Badge className={`${statusConfig.bgColor} ${statusConfig.color}`}>
                            {statusConfig.labelPT}
                          </Badge>
                        </div>
                      </div>
                    </Link>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </ClientLayout>
  );
}
