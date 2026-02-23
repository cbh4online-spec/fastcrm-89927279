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
  FileCheck,
  CheckCircle,
  BarChart3,
  Sparkles,
} from "lucide-react";
import { orderNoteStatusConfig } from "@/types/order-note";
import { formatDistanceToNow, format, subMonths, startOfMonth, endOfMonth, isWithinInterval } from "date-fns";
import { pt } from "date-fns/locale";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
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

  // Calculate stats
  const submittedOrders = orders.filter(o => o.status === 'submitted' || o.status === 'awaiting_approval').length;
  const approvedOrders = orders.filter(o => o.status === 'approved' || o.status === 'in_preparation').length;
  const totalSpent = orders
    .filter(o => o.status === 'invoiced')
    .reduce((sum, o) => sum + o.total_gross, 0);

  // Monthly evolution chart data (last 6 months)
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
      const count = monthOrders.length;

      months.push({ name: label, valor: Math.round(total * 100) / 100, encomendas: count });
    }
    return months;
  }, [orders]);

  // Top products by order frequency
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

  // Recent orders (last 5)
  const recentOrders = orders.slice(0, 5);

  // Alerts
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

  return (
    <ClientLayout>
      <div className="space-y-6">
        {/* Welcome Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold">
              Olá, {clientUser?.name?.split(' ')[0]}!
            </h1>
            <p className="text-muted-foreground">
              Painel executivo do portal profissional
            </p>
          </div>
          <div className="flex gap-2">
            <Link to="/client/assistant">
              <Button variant="outline">
                <Sparkles className="h-4 w-4 mr-2" /> Copilot IA
              </Button>
            </Link>
            <Link to="/client/catalog">
              <Button>
                <Package className="h-5 w-5 mr-2" /> Nova Encomenda
              </Button>
            </Link>
          </div>
        </div>

        {/* Alerts */}
        {alerts.length > 0 && (
          <div className="grid gap-2 sm:grid-cols-2">
            {alerts.map((alert, i) => (
              <Link key={i} to={alert.link || "#"}>
                <Card className="border-orange-200 bg-orange-50 dark:bg-orange-950/20 dark:border-orange-800 hover:shadow-md transition-shadow cursor-pointer">
                  <CardContent className="flex items-center gap-3 py-3">
                    <AlertTriangle className="h-4 w-4 text-orange-600 dark:text-orange-400 shrink-0" />
                    <span className="text-sm font-medium text-orange-800 dark:text-orange-200">{alert.message}</span>
                    <ArrowRight className="h-4 w-4 ml-auto text-orange-600 dark:text-orange-400" />
                  </CardContent>
                </Card>
              </Link>
            ))}
          </div>
        )}

        {/* KPI Cards */}
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">No Carrinho</CardTitle>
              <ShoppingCart className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{itemCount}</div>
              <p className="text-xs text-muted-foreground">{cart.total_gross.toFixed(2)}€ total</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Pendentes</CardTitle>
              <Clock className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{submittedOrders}</div>
              <p className="text-xs text-muted-foreground">encomendas aguardando</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Em Preparação</CardTitle>
              <FileText className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{approvedOrders}</div>
              <p className="text-xs text-muted-foreground">encomendas aprovadas</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Total Faturado</CardTitle>
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{totalSpent.toFixed(2)}€</div>
              <p className="text-xs text-muted-foreground">em encomendas</p>
            </CardContent>
          </Card>
        </div>

        {/* Charts Row */}
        <div className="grid gap-6 lg:grid-cols-2">
          {/* Monthly Evolution */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <BarChart3 className="h-5 w-5" /> Evolução Mensal
              </CardTitle>
              <CardDescription>Valor de encomendas nos últimos 6 meses</CardDescription>
            </CardHeader>
            <CardContent>
              {monthlyData.some(m => m.valor > 0) ? (
                <ResponsiveContainer width="100%" height={220}>
                  <BarChart data={monthlyData}>
                    <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                    <XAxis dataKey="name" className="text-xs" />
                    <YAxis className="text-xs" />
                    <Tooltip
                      formatter={(value: number) => [`${value.toFixed(2)}€`, "Valor"]}
                      contentStyle={{ borderRadius: "8px", border: "1px solid hsl(var(--border))" }}
                    />
                    <Bar dataKey="valor" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <div className="h-[220px] flex items-center justify-center text-muted-foreground">
                  Sem dados de encomendas
                </div>
              )}
            </CardContent>
          </Card>

          {/* Top Products */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Package className="h-5 w-5" /> Top Produtos
              </CardTitle>
              <CardDescription>Produtos mais encomendados</CardDescription>
            </CardHeader>
            <CardContent>
              {topProducts.length > 0 ? (
                <div className="space-y-3">
                  {topProducts.map((p, i) => (
                    <div key={i} className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <span className="text-sm font-bold text-muted-foreground w-5">{i + 1}.</span>
                        <span className="text-sm font-medium truncate max-w-[200px]">{p.name}</span>
                      </div>
                      <div className="flex items-center gap-3">
                        <Badge variant="secondary">{p.count} un.</Badge>
                        <span className="text-sm font-medium">{p.total.toFixed(2)}€</span>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="h-[220px] flex items-center justify-center text-muted-foreground">
                  Sem dados de produtos
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Quick Actions */}
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <Link to="/client/diagnosis">
            <Card className="hover:border-primary/50 transition-colors cursor-pointer h-full">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Sparkles className="h-5 w-5 text-primary" /> Comprar por Diagnóstico
                </CardTitle>
                <CardDescription>Selecione a patologia e veja protocolos</CardDescription>
              </CardHeader>
              <CardContent>
                <Button variant="ghost" className="p-0 h-auto">
                  Ver diagnósticos <ArrowRight className="h-4 w-4 ml-1" />
                </Button>
              </CardContent>
            </Card>
          </Link>

          <Link to="/client/catalog">
            <Card className="hover:border-primary/50 transition-colors cursor-pointer h-full">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Package className="h-5 w-5 text-primary" /> Catálogo de Produtos
                </CardTitle>
                <CardDescription>Consulte o catálogo técnico completo</CardDescription>
              </CardHeader>
              <CardContent>
                <Button variant="ghost" className="p-0 h-auto">
                  Ver catálogo <ArrowRight className="h-4 w-4 ml-1" />
                </Button>
              </CardContent>
            </Card>
          </Link>

          <Link to="/client/cart">
            <Card className="hover:border-primary/50 transition-colors cursor-pointer h-full">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <ShoppingCart className="h-5 w-5 text-primary" /> Carrinho
                  {itemCount > 0 && <Badge variant="secondary">{itemCount} itens</Badge>}
                </CardTitle>
                <CardDescription>Reveja e finalize a sua encomenda</CardDescription>
              </CardHeader>
              <CardContent>
                <Button variant="ghost" className="p-0 h-auto">
                  Ver carrinho <ArrowRight className="h-4 w-4 ml-1" />
                </Button>
              </CardContent>
            </Card>
          </Link>

          <Link to="/client/insights/rankings">
            <Card className="hover:border-primary/50 transition-colors cursor-pointer h-full">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <BarChart3 className="h-5 w-5 text-primary" /> Mais Comprados
                </CardTitle>
                <CardDescription>Rankings e re-encomenda rápida</CardDescription>
              </CardHeader>
              <CardContent>
                <Button variant="ghost" className="p-0 h-auto">
                  Ver rankings <ArrowRight className="h-4 w-4 ml-1" />
                </Button>
              </CardContent>
            </Card>
          </Link>
        </div>

        {/* Recent Orders */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle>Encomendas Recentes</CardTitle>
              <CardDescription>As suas últimas encomendas</CardDescription>
            </div>
            <Link to="/client/orders">
              <Button variant="outline" size="sm">Ver todas</Button>
            </Link>
          </CardHeader>
          <CardContent>
            {ordersLoading ? (
              <div className="text-center py-8 text-muted-foreground">A carregar...</div>
            ) : recentOrders.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <FileText className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>Ainda não tem encomendas.</p>
                <Link to="/client/catalog">
                  <Button className="mt-4">Fazer primeira encomenda</Button>
                </Link>
              </div>
            ) : (
              <div className="space-y-3">
                {recentOrders.map((order) => {
                  const statusConfig = orderNoteStatusConfig[order.status];
                  return (
                    <Link key={order.id} to={`/client/orders/${order.id}`} className="block">
                      <div className="flex items-center justify-between p-3 rounded-lg border hover:bg-muted/50 transition-colors">
                        <div className="flex items-center gap-4">
                          <div>
                            <p className="font-medium">{order.order_number}</p>
                            <p className="text-sm text-muted-foreground">
                              {formatDistanceToNow(new Date(order.created_at), { addSuffix: true, locale: pt })}
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center gap-4">
                          <span className="font-medium">{order.total_gross.toFixed(2)}€</span>
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
