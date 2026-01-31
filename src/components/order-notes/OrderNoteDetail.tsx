import { format } from "date-fns";
import { pt } from "date-fns/locale";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { OrderNoteStatusBadge } from "./OrderNoteStatusBadge";
import { OrderNoteStatusFlow } from "./OrderNoteStatusFlow";
import { OrderNoteActions } from "./OrderNoteActions";
import { InstallmentApproval } from "./InstallmentApproval";
import { OrderNotePDF } from "./OrderNotePDF";
import { useOrderNote, useOrderNoteActions } from "@/hooks/useOrderNotes";
import { useWorkspace } from "@/contexts/WorkspaceContext";
import {
  User,
  Mail,
  Phone,
  FileText,
  MapPin,
  Package,
  Calendar,
  MessageSquare,
  Save,
  Loader2,
} from "lucide-react";
import { useState } from "react";

interface OrderNoteDetailProps {
  orderId: string;
}

export function OrderNoteDetail({ orderId }: OrderNoteDetailProps) {
  const { order, loading, refetch } = useOrderNote(orderId);
  const { addAdminNote, isUpdating } = useOrderNoteActions();
  const { currentWorkspace } = useWorkspace();
  const [newNote, setNewNote] = useState("");

  if (loading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-24 w-full" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  if (!order) {
    return (
      <div className="text-center py-12 text-muted-foreground">
        Encomenda não encontrada
      </div>
    );
  }

  const handleAddNote = async () => {
    if (!newNote.trim()) return;
    const success = await addAdminNote(orderId, newNote);
    if (success) {
      setNewNote("");
      refetch();
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold font-mono">{order.order_number}</h1>
            <OrderNoteStatusBadge status={order.status} size="lg" />
          </div>
          <p className="text-muted-foreground mt-1">
            Criada em{" "}
            {format(new Date(order.created_at), "dd MMMM yyyy 'às' HH:mm", {
              locale: pt,
            })}
          </p>
        </div>
        <OrderNotePDF order={order} workspaceName={currentWorkspace?.name} />
      </div>

      {/* Status Flow */}
      <Card>
        <CardContent className="pt-6">
          <OrderNoteStatusFlow
            currentStatus={order.status}
            hasInstallmentRequest={order.installment_requested}
          />
        </CardContent>
      </Card>

      {/* Installment Request Alert */}
      {order.installment_requested && <InstallmentApproval order={order} />}

      {/* Actions */}
      <Card>
        <CardContent className="pt-6">
          <OrderNoteActions order={order} onSuccess={refetch} />
        </CardContent>
      </Card>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Client Info */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <User className="h-5 w-5" />
              Dados do Cliente
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <p className="font-medium">{order.client_user?.name}</p>
              <div className="flex items-center gap-2 text-sm text-muted-foreground mt-1">
                <Mail className="h-4 w-4" />
                {order.client_user?.email}
              </div>
              {order.client_user?.phone && (
                <div className="flex items-center gap-2 text-sm text-muted-foreground mt-1">
                  <Phone className="h-4 w-4" />
                  {order.client_user?.phone}
                </div>
              )}
              {order.client_user?.tax_id && (
                <div className="flex items-center gap-2 text-sm text-muted-foreground mt-1">
                  <FileText className="h-4 w-4" />
                  NIF: {order.client_user?.tax_id}
                </div>
              )}
            </div>

            {order.billing_address && Object.keys(order.billing_address).length > 0 && (
              <>
                <Separator />
                <div>
                  <p className="text-sm font-medium mb-1">Endereço de Faturação</p>
                  <div className="text-sm text-muted-foreground">
                    {order.billing_address.street && <p>{order.billing_address.street}</p>}
                    {order.billing_address.postal_code && order.billing_address.city && (
                      <p>
                        {order.billing_address.postal_code} {order.billing_address.city}
                      </p>
                    )}
                    {order.billing_address.country && <p>{order.billing_address.country}</p>}
                  </div>
                </div>
              </>
            )}
          </CardContent>
        </Card>

        {/* Order Items */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Package className="h-5 w-5" />
              Produtos ({order.items?.length || 0})
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="divide-y">
              {order.items?.map((item) => (
                <div key={item.id} className="flex items-center gap-4 py-3">
                  {item.product_image_url ? (
                    <img
                      src={item.product_image_url}
                      alt={item.product_name}
                      className="w-16 h-16 object-cover rounded-lg"
                    />
                  ) : (
                    <div className="w-16 h-16 bg-muted rounded-lg flex items-center justify-center">
                      <Package className="h-6 w-6 text-muted-foreground" />
                    </div>
                  )}
                  <div className="flex-1 min-w-0">
                    <p className="font-medium truncate">{item.product_name}</p>
                    {item.product_sku && (
                      <p className="text-xs text-muted-foreground">
                        SKU: {item.product_sku}
                      </p>
                    )}
                    <p className="text-sm text-muted-foreground">
                      {item.quantity} × €{item.unit_price_net?.toFixed(2)}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="font-medium">€{item.line_total_net?.toFixed(2)}</p>
                    <p className="text-xs text-muted-foreground">
                      +€{item.vat_amount?.toFixed(2)} IVA
                    </p>
                  </div>
                </div>
              ))}
            </div>

            <Separator className="my-4" />

            {/* Totals */}
            <div className="space-y-2 text-right">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Subtotal (s/ IVA)</span>
                <span>€{order.total_net?.toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">IVA</span>
                <span>€{order.total_vat?.toFixed(2)}</span>
              </div>
              <Separator />
              <div className="flex justify-between text-lg font-semibold">
                <span>Total</span>
                <span className="text-primary">€{order.total_gross?.toFixed(2)}</span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Notes Section */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Client Notes */}
        {order.client_notes && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <MessageSquare className="h-5 w-5" />
                Notas do Cliente
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground whitespace-pre-wrap">
                {order.client_notes}
              </p>
            </CardContent>
          </Card>
        )}

        {/* Admin Notes */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <FileText className="h-5 w-5" />
              Notas Internas
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {order.admin_notes && (
              <div className="bg-muted/50 rounded-lg p-3 text-sm whitespace-pre-wrap">
                {order.admin_notes}
              </div>
            )}
            <div className="flex gap-2">
              <Textarea
                placeholder="Adicionar nota interna..."
                value={newNote}
                onChange={(e) => setNewNote(e.target.value)}
                rows={2}
              />
              <Button
                onClick={handleAddNote}
                disabled={!newNote.trim() || isUpdating}
                size="icon"
              >
                {isUpdating ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Save className="h-4 w-4" />
                )}
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Rejection Reason */}
      {order.status === "rejected" && order.rejection_reason && (
        <Card className="border-red-200 bg-red-50">
          <CardHeader>
            <CardTitle className="text-red-700">Motivo da Rejeição</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-red-700">{order.rejection_reason}</p>
            {order.rejected_at && (
              <p className="text-sm text-red-500 mt-2">
                Rejeitada em{" "}
                {format(new Date(order.rejected_at), "dd/MM/yyyy 'às' HH:mm", {
                  locale: pt,
                })}
              </p>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
