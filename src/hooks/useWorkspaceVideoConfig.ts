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
  zoom_enabled: boolean;
  google_service_account_json: string | null;
  google_calendar_email: string | null;
  google_meet_enabled: boolean;
  created_at: string;
  updated_at: string;
}

export interface SaveVideoConfigInput {
  zoom_account_id?: string;
  zoom_client_id?: string;
  zoom_client_secret?: string;
  zoom_enabled: boolean;
  google_service_account_json?: string;
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
        zoom_account_id: input.zoom_account_id || null,
        zoom_client_id: input.zoom_client_id || null,
        zoom_enabled: input.zoom_enabled,
        google_calendar_email: input.google_calendar_email || null,
        google_meet_enabled: input.google_meet_enabled,
        updated_at: new Date().toISOString(),
      };

      // Only update secrets if provided
      if (input.zoom_client_secret) {
        payload.zoom_client_secret_encrypted = input.zoom_client_secret;
      }
      if (input.google_service_account_json) {
        payload.google_service_account_json = input.google_service_account_json;
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

  const testZoomMutation = useMutation({
    mutationFn: async (credentials: { accountId: string; clientId: string; clientSecret: string }) => {
      if (!credentials.accountId || !credentials.clientId || !credentials.clientSecret) {
        throw new Error("Preencha Account ID, Client ID e Client Secret do Zoom");
      }

      const { data, error } = await supabase.functions.invoke("create-video-meeting", {
        body: {
          action: "test",
          provider: "zoom",
          workspace_id: workspaceId,
          test_credentials: {
            zoom_account_id: credentials.accountId,
            zoom_client_id: credentials.clientId,
            zoom_client_secret: credentials.clientSecret,
          },
        },
      });

      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      return data;
    },
    onSuccess: () => {
      toast.success("Conexão Zoom testada com sucesso!");
    },
    onError: (error) => {
      toast.error(error instanceof Error ? error.message : "Erro ao testar Zoom");
    },
  });

  const testGoogleMutation = useMutation({
    mutationFn: async (credentials: { serviceAccountJson: string; calendarEmail: string }) => {
      if (!credentials.serviceAccountJson || !credentials.calendarEmail) {
        throw new Error("Preencha o JSON da Service Account e o email do calendário");
      }

      const { data, error } = await supabase.functions.invoke("create-video-meeting", {
        body: {
          action: "test",
          provider: "google_meet",
          workspace_id: workspaceId,
          test_credentials: {
            google_service_account_json: credentials.serviceAccountJson,
            google_calendar_email: credentials.calendarEmail,
          },
        },
      });

      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      return data;
    },
    onSuccess: () => {
      toast.success("Conexão Google Meet testada com sucesso!");
    },
    onError: (error) => {
      toast.error(error instanceof Error ? error.message : "Erro ao testar Google Meet");
    },
  });

  const isZoomConfigured = !!(
    config?.zoom_account_id &&
    config?.zoom_client_id &&
    config?.zoom_client_secret_encrypted &&
    config?.zoom_enabled
  );

  const isGoogleMeetConfigured = !!(
    config?.google_service_account_json &&
    config?.google_calendar_email &&
    config?.google_meet_enabled
  );

  const hasZoomCredentials = !!(config?.zoom_client_secret_encrypted);
  const hasGoogleCredentials = !!(config?.google_service_account_json);

  return {
    config,
    isLoading,
    error,
    isZoomConfigured,
    isGoogleMeetConfigured,
    hasZoomCredentials,
    hasGoogleCredentials,
    saveConfig: saveConfigMutation.mutate,
    saveConfigAsync: saveConfigMutation.mutateAsync,
    isSaving: saveConfigMutation.isPending,
    testZoom: testZoomMutation.mutate,
    isTestingZoom: testZoomMutation.isPending,
    testGoogleMeet: testGoogleMutation.mutate,
    isTestingGoogle: testGoogleMutation.isPending,
  };
}
