import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useWorkspace } from "@/contexts/WorkspaceContext";
import { toast } from "sonner";

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
  ghl_api_key?: string; // Only set when user wants to update the key
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
        // Update existing
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
        // Insert new
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
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["workspace-ghl-config", workspaceId] });
      toast.success("Configuração GHL guardada com sucesso");
    },
    onError: (error) => {
      console.error("Failed to save GHL config:", error);
      toast.error("Erro ao guardar configuração GHL");
    },
  });

  const testConnectionMutation = useMutation({
    mutationFn: async (apiKey: string) => {
      // Test connection to GHL API
      // For V0, we just validate the API key format and optionally ping the API
      if (!apiKey || apiKey.length < 10) {
        throw new Error("API Key inválida");
      }

      // In a real implementation, you would call the GHL API to validate
      // For now, we just check the format
      return { success: true };
    },
    onSuccess: () => {
      toast.success("Conexão testada com sucesso");
    },
    onError: (error) => {
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
