import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface StatementInvoice {
  id: string;
  invoice_number: string;
  document_type: string | null;
  issue_date: string;
  due_date: string;
  total: number;
  amount_paid: number;
  status: string;
  currency: string | null;
}

export interface StatementPayment {
  id: string;
  invoice_id: string;
  invoice_number: string;
  payment_date: string;
  amount: number;
  payment_method: string | null;
  reference: string | null;
}

export interface AccountStatementData {
  invoices: StatementInvoice[];
  payments: StatementPayment[];
  totalInvoiced: number;
  totalPaid: number;
  totalOutstanding: number;
  currency: string;
}

/**
 * Carrega o extrato de conta completo de um devedor (caso de cobrança):
 * todas as faturas + pagamentos registados.
 */
export function useAccountStatement(params: {
  workspaceId: string | undefined;
  companyId: string | null | undefined;
  contactId: string | null | undefined;
  enabled?: boolean;
}) {
  const { workspaceId, companyId, contactId, enabled = true } = params;
  const filterId = companyId ?? contactId ?? null;
  const filterCol = companyId ? "company_id" : contactId ? "contact_id" : null;

  return useQuery({
    queryKey: ["account-statement", workspaceId, filterCol, filterId],
    enabled: enabled && !!workspaceId && !!filterCol && !!filterId,
    queryFn: async (): Promise<AccountStatementData> => {
      if (!workspaceId || !filterCol || !filterId) {
        return { invoices: [], payments: [], totalInvoiced: 0, totalPaid: 0, totalOutstanding: 0, currency: "EUR" };
      }

      const { data: invs, error: invErr } = await supabase
        .from("invoices")
        .select("id, invoice_number, document_type, issue_date, due_date, total, amount_paid, status, currency")
        .eq("workspace_id", workspaceId)
        .eq(filterCol as "company_id" | "contact_id", filterId)
        .neq("status", "cancelled")
        .order("issue_date", { ascending: true });
      if (invErr) throw invErr;

      const invoices = (invs ?? []).map((i) => ({
        ...i,
        total: Number(i.total),
        amount_paid: Number(i.amount_paid ?? 0),
      })) as StatementInvoice[];

      const invoiceIds = invoices.map((i) => i.id);
      let payments: StatementPayment[] = [];
      if (invoiceIds.length > 0) {
        const { data: pays, error: payErr } = await supabase
          .from("invoice_payments")
          .select("id, invoice_id, amount, payment_date, payment_method, reference")
          .in("invoice_id", invoiceIds)
          .order("payment_date", { ascending: true });
        if (payErr) throw payErr;

        const numToInv = new Map(invoices.map((i) => [i.id, i.invoice_number] as const));
        payments = (pays ?? []).map((p) => ({
          id: p.id,
          invoice_id: p.invoice_id,
          invoice_number: numToInv.get(p.invoice_id) ?? "—",
          payment_date: p.payment_date,
          amount: Number(p.amount),
          payment_method: p.payment_method ?? null,
          reference: p.reference ?? null,
        }));
      }

      const totalInvoiced = invoices.reduce((s, i) => s + i.total, 0);
      const totalPaid = invoices.reduce((s, i) => s + i.amount_paid, 0);
      const totalOutstanding = Math.max(0, totalInvoiced - totalPaid);
      const currency = invoices[0]?.currency || "EUR";

      return { invoices, payments, totalInvoiced, totalPaid, totalOutstanding, currency };
    },
  });
}
