import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useWorkspace } from "@/contexts/WorkspaceContext";
import { toast } from "sonner";

export interface MymiaCrmSyncSettings {
  workspace_id: string;
  inbound_enabled: boolean;
  outbound_enabled: boolean;
  outbound_endpoint_url: string | null;
  default_source: string;
  default_tags: string[];
}

export interface MymiaCrmSyncLog {
  id: string;
  direction: string;
  action: string;
  status: string;
  external_lead_id: string | null;
  lead_id: string | null;
  error: string | null;
  details: Record<string, unknown> | null;
  created_at: string;
}

const PROJECT_ID = import.meta.env.VITE_SUPABASE_PROJECT_ID as string;

export function useMymiaCrmSync() {
  const { currentWorkspace } = useWorkspace();
  const workspaceId = currentWorkspace?.id ?? null;
  const qc = useQueryClient();

  const settingsQuery = useQuery({
    queryKey: ["mymia-crm-sync-settings", workspaceId],
    enabled: !!workspaceId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("mymia_crm_sync_settings")
        .select("*")
        .eq("workspace_id", workspaceId!)
        .maybeSingle();
      if (error) throw error;
      return (data as MymiaCrmSyncSettings | null) ?? null;
    },
  });

  const logsQuery = useQuery({
    queryKey: ["mymia-crm-sync-logs", workspaceId],
    enabled: !!workspaceId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("mymia_crm_sync_logs")
        .select("*")
        .eq("workspace_id", workspaceId!)
        .order("created_at", { ascending: false })
        .limit(50);
      if (error) throw error;
      return (data ?? []) as MymiaCrmSyncLog[];
    },
  });

  const linkedCountQuery = useQuery({
    queryKey: ["mymia-crm-linked-count", workspaceId],
    enabled: !!workspaceId,
    queryFn: async () => {
      const { count, error } = await supabase
        .from("mymia_crm_lead_links")
        .select("id", { count: "exact", head: true })
        .eq("workspace_id", workspaceId!);
      if (error) throw error;
      return count ?? 0;
    },
  });

  const saveSettings = useMutation({
    mutationFn: async (patch: Partial<MymiaCrmSyncSettings>) => {
      if (!workspaceId) throw new Error("Nenhum espaço de trabalho ativo");
      const { error } = await supabase
        .from("mymia_crm_sync_settings")
        .upsert({ workspace_id: workspaceId, ...patch }, { onConflict: "workspace_id" });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Configuração guardada");
      qc.invalidateQueries({ queryKey: ["mymia-crm-sync-settings", workspaceId] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const endpointUrl = PROJECT_ID
    ? `https://${PROJECT_ID}.supabase.co/functions/v1/mymia-crm-sync`
    : "";

  return {
    workspaceId,
    settings: settingsQuery.data ?? null,
    isLoading: settingsQuery.isLoading,
    logs: logsQuery.data ?? [],
    logsLoading: logsQuery.isLoading,
    linkedCount: linkedCountQuery.data ?? 0,
    saveSettings,
    endpointUrl,
  };
}
