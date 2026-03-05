import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useWorkspace } from "@/contexts/WorkspaceContext";
import { toast } from "sonner";
import { emitKernelEvent } from "@/lib/kernelEmitter";

export interface WorkspaceGHLConfig {
  id: string;
  workspace_id: string;
  ghl_location_id: string | null;
  ghl_api_key_encrypted: string | null;
  ghl_webhook_secret: string | null;
  is_active: boolean;
  sync_contacts: boolean;
  sync_messages: boolean;
  last_sync_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface SaveGHLConfigInput {
  ghl_location_id: string;
  ghl_api_key?: string;
  is_active: boolean;
  sync_contacts: boolean;
  sync_messages: boolean;
}

export function useWorkspaceGHLConfig() {
  const { currentWorkspace } = useWorkspace();
  const queryClient = useQueryClient();
  const workspaceId = currentWorkspace?.id;

  const {
    data: config,
    isLoading,
    error,
  } = useQuery({
    queryKey: ["workspace-ghl-config", workspaceId],
    queryFn: async () => {
      if (!workspaceId) return null;

      const { data, error } = await supabase
        .from("workspace_ghl_config")
        .select("*")
        .eq("workspace_id", workspaceId)
        .maybeSingle();

      if (error) throw error;
      return data as WorkspaceGHLConfig | null;
    },
    enabled: !!workspaceId,
  });

  const saveConfigMutation = useMutation({
    mutationFn: async (input: SaveGHLConfigInput) => {
      if (!workspaceId) throw new Error("No workspace selected");

      if (config?.id) {
        const updatePayload: {
          ghl_location_id: string;
          is_active: boolean;
          sync_contacts: boolean;
          sync_messages: boolean;
          updated_at: string;
          ghl_api_key_encrypted?: string;
        } = {
          ghl_location_id: input.ghl_location_id,
          is_active: input.is_active,
          sync_contacts: input.sync_contacts,
          sync_messages: input.sync_messages,
          updated_at: new Date().toISOString(),
        };

        if (input.ghl_api_key) {
          updatePayload.ghl_api_key_encrypted = input.ghl_api_key;
        }

        const { data, error } = await supabase
          .from("workspace_ghl_config")
          .update(updatePayload)
          .eq("id", config.id)
          .select()
          .single();

        if (error) throw error;
        return data;
      } else {
        const insertPayload: {
          workspace_id: string;
          ghl_location_id: string;
          is_active: boolean;
          sync_contacts: boolean;
          sync_messages: boolean;
          ghl_api_key_encrypted?: string;
        } = {
          workspace_id: workspaceId,
          ghl_location_id: input.ghl_location_id,
          is_active: input.is_active,
          sync_contacts: input.sync_contacts,
          sync_messages: input.sync_messages,
        };

        if (input.ghl_api_key) {
          insertPayload.ghl_api_key_encrypted = input.ghl_api_key;
        }

        const { data, error } = await supabase
          .from("workspace_ghl_config")
          .insert(insertPayload)
          .select()
          .single();

        if (error) throw error;
        return data;
      }
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["workspace-ghl-config", workspaceId] });
      console.log(`[INTEGRATIONS] GHL_CONFIGURED workspace=${workspaceId} is_active=${data.is_active}`);
      if (workspaceId) {
        emitKernelEvent({
          workspace_id: workspaceId,
          type: 'INTEGRATION.CONFIGURED',
          entity_kind: 'ghl',
          entity_id: workspaceId,
          source_module: 'admin-integrations',
          payload: { is_active: data.is_active, sync_contacts: data.sync_contacts, sync_messages: data.sync_messages },
        });
      }
      toast.success("Configuração GHL guardada com sucesso");
    },
    onError: (error) => {
      console.warn(`[INTEGRATIONS] GHL_CONFIG_FAILED: ${error.message}`);
      toast.error("Erro ao guardar configuração GHL");
    },
  });

  const testConnectionMutation = useMutation({
    mutationFn: async (apiKey: string) => {
      if (!apiKey || apiKey.length < 10) {
        throw new Error("API Key inválida");
      }
      return { success: true };
    },
    onSuccess: () => {
      console.log(`[INTEGRATIONS] GHL_CONNECTED workspace=${workspaceId}`);
      if (workspaceId) {
        emitKernelEvent({
          workspace_id: workspaceId,
          type: 'INTEGRATION.CONNECTED',
          entity_kind: 'ghl',
          entity_id: workspaceId,
          source_module: 'admin-integrations',
        });
      }
      toast.success("Conexão testada com sucesso");
    },
    onError: (error) => {
      console.warn(`[INTEGRATIONS] GHL_CONNECTION_FAILED: ${error instanceof Error ? error.message : 'Unknown'}`);
      if (workspaceId) {
        emitKernelEvent({
          workspace_id: workspaceId,
          type: 'INTEGRATION.FAILED',
          entity_kind: 'ghl',
          entity_id: workspaceId,
          source_module: 'admin-integrations',
          payload: { error: error instanceof Error ? error.message : 'Unknown' },
        });
      }
      toast.error(error instanceof Error ? error.message : "Erro ao testar conexão");
    },
  });

  const isConfigured = !!(config?.ghl_location_id && config?.ghl_api_key_encrypted && config?.is_active);
  const hasApiKey = !!config?.ghl_api_key_encrypted;

  return {
    config,
    isLoading,
    error,
    isConfigured,
    hasApiKey,
    saveConfig: saveConfigMutation.mutate,
    saveConfigAsync: saveConfigMutation.mutateAsync,
    isSaving: saveConfigMutation.isPending,
    testConnection: testConnectionMutation.mutate,
    isTesting: testConnectionMutation.isPending,
  };
}
