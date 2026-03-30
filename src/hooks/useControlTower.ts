import { useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useWorkspace } from "@/contexts/WorkspaceContext";
import { toast } from "sonner";

export function useControlTowerState() {
  const { currentWorkspace } = useWorkspace();
  const wid = currentWorkspace?.id;
  const qc = useQueryClient();

  const query = useQuery({
    queryKey: ["control-tower-state", wid],
    queryFn: async () => {
      if (!wid) return null;
      const { data, error } = await supabase
        .from("control_tower_state")
        .select("*")
        .eq("workspace_id", wid)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
    enabled: !!wid,
    refetchInterval: 60_000,
  });

  useEffect(() => {
    if (!wid) return;
    const channel = supabase
      .channel(`ct-state-${wid}`)
      .on("postgres_changes", {
        event: "*",
        schema: "public",
        table: "control_tower_state",
        filter: `workspace_id=eq.${wid}`,
      }, () => {
        qc.invalidateQueries({ queryKey: ["control-tower-state", wid] });
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [wid, qc]);

  return query;
}

export function useControlTowerSettings() {
  const { currentWorkspace } = useWorkspace();
  const wid = currentWorkspace?.id;
  const qc = useQueryClient();

  const query = useQuery({
    queryKey: ["control-tower-settings", wid],
    queryFn: async () => {
      if (!wid) return null;
      const { data, error } = await supabase
        .from("control_tower_settings")
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
      default_mode?: string;
      auto_refresh_seconds?: number;
      show_executive_first?: boolean;
      enable_intervention_queue?: boolean;
    }) => {
      if (!wid) throw new Error("No workspace");
      const { error } = await supabase
        .from("control_tower_settings")
        .upsert(
          { workspace_id: wid, ...values, updated_at: new Date().toISOString() },
          { onConflict: "workspace_id" }
        );
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["control-tower-settings", wid] });
      toast.success("Definições da Control Tower atualizadas");
    },
  });

  return { ...query, upsert };
}

export function useRefreshControlTower() {
  const { currentWorkspace } = useWorkspace();
  const wid = currentWorkspace?.id;
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async () => {
      if (!wid) throw new Error("No workspace");
      const { data, error } = await supabase.functions.invoke("process-control-tower", {
        body: { workspace_id: wid },
      });
      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      qc.invalidateQueries({ queryKey: ["control-tower-state"] });
      toast.success(`Control Tower atualizada — ${data?.overall_status ?? "ok"}`);
    },
    onError: (err) => {
      toast.error("Erro ao atualizar Control Tower: " + (err as Error).message);
    },
  });
}

export interface Intervention {
  type: string;
  title: string;
  rationale: string;
  urgency: string;
  impact_estimate: string;
  target_entity_type: string;
  recommended_action: string;
}

export function useControlTowerInterventions() {
  const { data: state } = useControlTowerState();
  const interventions: Intervention[] = Array.isArray(state?.interventions_json)
    ? (state.interventions_json as Intervention[])
    : [];
  return interventions;
}
