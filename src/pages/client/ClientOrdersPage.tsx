import { Link } from "react-router-dom";
import { ClientLayout } from "@/components/client-portal/ClientLayout";
import { useClientAuth } from "@/hooks/client-portal/useClientAuth";
import { useClientOrders } from "@/hooks/client-portal/useClientOrders";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { 
  FileText, 
  ArrowRight,
  Package,
  Loader2
} from "lucide-react";
import { orderNoteStatusConfig } from "@/types/order-note";
import { format } from "date-fns";
import { pt } from "date-fns/locale";

export default function ClientOrdersPage() {
  const { clientUser } = useClientAuth();
  const { orders, loading } = useClientOrders(clientUser?.id);

  return (
    <ClientLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">Histórico de Encomendas</h1>
            <p className="text-muted-foreground">
              {orders.length} {orders.length === 1 ? "encomenda" : "encomendas"}
            </p>
          </div>
          <Link to="/client/catalog">
            <Button>
              <Package className="h-4 w-4 mr-2" />
              Nova Encomenda
            </Button>
          </Link>
        </div>

        {/* Orders List */}
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : orders.length === 0 ? (
          <div className="text-center py-12">
            <FileText className="h-12 w-12 mx-auto mb-4 text-muted-foreground opacity-50" />
            <p className="text-muted-foreground mb-6">
              Ainda não tem encomendas registadas.
            </p>
            <Link to="/client/catalog">
              <Button>Fazer primeira encomenda</Button>
            </Link>
          </div>
        ) : (
          <div className="space-y-4">
            {orders.map((order) => {
              const statusConfig = orderNoteStatusConfig[order.status];
              const itemCount = order.items?.length || 0;

              return (
                <Card key={order.id} className="hover:border-primary/50 transition-colors">
                  <CardContent className="p-6">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                      <div className="space-y-1">
                        <div className="flex items-center gap-3">
                          <h3 className="font-semibold text-lg">{order.order_number}</h3>
                          <Badge className={`${statusConfig.bgColor} ${statusConfig.color}`}>
                            {statusConfig.labelPT}
                          </Badge>
                        </div>
                        <p className="text-sm text-muted-foreground">
                          {format(new Date(order.created_at), "d 'de' MMMM 'de' yyyy, HH:mm", { locale: pt })}
                        </p>
                        <p className="text-sm text-muted-foreground">
                          {itemCount} {itemCount === 1 ? "produto" : "produtos"}
                        </p>
                      </div>

                      <div className="flex items-center gap-4">
                        <div className="text-right">
                          <p className="text-2xl font-bold text-primary">
                            {order.total_gross.toFixed(2)}€
                          </p>
                          <p className="text-xs text-muted-foreground">c/ IVA</p>
                        </div>
                        <Link to={`/client/orders/${order.id}`}>
                          <Button variant="outline" size="sm">
                            Ver detalhes
                            <ArrowRight className="h-4 w-4 ml-2" />
                          </Button>
                        </Link>
                      </div>
                    </div>

                    {/* Additional info */}
                    {(order.installment_requested || order.client_notes) && (
                      <div className="mt-4 pt-4 border-t flex flex-wrap gap-4">
                        {order.installment_requested && (
                          <Badge variant="outline">
                            {order.installment_count}x prestações solicitadas
                          </Badge>
                        )}
                        {order.client_notes && (
                          <p className="text-sm text-muted-foreground">
                            <span className="font-medium">Notas:</span> {order.client_notes}
                          </p>
                        )}
                      </div>
                    )}
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </div>
    </ClientLayout>
  );
}
