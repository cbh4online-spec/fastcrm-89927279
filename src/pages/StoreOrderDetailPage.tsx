import { useParams, useNavigate } from "react-router-dom";
import { Helmet } from "react-helmet-async";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { useStoreOrderDetail } from "@/hooks/useStoreOrderDetail";
import { useUpdateStoreOrderStatus } from "@/hooks/useStoreOrders";
import { StoreOrderTimeline } from "@/components/store-orders/StoreOrderTimeline";
import { StoreOrderAssociations } from "@/components/store-orders/StoreOrderAssociations";
import { StoreOrderTracking } from "@/components/store-orders/StoreOrderTracking";
import { ReturnRequestManager } from "@/components/store-orders/ReturnRequestManager";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { ArrowLeft, Package, CheckCircle2, Truck, XCircle, Clock, Loader2 } from "lucide-react";
import { format } from "date-fns";
import { pt } from "date-fns/locale";
import { ORDER_STATUS_CONFIG } from "@/types/store-order";

export default function StoreOrderDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { data: order, isLoading } = useStoreOrderDetail(id);
  const updateStatus = useUpdateStoreOrderStatus();

  if (isLoading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center h-64"><Loader2 className="h-8 w-8 animate-spin text-muted-foreground" /></div>
      </DashboardLayout>
    );
  }

  if (!order) {
    return (
      <DashboardLayout>
        <div className="p-6">
          <Button variant="ghost" onClick={() => navigate("/dashboard/store-orders")} className="gap-2 mb-4">
            <ArrowLeft className="h-4 w-4" /> Voltar
          </Button>
          <p className="text-muted-foreground">Encomenda não encontrada.</p>
        </div>
      </DashboardLayout>
    );
  }

  const status = order.status as string;
  const statusConf = ORDER_STATUS_CONFIG[status] || { label: status, color: "bg-muted" };
  const items = Array.isArray(order.items) ? (order.items as Array<{ name: string; quantity: number; unit_price: number; sku?: string }>) : [];
  const handleStatus = (s: string) => updateStatus.mutate({ id: id!, status: s });

  return (
    <>
      <Helmet><title>Encomenda {(order.order_number as string) || (order.id as string).slice(0, 8)} | FastCRM</title></Helmet>
      <DashboardLayout>
        <div className="p-6 space-y-6">
          {/* Header */}
          <div className="flex items-center justify-between flex-wrap gap-4">
            <div className="flex items-center gap-3">
              <Button variant="ghost" size="icon" onClick={() => navigate("/dashboard/store-orders")}>
                <ArrowLeft className="h-4 w-4" />
              </Button>
              <div>
                <h1 className="text-xl font-bold font-mono">
                  Encomenda {(order.order_number as string) || (order.id as string).slice(0, 8)}
                </h1>
                <p className="text-sm text-muted-foreground">
                  {format(new Date(order.created_at as string), "dd MMM yyyy, HH:mm", { locale: pt })}
                </p>
              </div>
              <Badge variant="outline" className={statusConf.color}>{statusConf.label}</Badge>
            </div>
            <div className="flex gap-2 flex-wrap">
              {status === "pending" && <Button size="sm" onClick={() => handleStatus("paid")}><CheckCircle2 className="h-4 w-4 mr-1" />Pago</Button>}
              {status === "paid" && <Button size="sm" onClick={() => handleStatus("processing")}><Package className="h-4 w-4 mr-1" />Preparar</Button>}
              {status === "processing" && <Button size="sm" onClick={() => handleStatus("shipped")}><Truck className="h-4 w-4 mr-1" />Enviar</Button>}
              {status === "shipped" && <Button size="sm" onClick={() => handleStatus("delivered")}><CheckCircle2 className="h-4 w-4 mr-1" />Entregue</Button>}
              {!["cancelled", "refunded", "delivered"].includes(status) && (
                <Button size="sm" variant="destructive" onClick={() => handleStatus("cancelled")}><XCircle className="h-4 w-4 mr-1" />Cancelar</Button>
              )}
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Main content */}
            <div className="lg:col-span-2 space-y-6">
              {/* Customer */}
              <Card>
                <CardHeader className="pb-3"><CardTitle className="text-base">Cliente</CardTitle></CardHeader>
                <CardContent className="text-sm space-y-1">
                  <p className="font-medium">{order.customer_name as string}</p>
                  <p className="text-muted-foreground">{order.customer_email as string}</p>
                  {order.customer_phone && <p className="text-muted-foreground">{order.customer_phone as string}</p>}
                </CardContent>
              </Card>

              {/* Items */}
              <Card>
                <CardHeader className="pb-3"><CardTitle className="text-base">Itens ({items.length})</CardTitle></CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    {items.map((item, i) => (
                      <div key={i} className="flex justify-between text-sm">
                        <span>
                          {item.name} × {item.quantity}
                          {item.sku && <span className="text-muted-foreground ml-1">({item.sku})</span>}
                        </span>
                        <span className="font-medium">€{(item.unit_price * item.quantity).toFixed(2)}</span>
                      </div>
                    ))}
                  </div>
                  <Separator className="my-3" />
                  <div className="space-y-1 text-sm">
                    {order.subtotal != null && (
                      <div className="flex justify-between"><span className="text-muted-foreground">Subtotal</span><span>€{(order.subtotal as number).toFixed(2)}</span></div>
                    )}
                    {(order.shipping_cost as number) > 0 && (
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Envio{order.shipping_method_name ? ` (${order.shipping_method_name})` : ""}</span>
                        <span>€{(order.shipping_cost as number).toFixed(2)}</span>
                      </div>
                    )}
                    {order.tax_total != null && (
                      <div className="flex justify-between"><span className="text-muted-foreground">IVA</span><span>€{(order.tax_total as number).toFixed(2)}</span></div>
                    )}
                    <div className="flex justify-between font-semibold text-base pt-1">
                      <span>Total</span>
                      <span>€{(order.total as number)?.toFixed(2)}</span>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Addresses */}
              {(order.billing_address || order.shipping_address) && (
                <Card>
                  <CardHeader className="pb-3"><CardTitle className="text-base">Moradas</CardTitle></CardHeader>
                  <CardContent className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
                    {order.billing_address && (
                      <div>
                        <p className="font-medium mb-1">Faturação</p>
                        <p className="text-muted-foreground">{Object.values(order.billing_address as Record<string, string>).filter(Boolean).join(", ")}</p>
                      </div>
                    )}
                    {order.shipping_address && (
                      <div>
                        <p className="font-medium mb-1">Envio</p>
                        <p className="text-muted-foreground">{Object.values(order.shipping_address as Record<string, string>).filter(Boolean).join(", ")}</p>
                      </div>
                    )}
                  </CardContent>
                </Card>
              )}

              {/* Dates */}
              <Card>
                <CardHeader className="pb-3"><CardTitle className="text-base flex items-center gap-2"><Clock className="h-4 w-4" />Datas</CardTitle></CardHeader>
                <CardContent className="text-sm space-y-1 text-muted-foreground">
                  <p>Criada: {format(new Date(order.created_at as string), "dd/MM/yyyy HH:mm", { locale: pt })}</p>
                  {order.paid_at && <p>Paga: {format(new Date(order.paid_at as string), "dd/MM/yyyy HH:mm", { locale: pt })}</p>}
                  {order.shipped_at && <p>Enviada: {format(new Date(order.shipped_at as string), "dd/MM/yyyy HH:mm", { locale: pt })}</p>}
                  {order.completed_at && <p>Concluída: {format(new Date(order.completed_at as string), "dd/MM/yyyy HH:mm", { locale: pt })}</p>}
                  {order.refunded_at && <p>Reembolsada: {format(new Date(order.refunded_at as string), "dd/MM/yyyy HH:mm", { locale: pt })}</p>}
                </CardContent>
              </Card>
            </div>

            {/* Sidebar */}
            <div className="space-y-6">
              <StoreOrderTracking
                orderId={id!}
                trackingNumber={order.tracking_number as string | null}
                trackingCarrier={order.tracking_carrier as string | null}
                trackingUrl={order.tracking_url as string | null}
                trackingAddedAt={order.tracking_added_at as string | null}
                customerEmail={order.customer_email as string}
                customerName={order.customer_name as string}
                orderNumber={order.order_number as string | null}
              />
              <ReturnRequestManager
                orderId={id!}
                orderItems={items}
                orderTotal={order.total as number}
                orderStatus={status}
              />
              <StoreOrderTimeline orderId={id!} />
              <StoreOrderAssociations order={order} />
            </div>
          </div>
        </div>
      </DashboardLayout>
    </>
  );
}
