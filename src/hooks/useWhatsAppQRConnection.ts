import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useWorkspace } from "@/contexts/WorkspaceContext";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export type WhatsAppQRStatus =
  | "not_configured"
  | "creating_instance"
  | "qr_pending"
  | "waiting_for_scan"
  | "authenticating"
  | "connected"
  | "disconnected"
  | "qr_expired"
  | "reconnecting"
  | "error";

export type WhatsAppSyncHealth =
  | "active"
  | "delayed"
  | "suspended"
  | "degraded"
  | "failed"
  | "unknown";

export type WhatsAppRecoveryState =
  | "none"
  | "checking"
  | "resyncing"
  | "reconnecting"
  | "repair_required"
  | "repaired"
  | "failed";

const TRANSITIONAL_STATUSES: WhatsAppQRStatus[] = [
  "creating_instance",
  "qr_pending",
  "waiting_for_scan",
  "authenticating",
  "reconnecting",
];

const STABLE_POLL_INTERVAL = 60000; // 60s fallback for stable states

export interface WhatsAppQRConnection {
  id: string;
  workspace_id: string;
  instance_name: string;
  provider: string;
  status: WhatsAppQRStatus;
  sync_health: WhatsAppSyncHealth;
  recovery_state: WhatsAppRecoveryState;
  recovery_attempt_count: number;
  recovery_last_attempt_at: string | null;
  qr_code: string | null;
  qr_updated_at: string | null;
  phone_number: string | null;
  connected_at: string | null;
  disconnected_at: string | null;
  last_seen_at: string | null;
  last_error: string | null;
  sync_issue_reason: string | null;
  last_health_check_at: string | null;
  last_sync_at: string | null;
  last_successful_sync_at: string | null;
  last_inbound_message_at: string | null;
  last_outbound_message_at: string | null;
  last_reconnect_at: string | null;
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
    refetchInterval: (query) => {
      const status = query.state.data?.status as WhatsAppQRStatus | undefined;
      if (status && TRANSITIONAL_STATUSES.includes(status)) {
        return 5000; // Fast polling for transitional states
      }
      // Slow fallback for stable states to catch webhook failures
      if (status === "connected") return STABLE_POLL_INTERVAL;
      return false;
    },
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

export function useReconnectWhatsAppQR() {
  const queryClient = useQueryClient();
  const { currentWorkspace } = useWorkspace();

  return useMutation({
    mutationFn: async () => {
      if (!currentWorkspace?.id) throw new Error("No workspace");
      const { data, error } = await supabase.functions.invoke("whatsapp-qr-reconnect", {
        body: { workspaceId: currentWorkspace.id },
      });
      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["whatsapp-qr-connection", currentWorkspace?.id] });
      queryClient.invalidateQueries({ queryKey: ["whatsapp-connection", currentWorkspace?.id] });
      if (data?.recovery_state === "repair_required") {
        toast.warning("Recuperação não resolveu o problema. É necessário iniciar uma nova ligação.");
      } else if (data?.sync_health === "active") {
        toast.success("Reconexão bem-sucedida — sync ativo");
      } else {
        toast.info("Reconexão tentada — a verificar estado...");
      }
      console.log(`[WHATSAPP_QR] RECONNECT_DONE workspace=${currentWorkspace?.id} recovery_state=${data?.recovery_state}`);
    },
    onError: (error) => {
      toast.error("Erro ao reconectar: " + error.message);
    },
  });
}
