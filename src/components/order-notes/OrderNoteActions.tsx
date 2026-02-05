import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { useOrderNoteStatus } from "@/hooks/useOrderNoteStatus";
import { useConvertOrderToInvoice } from "@/hooks/useConvertOrderToInvoice";
import type { OrderNote, OrderNoteStatus } from "@/types/order-note";
import {
  CheckCircle,
  XCircle,
  Package,
  FileText,
  Ban,
  Loader2,
  Receipt,
} from "lucide-react";

interface OrderNoteActionsProps {
  order: OrderNote;
  onSuccess?: () => void;
}

export function OrderNoteActions({ order, onSuccess }: OrderNoteActionsProps) {
  const navigate = useNavigate();
  const [rejectDialogOpen, setRejectDialogOpen] = useState(false);
  const [cancelDialogOpen, setCancelDialogOpen] = useState(false);
  const [invoiceDialogOpen, setInvoiceDialogOpen] = useState(false);
  const [rejectionReason, setRejectionReason] = useState("");
  const [cancelReason, setCancelReason] = useState("");
  const [dueInDays, setDueInDays] = useState(30);
  const [invoiceNotes, setInvoiceNotes] = useState("");

  const {
    approve,
    reject,
    markInPreparation,
    cancel,
    isChanging,
  } = useOrderNoteStatus();

  const convertToInvoice = useConvertOrderToInvoice();

  const handleApprove = async () => {
    await approve(order.id);
    onSuccess?.();
  };

  const handleReject = async () => {
    if (!rejectionReason.trim()) return;
    await reject(order.id, rejectionReason);
    setRejectDialogOpen(false);
    setRejectionReason("");
    onSuccess?.();
  };

  const handleMarkInPreparation = async () => {
    await markInPreparation(order.id);
    onSuccess?.();
  };

  const handleConvertToInvoice = async () => {
    const result = await convertToInvoice.mutateAsync({
      order,
      dueInDays,
      notes: invoiceNotes || undefined,
    });
    setInvoiceDialogOpen(false);
    setInvoiceNotes("");
    onSuccess?.();
    // Navigate to the new invoice
    navigate(`/dashboard/invoices/${result.id}`);
  };

  const handleCancel = async () => {
    await cancel(order.id);
    setCancelDialogOpen(false);
    setCancelReason("");
    onSuccess?.();
  };

  const status = order.status as OrderNoteStatus;

  // Define available actions based on current status
  const showApprove = ["submitted", "awaiting_approval"].includes(status);
  const showReject = status === "awaiting_approval";
  const showInPreparation = ["submitted", "approved"].includes(status);
  const showConvertToInvoice = status === "in_preparation";
  const showCancel = ["submitted", "awaiting_approval"].includes(status);

  const isProcessing = isChanging || convertToInvoice.isPending;

  if (!showApprove && !showReject && !showInPreparation && !showConvertToInvoice && !showCancel) {
    return null;
  }

  return (
    <div className="space-y-4">
      <h3 className="font-semibold text-sm text-muted-foreground uppercase tracking-wide">
        Ações Disponíveis
      </h3>
      
      <div className="flex flex-wrap gap-2">
        {showApprove && (
          <Button
            onClick={handleApprove}
            disabled={isChanging}
            className="bg-green-600 hover:bg-green-700"
          >
            {isChanging ? (
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <CheckCircle className="h-4 w-4 mr-2" />
            )}
            Aprovar
          </Button>
        )}

        {showReject && (
          <Button
            variant="destructive"
            onClick={() => setRejectDialogOpen(true)}
            disabled={isChanging}
          >
            <XCircle className="h-4 w-4 mr-2" />
            Rejeitar
          </Button>
        )}

        {showInPreparation && (
          <Button
            variant="outline"
            onClick={handleMarkInPreparation}
            disabled={isChanging}
            className="border-purple-300 text-purple-700 hover:bg-purple-50"
          >
            {isChanging ? (
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <Package className="h-4 w-4 mr-2" />
            )}
            Em Preparação
          </Button>
        )}

        {showConvertToInvoice && (
          <Button
            variant="outline"
            onClick={() => setInvoiceDialogOpen(true)}
            disabled={isProcessing}
            className="border-emerald-300 text-emerald-700 hover:bg-emerald-50 dark:border-emerald-600 dark:text-emerald-400 dark:hover:bg-emerald-950"
          >
            {convertToInvoice.isPending ? (
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <Receipt className="h-4 w-4 mr-2" />
            )}
            Converter para Fatura
          </Button>
        )}

        {showCancel && (
          <Button
            variant="ghost"
            onClick={() => setCancelDialogOpen(true)}
            disabled={isChanging}
            className="text-muted-foreground hover:text-destructive"
          >
            <Ban className="h-4 w-4 mr-2" />
            Cancelar
          </Button>
        )}
      </div>

      {/* Reject Dialog */}
      <Dialog open={rejectDialogOpen} onOpenChange={setRejectDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Rejeitar Encomenda</DialogTitle>
            <DialogDescription>
              Por favor, indique o motivo da rejeição. Esta informação será
              enviada ao cliente.
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <Label htmlFor="rejection-reason">Motivo da Rejeição *</Label>
            <Textarea
              id="rejection-reason"
              value={rejectionReason}
              onChange={(e) => setRejectionReason(e.target.value)}
              placeholder="Explique o motivo da rejeição..."
              className="mt-2"
              rows={4}
            />
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setRejectDialogOpen(false)}
            >
              Cancelar
            </Button>
            <Button
              variant="destructive"
              onClick={handleReject}
              disabled={!rejectionReason.trim() || isChanging}
            >
              {isChanging && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Rejeitar Encomenda
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Convert to Invoice Dialog */}
      <Dialog open={invoiceDialogOpen} onOpenChange={setInvoiceDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Converter para Fatura</DialogTitle>
            <DialogDescription>
              Será criada uma nova fatura com base nos dados desta encomenda.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Cliente</Label>
                <p className="text-sm font-medium mt-1">{order.client_user?.name || "—"}</p>
              </div>
              <div>
                <Label>Valor Total</Label>
                <p className="text-sm font-medium mt-1">
                  {order.total_gross.toLocaleString("pt-PT", {
                    style: "currency",
                    currency: order.currency || "EUR",
                  })}
                </p>
              </div>
            </div>
            <div>
              <Label htmlFor="due-in-days">Prazo de Pagamento (dias)</Label>
              <Input
                id="due-in-days"
                type="number"
                min={1}
                max={365}
                value={dueInDays}
                onChange={(e) => setDueInDays(Number(e.target.value))}
                className="mt-2"
              />
            </div>
            <div>
              <Label htmlFor="invoice-notes">Notas (opcional)</Label>
              <Textarea
                id="invoice-notes"
                value={invoiceNotes}
                onChange={(e) => setInvoiceNotes(e.target.value)}
                placeholder="Notas adicionais para a fatura..."
                className="mt-2"
                rows={3}
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setInvoiceDialogOpen(false)}
            >
              Cancelar
            </Button>
            <Button
              onClick={handleConvertToInvoice}
              disabled={convertToInvoice.isPending}
              className="bg-emerald-600 hover:bg-emerald-700"
            >
              {convertToInvoice.isPending && (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              )}
              Criar Fatura
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Cancel Dialog */}
      <Dialog open={cancelDialogOpen} onOpenChange={setCancelDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Cancelar Encomenda</DialogTitle>
            <DialogDescription>
              Tem a certeza que pretende cancelar esta encomenda?
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <Label htmlFor="cancel-reason">Motivo (opcional)</Label>
            <Textarea
              id="cancel-reason"
              value={cancelReason}
              onChange={(e) => setCancelReason(e.target.value)}
              placeholder="Motivo do cancelamento..."
              className="mt-2"
              rows={3}
            />
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setCancelDialogOpen(false)}
            >
              Voltar
            </Button>
            <Button
              variant="destructive"
              onClick={handleCancel}
              disabled={isChanging}
            >
              {isChanging && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Confirmar Cancelamento
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
