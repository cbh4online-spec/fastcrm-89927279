import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface OpenInvoice { id: string; invoice_number: string; due_date: string | null; total: number; amount_paid: number | null; }
export interface CasePayment { id: string; payment_date: string; amount: number; invoice_number: string | null; }

interface Args { caseId?: string; workspaceId?: string; companyId?: string | null; contactId?: string | null; enabled: boolean }

/** Faturas/ND em aberto do devedor, usadas quando o processo não tem faturas ligadas. */
export function useCaseCompanyOpenInvoices({ caseId, workspaceId, companyId, contactId, enabled }: Args) {
  return useQuery({
    queryKey: ["collection-case-open-invoices", caseId, companyId, contactId],
    enabled: enabled && !!workspaceId && !!(companyId || contactId),
    queryFn: async (): Promise<OpenInvoice[]> => {
      let q = supabase.from("invoices").select("id, invoice_number, due_date, total, amount_paid, status")
        .eq("workspace_id", workspaceId!).in("document_type", ["invoice", "debit_note"])
        .not("status", "in", "(paid,cancelled,void,draft)").order("due_date", { ascending: true }).limit(200);
      q = companyId ? q.eq("company_id", companyId) : q.eq("contact_id", contactId!);
      const { data, error } = await q;
      if (error) throw error;
      return (data ?? []).filter((i) => Number(i.total) - Math.max(0, Number(i.amount_paid ?? 0)) > 0.009) as OpenInvoice[];
    },
  });
}

export function useLinkInvoiceToCase(caseId: string, workspaceId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (inv: OpenInvoice) => {
      const { error } = await supabase.from("collection_case_invoices").upsert({
        workspace_id: workspaceId, case_id: caseId, invoice_id: inv.id, snapshot_total: inv.total,
        snapshot_amount_paid: Math.max(0, Number(inv.amount_paid ?? 0)), snapshot_due_date: inv.due_date, removed_at: null,
      }, { onConflict: "case_id,invoice_id" });
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["collection-case", caseId] });
      qc.invalidateQueries({ queryKey: ["collection-case-open-invoices", caseId] });
    },
  });
}

/** Recebimentos das faturas ligadas ao processo, para o histórico. */
export function useCasePayments(caseId: string | undefined, invoiceIds: string[]) {
  return useQuery({
    queryKey: ["collection-case-payments", caseId, invoiceIds],
    enabled: !!caseId && invoiceIds.length > 0,
    queryFn: async (): Promise<CasePayment[]> => {
      const { data, error } = await supabase.from("invoice_payments")
        .select("id, payment_date, amount, invoice:invoices(invoice_number)")
        .in("invoice_id", invoiceIds).order("payment_date", { ascending: false }).limit(100);
      if (error) throw error;
      return (data ?? []).map((p: any) => ({ id: p.id, payment_date: p.payment_date, amount: Number(p.amount), invoice_number: p.invoice?.invoice_number ?? null }));
    },
  });
}
