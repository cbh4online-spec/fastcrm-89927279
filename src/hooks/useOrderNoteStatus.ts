import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import type { OrderNoteStatus } from "@/types/order-note";
import { toast } from "sonner";

// Valid status transitions
const validTransitions: Record<OrderNoteStatus, OrderNoteStatus[]> = {
  draft: ["submitted", "cancelled"],
  submitted: ["approved", "in_preparation", "cancelled"],
  awaiting_approval: ["approved", "rejected", "cancelled"],
  approved: ["in_preparation"],
  rejected: [],
  in_preparation: ["invoiced"],
  invoiced: [],
  cancelled: [],
};

interface StatusChangeData {
  orderId: string;
  newStatus: OrderNoteStatus;
  rejectionReason?: string;
  sendNotification?: boolean;
}

export function useOrderNoteStatus() {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  const changeStatusMutation = useMutation({
    mutationFn: async ({
      orderId,
      newStatus,
      rejectionReason,
      sendNotification = true,
    }: StatusChangeData) => {
      // Get current order status
      const { data: order, error: fetchError } = await supabase
        .from("order_notes")
        .select("status")
        .eq("id", orderId)
        .single();

      if (fetchError) throw new Error("Encomenda não encontrada");

      const currentStatus = order.status as OrderNoteStatus;

      // Validate transition
      if (!validTransitions[currentStatus]?.includes(newStatus)) {
        throw new Error(
          `Transição inválida: ${currentStatus} -> ${newStatus}`
        );
      }

      // Prepare update data
      const updateData: Record<string, unknown> = {
        status: newStatus,
        updated_at: new Date().toISOString(),
      };

      // Add specific fields based on status
      if (newStatus === "approved") {
        updateData.approved_at = new Date().toISOString();
        updateData.approved_by = user?.id;
      } else if (newStatus === "rejected") {
        if (!rejectionReason?.trim()) {
          throw new Error("Motivo de rejeição é obrigatório");
        }
        updateData.rejected_at = new Date().toISOString();
        updateData.rejected_by = user?.id;
        updateData.rejection_reason = rejectionReason;
      }

      // Update order
      const { error: updateError } = await supabase
        .from("order_notes")
        .update(updateData)
        .eq("id", orderId);

      if (updateError) throw updateError;

      // Send notification if needed
      if (sendNotification && ["approved", "rejected", "in_preparation", "invoiced"].includes(newStatus)) {
        try {
          const { data: session } = await supabase.auth.getSession();
          await supabase.functions.invoke("order-note-notify", {
            body: { orderId, newStatus, rejectionReason },
            headers: {
              Authorization: `Bearer ${session?.session?.access_token}`,
            },
          });
        } catch (notifyError) {
          console.error("Failed to send notification:", notifyError);
          // Don't fail the status change if notification fails
        }
      }

      return { orderId, newStatus };
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["order-notes"] });
      queryClient.invalidateQueries({ queryKey: ["order-note", variables.orderId] });

      const statusLabels: Record<string, string> = {
        approved: "aprovada",
        rejected: "rejeitada",
        in_preparation: "marcada como 'Em Preparação'",
        invoiced: "marcada como 'Faturada'",
        cancelled: "cancelada",
        submitted: "enviada",
      };

      toast.success(`Encomenda ${statusLabels[variables.newStatus] || "atualizada"}`);
    },
    onError: (error) => {
      toast.error(error.message || "Erro ao alterar estado");
    },
  });

  const approve = (orderId: string) =>
    changeStatusMutation.mutateAsync({ orderId, newStatus: "approved" });

  const reject = (orderId: string, rejectionReason: string) =>
    changeStatusMutation.mutateAsync({
      orderId,
      newStatus: "rejected",
      rejectionReason,
    });

  const markInPreparation = (orderId: string) =>
    changeStatusMutation.mutateAsync({ orderId, newStatus: "in_preparation" });

  const markInvoiced = (orderId: string) =>
    changeStatusMutation.mutateAsync({ orderId, newStatus: "invoiced" });

  const cancel = (orderId: string) =>
    changeStatusMutation.mutateAsync({
      orderId,
      newStatus: "cancelled",
      sendNotification: false,
    });

  return {
    changeStatus: changeStatusMutation.mutateAsync,
    approve,
    reject,
    markInPreparation,
    markInvoiced,
    cancel,
    isChanging: changeStatusMutation.isPending,
  };
}
