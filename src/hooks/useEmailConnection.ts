import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useWorkspace } from "@/contexts/WorkspaceContext";
import { useWorkspaceInstance } from "@/contexts/WorkspaceInstanceContext";
import { toast } from "sonner";
import { emitKernelEvent } from "@/lib/kernelEmitter";

export type EmailProvider = "gmail" | "outlook" | "hostinger" | "custom";
export type EmailAuthType = "oauth" | "app_password";

export interface EmailConnection {
  id: string;
  workspace_id: string;
  email_address: string;
  display_name: string | null;
  provider: EmailProvider;
  auth_type: EmailAuthType;
  imap_host: string | null;
  imap_port: number | null;
  smtp_host: string | null;
  smtp_port: number | null;
  last_sync_at: string | null;
  sync_status: "pending" | "syncing" | "synced" | "error";
  sync_error: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

interface ConnectEmailParams {
  emailAddress: string;
  displayName?: string;
  provider: EmailProvider;
  authType: EmailAuthType;
  appPassword?: string;
  customConfig?: {
    imapHost: string;
    imapPort: number;
    smtpHost: string;
    smtpPort: number;
  };
}

interface UpdateEmailParams {
  connectionId: string;
  displayName?: string;
  newPassword?: string;
  isActive?: boolean;
  serverConfig?: {
    imapHost: string;
    imapPort: number;
    smtpHost: string;
    smtpPort: number;
  };
}

interface DisconnectEmailParams {
  connectionId: string;
  deleteData?: boolean;
}

export function useEmailConnections() {
  const { currentWorkspace } = useWorkspace();
  const { workspaceClient } = useWorkspaceInstance();

  return useQuery({
    queryKey: ["email-connections", currentWorkspace?.id],
    queryFn: async () => {
      if (!currentWorkspace) return [];

      const { data, error } = await workspaceClient
        .from("email_connections")
        .select("*")
        .eq("workspace_id", currentWorkspace.id)
        .order("created_at", { ascending: false });

      if (error) throw error;
      return data as EmailConnection[];
    },
    enabled: !!currentWorkspace,
  });
}

export function useActiveEmailConnection() {
  const { currentWorkspace } = useWorkspace();
  const { workspaceClient } = useWorkspaceInstance();

  return useQuery({
    queryKey: ["email-connection-active", currentWorkspace?.id],
    queryFn: async () => {
      if (!currentWorkspace) return null;

      const { data, error } = await workspaceClient
        .from("email_connections")
        .select("*")
        .eq("workspace_id", currentWorkspace.id)
        .eq("is_active", true)
        .maybeSingle();

      if (error) throw error;
      return data as EmailConnection | null;
    },
    enabled: !!currentWorkspace,
  });
}

export function useConnectEmail() {
  const queryClient = useQueryClient();
  const { currentWorkspace } = useWorkspace();
  const { mainClient } = useWorkspaceInstance();

  return useMutation({
    mutationFn: async (params: ConnectEmailParams) => {
      if (!currentWorkspace) throw new Error("No workspace selected");

      const { data, error } = await mainClient.functions.invoke("email-connect", {
        body: {
          workspaceId: currentWorkspace.id,
          ...params,
        },
      });

      if (error) throw error;
      if (data?.error) throw new Error(data.error);

      return data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["email-connections"] });
      queryClient.invalidateQueries({ queryKey: ["email-connection-active"] });
      console.log(`[INTEGRATIONS] EMAIL_CONNECTED workspace=${currentWorkspace?.id} provider=${variables.provider}`);
      if (currentWorkspace?.id) {
        emitKernelEvent({
          workspace_id: currentWorkspace.id,
          type: 'INTEGRATION.CONNECTED',
          entity_kind: 'email',
          entity_id: currentWorkspace.id,
          source_module: 'admin-integrations',
          payload: { provider: variables.provider },
        });
      }
      toast.success("Email conectado com sucesso!");
    },
    onError: (error) => {
      console.warn(`[INTEGRATIONS] EMAIL_CONNECT_FAILED: ${error.message}`);
      if (currentWorkspace?.id) {
        emitKernelEvent({
          workspace_id: currentWorkspace.id,
          type: 'INTEGRATION.FAILED',
          entity_kind: 'email',
          entity_id: currentWorkspace.id,
          source_module: 'admin-integrations',
          payload: { error: error.message, action: 'connect' },
        });
      }
      toast.error(`Erro ao conectar email: ${error.message}`);
    },
  });
}

export function useUpdateEmail() {
  const queryClient = useQueryClient();
  const { currentWorkspace } = useWorkspace();
  const { mainClient } = useWorkspaceInstance();

  return useMutation({
    mutationFn: async (params: UpdateEmailParams) => {
      if (!currentWorkspace) throw new Error("No workspace selected");

      const { data, error } = await mainClient.functions.invoke("email-update", {
        body: {
          workspaceId: currentWorkspace.id,
          ...params,
        },
      });

      if (error) throw error;
      if (data?.error) throw new Error(data.error);

      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["email-connections"] });
      queryClient.invalidateQueries({ queryKey: ["email-connection-active"] });
      console.log(`[INTEGRATIONS] EMAIL_UPDATED workspace=${currentWorkspace?.id}`);
      toast.success("Configurações atualizadas!");
    },
    onError: (error) => {
      console.warn(`[INTEGRATIONS] EMAIL_UPDATE_FAILED: ${error.message}`);
      toast.error(`Erro ao atualizar: ${error.message}`);
    },
  });
}

export function useDisconnectEmail() {
  const queryClient = useQueryClient();
  const { currentWorkspace } = useWorkspace();
  const { mainClient } = useWorkspaceInstance();

  return useMutation({
    mutationFn: async ({ connectionId, deleteData }: DisconnectEmailParams) => {
      if (!currentWorkspace) throw new Error("No workspace selected");

      const { data, error } = await mainClient.functions.invoke("email-disconnect", {
        body: {
          connectionId,
          workspaceId: currentWorkspace.id,
          deleteData,
        },
      });

      if (error) throw error;
      if (data?.error) throw new Error(data.error);

      return data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["email-connections"] });
      queryClient.invalidateQueries({ queryKey: ["email-connection-active"] });
      console.log(`[INTEGRATIONS] EMAIL_DISCONNECTED workspace=${currentWorkspace?.id} connection=${variables.connectionId}`);
      if (currentWorkspace?.id) {
        emitKernelEvent({
          workspace_id: currentWorkspace.id,
          type: 'INTEGRATION.DISCONNECTED',
          entity_kind: 'email',
          entity_id: variables.connectionId,
          source_module: 'admin-integrations',
        });
      }
      toast.success(variables.deleteData ? "Email removido" : "Email desconectado");
    },
    onError: (error) => {
      console.warn(`[INTEGRATIONS] EMAIL_DISCONNECT_FAILED: ${error.message}`);
      toast.error(`Erro ao desconectar email: ${error.message}`);
    },
  });
}

export function useSyncEmail() {
  const queryClient = useQueryClient();
  const { currentWorkspace } = useWorkspace();
  const { mainClient } = useWorkspaceInstance();

  return useMutation({
    mutationFn: async (connectionId: string) => {
      if (!currentWorkspace) throw new Error("No workspace selected");

      const { data, error } = await mainClient.functions.invoke("email-fetch", {
        body: {
          connectionId,
          workspaceId: currentWorkspace.id,
        },
      });

      if (error) throw error;
      if (data?.error) throw new Error(data.error);

      return data;
    },
    onSuccess: (_, connectionId) => {
      queryClient.invalidateQueries({ queryKey: ["email-connections"] });
      queryClient.invalidateQueries({ queryKey: ["conversations"] });
      console.log(`[INTEGRATIONS] EMAIL_SYNCED workspace=${currentWorkspace?.id} connection=${connectionId}`);
      if (currentWorkspace?.id) {
        emitKernelEvent({
          workspace_id: currentWorkspace.id,
          type: 'INTEGRATION.SYNCED',
          entity_kind: 'email',
          entity_id: connectionId,
          source_module: 'admin-integrations',
        });
      }
      toast.success("Sincronização iniciada");
    },
    onError: (error) => {
      console.warn(`[INTEGRATIONS] EMAIL_SYNC_FAILED: ${error.message}`);
      if (currentWorkspace?.id) {
        emitKernelEvent({
          workspace_id: currentWorkspace.id,
          type: 'INTEGRATION.FAILED',
          entity_kind: 'email',
          entity_id: currentWorkspace.id,
          source_module: 'admin-integrations',
          payload: { error: error.message, action: 'sync' },
        });
      }
      toast.error(`Erro na sincronização: ${error.message}`);
    },
  });
}

export function useForceResyncEmail() {
  const queryClient = useQueryClient();
  const { currentWorkspace } = useWorkspace();
  const { mainClient } = useWorkspaceInstance();

  return useMutation({
    mutationFn: async (connectionId: string) => {
      if (!currentWorkspace) throw new Error("No workspace selected");

      const { data, error } = await mainClient.functions.invoke("email-fetch", {
        body: {
          connectionId,
          workspaceId: currentWorkspace.id,
          forceResync: true,
        },
      });

      if (error) throw error;
      if (data?.error) throw new Error(data.error);

      return data;
    },
    onSuccess: (_, connectionId) => {
      queryClient.invalidateQueries({ queryKey: ["email-connections"] });
      queryClient.invalidateQueries({ queryKey: ["conversations"] });
      queryClient.invalidateQueries({ queryKey: ["leads"] });
      console.log(`[INTEGRATIONS] EMAIL_FORCE_RESYNCED workspace=${currentWorkspace?.id} connection=${connectionId}`);
      toast.success("Re-sincronização completa iniciada");
    },
    onError: (error) => {
      console.warn(`[INTEGRATIONS] EMAIL_FORCE_RESYNC_FAILED: ${error.message}`);
      toast.error(`Erro na re-sincronização: ${error.message}`);
    },
  });
}

export function useSendEmail() {
  const queryClient = useQueryClient();
  const { currentWorkspace } = useWorkspace();
  const { mainClient } = useWorkspaceInstance();

  return useMutation({
    mutationFn: async (params: {
      connectionId: string;
      conversationId: string;
      to: string;
      subject: string;
      body: string;
      isHtml?: boolean;
      inReplyTo?: string;
      references?: string[];
    }) => {
      if (!currentWorkspace) throw new Error("No workspace selected");

      const { data, error } = await mainClient.functions.invoke("email-send", {
        body: {
          ...params,
          workspaceId: currentWorkspace.id,
        },
      });

      if (error) throw error;
      if (data?.error) throw new Error(data.error);

      return data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["messages", variables.conversationId] });
      queryClient.invalidateQueries({ queryKey: ["conversations"] });
      console.log(`[INTEGRATIONS][EMAIL] EMAIL_SENT workspace=${currentWorkspace?.id}`);
      if (currentWorkspace?.id) {
        emitKernelEvent({
          workspace_id: currentWorkspace.id,
          type: 'EMAIL.SENT',
          entity_kind: 'message',
          entity_id: variables.conversationId,
          source_module: 'comm-email',
          payload: {
            to: variables.to,
            has_subject: !!variables.subject,
            is_html: !!variables.isHtml,
            has_in_reply_to: !!variables.inReplyTo,
          },
        });
      }
      toast.success("Email enviado!");
    },
    onError: (error) => {
      console.warn(`[INTEGRATIONS][EMAIL] EMAIL_SEND_FAILED: ${error.message}`);
      if (currentWorkspace?.id) {
        emitKernelEvent({
          workspace_id: currentWorkspace.id,
          type: 'EMAIL.SEND_FAILED',
          entity_kind: 'message',
          entity_id: currentWorkspace.id,
          source_module: 'comm-email',
          payload: { error: error.message },
        });
      }
      toast.error(`Erro ao enviar email: ${error.message}`);
    },
  });
}
