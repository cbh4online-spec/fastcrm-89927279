import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useWorkspace } from "@/contexts/WorkspaceContext";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export type WhatsAppQRStatus =
  | "not_configured"
  | "creating_instance"
  | "qr_pending"
  | "waiting_for_scan"
  | "connected"
  | "disconnected"
  | "qr_expired"
  | "reconnecting"
  | "error";

export interface WhatsAppQRConnection {
  id: string;
  workspace_id: string;
  instance_name: string;
  provider: string;
  status: WhatsAppQRStatus;
  qr_code: string | null;
  qr_updated_at: string | null;
  phone_number: string | null;
  connected_at: string | null;
  disconnected_at: string | null;
  last_seen_at: string | null;
  last_error: string | null;
  metadata_json: Record<string, unknown>;
  created_at: string;
  updated_at: string;
}

export function useWhatsAppQRConnection() {
  const { currentWorkspace } = useWorkspace();

  return useQuery({
    queryKey: ["whatsapp-qr-connection", currentWorkspace?.id],
    queryFn: async () => {
      if (!currentWorkspace) return null;

      const { data, error } = await supabase
        .from("whatsapp_qr_connections" as any)
        .select("*")
        .eq("workspace_id", currentWorkspace.id)
        .maybeSingle();

      if (error) throw error;
      return data as unknown as WhatsAppQRConnection | null;
    },
    enabled: !!currentWorkspace,
    refetchInterval: false,
  });
}

export function useDisconnectWhatsAppQR() {
  const queryClient = useQueryClient();
  const { currentWorkspace } = useWorkspace();

  return useMutation({
    mutationFn: async () => {
      if (!currentWorkspace?.id) throw new Error("No workspace");
      const { data, error } = await supabase.functions.invoke("whatsapp-qr-disconnect", {
        body: { workspaceId: currentWorkspace.id },
      });
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["whatsapp-qr-connection", currentWorkspace?.id] });
      queryClient.invalidateQueries({ queryKey: ["whatsapp-connection", currentWorkspace?.id] });
      toast.success("WhatsApp desconectado com sucesso");
      console.log(`[WHATSAPP_QR] DISCONNECTED workspace=${currentWorkspace?.id}`);
    },
    onError: (error) => {
      toast.error("Erro ao desconectar: " + error.message);
    },
  });
}

export function useSyncWhatsAppQR() {
  const queryClient = useQueryClient();
  const { currentWorkspace } = useWorkspace();

  return useMutation({
    mutationFn: async () => {
      if (!currentWorkspace?.id) throw new Error("No workspace");
      const { data, error } = await supabase.functions.invoke("whatsapp-qr-sync", {
        body: { workspaceId: currentWorkspace.id },
      });
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["whatsapp-qr-connection", currentWorkspace?.id] });
      queryClient.invalidateQueries({ queryKey: ["whatsapp-connection", currentWorkspace?.id] });
    },
  });
}
