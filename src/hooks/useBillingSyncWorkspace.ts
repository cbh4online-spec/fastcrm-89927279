import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useWorkspace } from "@/contexts/WorkspaceContext";
import type { BillingSyncRun } from "./useBillingSync";

const sb = supabase as any;

export function useWorkspaceBillingSyncRuns(limit = 50) {
  const { currentWorkspace } = useWorkspace();
  const wid = currentWorkspace?.id;
  return useQuery({
    queryKey: ["billing-sync-runs-ws", wid, limit],
    enabled: !!wid,
    queryFn: async (): Promise<BillingSyncRun[]> => {
      const { data, error } = await sb
        .from("billing_sync_runs")
        .select("*")
        .eq("workspace_id", wid)
        .order("started_at", { ascending: false })
        .limit(limit);
      if (error) throw error;
      return data || [];
    },
    refetchInterval: (q) => {
      const list = (q.state.data as BillingSyncRun[] | undefined) || [];
      return list.some((r) => r.status === "running") ? 4000 : false;
    },
  });
}

export interface ImportedInvoice {
  id: string;
  invoice_number: string | null;
  external_provider: string | null;
  external_id: string | null;
  external_url: string | null;
  external_synced_at: string | null;
  status: string | null;
  total: number | null;
  amount_paid: number | null;
  currency: string | null;
  issue_date: string | null;
  due_date: string | null;
  client_name: string | null;
}

export function useImportedInvoices(limit = 100) {
  const { currentWorkspace } = useWorkspace();
  const wid = currentWorkspace?.id;
  return useQuery({
    queryKey: ["imported-invoices", wid, limit],
    enabled: !!wid,
    queryFn: async (): Promise<ImportedInvoice[]> => {
      const { data, error } = await sb
        .from("invoices")
        .select(
          "id, invoice_number, external_provider, external_id, external_url, external_synced_at, status, total, amount_paid, currency, issue_date, due_date, client_name",
        )
        .eq("workspace_id", wid)
        .not("external_provider", "is", null)
        .order("external_synced_at", { ascending: false })
        .limit(limit);
      if (error) throw error;
      return data || [];
    },
  });
}
