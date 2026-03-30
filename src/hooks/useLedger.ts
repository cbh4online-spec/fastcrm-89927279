import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useWorkspace } from "@/contexts/WorkspaceContext";
import { toast } from "sonner";

export function useLedgerChains(typeFilter?: string, statusFilter?: string) {
  const { currentWorkspace } = useWorkspace();
  const wid = currentWorkspace?.id;

  return useQuery({
    queryKey: ["ledger-chains", wid, typeFilter, statusFilter],
    queryFn: async () => {
      if (!wid) return [];
      let q = supabase
        .from("operating_ledger_chains")
        .select("*")
        .eq("workspace_id", wid)
        .order("created_at", { ascending: false })
        .limit(100);

      if (typeFilter) q = q.eq("chain_type", typeFilter);
      if (statusFilter) q = q.eq("status", statusFilter);

      const { data, error } = await q;
      if (error) throw error;
      return data ?? [];
    },
    enabled: !!wid,
  });
}

export function useLedgerChainDetail(chainId?: string) {
  const { currentWorkspace } = useWorkspace();
  const wid = currentWorkspace?.id;

  return useQuery({
    queryKey: ["ledger-chain-detail", chainId],
    queryFn: async () => {
      if (!chainId || !wid) return null;

      const [chainRes, linksRes] = await Promise.all([
        supabase.from("operating_ledger_chains").select("*").eq("id", chainId).single(),
        supabase.from("operating_ledger_links").select("*").eq("chain_id", chainId).order("depth", { ascending: true }),
      ]);

      if (chainRes.error) throw chainRes.error;

      const eventIds = (linksRes.data ?? []).map(l => l.event_id).filter(Boolean);
      let events: Record<string, any> = {};

      if (eventIds.length > 0) {
        const { data: evts } = await supabase
          .from("kernel_events")
          .select("id, type, entity_kind, entity_id, actor_type, actor_id, source_module, occurred_at, payload, created_at")
          .in("id", eventIds);

        if (evts) {
          events = Object.fromEntries(evts.map(e => [e.id, e]));
        }
      }

      return {
        chain: chainRes.data,
        links: linksRes.data ?? [],
        events,
      };
    },
    enabled: !!chainId && !!wid,
  });
}

export function useLedgerSettings() {
  const { currentWorkspace } = useWorkspace();
  const wid = currentWorkspace?.id;
  const qc = useQueryClient();

  const query = useQuery({
    queryKey: ["ledger-settings", wid],
    queryFn: async () => {
      if (!wid) return null;
      const { data, error } = await supabase
        .from("ledger_settings")
        .select("*")
        .eq("workspace_id", wid)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
    enabled: !!wid,
  });

  const upsert = useMutation({
    mutationFn: async (values: {
      is_enabled?: boolean;
      auto_chain_build?: boolean;
      max_chain_depth?: number;
      retain_raw_payloads?: boolean;
    }) => {
      if (!wid) throw new Error("No workspace");
      const { error } = await supabase
        .from("ledger_settings")
        .upsert({ workspace_id: wid, ...values, updated_at: new Date().toISOString() }, { onConflict: "workspace_id" });
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["ledger-settings", wid] });
      toast.success("Definições do ledger atualizadas");
    },
  });

  return { ...query, upsert };
}

export function useRefreshLedger() {
  const { currentWorkspace } = useWorkspace();
  const wid = currentWorkspace?.id;
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async () => {
      if (!wid) throw new Error("No workspace");
      const { data, error } = await supabase.functions.invoke("process-ledger-chains", {
        body: { workspace_id: wid },
      });
      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      qc.invalidateQueries({ queryKey: ["ledger-chains"] });
      toast.success(`Ledger atualizado: ${data?.chains_processed ?? 0} chains processadas`);
    },
    onError: (err) => {
      toast.error("Erro ao reconstruir chains: " + (err as Error).message);
    },
  });
}

export function useLedgerStats() {
  const { currentWorkspace } = useWorkspace();
  const wid = currentWorkspace?.id;

  return useQuery({
    queryKey: ["ledger-stats", wid],
    queryFn: async () => {
      if (!wid) return { total: 0, completed: 0, failed: 0, active: 0, totalRevenue: 0 };
      const { data, error } = await supabase
        .from("operating_ledger_chains")
        .select("status, outcome_value")
        .eq("workspace_id", wid);

      if (error) throw error;
      const chains = data ?? [];

      return {
        total: chains.length,
        completed: chains.filter(c => c.status === "completed").length,
        failed: chains.filter(c => c.status === "failed").length,
        active: chains.filter(c => c.status === "active").length,
        totalRevenue: chains.reduce((sum, c) => sum + (Number(c.outcome_value) || 0), 0),
      };
    },
    enabled: !!wid,
  });
}

export function useLedgerSearch(query?: string) {
  const { currentWorkspace } = useWorkspace();
  const wid = currentWorkspace?.id;

  return useQuery({
    queryKey: ["ledger-search", wid, query],
    queryFn: async () => {
      if (!wid || !query || query.length < 2) return [];
      const { data, error } = await supabase
        .from("operating_ledger_chains")
        .select("*")
        .eq("workspace_id", wid)
        .or(`correlation_id.ilike.%${query}%,title.ilike.%${query}%,outcome_type.ilike.%${query}%`)
        .order("created_at", { ascending: false })
        .limit(50);

      if (error) throw error;
      return data ?? [];
    },
    enabled: !!wid && !!query && query.length >= 2,
  });
}
