import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useWorkspace } from "@/contexts/WorkspaceContext";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export type ZapiStatus =
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

export type ZapiAccountMode = "master" | "byo";

export interface WhatsAppZapiConnection {
  id: string;
  workspace_id: string;
  instance_id: string | null;
  instance_name: string | null;
  account_mode: ZapiAccountMode;
  status: ZapiStatus;
  phone_number: string | null;
  qr_code: string | null;
  qr_updated_at: string | null;
  connected_at: string | null;
  disconnected_at: string | null;
  last_seen_at: string | null;
  last_sync_at: string | null;
  last_error: string | null;
  webhook_configured: boolean;
  webhook_last_received_at: string | null;
  webhook_last_error: string | null;
  ai_auto_analyze: boolean;
  metadata_json: Record<string, unknown>;
  created_at: string;
  updated_at: string;
}

const TRANSITIONAL: ZapiStatus[] = [
  "creating_instance",
  "qr_pending",
  "waiting_for_scan",
  "authenticating",
  "reconnecting",
];

export function useWhatsAppZapiConnection() {
  const { currentWorkspace } = useWorkspace();

  return useQuery({
    queryKey: ["whatsapp-zapi-connection", currentWorkspace?.id],
    queryFn: async () => {
      if (!currentWorkspace) return null;
      const { data, error } = await supabase
        .from("whatsapp_zapi_connections" as any)
        .select(
          "id, workspace_id, instance_id, instance_name, account_mode, status, phone_number, qr_code, qr_updated_at, connected_at, disconnected_at, last_seen_at, last_sync_at, last_error, webhook_configured, webhook_last_received_at, webhook_last_error, ai_auto_analyze, metadata_json, created_at, updated_at"
        )
        .eq("workspace_id", currentWorkspace.id)
        .maybeSingle();
      if (error) throw error;
      return (data as unknown) as WhatsAppZapiConnection | null;
    },
    enabled: !!currentWorkspace,
    refetchInterval: (query) => {
      const status = query.state.data?.status as ZapiStatus | undefined;
      if (status && TRANSITIONAL.includes(status)) return 5000;
      if (status === "connected") return 60000;
      return false;
    },
  });
}

export function useConnectWhatsAppZapi() {
  const queryClient = useQueryClient();
  const { currentWorkspace } = useWorkspace();

  return useMutation({
    mutationFn: async (byo?: { instanceId: string; instanceToken: string; clientToken: string }) => {
      if (!currentWorkspace?.id) throw new Error("No workspace");
      const { data, error } = await supabase.functions.invoke("whatsapp-zapi-connect", {
        body: { workspaceId: currentWorkspace.id, byo },
      });
      if (error) throw error;
      if (data?.error) {
        const e = new Error(data.error) as Error & { requires_byo?: boolean };
        if (data.requires_byo) e.requires_byo = true;
        throw e;
      }
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["whatsapp-zapi-connection", currentWorkspace?.id] });
      toast.success("Instância Z-API criada — escaneie o QR code");
    },
    onError: (err: Error & { requires_byo?: boolean }) => {
      if (!err.requires_byo) {
        toast.error(err.message, { duration: 8000 });
      }
    },
  });
}

export function useStatusWhatsAppZapi() {
  const queryClient = useQueryClient();
  const { currentWorkspace } = useWorkspace();

  return useMutation({
    mutationFn: async () => {
      if (!currentWorkspace?.id) throw new Error("No workspace");
      const { data, error } = await supabase.functions.invoke("whatsapp-zapi-status", {
        body: { workspaceId: currentWorkspace.id },
      });
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["whatsapp-zapi-connection", currentWorkspace?.id] });
    },
  });
}

export function useDisconnectWhatsAppZapi() {
  const queryClient = useQueryClient();
  const { currentWorkspace } = useWorkspace();

  return useMutation({
    mutationFn: async () => {
      if (!currentWorkspace?.id) throw new Error("No workspace");
      const { data, error } = await supabase.functions.invoke("whatsapp-zapi-disconnect", {
        body: { workspaceId: currentWorkspace.id },
      });
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["whatsapp-zapi-connection", currentWorkspace?.id] });
      toast.success("WhatsApp desconectado");
    },
    onError: (err: Error) => {
      toast.error("Erro a desconectar: " + err.message);
    },
  });
}
