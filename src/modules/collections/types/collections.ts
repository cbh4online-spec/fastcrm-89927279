import type { Database } from "@/integrations/supabase/types";

export type CollectionCaseRow = Database["public"]["Tables"]["collection_cases"]["Row"];
export type CollectionActionRow = Database["public"]["Tables"]["collection_actions"]["Row"];
export type CollectionCaseInvoiceRow =
  Database["public"]["Tables"]["collection_case_invoices"]["Row"];

export type CollectionStatus = CollectionCaseRow["status"];
export type CollectionActionType = CollectionActionRow["action_type"];
export type CollectionChannel = NonNullable<CollectionActionRow["channel"]>;

export interface CollectionCaseListFilters {
  status?: CollectionStatus[];
  assignedTo?: string | null;
  minOverdueDays?: number;
  minAmount?: number;
  search?: string;
  orderBy?: "total_due" | "oldest_due_date" | "updated_at";
}

export interface CaseWithInvoices extends CollectionCaseRow {
  invoices: Array<
    CollectionCaseInvoiceRow & {
      invoice?: {
        id: string;
        invoice_number: string;
        issue_date: string;
        due_date: string;
        total: number;
        amount_paid: number | null;
        status: string;
      } | null;
    }
  >;
}
