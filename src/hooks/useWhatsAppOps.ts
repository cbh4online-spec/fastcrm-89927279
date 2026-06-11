import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useWorkspace } from "@/contexts/WorkspaceContext";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export interface WhatsAppWebhookLog {
  id: string;
  workspace_id: string;
  connection_id: string | null;
  instance_id: string | null;
  event_type: string | null;
  payload: Record<string, unknown>;
  processed: boolean;
  error_message: string | null;
  processing_ms: number | null;
  created_at: string;
}

export function useWhatsAppWebhookLogs(limit = 20) {
  const { currentWorkspace } = useWorkspace();
  return useQuery({
    queryKey: ["whatsapp-webhook-logs", currentWorkspace?.id, limit],
    queryFn: async () => {
      if (!currentWorkspace) return [] as WhatsAppWebhookLog[];
      const { data, error } = await supabase
        .from("whatsapp_webhook_logs" as any)
        .select("*")
        .eq("workspace_id", currentWorkspace.id)
        .order("created_at", { ascending: false })
        .limit(limit);
      if (error) throw error;
      return (data ?? []) as unknown as WhatsAppWebhookLog[];
    },
    enabled: !!currentWorkspace,
    refetchInterval: 15000,
  });
}

export function useWhatsAppTestSend() {
  const { currentWorkspace } = useWorkspace();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (vars: { phone: string; message: string }) => {
      if (!currentWorkspace?.id) throw new Error("No workspace");
      const { data, error } = await supabase.functions.invoke("whatsapp-zapi-test-send", {
        body: { workspaceId: currentWorkspace.id, phone: vars.phone, message: vars.message },
      });
      if (error) throw error;
      if (!data?.ok) throw new Error(data?.error || "Erro a enviar");
      return data;
    },
    onSuccess: () => {
      toast.success("Mensagem de teste enviada");
      qc.invalidateQueries({ queryKey: ["whatsapp-webhook-logs"] });
    },
    onError: (err: Error) => toast.error(err.message),
  });
}

export function useWhatsAppConfigureWebhook() {
  const { currentWorkspace } = useWorkspace();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async () => {
      if (!currentWorkspace?.id) throw new Error("No workspace");
      const { data, error } = await supabase.functions.invoke("whatsapp-zapi-configure-webhook", {
        body: { workspaceId: currentWorkspace.id },
      });
      if (error) throw error;
      if (!data?.ok) throw new Error(data?.error || "Falha a configurar webhook");
      return data;
    },
    onSuccess: () => {
      toast.success("Webhook configurado");
      qc.invalidateQueries({ queryKey: ["whatsapp-zapi-connection"] });
    },
    onError: (err: Error) => toast.error(err.message),
  });
}

/**
 * Mover uma instância Z-API entre workspaces (super-admin).
 * Desactiva no workspace de origem, move credenciais, reconfigura webhook
 * e refresca status/phone_number em série numa única chamada.
 */
export function useMoveWhatsAppZapiInstance() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (vars: {
      toWorkspaceId: string;
      instanceId?: string;
      fromWorkspaceId?: string;
    }) => {
      if (!vars.toWorkspaceId) throw new Error("toWorkspaceId obrigatório");
      if (!vars.instanceId && !vars.fromWorkspaceId) {
        throw new Error("instanceId ou fromWorkspaceId obrigatório");
      }
      const { data, error } = await supabase.functions.invoke(
        "whatsapp-zapi-move-instance",
        { body: vars },
      );
      if (error) throw error;
      if (!data?.ok) throw new Error(data?.error || "Falha ao mover instância");
      return data as {
        ok: true;
        moved: boolean;
        fromWorkspaceId: string;
        toWorkspaceId: string;
        instanceId: string;
        webhookConfigured: boolean;
        status: string;
        connected: boolean;
        phoneNumber: string | null;
      };
    },
    onSuccess: (data) => {
      const msg = data.connected
        ? `Instância movida e ligada (${data.phoneNumber ?? "—"})`
        : data.webhookConfigured
        ? "Instância movida e webhook configurado — aguardar ligação"
        : "Instância movida mas webhook falhou parcialmente";
      toast.success(msg);
      qc.invalidateQueries({ queryKey: ["whatsapp-zapi-connection"] });
      qc.invalidateQueries({ queryKey: ["whatsapp-provider-instances"] });
    },
    onError: (err: Error) => toast.error(err.message),
  });
}
