import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

/**
 * Returns all invoices associated with a company, either directly (company_id)
 * or indirectly through any contact that belongs to the company (contact.company_id).
 *
 * This is important because invoices imported via SAF-T or created from a contact
 * are frequently linked to the contact only, not to the parent company.
 */
export interface AggregatedInvoice {
  id: string;
  status: string | null;
  total: number | null;
  subtotal: number | null;
  tax_amount: number | null;
  amount_paid: number | null;
  issue_date: string | null;
  paid_at: string | null;
  due_date: string | null;
  company_id: string | null;
  contact_id: string | null;
  invoice_number: string | null;
  workspace_id: string | null;
}

export function useCompanyAggregatedInvoices(companyId: string | undefined) {
  return useQuery({
    queryKey: ["company-aggregated-invoices", companyId],
    enabled: !!companyId,
    queryFn: async (): Promise<AggregatedInvoice[]> => {
      if (!companyId) return [];

      // 1. Get all contacts belonging to this company
      const { data: contacts, error: cErr } = await supabase
        .from("contacts")
        .select("id")
        .eq("company_id", companyId)
        .is("deleted_at", null);
      if (cErr) throw cErr;

      const contactIds = (contacts || []).map((c: any) => c.id);

      // 2. Fetch invoices directly linked to the company
      const directPromise = supabase
        .from("invoices")
        .select("id,status,total,subtotal,tax_amount,amount_paid,issue_date,paid_at,due_date,company_id,contact_id,invoice_number")
        .eq("company_id", companyId);

      // 3. Fetch invoices linked to any of the company's contacts
      const viaContactsPromise = contactIds.length > 0
        ? supabase
            .from("invoices")
            .select("id,status,total,subtotal,tax_amount,amount_paid,issue_date,paid_at,due_date,company_id,contact_id,invoice_number")
            .in("contact_id", contactIds)
        : Promise.resolve({ data: [] as any[], error: null });

      const [direct, viaContacts] = await Promise.all([directPromise, viaContactsPromise]);
      if (direct.error) throw direct.error;
      if ((viaContacts as any).error) throw (viaContacts as any).error;

      // Deduplicate by id
      const map = new Map<string, AggregatedInvoice>();
      for (const row of [...(direct.data || []), ...((viaContacts as any).data || [])]) {
        map.set(row.id, row as AggregatedInvoice);
      }
      return Array.from(map.values());
    },
  });
}
