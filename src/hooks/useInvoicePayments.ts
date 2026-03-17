import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useWorkspace } from "@/contexts/WorkspaceContext";
import { useWorkspaceInstance } from "@/contexts/WorkspaceInstanceContext";
import { toast } from "sonner";
import { useTranslation } from "react-i18next";

export interface InvoicePayment {
  id: string;
  invoice_id: string;
  workspace_id: string;
  amount: number;
  payment_date: string;
  payment_method: string | null;
  reference: string | null;
  notes: string | null;
  created_by: string | null;
  created_at: string;
}

export interface RegisterPaymentInput {
  invoice_id: string;
  amount: number;
  payment_date: string;
  payment_method?: string;
  reference?: string;
  notes?: string;
}

export function useInvoicePayments(invoiceId: string | undefined) {
  const workspaceClient = useWorkspaceInstance().workspaceClient as any;

  return useQuery({
    queryKey: ["invoice-payments", invoiceId],
    queryFn: async () => {
      if (!invoiceId) return [];
      const { data, error } = await workspaceClient
        .from("invoice_payments")
        .select("*")
        .eq("invoice_id", invoiceId)
        .order("payment_date", { ascending: false });
      if (error) throw error;
      return data as InvoicePayment[];
    },
    enabled: !!invoiceId,
  });
}

export function useRegisterPayment() {
  const queryClient = useQueryClient();
  const { currentWorkspace } = useWorkspace();
  const workspaceClient = useWorkspaceInstance().workspaceClient as any;
  const { t } = useTranslation("invoices");

  return useMutation({
    mutationFn: async (input: RegisterPaymentInput) => {
      if (!currentWorkspace) throw new Error("No workspace");

      const normalizedAmount = Number(input.amount);
      if (!Number.isFinite(normalizedAmount) || normalizedAmount <= 0) {
        throw new Error("Invalid payment amount");
      }

      const { data, error } = await workspaceClient.rpc("register_invoice_payment", {
        p_invoice_id: input.invoice_id,
        p_workspace_id: currentWorkspace.id,
        p_amount: normalizedAmount,
        p_payment_date: input.payment_date,
        p_payment_method: input.payment_method || null,
        p_reference: input.reference || null,
        p_notes: input.notes || null,
      });

      if (error) throw error;

      const result = Array.isArray(data) ? data[0] : data;
      return {
        totalPaid: Number(result?.total_paid ?? 0),
        newStatus: String(result?.new_status ?? "partially_paid"),
      };
    },
    onSuccess: (_, input) => {
      queryClient.invalidateQueries({ queryKey: ["invoice-payments", input.invoice_id] });
      queryClient.invalidateQueries({ queryKey: ["invoice", input.invoice_id] });
      queryClient.invalidateQueries({ queryKey: ["invoices"] });
      queryClient.invalidateQueries({ queryKey: ["invoice-stats"] });
      toast.success(t("paymentRegistered"));
    },
    onError: (error: any) => {
      console.error("Error registering payment:", error);
      toast.error(error?.message || t("paymentError"));
    },
  });
}
