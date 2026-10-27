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

export interface UpdateInvoicePaymentInput {
  id: string;
  invoice_id: string;
  amount: number;
  payment_date: string;
  payment_method: string | null;
  reference: string | null;
  notes: string | null;
}

function invalidateAll(queryClient: ReturnType<typeof useQueryClient>, invoiceId: string) {
  queryClient.invalidateQueries({ queryKey: ["invoice-payments", invoiceId] });
  queryClient.invalidateQueries({ queryKey: ["invoice", invoiceId] });
  queryClient.invalidateQueries({ queryKey: ["invoices"] });
  queryClient.invalidateQueries({ queryKey: ["invoice-stats"] });
  queryClient.invalidateQueries({ queryKey: ["invoice-receipts"] });
}

async function logChange(client: any, workspaceId: string, recordId: string, action: string, oldData: any, newData: any) {
  try {
    const { data: auth } = await client.auth.getUser();
    await client.from("activity_logs").insert({
      workspace_id: workspaceId,
      user_id: auth?.user?.id ?? null,
      table_name: "invoice_payments",
      record_id: recordId,
      action,
      old_data: oldData,
      new_data: newData,
      module: "billing-payments",
    });
  } catch {
    // auditoria best-effort: não bloquear a correção
  }
}

/** Corrige um recibo. A fatura é recalculada automaticamente pela base de dados. */
export function useUpdateInvoicePayment() {
  const queryClient = useQueryClient();
  const { currentWorkspace } = useWorkspace();
  const workspaceClient = useWorkspaceInstance().workspaceClient as any;

  return useMutation({
    mutationFn: async (input: UpdateInvoicePaymentInput) => {
      if (!currentWorkspace) throw new Error("Sem espaço de trabalho");
      const amount = Number(input.amount);
      if (!Number.isFinite(amount) || amount <= 0) throw new Error("Valor inválido");
      if (!input.payment_date) throw new Error("Data obrigatória");
      const { data: old } = await workspaceClient.from("invoice_payments").select("*").eq("id", input.id).maybeSingle();
      const patch = {
        amount: Math.round(amount * 100) / 100,
        payment_date: input.payment_date,
        payment_method: input.payment_method?.slice(0, 50) || null,
        reference: input.reference?.trim().slice(0, 120) || null,
        notes: input.notes?.trim().slice(0, 1000) || null,
      };
      const { error } = await workspaceClient
        .from("invoice_payments")
        .update(patch)
        .eq("id", input.id)
        .eq("workspace_id", currentWorkspace.id);
      if (error) throw error;
      await logChange(workspaceClient, currentWorkspace.id, input.id, "UPDATE", old, patch);
    },
    onSuccess: (_, input) => {
      invalidateAll(queryClient, input.invoice_id);
      toast.success("Recibo corrigido. A fatura foi recalculada.");
    },
    onError: (e: any) => toast.error(e?.message || "Não foi possível corrigir o recibo"),
  });
}

/** Anula um recibo registado por engano: a fatura volta a pendente/parcial automaticamente. */
export function useDeleteInvoicePayment() {
  const queryClient = useQueryClient();
  const { currentWorkspace } = useWorkspace();
  const workspaceClient = useWorkspaceInstance().workspaceClient as any;

  return useMutation({
    mutationFn: async ({ id, reason }: { id: string; invoice_id: string; reason?: string }) => {
      if (!currentWorkspace) throw new Error("Sem espaço de trabalho");
      const { data: old } = await workspaceClient.from("invoice_payments").select("*").eq("id", id).maybeSingle();
      const { error } = await workspaceClient
        .from("invoice_payments")
        .delete()
        .eq("id", id)
        .eq("workspace_id", currentWorkspace.id);
      if (error) throw error;
      await logChange(workspaceClient, currentWorkspace.id, id, "DELETE", old, { reason: reason?.slice(0, 500) || null });
    },
    onSuccess: (_, input) => {
      invalidateAll(queryClient, input.invoice_id);
      toast.success("Recibo anulado. A fatura voltou a ficar por liquidar.");
    },
    onError: (e: any) => toast.error(e?.message || "Não foi possível anular o recibo"),
  });
}
