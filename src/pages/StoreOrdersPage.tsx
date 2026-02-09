import { useState } from "react";
import { Helmet } from "react-helmet-async";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { useStoreOrders, useUpdateStoreOrderStatus } from "@/hooks/useStoreOrders";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Search, ShoppingBag, MoreHorizontal, Eye, Package, Clock, CheckCircle2, XCircle, Truck } from "lucide-react";
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

const statusConfig: Record<string, { label: string; color: string; icon: React.ReactNode }> = {
  pending: { label: "Pendente", color: "bg-yellow-100 text-yellow-800 border-yellow-200", icon: <Clock className="h-3 w-3" /> },
  paid: { label: "Pago", color: "bg-green-100 text-green-800 border-green-200", icon: <CheckCircle2 className="h-3 w-3" /> },
  processing: { label: "Em Preparação", color: "bg-blue-100 text-blue-800 border-blue-200", icon: <Package className="h-3 w-3" /> },
  shipped: { label: "Enviado", color: "bg-purple-100 text-purple-800 border-purple-200", icon: <Truck className="h-3 w-3" /> },
  delivered: { label: "Entregue", color: "bg-emerald-100 text-emerald-800 border-emerald-200", icon: <CheckCircle2 className="h-3 w-3" /> },
  cancelled: { label: "Cancelado", color: "bg-red-100 text-red-800 border-red-200", icon: <XCircle className="h-3 w-3" /> },
  refunded: { label: "Reembolsado", color: "bg-gray-100 text-gray-800 border-gray-200", icon: <XCircle className="h-3 w-3" /> },
};

function StatusBadge({ status }: { status: string }) {
  const config = statusConfig[status] || { label: status, color: "bg-muted text-muted-foreground", icon: null };
  return (
    <Badge variant="outline" className={`gap-1 ${config.color}`}>
      {config.icon}
      {config.label}
    </Badge>
  );
}

export default function StoreOrdersPage() {
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [selectedOrder, setSelectedOrder] = useState<StoreOrder | null>(null);
  const { data: orders = [], isLoading } = useStoreOrders({ status: statusFilter, search });
  const updateStatus = useUpdateStoreOrderStatus();

  const handleStatusChange = (orderId: string, newStatus: string) => {
    updateStatus.mutate({ id: orderId, status: newStatus });
  };

  return (
    <>
      <Helmet>
        <title>Encomendas da Loja | FastCRM</title>
      </Helmet>
      <DashboardLayout>
          <main className="p-6 space-y-6">
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-2xl font-bold flex items-center gap-2">
                  <ShoppingBag className="h-6 w-6" />
                  Encomendas da Loja
                </h1>
                <p className="text-sm text-muted-foreground">
                  Gerir encomendas da loja online
                </p>
              </div>
            </div>

            {/* Filters */}
            <div className="flex flex-col sm:flex-row gap-3">
              <div className="relative flex-1 max-w-sm">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Pesquisar por nome, email, nº..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="pl-9"
                />
              </div>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-44">
                  <SelectValue placeholder="Estado" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos</SelectItem>
                  {Object.entries(statusConfig).map(([key, { label }]) => (
                    <SelectItem key={key} value={key}>{label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Table */}
            <div className="border rounded-lg">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Encomenda</TableHead>
                    <TableHead>Cliente</TableHead>
                    <TableHead>Itens</TableHead>
                    <TableHead className="text-right">Total</TableHead>
                    <TableHead>Estado</TableHead>
                    <TableHead>Data</TableHead>
                    <TableHead className="w-10" />
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {isLoading ? (
                    <TableRow>
                      <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                        A carregar...
                      </TableCell>
                    </TableRow>
                  ) : orders.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                        Sem encomendas
                      </TableCell>
                    </TableRow>
                  ) : (
                    orders.map((order) => (
                      <TableRow key={order.id} className="cursor-pointer hover:bg-muted/50" onClick={() => setSelectedOrder(order)}>
                        <TableCell className="font-mono text-sm">
                          {order.order_number || order.id.slice(0, 8)}
                        </TableCell>
                        <TableCell>
                          <div>
                            <p className="font-medium text-sm">{order.customer_name}</p>
                            <p className="text-xs text-muted-foreground">{order.customer_email}</p>
                          </div>
                        </TableCell>
                        <TableCell className="text-sm">
                          {Array.isArray(order.items) ? order.items.length : 0} item(s)
                        </TableCell>
                        <TableCell className="text-right font-semibold">
                          {order.currency === "EUR" ? "€" : order.currency}{order.total?.toFixed(2)}
                        </TableCell>
                        <TableCell>
                          <StatusBadge status={order.status} />
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground">
                          {format(new Date(order.created_at), "dd MMM yyyy HH:mm", { locale: pt })}
                        </TableCell>
                        <TableCell>
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
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
          </main>
      </DashboardLayout>

      {/* Order Detail Dialog */}
      <OrderDetailDialog order={selectedOrder} onClose={() => setSelectedOrder(null)} />
    </>
  );
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
            <StatusBadge status={order.status} />
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Customer */}
          <div>
            <h3 className="text-sm font-semibold mb-1">Cliente</h3>
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
