import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useWorkspace } from "@/contexts/WorkspaceContext";
import { toast } from "sonner";

export interface WorkspaceVideoConfig {
  id: string;
  workspace_id: string;
  zoom_account_id: string | null;
  zoom_client_id: string | null;
  zoom_client_secret_encrypted: string | null;
  zoom_access_token: string | null;
  zoom_refresh_token: string | null;
  zoom_token_expires_at: string | null;
  zoom_enabled: boolean;
  google_service_account_json: string | null;
  google_calendar_email: string | null;
  google_client_id: string | null;
  google_client_secret_encrypted: string | null;
  google_access_token: string | null;
  google_refresh_token: string | null;
  google_token_expires_at: string | null;
  google_meet_enabled: boolean;
  created_at: string;
  updated_at: string;
}

export interface SaveVideoConfigInput {
  zoom_client_id?: string;
  zoom_client_secret?: string;
  zoom_enabled: boolean;
  google_client_id?: string;
  google_client_secret?: string;
  google_calendar_email?: string;
  google_meet_enabled: boolean;
}

export function useWorkspaceVideoConfig() {
  const { currentWorkspace } = useWorkspace();
  const queryClient = useQueryClient();
  const workspaceId = currentWorkspace?.id;

  const {
    data: config,
    isLoading,
    error,
  } = useQuery({
    queryKey: ["workspace-video-config", workspaceId],
    queryFn: async () => {
      if (!workspaceId) return null;

      const { data, error } = await (supabase as any)
        .from("workspace_video_config")
        .select("*")
        .eq("workspace_id", workspaceId)
        .maybeSingle();

      if (error) throw error;
      return data as WorkspaceVideoConfig | null;
    },
    enabled: !!workspaceId,
  });

  const saveConfigMutation = useMutation({
    mutationFn: async (input: SaveVideoConfigInput) => {
      if (!workspaceId) throw new Error("No workspace selected");

      const payload: Record<string, unknown> = {
        zoom_client_id: input.zoom_client_id || null,
        zoom_enabled: input.zoom_enabled,
        google_client_id: input.google_client_id || null,
        google_calendar_email: input.google_calendar_email || null,
        google_meet_enabled: input.google_meet_enabled,
        updated_at: new Date().toISOString(),
      };

      // Only update secrets if provided
      if (input.zoom_client_secret) {
        payload.zoom_client_secret_encrypted = input.zoom_client_secret;
      }
      if (input.google_client_secret) {
        payload.google_client_secret_encrypted = input.google_client_secret;
      }

      if (config?.id) {
        const { data, error } = await (supabase as any)
          .from("workspace_video_config")
          .update(payload)
          .eq("id", config.id)
          .select()
          .single();

        if (error) throw error;
        return data;
      } else {
        payload.workspace_id = workspaceId;
        const { data, error } = await (supabase as any)
          .from("workspace_video_config")
          .insert(payload)
          .select()
          .single();

        if (error) throw error;
        return data;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["workspace-video-config", workspaceId] });
      toast.success("Configuração de videoconferência guardada");
    },
    onError: (error) => {
      console.error("Failed to save video config:", error);
      toast.error("Erro ao guardar configuração");
    },
  });

  const connectOAuthMutation = useMutation({
    mutationFn: async (provider: "zoom" | "google_meet") => {
      if (!workspaceId) throw new Error("No workspace selected");

      const redirectUrl = window.location.origin + window.location.pathname;

      const { data, error } = await supabase.functions.invoke("video-auth-url", {
        body: {
          provider,
          workspace_id: workspaceId,
          redirect_url: redirectUrl,
        },
      });

      if (error) throw error;
      if (data?.error) throw new Error(data.error);

      if (data?.authUrl) {
        window.location.href = data.authUrl;
      }
    },
    onError: (error) => {
      toast.error(error instanceof Error ? error.message : "Erro ao iniciar ligação");
    },
  });

  const disconnectMutation = useMutation({
    mutationFn: async (provider: "zoom" | "google_meet") => {
      if (!config?.id) throw new Error("No config found");

      const updates: Record<string, unknown> = {
        updated_at: new Date().toISOString(),
      };

      if (provider === "zoom") {
        updates.zoom_access_token = null;
        updates.zoom_refresh_token = null;
        updates.zoom_token_expires_at = null;
        updates.zoom_enabled = false;
      } else {
        updates.google_access_token = null;
        updates.google_refresh_token = null;
        updates.google_token_expires_at = null;
        updates.google_meet_enabled = false;
      }

      const { error } = await (supabase as any)
        .from("workspace_video_config")
        .update(updates)
        .eq("id", config.id);

      if (error) throw error;
    },
    onSuccess: (_, provider) => {
      queryClient.invalidateQueries({ queryKey: ["workspace-video-config", workspaceId] });
      toast.success(provider === "zoom" ? "Zoom desligado" : "Google Meet desligado");
    },
    onError: () => {
      toast.error("Erro ao desligar");
    },
  });

  const testConnectionMutation = useMutation({
    mutationFn: async (provider: "zoom" | "google_meet") => {
      const { data, error } = await supabase.functions.invoke("create-video-meeting", {
        body: {
          action: "test",
          provider,
          workspace_id: workspaceId,
        },
      });

      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      return data;
    },
    onSuccess: (_, provider) => {
      toast.success(provider === "zoom" ? "Zoom conectado com sucesso!" : "Google Meet conectado com sucesso!");
    },
    onError: (error) => {
      toast.error(error instanceof Error ? error.message : "Erro ao testar conexão");
    },
  });

  const isZoomConnected = !!(config?.zoom_refresh_token && config?.zoom_enabled);
  const isGoogleMeetConnected = !!(config?.google_refresh_token && config?.google_meet_enabled);

  const isZoomConfigured = !!(config?.zoom_client_id && config?.zoom_client_secret_encrypted);
  const isGoogleMeetConfigured = !!(config?.google_client_id && config?.google_client_secret_encrypted);

  const hasZoomCredentials = !!(config?.zoom_client_secret_encrypted);
  const hasGoogleCredentials = !!(config?.google_client_secret_encrypted);

  return {
    config,
    isLoading,
    error,
    isZoomConnected,
    isGoogleMeetConnected,
    isZoomConfigured,
    isGoogleMeetConfigured,
    hasZoomCredentials,
    hasGoogleCredentials,
    saveConfig: saveConfigMutation.mutate,
    saveConfigAsync: saveConfigMutation.mutateAsync,
    isSaving: saveConfigMutation.isPending,
    connectOAuth: connectOAuthMutation.mutate,
    isConnecting: connectOAuthMutation.isPending,
    disconnect: disconnectMutation.mutate,
    isDisconnecting: disconnectMutation.isPending,
    testConnection: testConnectionMutation.mutate,
    isTesting: testConnectionMutation.isPending,
  };
}
