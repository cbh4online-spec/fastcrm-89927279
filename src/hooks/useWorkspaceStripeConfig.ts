import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useWorkspace } from "@/contexts/WorkspaceContext";
import { toast } from "sonner";
import { emitKernelEvent } from "@/lib/kernelEmitter";

export interface WorkspaceStripeConfig {
  id: string;
  workspace_id: string;
  stripe_account_id: string | null;
  stripe_secret_key_encrypted: string | null;
  stripe_webhook_secret_encrypted: string | null;
  stripe_publishable_key: string | null;
  is_active: boolean;
  test_mode: boolean;
  created_at: string;
  updated_at: string;
}

export function useWorkspaceStripeConfig() {
  const { currentWorkspace } = useWorkspace();
  const queryClient = useQueryClient();

  const { data: config, isLoading, error } = useQuery({
    queryKey: ["workspace-stripe-config", currentWorkspace?.id],
    queryFn: async () => {
      if (!currentWorkspace?.id) return null;

      const { data, error } = await supabase
        .from("workspace_stripe_config")
        .select("*")
        .eq("workspace_id", currentWorkspace.id)
        .maybeSingle();

      if (error) throw error;
      return data as WorkspaceStripeConfig | null;
    },
    enabled: !!currentWorkspace?.id,
  });

  const saveConfig = useMutation({
    mutationFn: async (configData: {
      stripe_secret_key?: string;
      stripe_webhook_secret?: string;
      stripe_publishable_key?: string;
      stripe_account_id?: string;
      is_active?: boolean;
      test_mode?: boolean;
    }) => {
      if (!currentWorkspace?.id) throw new Error("No workspace selected");

      const payload = {
        workspace_id: currentWorkspace.id,
        ...(configData.stripe_secret_key && { 
          stripe_secret_key_encrypted: configData.stripe_secret_key 
        }),
        ...(configData.stripe_webhook_secret && { 
          stripe_webhook_secret_encrypted: configData.stripe_webhook_secret 
        }),
        ...(configData.stripe_publishable_key && { 
          stripe_publishable_key: configData.stripe_publishable_key 
        }),
        ...(configData.stripe_account_id && { 
          stripe_account_id: configData.stripe_account_id 
        }),
        ...(configData.is_active !== undefined && { 
          is_active: configData.is_active 
        }),
        ...(configData.test_mode !== undefined && { 
          test_mode: configData.test_mode 
        }),
      };

      if (config?.id) {
        const { data, error } = await supabase
          .from("workspace_stripe_config")
          .update(payload)
          .eq("id", config.id)
          .select()
          .single();

        if (error) throw error;
        return data;
      } else {
        const { data, error } = await supabase
          .from("workspace_stripe_config")
          .insert(payload)
          .select()
          .single();

        if (error) throw error;
        return data;
      }
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ 
        queryKey: ["workspace-stripe-config", currentWorkspace?.id] 
      });
      console.log(`[INTEGRATIONS] STRIPE_CONFIGURED workspace=${currentWorkspace?.id} is_active=${data.is_active}`);
      if (currentWorkspace?.id) {
        emitKernelEvent({
          workspace_id: currentWorkspace.id,
          type: 'INTEGRATION.CONFIGURED',
          entity_kind: 'stripe',
          entity_id: currentWorkspace.id,
          source_module: 'admin-integrations',
          payload: { is_active: data.is_active, test_mode: data.test_mode },
        });
      }
      toast.success("Configuração Stripe guardada com sucesso");
    },
    onError: (error) => {
      console.warn(`[INTEGRATIONS] STRIPE_CONFIG_FAILED: ${error.message}`);
      toast.error(`Erro ao guardar configuração: ${error.message}`);
    },
  });

  const testConnection = useMutation({
    mutationFn: async () => {
      if (!currentWorkspace?.id) throw new Error("No workspace selected");

      const { data, error } = await supabase.functions.invoke("test-stripe-connection", {
        body: { workspaceId: currentWorkspace.id },
      });

      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      if (data.success) {
        console.log(`[INTEGRATIONS] STRIPE_CONNECTED workspace=${currentWorkspace?.id}`);
        if (currentWorkspace?.id) {
          emitKernelEvent({
            workspace_id: currentWorkspace.id,
            type: 'INTEGRATION.CONNECTED',
            entity_kind: 'stripe',
            entity_id: currentWorkspace.id,
            source_module: 'admin-integrations',
          });
        }
        toast.success("Conexão Stripe verificada com sucesso!");
      } else {
        console.warn(`[INTEGRATIONS] STRIPE_CONNECTION_FAILED workspace=${currentWorkspace?.id} error=${data.error}`);
        if (currentWorkspace?.id) {
          emitKernelEvent({
            workspace_id: currentWorkspace.id,
            type: 'INTEGRATION.FAILED',
            entity_kind: 'stripe',
            entity_id: currentWorkspace.id,
            source_module: 'admin-integrations',
            payload: { error: data.error },
          });
        }
        toast.error(`Falha na conexão: ${data.error}`);
      }
    },
    onError: (error) => {
      console.warn(`[INTEGRATIONS] STRIPE_CONNECTION_ERROR: ${error.message}`);
      if (currentWorkspace?.id) {
        emitKernelEvent({
          workspace_id: currentWorkspace.id,
          type: 'INTEGRATION.FAILED',
          entity_kind: 'stripe',
          entity_id: currentWorkspace.id,
          source_module: 'admin-integrations',
          payload: { error: error.message },
        });
      }
      toast.error(`Erro ao testar conexão: ${error.message}`);
    },
  });

  return {
    config,
    isLoading,
    error,
    saveConfig,
    testConnection,
    isConfigured: !!config?.is_active && !!config?.stripe_secret_key_encrypted,
  };
}
