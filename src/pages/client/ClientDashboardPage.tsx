import { Link } from "react-router-dom";
import { ClientLayout } from "@/components/client-portal/ClientLayout";
import { useClientAuth } from "@/hooks/client-portal/useClientAuth";
import { useClientOrders } from "@/hooks/client-portal/useClientOrders";
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
  TrendingUp
} from "lucide-react";
import { orderNoteStatusConfig } from "@/types/order-note";
import { formatDistanceToNow } from "date-fns";
import { pt } from "date-fns/locale";

export default function ClientDashboardPage() {
  const { clientUser } = useClientAuth();
  const { orders, loading: ordersLoading } = useClientOrders(clientUser?.id);
  const { itemCount, cart } = useCart();

  // Calculate stats
  const submittedOrders = orders.filter(o => o.status === 'submitted' || o.status === 'awaiting_approval').length;
  const approvedOrders = orders.filter(o => o.status === 'approved' || o.status === 'in_preparation').length;
  const totalSpent = orders
    .filter(o => o.status === 'invoiced')
    .reduce((sum, o) => sum + o.total_gross, 0);

  // Recent orders (last 5)
  const recentOrders = orders.slice(0, 5);

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
              Bem-vindo ao portal de encomendas profissionais
            </p>
          </div>
          <Link to="/client/catalog">
            <Button size="lg">
              <Package className="h-5 w-5 mr-2" />
              Nova Encomenda
            </Button>
          </Link>
        </div>

        {/* Stats Cards */}
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">No Carrinho</CardTitle>
              <ShoppingCart className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{itemCount}</div>
              <p className="text-xs text-muted-foreground">
                {cart.total_gross.toFixed(2)}€ total
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Pendentes</CardTitle>
              <Clock className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{submittedOrders}</div>
              <p className="text-xs text-muted-foreground">
                encomendas aguardando
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Em Preparação</CardTitle>
              <FileText className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{approvedOrders}</div>
              <p className="text-xs text-muted-foreground">
                encomendas aprovadas
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Total Faturado</CardTitle>
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{totalSpent.toFixed(2)}€</div>
              <p className="text-xs text-muted-foreground">
                em encomendas
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Quick Actions */}
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <Link to="/client/catalog">
            <Card className="hover:border-primary/50 transition-colors cursor-pointer">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Package className="h-5 w-5 text-primary" />
                  Catálogo de Produtos
                </CardTitle>
                <CardDescription>
                  Consulte o catálogo técnico completo
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Button variant="ghost" className="p-0 h-auto">
                  Ver catálogo <ArrowRight className="h-4 w-4 ml-1" />
                </Button>
              </CardContent>
            </Card>
          </Link>

          <Link to="/client/cart">
            <Card className="hover:border-primary/50 transition-colors cursor-pointer">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <ShoppingCart className="h-5 w-5 text-primary" />
                  Carrinho
                  {itemCount > 0 && (
                    <Badge variant="secondary">{itemCount} itens</Badge>
                  )}
                </CardTitle>
                <CardDescription>
                  Reveja e finalize a sua encomenda
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Button variant="ghost" className="p-0 h-auto">
                  Ver carrinho <ArrowRight className="h-4 w-4 ml-1" />
                </Button>
              </CardContent>
            </Card>
          </Link>

          <Link to="/client/orders">
            <Card className="hover:border-primary/50 transition-colors cursor-pointer">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <FileText className="h-5 w-5 text-primary" />
                  Histórico
                </CardTitle>
                <CardDescription>
                  Veja todas as suas encomendas
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Button variant="ghost" className="p-0 h-auto">
                  Ver histórico <ArrowRight className="h-4 w-4 ml-1" />
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
              <Button variant="outline" size="sm">
                Ver todas
              </Button>
            </Link>
          </CardHeader>
          <CardContent>
            {ordersLoading ? (
              <div className="text-center py-8 text-muted-foreground">
                A carregar...
              </div>
            ) : recentOrders.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <FileText className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>Ainda não tem encomendas.</p>
                <Link to="/client/catalog">
                  <Button className="mt-4">
                    Fazer primeira encomenda
                  </Button>
                </Link>
              </div>
            ) : (
              <div className="space-y-3">
                {recentOrders.map((order) => {
                  const statusConfig = orderNoteStatusConfig[order.status];
                  return (
                    <Link 
                      key={order.id} 
                      to={`/client/orders/${order.id}`}
                      className="block"
                    >
                      <div className="flex items-center justify-between p-3 rounded-lg border hover:bg-muted/50 transition-colors">
                        <div className="flex items-center gap-4">
                          <div>
                            <p className="font-medium">{order.order_number}</p>
                            <p className="text-sm text-muted-foreground">
                              {formatDistanceToNow(new Date(order.created_at), { 
                                addSuffix: true,
                                locale: pt 
                              })}
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center gap-4">
                          <span className="font-medium">
                            {order.total_gross.toFixed(2)}€
                          </span>
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
