import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useWorkspace } from "@/contexts/WorkspaceContext";
import { useWorkspaceInstance } from "@/contexts/WorkspaceInstanceContext";
import { emitKernelEvent } from "@/lib/kernelEmitter";

export interface WhatsAppConnection {
  id: string;
  workspace_id: string;
  phone_number_id: string | null;
  waba_id: string | null;
  display_phone_number: string | null;
  access_token: string | null;
  is_active: boolean;
  token_expires_at: string | null;
  connected_by: string | null;
  created_at: string;
  updated_at: string;
}

export function useWhatsAppConnection() {
  const { currentWorkspace } = useWorkspace();
  const { workspaceClient } = useWorkspaceInstance();

  return useQuery({
    queryKey: ["whatsapp-connection", currentWorkspace?.id],
    queryFn: async () => {
      if (!currentWorkspace) return null;

      const { data, error } = await workspaceClient
        .from("whatsapp_connections")
        .select("*")
        .eq("workspace_id", currentWorkspace.id)
        .maybeSingle();

      if (error) throw error;
      return data as WhatsAppConnection | null;
    },
    enabled: !!currentWorkspace,
  });
}

export function useDisconnectWhatsApp() {
  const queryClient = useQueryClient();
  const { currentWorkspace } = useWorkspace();
  const { workspaceClient } = useWorkspaceInstance();

  return useMutation({
    mutationFn: async (connectionId: string) => {
      const { error } = await workspaceClient
        .from("whatsapp_connections")
        .update({ is_active: false })
        .eq("id", connectionId);

      if (error) throw error;
    },
    onSuccess: (_, connectionId) => {
      queryClient.invalidateQueries({
        queryKey: ["whatsapp-connection", currentWorkspace?.id],
      });
      console.log(`[INTEGRATIONS] WHATSAPP_DISCONNECTED workspace=${currentWorkspace?.id} connection=${connectionId}`);
      if (currentWorkspace?.id) {
        emitKernelEvent({
          workspace_id: currentWorkspace.id,
          type: 'INTEGRATION.DISCONNECTED',
          entity_kind: 'whatsapp',
          entity_id: connectionId,
          source_module: 'admin-integrations',
        });
      }
    },
    onError: (error) => {
      console.warn(`[INTEGRATIONS] WHATSAPP_DISCONNECT_FAILED: ${error.message}`);
    },
  });
}
