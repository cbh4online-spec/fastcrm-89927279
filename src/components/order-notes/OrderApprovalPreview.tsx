import { format } from "date-fns";
import { pt } from "date-fns/locale";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { OrderAuditTrail } from "./OrderAuditTrail";
import type { OrderNote } from "@/types/order-note";
import { orderNoteStatusConfig } from "@/types/order-note";
import {
  User,
  Mail,
  Phone,
  FileText,
  Package,
  Calendar,
  CreditCard,
  MapPin,
  Check,
  X,
  ExternalLink,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Link } from "react-router-dom";

interface OrderApprovalPreviewProps {
  order: OrderNote | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onApprove: () => void;
  onReject: () => void;
}

export function OrderApprovalPreview({
  order,
  open,
  onOpenChange,
  onApprove,
  onReject,
}: OrderApprovalPreviewProps) {
  if (!order) return null;

  const statusConfig = orderNoteStatusConfig[order.status];

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full sm:max-w-xl overflow-hidden flex flex-col">
        <SheetHeader className="pb-4">
          <div className="flex items-center gap-3">
            <SheetTitle className="font-mono">{order.order_number}</SheetTitle>
            <Badge className={cn("text-xs", statusConfig.bgColor, statusConfig.color)}>
              {statusConfig.labelPT}
            </Badge>
          </div>
          <SheetDescription className="flex items-center gap-2">
            <Calendar className="h-4 w-4" />
            {order.submitted_at
              ? format(new Date(order.submitted_at), "dd MMM yyyy, HH:mm", { locale: pt })
              : format(new Date(order.created_at), "dd MMM yyyy, HH:mm", { locale: pt })}
          </SheetDescription>
        </SheetHeader>

        <ScrollArea className="flex-1 -mx-6 px-6">
          <div className="space-y-6 pb-6">
            {/* Client Info */}
            <div className="rounded-lg border p-4 space-y-3">
              <h4 className="font-medium flex items-center gap-2 text-sm">
                <User className="h-4 w-4 text-muted-foreground" />
                Cliente
              </h4>
              <div className="space-y-1 text-sm">
                <p className="font-medium">{order.client_user?.name || "—"}</p>
                {order.client_user?.email && (
                  <p className="text-muted-foreground flex items-center gap-1.5">
                    <Mail className="h-3.5 w-3.5" />
                    {order.client_user.email}
                  </p>
                )}
                {order.client_user?.phone && (
                  <p className="text-muted-foreground flex items-center gap-1.5">
                    <Phone className="h-3.5 w-3.5" />
                    {order.client_user.phone}
                  </p>
                )}
                {order.client_user?.tax_id && (
                  <p className="text-muted-foreground flex items-center gap-1.5">
                    <FileText className="h-3.5 w-3.5" />
                    NIF: {order.client_user.tax_id}
                  </p>
                )}
              </div>

              {order.shipping_address && Object.keys(order.shipping_address).length > 0 && (
                <div className="pt-2 border-t">
                  <p className="text-xs font-medium text-muted-foreground mb-1 flex items-center gap-1">
                    <MapPin className="h-3 w-3" />
                    Entrega
                  </p>
                  <p className="text-sm">
                    {order.shipping_address.street}
                    {order.shipping_address.city && `, ${order.shipping_address.city}`}
                    {order.shipping_address.postal_code && ` - ${order.shipping_address.postal_code}`}
                  </p>
                </div>
              )}
            </div>

            {/* Installment Request */}
            {order.installment_requested && (
              <div className="rounded-lg border border-amber-200 bg-amber-50 p-4">
                <div className="flex items-center gap-2 mb-2">
                  <CreditCard className="h-4 w-4 text-amber-600" />
                  <span className="font-medium text-amber-800">Pedido de Prestações</span>
                </div>
                <div className="text-sm text-amber-700 space-y-1">
                  <p>Nº de prestações: <strong>{order.installment_count}</strong></p>
                  {order.installment_notes && (
                    <p>Justificação: {order.installment_notes}</p>
                  )}
                </div>
              </div>
            )}

            {/* Products */}
            <div className="space-y-3">
              <h4 className="font-medium flex items-center gap-2 text-sm">
                <Package className="h-4 w-4 text-muted-foreground" />
                Produtos ({order.items?.length || 0})
              </h4>
              <div className="rounded-lg border divide-y">
                {order.items?.map((item) => (
                  <div key={item.id} className="flex items-center gap-3 p-3">
                    {item.product_image_url ? (
                      <img
                        src={item.product_image_url}
                        alt={item.product_name}
                        className="w-12 h-12 rounded object-cover"
                      />
                    ) : (
                      <div className="w-12 h-12 rounded bg-muted flex items-center justify-center">
                        <Package className="h-5 w-5 text-muted-foreground" />
                      </div>
                    )}
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{item.product_name}</p>
                      <p className="text-xs text-muted-foreground">
                        {item.quantity} × €{item.unit_price_net?.toFixed(2)}
                      </p>
                    </div>
                    <div className="text-right text-sm">
                      <p className="font-medium">€{item.line_total_net?.toFixed(2)}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Totals */}
            <div className="rounded-lg bg-muted/50 p-4 space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Subtotal</span>
                <span>€{order.total_net?.toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">IVA</span>
                <span>€{order.total_vat?.toFixed(2)}</span>
              </div>
              <Separator />
              <div className="flex justify-between font-semibold">
                <span>Total</span>
                <span className="text-primary text-lg">€{order.total_gross?.toFixed(2)}</span>
              </div>
            </div>

            {/* Client Notes */}
            {order.client_notes && (
              <div className="rounded-lg border p-4">
                <h4 className="font-medium text-sm mb-2">Notas do Cliente</h4>
                <p className="text-sm text-muted-foreground whitespace-pre-wrap">
                  {order.client_notes}
                </p>
              </div>
            )}

            {/* Audit Trail */}
            <OrderAuditTrail orderId={order.id} maxHeight="200px" />
          </div>
        </ScrollArea>

        {/* Actions */}
        <div className="border-t pt-4 flex flex-col gap-3">
          <div className="flex gap-2">
            <Button
              onClick={onApprove}
              className="flex-1 gap-2 bg-green-600 hover:bg-green-700"
            >
              <Check className="h-4 w-4" />
              Aprovar
            </Button>
            <Button
              onClick={onReject}
              variant="destructive"
              className="flex-1 gap-2"
            >
              <X className="h-4 w-4" />
              Rejeitar
            </Button>
          </div>
          <Link to={`/dashboard/order-notes/${order.id}`} className="w-full">
            <Button variant="outline" className="w-full gap-2">
              <ExternalLink className="h-4 w-4" />
              Ver Detalhes Completos
            </Button>
          </Link>
        </div>
      </SheetContent>
    </Sheet>
  );
}
