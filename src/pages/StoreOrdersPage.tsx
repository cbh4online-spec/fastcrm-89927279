import { useState } from "react";
import { Helmet } from "react-helmet-async";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { useStoreOrders, useUpdateStoreOrderStatus } from "@/hooks/useStoreOrders";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { ShoppingBag, MoreHorizontal, Eye, Package, Clock, CheckCircle2, XCircle, Truck, UserCircle } from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import { format } from "date-fns";
import { pt } from "date-fns/locale";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Separator } from "@/components/ui/separator";
import type { StoreOrder } from "@/hooks/useStoreOrders";
import {
  DocumentListLayout,
  DocumentRow,
  DocumentStatusBadge,
  type DocumentStatusTone,
} from "@/components/documents/listing";

const statusConfig: Record<string, { label: string; tone: DocumentStatusTone; icon: React.ReactNode }> = {
  pending: { label: "Pendente", tone: "pending", icon: <Clock className="h-3 w-3" /> },
  paid: { label: "Pago", tone: "paid", icon: <CheckCircle2 className="h-3 w-3" /> },
  processing: { label: "Em Preparação", tone: "sent", icon: <Package className="h-3 w-3" /> },
  shipped: { label: "Enviado", tone: "sent", icon: <Truck className="h-3 w-3" /> },
  delivered: { label: "Entregue", tone: "paid", icon: <CheckCircle2 className="h-3 w-3" /> },
  cancelled: { label: "Cancelado", tone: "cancelled", icon: <XCircle className="h-3 w-3" /> },
  refunded: { label: "Reembolsado", tone: "neutral", icon: <XCircle className="h-3 w-3" /> },
};

export default function StoreOrdersPage() {
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [selectedOrder, setSelectedOrder] = useState<StoreOrder | null>(null);
  const { data: orders = [], isLoading } = useStoreOrders({ status: statusFilter, search });
  const updateStatus = useUpdateStoreOrderStatus();
  const navigate = useNavigate();

  const handleStatusChange = (orderId: string, newStatus: string, oldStatus?: string) => {
    updateStatus.mutate({ id: orderId, status: newStatus, oldStatus });
  };

  return (
    <>
      <Helmet>
        <title>Encomendas da Loja | FastCRM</title>
      </Helmet>
      <DashboardLayout>
        <DocumentListLayout
          title="Encomendas da Loja"
          searchValue={search}
          onSearchChange={setSearch}
          searchPlaceholder="Pesquisar por nome, email, nº..."
          primaryAction={
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="h-12 w-44 rounded-full">
                <SelectValue placeholder="Estado" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos</SelectItem>
                {Object.entries(statusConfig).map(([key, { label }]) => (
                  <SelectItem key={key} value={key}>{label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          }
        >
          {isLoading ? (
            <Card className="p-8 text-center text-muted-foreground">A carregar…</Card>
          ) : orders.length === 0 ? (
            <Card className="p-12 text-center text-muted-foreground">
              <ShoppingBag className="h-12 w-12 mx-auto mb-3 opacity-40" />
              Sem encomendas
            </Card>
          ) : (
            orders.map((order) => {
              const cfg = statusConfig[order.status] || { label: order.status, tone: "neutral" as DocumentStatusTone, icon: null };
              const itemsCount = Array.isArray(order.items) ? order.items.length : 0;
              return (
                <DocumentRow
                  key={order.id}
                  statusBadge={<DocumentStatusBadge label={cfg.label} tone={cfg.tone} />}
                  number={order.order_number || order.id.slice(0, 8)}
                  subtitle={`${itemsCount} item${itemsCount === 1 ? "" : "s"}`}
                  clientName={order.customer_name}
                  clientSubtitle={order.customer_email}
                  issueDate={format(new Date(order.created_at), "dd/MM/yyyy", { locale: pt })}
                  dueDate={order.customer_phone || undefined}
                  totalPrimary={`${order.currency === "EUR" ? "€" : order.currency}${order.total?.toFixed(2)}`}
                  onClick={() => navigate(`/dashboard/store-orders/${order.id}`)}
                  action={
                    <div className="flex items-center gap-1">
                      {order.contact_id && (
                        <Link
                          to={`/contacts/${order.contact_id}`}
                          onClick={(e) => e.stopPropagation()}
                          title="Ver contacto no CRM"
                        >
                          <UserCircle className="h-4 w-4 text-primary hover:text-primary/80" />
                        </Link>
                      )}
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                          <Button variant="ghost" size="icon" className="h-8 w-8">
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={(e) => { e.stopPropagation(); setSelectedOrder(order); }}>
                            <Eye className="h-4 w-4 mr-2" />
                            Ver Detalhes
                          </DropdownMenuItem>
                          {order.status === "pending" && (
                            <DropdownMenuItem onClick={(e) => { e.stopPropagation(); handleStatusChange(order.id, "paid"); }}>
                              <CheckCircle2 className="h-4 w-4 mr-2" />
                              Marcar como Pago
                            </DropdownMenuItem>
                          )}
                          {order.status === "paid" && (
                            <DropdownMenuItem onClick={(e) => { e.stopPropagation(); handleStatusChange(order.id, "processing"); }}>
                              <Package className="h-4 w-4 mr-2" />
                              Em Preparação
                            </DropdownMenuItem>
                          )}
                          {order.status === "processing" && (
                            <DropdownMenuItem onClick={(e) => { e.stopPropagation(); handleStatusChange(order.id, "shipped"); }}>
                              <Truck className="h-4 w-4 mr-2" />
                              Marcar como Enviado
                            </DropdownMenuItem>
                          )}
                          {order.status === "shipped" && (
                            <DropdownMenuItem onClick={(e) => { e.stopPropagation(); handleStatusChange(order.id, "delivered"); }}>
                              <CheckCircle2 className="h-4 w-4 mr-2" />
                              Marcar como Entregue
                            </DropdownMenuItem>
                          )}
                          {!["cancelled", "refunded", "delivered"].includes(order.status) && (
                            <DropdownMenuItem
                              className="text-destructive"
                              onClick={(e) => { e.stopPropagation(); handleStatusChange(order.id, "cancelled"); }}
                            >
                              <XCircle className="h-4 w-4 mr-2" />
                              Cancelar
                            </DropdownMenuItem>
                          )}
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  }
                />
              );
            })
          )}
        </DocumentListLayout>
      </DashboardLayout>

      {/* Order Detail Dialog */}
      <OrderDetailDialog order={selectedOrder} onClose={() => setSelectedOrder(null)} />
    </>
  );
}

function StatusBadgeInline({ status }: { status: string }) {
  const cfg = statusConfig[status] || { label: status, tone: "neutral" as DocumentStatusTone, icon: null };
  return <DocumentStatusBadge label={cfg.label} tone={cfg.tone} />;
}

function OrderDetailDialog({ order, onClose }: { order: StoreOrder | null; onClose: () => void }) {
  if (!order) return null;

  const items = Array.isArray(order.items) ? order.items : [];

  return (
    <Dialog open={!!order} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            Encomenda {order.order_number || order.id.slice(0, 8)}
            <StatusBadgeInline status={order.status} />
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Customer */}
          <div>
            <div className="flex items-center justify-between mb-1">
              <h3 className="text-sm font-semibold">Cliente</h3>
              {order.contact_id && (
                <Link
                  to={`/contacts/${order.contact_id}`}
                  className="text-xs text-primary hover:underline flex items-center gap-1"
                >
                  <UserCircle className="h-3.5 w-3.5" />
                  Ver no CRM
                </Link>
              )}
            </div>
            <p className="text-sm">{order.customer_name}</p>
            <p className="text-sm text-muted-foreground">{order.customer_email}</p>
            {order.customer_phone && <p className="text-sm text-muted-foreground">{order.customer_phone}</p>}
          </div>

          <Separator />

          {/* Items */}
          <div>
            <h3 className="text-sm font-semibold mb-2">Itens</h3>
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
          </div>

          <Separator />

          {/* Total */}
          <div className="flex justify-between font-semibold">
            <span>Total</span>
            <span>{order.currency === "EUR" ? "€" : order.currency}{order.total?.toFixed(2)}</span>
          </div>

          {/* Shipping */}
          {order.shipping_address && (
            <>
              <Separator />
              <div>
                <h3 className="text-sm font-semibold mb-1">Morada de Envio</h3>
                <p className="text-sm text-muted-foreground">
                  {Object.values(order.shipping_address).filter(Boolean).join(", ")}
                </p>
              </div>
            </>
          )}

          {/* Dates */}
          <div className="text-xs text-muted-foreground space-y-1">
            <p>Criada: {format(new Date(order.created_at), "dd/MM/yyyy HH:mm", { locale: pt })}</p>
            {order.paid_at && <p>Paga: {format(new Date(order.paid_at), "dd/MM/yyyy HH:mm", { locale: pt })}</p>}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

