import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

const sb = supabase as any;

export interface BillingSyncRun {
  id: string;
  workspace_id: string;
  integration_id: string;
  trigger: string;
  status: "running" | "ok" | "error";
  started_at: string;
  finished_at: string | null;
  cursor_from: string | null;
  cursor_to: string | null;
  imported_count: number;
  updated_count: number;
  failed_count: number;
  error_message: string | null;
  details: Record<string, any>;
}

export function useBillingSyncRuns(integrationId?: string) {
  return useQuery({
    queryKey: ["billing-sync-runs", integrationId],
    enabled: !!integrationId,
    queryFn: async (): Promise<BillingSyncRun[]> => {
      const { data, error } = await sb
        .from("billing_sync_runs")
        .select("*")
        .eq("integration_id", integrationId)
        .order("started_at", { ascending: false })
        .limit(50);
      if (error) throw error;
      return data || [];
    },
    refetchInterval: (q) => {
      const list = (q.state.data as BillingSyncRun[] | undefined) || [];
      return list.some((r) => r.status === "running") ? 4000 : false;
    },
  });
}

export function useTriggerBillingSync() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: { integration_id: string; since?: string }) => {
      const { data, error } = await supabase.functions.invoke("invoicexpress-sync-invoices", {
        body: { ...input, trigger: "manual" },
      });
      if (error) throw error;
      const r = data as { ok: boolean; error?: string; imported?: number; updated?: number; failed?: number };
      if (!r.ok) throw new Error(r.error || "Falha na sincronização");
      return r;
    },
    onSuccess: (r, vars) => {
      qc.invalidateQueries({ queryKey: ["billing-sync-runs", vars.integration_id] });
      qc.invalidateQueries({ queryKey: ["billing-integrations"] });
      qc.invalidateQueries({ queryKey: ["invoices"] });
      toast.success(`Sincronizado: ${r.imported ?? 0} novas, ${r.updated ?? 0} atualizadas`);
    },
    onError: (e: any) => toast.error(e?.message || "Erro na sincronização"),
  });
}
