import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

export function useExecutiveSnapshot(workspaceId: string | undefined, snapshotType?: string) {
  return useQuery({
    queryKey: ["executive-snapshot", workspaceId, snapshotType],
    queryFn: async () => {
      if (!workspaceId) return null;
      let q = supabase
        .from("executive_snapshots")
        .select("*")
        .eq("workspace_id", workspaceId)
        .order("created_at", { ascending: false })
        .limit(1);
      if (snapshotType) q = q.eq("snapshot_type", snapshotType);
      const { data, error } = await q.maybeSingle();
      if (error) throw error;
      return data;
    },
    enabled: !!workspaceId,
  });
}

export function useExecutiveSnapshots(workspaceId: string | undefined) {
  return useQuery({
    queryKey: ["executive-snapshots", workspaceId],
    queryFn: async () => {
      if (!workspaceId) return [];
      const { data, error } = await supabase
        .from("executive_snapshots")
        .select("*")
        .eq("workspace_id", workspaceId)
        .order("created_at", { ascending: false })
        .limit(20);
      if (error) throw error;
      return data || [];
    },
    enabled: !!workspaceId,
  });
}

export function useDecisionPacks(workspaceId: string | undefined, statusFilter?: string) {
  return useQuery({
    queryKey: ["decision-packs", workspaceId, statusFilter],
    queryFn: async () => {
      if (!workspaceId) return [];
      let q = supabase
        .from("executive_decision_packs")
        .select("*")
        .eq("workspace_id", workspaceId)
        .order("created_at", { ascending: false })
        .limit(20);
      if (statusFilter) q = q.eq("status", statusFilter);
      const { data, error } = await q;
      if (error) throw error;
      return data || [];
    },
    enabled: !!workspaceId,
  });
}

export function useGenerateBrief(workspaceId: string | undefined) {
  const qc = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (snapshotType: string = "board") => {
      const { data, error } = await supabase.functions.invoke("generate-executive-brief", {
        body: { workspace_id: workspaceId, snapshot_type: snapshotType },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["executive-snapshot", workspaceId] });
      qc.invalidateQueries({ queryKey: ["executive-snapshots", workspaceId] });
      qc.invalidateQueries({ queryKey: ["decision-packs", workspaceId] });
      toast({ title: "Briefing executivo gerado com sucesso" });
    },
    onError: (err: any) => {
      toast({ title: "Erro ao gerar briefing", description: err.message, variant: "destructive" });
    },
  });
}

export function useActOnDecision(workspaceId: string | undefined) {
  const qc = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async ({ id, status }: { id: string; status: "accepted" | "dismissed" | "executed" }) => {
      const { error } = await supabase
        .from("executive_decision_packs")
        .update({ status, updated_at: new Date().toISOString() })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["decision-packs", workspaceId] });
      toast({ title: "Decisão atualizada" });
    },
  });
}

export function useExecutiveSettings(workspaceId: string | undefined) {
  const qc = useQueryClient();

  const query = useQuery({
    queryKey: ["executive-settings", workspaceId],
    queryFn: async () => {
      if (!workspaceId) return null;
      const { data, error } = await supabase
        .from("executive_mode_settings")
        .select("*")
        .eq("workspace_id", workspaceId)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
    enabled: !!workspaceId,
  });

  const upsert = useMutation({
    mutationFn: async (settings: Record<string, any>) => {
      const { error } = await supabase
        .from("executive_mode_settings")
        .upsert({ workspace_id: workspaceId, ...settings, updated_at: new Date().toISOString() }, { onConflict: "workspace_id" });
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["executive-settings", workspaceId] }),
  });

  return { ...query, upsert };
}
