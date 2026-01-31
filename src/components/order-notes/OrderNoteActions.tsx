import { useState } from "react";
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
import { useOrderNoteStatus } from "@/hooks/useOrderNoteStatus";
import type { OrderNote, OrderNoteStatus } from "@/types/order-note";
import {
  CheckCircle,
  XCircle,
  Package,
  FileText,
  Ban,
  Loader2,
} from "lucide-react";

interface OrderNoteActionsProps {
  order: OrderNote;
  onSuccess?: () => void;
}

export function OrderNoteActions({ order, onSuccess }: OrderNoteActionsProps) {
  const [rejectDialogOpen, setRejectDialogOpen] = useState(false);
  const [cancelDialogOpen, setCancelDialogOpen] = useState(false);
  const [rejectionReason, setRejectionReason] = useState("");
  const [cancelReason, setCancelReason] = useState("");

  const {
    approve,
    reject,
    markInPreparation,
    markInvoiced,
    cancel,
    isChanging,
  } = useOrderNoteStatus();

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

  const handleMarkInvoiced = async () => {
    await markInvoiced(order.id);
    onSuccess?.();
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
  const showInvoiced = status === "in_preparation";
  const showCancel = ["submitted", "awaiting_approval"].includes(status);

  if (!showApprove && !showReject && !showInPreparation && !showInvoiced && !showCancel) {
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

        {showInvoiced && (
          <Button
            variant="outline"
            onClick={handleMarkInvoiced}
            disabled={isChanging}
            className="border-cyan-300 text-cyan-700 hover:bg-cyan-50"
          >
            {isChanging ? (
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <FileText className="h-4 w-4 mr-2" />
            )}
            Marcar como Faturada
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
