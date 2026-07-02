import { format } from "date-fns";
import { pt } from "date-fns/locale";
import { useNavigate } from "react-router-dom";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { IXCard } from "@/components/entity/ix/IXCard";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { OrderNoteStatusBadge } from "./OrderNoteStatusBadge";
import { OrderNoteStatusFlow } from "./OrderNoteStatusFlow";
import { OrderNoteActions } from "./OrderNoteActions";
import { InstallmentApproval } from "./InstallmentApproval";
import { OrderNotePDF } from "./OrderNotePDF";
import { useOrderNote, useOrderNoteActions } from "@/hooks/useOrderNotes";
import { useWorkspace } from "@/contexts/WorkspaceContext";
import { supabase } from "@/integrations/supabase/client";
import type { Json } from "@/integrations/supabase/types";
import { toast } from "sonner";
import { EditClientDataDialog } from "./EditClientDataDialog";
import { EditOrderItemsDialog } from "./EditOrderItemsDialog";
import {
  Mail,
  Phone,
  FileText,
  Package,
  MessageSquare,
  Save,
  Loader2,
  Copy,
  Pencil,
  MoreHorizontal,
} from "lucide-react";
import { useState } from "react";

interface OrderNoteDetailProps {
  orderId: string;
}

export function OrderNoteDetail({ orderId }: OrderNoteDetailProps) {
  const { order, loading, refetch } = useOrderNote(orderId);
  const { addAdminNote, isUpdating } = useOrderNoteActions();
  const { currentWorkspace } = useWorkspace();
  const navigate = useNavigate();
  const [newNote, setNewNote] = useState("");
  const [isDuplicating, setIsDuplicating] = useState(false);
  const [editClientOpen, setEditClientOpen] = useState(false);
  const [editItemsOpen, setEditItemsOpen] = useState(false);

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

  const handleDuplicateOrder = async () => {
    if (!order || !order.items || order.items.length === 0) {
      toast.error("Esta encomenda não tem produtos para duplicar");
      return;
    }

    setIsDuplicating(true);

    try {
      // Generate new order number
      const timestamp = Date.now().toString().slice(-8);
      const random = Math.random().toString(36).substring(2, 6).toUpperCase();
      const newOrderNumber = `NE-${timestamp}-${random}`;

      // Create new order note as draft
      const { data: newOrder, error: orderError } = await supabase
        .from("order_notes")
        .insert([{
          workspace_id: order.workspace_id,
          client_user_id: order.client_user_id,
          order_number: newOrderNumber,
          status: "draft" as const,
          total_net: order.total_net,
          total_vat: order.total_vat,
          total_gross: order.total_gross,
          currency: order.currency,
          billing_address: order.billing_address as Json,
          shipping_address: order.shipping_address as Json,
          client_notes: order.client_notes,
          admin_notes: `Duplicada da encomenda ${order.order_number}`,
        }])
        .select()
        .single();

      if (orderError) throw orderError;

      // Copy items
      const itemsToInsert = order.items.map((item, index) => ({
        order_note_id: newOrder.id,
        workspace_id: order.workspace_id,
        product_id: item.product_id,
        product_name: item.product_name,
        product_sku: item.product_sku,
        product_image_url: item.product_image_url,
        quantity: item.quantity,
        unit_price_net: item.unit_price_net,
        vat_rate: item.vat_rate,
        vat_amount: item.vat_amount,
        line_total_net: item.line_total_net,
        line_total_gross: item.line_total_gross,
        position: index,
        notes: item.notes,
      }));

      const { error: itemsError } = await supabase
        .from("order_note_items")
        .insert(itemsToInsert);

      if (itemsError) throw itemsError;

      toast.success("Encomenda duplicada com sucesso!", {
        action: {
          label: "Ver encomenda",
          onClick: () => navigate(`/dashboard/order-notes/${newOrder.id}`),
        },
      });

      navigate(`/dashboard/order-notes/${newOrder.id}`);
    } catch (err) {
      console.error("Error duplicating order:", err);
      toast.error("Erro ao duplicar encomenda");
    } finally {
      setIsDuplicating(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header IX */}
      <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
        <div className="min-w-0">
          <div className="flex items-center gap-3 flex-wrap">
            <h1 className="text-3xl font-bold tracking-tight font-mono">{order.order_number}</h1>
            <OrderNoteStatusBadge status={order.status} size="lg" />
          </div>
          <p className="text-sm text-muted-foreground mt-1">
            Criada em{" "}
            {format(new Date(order.created_at), "dd MMMM yyyy 'às' HH:mm", { locale: pt })}
          </p>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <OrderNotePDF order={order} workspaceName={currentWorkspace?.name} />
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="icon" aria-label="Mais ações">
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={handleDuplicateOrder} disabled={isDuplicating}>
                {isDuplicating ? (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                ) : (
                  <Copy className="h-4 w-4 mr-2" />
                )}
                Duplicar encomenda
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      {/* Status Flow */}
      <IXCard>
        <OrderNoteStatusFlow
          currentStatus={order.status}
          hasInstallmentRequest={order.installment_requested}
        />
      </IXCard>

      {/* Installment Request Alert */}
      {order.installment_requested && <InstallmentApproval order={order} />}

      {/* Actions */}
      <IXCard>
        <OrderNoteActions order={order} onSuccess={refetch} />
      </IXCard>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Client Info */}
        <IXCard
          title="Dados do Cliente"
          actions={
            order.client_user && (
              <Button variant="ghost" size="icon" onClick={() => setEditClientOpen(true)} aria-label="Editar cliente">
                <Pencil className="h-4 w-4" />
              </Button>
            )
          }
        >
          <div className="space-y-4">
            <div>
              <p className="font-medium text-foreground">{order.client_user?.name}</p>
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
                  <p className="text-[11px] uppercase tracking-wider text-muted-foreground mb-1">Endereço de Faturação</p>
                  <div className="text-sm text-muted-foreground">
                    {order.billing_address.street && <p>{order.billing_address.street}</p>}
                    {order.billing_address.postal_code && order.billing_address.city && (
                      <p>{order.billing_address.postal_code} {order.billing_address.city}</p>
                    )}
                    {order.billing_address.country && <p>{order.billing_address.country}</p>}
                  </div>
                </div>
              </>
            )}
          </div>
        </IXCard>

        {/* Order Items */}
        <IXCard
          className="lg:col-span-2"
          title={`Produtos (${order.items?.length || 0})`}
          actions={
            <Button variant="ghost" size="icon" onClick={() => setEditItemsOpen(true)} aria-label="Editar valores">
              <Pencil className="h-4 w-4" />
            </Button>
          }
        >
          <div className="divide-y divide-border">
            {order.items?.map((item) => (
              <div key={item.id} className="flex items-center gap-4 py-3 first:pt-0">
                {item.product_image_url ? (
                  <img
                    src={item.product_image_url}
                    alt={item.product_name}
                    className="w-16 h-16 object-cover rounded-lg border border-border"
                  />
                ) : (
                  <div className="w-16 h-16 bg-muted rounded-lg flex items-center justify-center">
                    <Package className="h-6 w-6 text-muted-foreground" />
                  </div>
                )}
                <div className="flex-1 min-w-0">
                  <p className="font-medium truncate text-foreground">{item.product_name}</p>
                  {item.product_sku && (
                    <p className="text-xs text-muted-foreground">SKU: {item.product_sku}</p>
                  )}
                  <p className="text-sm text-muted-foreground">
                    {item.quantity} × €{item.unit_price_net?.toFixed(2)}
                  </p>
                </div>
                <div className="text-right">
                  <p className="font-medium text-foreground">€{item.line_total_net?.toFixed(2)}</p>
                  <p className="text-xs text-muted-foreground">
                    +€{item.vat_amount?.toFixed(2)} IVA
                  </p>
                </div>
              </div>
            ))}
          </div>

          <Separator className="my-4" />

          {/* Totals */}
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Subtotal (s/ IVA)</span>
              <span className="text-foreground">€{order.total_net?.toFixed(2)}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">IVA</span>
              <span className="text-foreground">€{order.total_vat?.toFixed(2)}</span>
            </div>
            <Separator />
            <div className="flex justify-between text-lg font-bold">
              <span className="text-foreground">Total</span>
              <span className="text-primary">€{order.total_gross?.toFixed(2)}</span>
            </div>
          </div>
        </IXCard>
      </div>

      {/* Notes Section */}
      <div className="grid gap-6 lg:grid-cols-2">
        {order.client_notes && (
          <IXCard title="Notas do Cliente">
            <div className="flex items-start gap-2">
              <MessageSquare className="h-4 w-4 text-muted-foreground mt-0.5 shrink-0" />
              <p className="text-sm text-muted-foreground whitespace-pre-wrap">
                {order.client_notes}
              </p>
            </div>
          </IXCard>
        )}

        <IXCard title="Notas Internas">
          <div className="space-y-4">
            {order.admin_notes && (
              <div className="bg-muted/50 rounded-lg p-3 text-sm whitespace-pre-wrap text-foreground">
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
          </div>
        </IXCard>
      </div>

      {/* Rejection Reason */}
      {order.status === "rejected" && order.rejection_reason && (
        <IXCard className="border-destructive/30 bg-destructive/5" title="Motivo da Rejeição">
          <p className="text-sm text-foreground whitespace-pre-wrap">{order.rejection_reason}</p>
          {order.rejected_at && (
            <p className="text-xs text-muted-foreground mt-2">
              Rejeitada em{" "}
              {format(new Date(order.rejected_at), "dd/MM/yyyy 'às' HH:mm", { locale: pt })}
            </p>
          )}
        </IXCard>
      )}

      {/* Edit Client Dialog */}
      {order.client_user && (
        <EditClientDataDialog
          open={editClientOpen}
          onOpenChange={setEditClientOpen}
          clientUser={order.client_user}
          onSuccess={refetch}
        />
      )}

      <EditOrderItemsDialog
        open={editItemsOpen}
        onOpenChange={setEditItemsOpen}
        orderId={orderId}
        items={order.items || []}
        onSuccess={refetch}
      />
    </div>
  );
}
