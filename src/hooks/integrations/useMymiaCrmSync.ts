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
  source_url: string | null;
  pull_enabled: boolean;
  pull_conversations: boolean;
  last_pull_at: string | null;
  last_pull_summary: Record<string, number> | null;
}

export interface MymiaPullResult {
  ok: boolean;
  mode?: string;
  received?: number;
  created?: number;
  updated?: number;
  skipped?: number;
  activities?: number;
  conversations?: number;
  messages?: number;
  error?: unknown;
  reason?: string;
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

function reasonToMessage(reason?: string): string {
  switch (reason) {
    case "source_url_invalido":
      return "Indique o endereço do mymia.world antes de sincronizar.";
    case "pull_desligado":
      return "Ligue primeiro a opção de trazer dados do mymia.world.";
    case "chave_origem_ausente":
      return "Falta a chave de acesso do mymia.world. Peça para a guardar em segurança.";
    case "chave_origem_invalida":
      return "O mymia.world recusou a chave de acesso guardada. Use o envio por token (FASTCRM_CRM_URL + FASTCRM_CRM_TOKEN) a partir do mymia.world.";
    case "origem_inacessivel":
      return "Não foi possível contactar o mymia.world. Tente novamente mais tarde.";
    case "not_workspace_admin":
      return "Só um responsável do espaço de trabalho pode sincronizar.";
    default:
      return reason
        ? `Não foi possível sincronizar (${reason}).`
        : "Não foi possível sincronizar.";
  }
}

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

  const runPull = useMutation({
    mutationFn: async (opts: { mode: "preview" | "apply"; limit?: number }) => {
      if (!workspaceId) throw new Error("Nenhum espaço de trabalho ativo");
      const { data, error } = await supabase.functions.invoke("mymia-crm-pull", {
        body: {
          workspace_id: workspaceId,
          mode: opts.mode,
          limit: opts.limit ?? 200,
          include_conversations: true,
        },
      });
      if (error) throw error;
      const result = data as MymiaPullResult;
      if (result?.ok === false || result?.reason) {
        throw new Error(reasonToMessage(result.reason));
      }
      return result;
    },
    onSuccess: (result, variables) => {
      if (variables.mode === "preview") {
        toast.success(`Encontrei ${result.received ?? 0} contactos no mymia.world`);
      } else {
        toast.success(
          `${result.created ?? 0} novos, ${result.updated ?? 0} atualizados, ${result.conversations ?? 0} conversas, ${result.messages ?? 0} mensagens`,
        );
      }
      qc.invalidateQueries({ queryKey: ["mymia-crm-sync-settings", workspaceId] });
      qc.invalidateQueries({ queryKey: ["mymia-crm-sync-logs", workspaceId] });
      qc.invalidateQueries({ queryKey: ["mymia-crm-linked-count", workspaceId] });
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
    runPull,
    endpointUrl,
  };
}
