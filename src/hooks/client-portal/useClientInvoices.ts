import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useClientAuth } from "./useClientAuth";

export interface ClientInvoice {
  id: string;
  invoice_number: string;
  document_type: string;
  issue_date: string;
  due_date: string;
  status: string;
  total: number;
  subtotal: number;
  tax_amount: number;
  amount_paid: number | null;
  currency: string;
  client_name: string;
  notes: string | null;
}

export function useClientInvoices() {
  const workspaceId = localStorage.getItem("client_workspace_id") || undefined;
  const { clientUser } = useClientAuth({ workspaceId });

  const { data: invoices = [], isLoading } = useQuery({
    queryKey: ["client-invoices", clientUser?.company_id, clientUser?.contact_id],
    queryFn: async () => {
      if (!clientUser?.workspace_id) return [];

      // Filter by company_id or contact_id
      let query = supabase
        .from("invoices")
        .select("id, invoice_number, document_type, issue_date, due_date, status, total, subtotal, tax_amount, amount_paid, currency, client_name, notes")
        .eq("workspace_id", clientUser.workspace_id)
        .order("issue_date", { ascending: false });

      if (clientUser.company_id) {
        query = query.eq("company_id", clientUser.company_id);
      } else if (clientUser.contact_id) {
        query = query.eq("contact_id", clientUser.contact_id);
      } else {
        return [];
      }

      const { data, error } = await query;
      if (error) throw error;
      return (data ?? []) as ClientInvoice[];
    },
    enabled: !!clientUser?.workspace_id && !!(clientUser?.company_id || clientUser?.contact_id),
  });

  // Aggregations
  const totalInvoiced = invoices.reduce((sum, inv) => sum + inv.total, 0);
  const totalPaid = invoices.reduce((sum, inv) => sum + (inv.amount_paid ?? 0), 0);
  const totalPending = invoices
    .filter((inv) => inv.status === "sent" || inv.status === "pending" || inv.status === "overdue")
    .reduce((sum, inv) => sum + inv.total - (inv.amount_paid ?? 0), 0);
  const totalOverdue = invoices
    .filter((inv) => {
      const isUnpaid = inv.status !== "paid" && inv.status !== "cancelled";
      return isUnpaid && new Date(inv.due_date) < new Date();
    })
    .reduce((sum, inv) => sum + inv.total - (inv.amount_paid ?? 0), 0);

  return {
    invoices,
    isLoading,
    totalInvoiced,
    totalPaid,
    totalPending,
    totalOverdue,
  };
}
