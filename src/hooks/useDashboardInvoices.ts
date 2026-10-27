import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

/**
 * Faturas do espaço de trabalho para a Visão Global, com todas as linhas.
 * A API devolve no máximo 1000 linhas por pedido, por isso as páginas são
 * pedidas em paralelo depois da primeira (que traz a contagem total).
 * Só são lidas as colunas que os cartões usam.
 */
const PAGE_SIZE = 1000;
const MAX_PAGES = 50;
const SELECT =
  "id,status,document_type,client_name,company_id,contact_id,total,subtotal,tax_amount,tax_rate,amount_paid,issue_date,rental_contract_id";

export interface DashboardInvoice {
  id: string;
  status: string | null;
  document_type: string | null;
  client_name: string | null;
  company_id: string | null;
  contact_id: string | null;
  total: number | null;
  subtotal: number | null;
  tax_amount: number | null;
  tax_rate: number | null;
  amount_paid: number | null;
  issue_date: string;
  rental_contract_id: string | null;
}

export interface DashboardInvoiceStats {
  totalDraft: number;
  totalSent: number;
  totalPaid: number;
  totalOverdue: number;
  totalPartiallyPaid: number;
  amountDraft: number;
  amountSent: number;
  amountPaid: number;
  amountOverdue: number;
  amountPartiallyPaid: number;
}

export function computeInvoiceStats(
  invoices: Array<{ status: string | null; total: number | string | null }>,
): DashboardInvoiceStats {
  const s: DashboardInvoiceStats = {
    totalDraft: 0, totalSent: 0, totalPaid: 0, totalOverdue: 0, totalPartiallyPaid: 0,
    amountDraft: 0, amountSent: 0, amountPaid: 0, amountOverdue: 0, amountPartiallyPaid: 0,
  };
  for (const inv of invoices) {
    const v = Number(inv.total || 0);
    switch (inv.status) {
      case "draft": s.totalDraft++; s.amountDraft += v; break;
      case "sent": s.totalSent++; s.amountSent += v; break;
      case "paid": s.totalPaid++; s.amountPaid += v; break;
      case "overdue": s.totalOverdue++; s.amountOverdue += v; break;
      case "partially_paid": s.totalPartiallyPaid++; s.amountPartiallyPaid += v; break;
    }
  }
  return s;
}

export function useDashboardInvoices(workspaceId: string | undefined) {
  return useQuery({
    queryKey: ["invoices", "dashboard", workspaceId],
    enabled: !!workspaceId,
    staleTime: 60_000,
    queryFn: async (): Promise<DashboardInvoice[]> => {
      const fetchPage = (page: number, withCount = false) => {
        const from = page * PAGE_SIZE;
        return supabase
          .from("invoices")
          .select(SELECT, withCount ? { count: "exact" } : undefined)
          .eq("workspace_id", workspaceId!)
          .order("created_at", { ascending: false })
          .order("id", { ascending: true })
          .range(from, from + PAGE_SIZE - 1);
      };

      const first = await fetchPage(0, true);
      if (first.error) throw first.error;
      const out = [...((first.data || []) as unknown as DashboardInvoice[])];
      const total = first.count ?? out.length;
      const pages = Math.min(MAX_PAGES, Math.ceil(total / PAGE_SIZE));
      if (pages > 1) {
        const rest = await Promise.all(Array.from({ length: pages - 1 }, (_, i) => fetchPage(i + 1)));
        for (const r of rest) {
          if (r.error) throw r.error;
          out.push(...((r.data || []) as unknown as DashboardInvoice[]));
        }
      }
      return out;
    },
  });
}
