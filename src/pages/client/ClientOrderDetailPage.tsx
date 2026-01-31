import { useParams, Link } from "react-router-dom";
import { ClientLayout } from "@/components/client-portal/ClientLayout";
import { useClientAuth } from "@/hooks/client-portal/useClientAuth";
import { useClientOrders } from "@/hooks/client-portal/useClientOrders";
import { RepeatOrderButton } from "@/components/client-portal/RepeatOrderButton";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { 
  ArrowLeft,
  Package,
  Loader2,
  FileText,
  CreditCard,
  MapPin,
  Calendar
} from "lucide-react";
import { orderNoteStatusConfig } from "@/types/order-note";
import { format } from "date-fns";
import { pt } from "date-fns/locale";

export default function ClientOrderDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { clientUser } = useClientAuth();
  const { orders, loading } = useClientOrders(clientUser?.id);

  const order = orders.find((o) => o.id === id);

  if (loading) {
    return (
      <ClientLayout>
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </ClientLayout>
    );
  }

  if (!order) {
    return (
      <ClientLayout>
        <div className="text-center py-12">
          <FileText className="h-12 w-12 mx-auto mb-4 text-muted-foreground opacity-50" />
          <p className="text-muted-foreground mb-6">Encomenda não encontrada.</p>
          <Link to="/client/orders">
            <Button>Ver todas as encomendas</Button>
          </Link>
        </div>
      </ClientLayout>
    );
  }

  const statusConfig = orderNoteStatusConfig[order.status];

  return (
    <ClientLayout>
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center gap-4">
          <Link to="/client/orders">
            <Button variant="ghost" size="icon">
              <ArrowLeft className="h-5 w-5" />
            </Button>
          </Link>
          <div className="flex-1">
            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-bold">{order.order_number}</h1>
              <Badge className={`${statusConfig.bgColor} ${statusConfig.color}`}>
                {statusConfig.labelPT}
              </Badge>
            </div>
            <p className="text-muted-foreground">
              Criada em {format(new Date(order.created_at), "d 'de' MMMM 'de' yyyy, HH:mm", { locale: pt })}
            </p>
          </div>
          <RepeatOrderButton order={order} variant="button" size="default" />
        </div>

        <div className="grid gap-6 lg:grid-cols-3">
          {/* Items */}
          <div className="lg:col-span-2 space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Produtos</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {order.items && order.items.length > 0 ? (
                  order.items.map((item) => (
                    <div key={item.id} className="flex gap-4 pb-4 border-b last:border-0 last:pb-0">
                      <div className="w-16 h-16 bg-muted rounded-lg overflow-hidden flex-shrink-0">
                        {item.product_image_url ? (
                          <img 
                            src={item.product_image_url} 
                            alt={item.product_name}
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center">
                            <Package className="h-6 w-6 text-muted-foreground/30" />
                          </div>
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <h4 className="font-medium">{item.product_name}</h4>
                        {item.product_sku && (
                          <p className="text-xs text-muted-foreground">SKU: {item.product_sku}</p>
                        )}
                        <p className="text-sm text-muted-foreground mt-1">
                          {item.quantity}x {item.unit_price_net.toFixed(2)}€
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="font-semibold">{item.line_total_gross.toFixed(2)}€</p>
                        <p className="text-xs text-muted-foreground">c/ IVA</p>
                      </div>
                    </div>
                  ))
                ) : (
                  <p className="text-muted-foreground text-center py-4">
                    Sem produtos
                  </p>
                )}
              </CardContent>
            </Card>

            {/* Notes */}
            {order.client_notes && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Observações</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-muted-foreground">{order.client_notes}</p>
                </CardContent>
              </Card>
            )}

            {/* Admin Notes (if rejected) */}
            {order.status === 'rejected' && order.rejection_reason && (
              <Card className="border-destructive">
                <CardHeader>
                  <CardTitle className="text-lg text-destructive">Motivo da Rejeição</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-muted-foreground">{order.rejection_reason}</p>
                </CardContent>
              </Card>
            )}
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Totals */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Resumo</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Subtotal (s/ IVA)</span>
                  <span>{order.total_net.toFixed(2)}€</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">IVA</span>
                  <span>{order.total_vat.toFixed(2)}€</span>
                </div>
                <div className="border-t pt-2 flex justify-between font-semibold text-lg">
                  <span>Total</span>
                  <span className="text-primary">{order.total_gross.toFixed(2)}€</span>
                </div>
              </CardContent>
            </Card>

            {/* Installment Info */}
            {order.installment_requested && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg flex items-center gap-2">
                    <CreditCard className="h-5 w-5" />
                    Prestações
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Nº de prestações</span>
                    <span>{order.installment_count}x</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Valor por prestação</span>
                    <span>{(order.total_gross / (order.installment_count || 1)).toFixed(2)}€</span>
                  </div>
                  {order.installment_notes && (
                    <p className="text-xs text-muted-foreground mt-2 pt-2 border-t">
                      {order.installment_notes}
                    </p>
                  )}
                </CardContent>
              </Card>
            )}

            {/* Timeline */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <Calendar className="h-5 w-5" />
                  Histórico
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex gap-3 text-sm">
                  <div className="w-2 h-2 rounded-full bg-primary mt-1.5" />
                  <div>
                    <p className="font-medium">Criada</p>
                    <p className="text-muted-foreground">
                      {format(new Date(order.created_at), "d MMM yyyy, HH:mm", { locale: pt })}
                    </p>
                  </div>
                </div>
                {order.submitted_at && (
                  <div className="flex gap-3 text-sm">
                    <div className="w-2 h-2 rounded-full bg-blue-500 mt-1.5" />
                    <div>
                      <p className="font-medium">Enviada</p>
                      <p className="text-muted-foreground">
                        {format(new Date(order.submitted_at), "d MMM yyyy, HH:mm", { locale: pt })}
                      </p>
                    </div>
                  </div>
                )}
                {order.approved_at && (
                  <div className="flex gap-3 text-sm">
                    <div className="w-2 h-2 rounded-full bg-green-500 mt-1.5" />
                    <div>
                      <p className="font-medium">Aprovada</p>
                      <p className="text-muted-foreground">
                        {format(new Date(order.approved_at), "d MMM yyyy, HH:mm", { locale: pt })}
                      </p>
                    </div>
                  </div>
                )}
                {order.rejected_at && (
                  <div className="flex gap-3 text-sm">
                    <div className="w-2 h-2 rounded-full bg-red-500 mt-1.5" />
                    <div>
                      <p className="font-medium">Rejeitada</p>
                      <p className="text-muted-foreground">
                        {format(new Date(order.rejected_at), "d MMM yyyy, HH:mm", { locale: pt })}
                      </p>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </ClientLayout>
  );
}
