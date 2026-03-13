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
  const { workspaceClient } = useWorkspaceInstance();
  const { t } = useTranslation("invoices");

  return useMutation({
    mutationFn: async (input: RegisterPaymentInput) => {
      if (!currentWorkspace) throw new Error("No workspace");

      const userId = (await workspaceClient.auth.getUser()).data.user?.id;

      // Insert payment record
      const { error: paymentError } = await workspaceClient
        .from("invoice_payments")
        .insert({
          invoice_id: input.invoice_id,
          workspace_id: currentWorkspace.id,
          amount: input.amount,
          payment_date: input.payment_date,
          payment_method: input.payment_method || null,
          reference: input.reference || null,
          notes: input.notes || null,
          created_by: userId,
        });

      if (paymentError) throw paymentError;

      // Get invoice total and sum of all payments
      const { data: invoice, error: invError } = await workspaceClient
        .from("invoices")
        .select("total, amount_paid")
        .eq("id", input.invoice_id)
        .single();

      if (invError) throw invError;

      const { data: payments, error: paymentsError } = await workspaceClient
        .from("invoice_payments")
        .select("amount")
        .eq("invoice_id", input.invoice_id);

      if (paymentsError) throw paymentsError;

      const totalPaid = (payments || []).reduce((sum, p) => sum + Number(p.amount), 0);
      const newStatus = totalPaid >= invoice.total ? "paid" : "partially_paid";

      const updateData: Record<string, unknown> = {
        amount_paid: totalPaid,
        status: newStatus,
      };
      if (newStatus === "paid") {
        updateData.paid_at = new Date().toISOString();
      }

      const { error: updateError } = await workspaceClient
        .from("invoices")
        .update(updateData)
        .eq("id", input.invoice_id);

      if (updateError) throw updateError;

      return { totalPaid, newStatus };
    },
    onSuccess: (_, input) => {
      queryClient.invalidateQueries({ queryKey: ["invoice-payments", input.invoice_id] });
      queryClient.invalidateQueries({ queryKey: ["invoice", input.invoice_id] });
      queryClient.invalidateQueries({ queryKey: ["invoices"] });
      queryClient.invalidateQueries({ queryKey: ["invoice-stats"] });
      toast.success(t("paymentRegistered"));
    },
    onError: (error) => {
      console.error("Error registering payment:", error);
      toast.error(t("paymentError"));
    },
  });
}
