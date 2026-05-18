import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { CaseWithInvoices } from "../types/collections";

export function useCollectionCase(caseId: string | undefined) {
  return useQuery({
    queryKey: ["collection-case", caseId],
    enabled: !!caseId,
    queryFn: async (): Promise<CaseWithInvoices | null> => {
      if (!caseId) return null;

      const { data: caseRow, error: caseErr } = await supabase
        .from("collection_cases")
        .select("*")
        .eq("id", caseId)
        .maybeSingle();
      if (caseErr) throw caseErr;
      if (!caseRow) return null;

      const { data: invoices, error: invErr } = await supabase
        .from("collection_case_invoices")
        .select(
          `*, invoice:invoices (id, invoice_number, issue_date, due_date, total, amount_paid, status)`,
        )
        .eq("case_id", caseId)
        .is("removed_at", null)
        .order("snapshot_due_date", { ascending: true });
      if (invErr) throw invErr;

      return { ...caseRow, invoices: (invoices ?? []) as CaseWithInvoices["invoices"] };
    },
  });
}
