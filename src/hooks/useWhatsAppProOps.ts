import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useWorkspace } from "@/contexts/WorkspaceContext";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export interface WhatsAppWebhookLog {
  id: string;
  workspace_id: string | null;
  provider_instance_id: string | null;
  provider_name: string | null;
  event_type: string | null;
  payload: Record<string, unknown>;
  headers: Record<string, unknown> | null;
  normalized_payload: Record<string, unknown> | null;
  direction: string;
  phone: string | null;
  processed: boolean;
  error_message: string | null;
  created_at: string;
}

export interface ProviderRequestLog {
  id: string;
  workspace_id: string;
  provider_instance_id: string | null;
  provider_name: string;
  direction: string;
  endpoint: string | null;
  request_payload: Record<string, unknown> | null;
  response_payload: Record<string, unknown> | null;
  status_code: number | null;
  success: boolean;
  error: string | null;
  duration_ms: number | null;
  created_at: string;
}

export interface WebhookLogFilters {
  eventType?: string;
  processed?: "all" | "processed" | "errors";
  phone?: string;
  provider?: string;
}

export function useWhatsAppWebhookLogs(filters: WebhookLogFilters = {}, limit = 100) {
  const { currentWorkspace } = useWorkspace();
  return useQuery({
    queryKey: ["whatsapp-webhook-logs", currentWorkspace?.id, filters, limit],
    queryFn: async () => {
      if (!currentWorkspace) return [];
      let q = supabase
        .from("whatsapp_webhook_logs" as never)
        .select("*")
        .eq("workspace_id", currentWorkspace.id)
        .order("created_at", { ascending: false })
        .limit(limit);
      if (filters.eventType) q = q.eq("event_type", filters.eventType);
      if (filters.provider) q = q.eq("provider_name", filters.provider);
      if (filters.phone) q = q.ilike("phone", `%${filters.phone}%`);
      if (filters.processed === "processed") q = q.eq("processed", true);
      if (filters.processed === "errors") q = q.not("error_message", "is", null);
      const { data, error } = await q;
      if (error) throw error;
      return (data ?? []) as unknown as WhatsAppWebhookLog[];
    },
    enabled: !!currentWorkspace,
    refetchInterval: 15000,
  });
}

export function useProviderRequestLogs(limit = 100) {
  const { currentWorkspace } = useWorkspace();
  return useQuery({
    queryKey: ["provider-request-logs", currentWorkspace?.id, limit],
    queryFn: async () => {
      if (!currentWorkspace) return [];
      const { data, error } = await supabase
        .from("provider_request_logs" as never)
        .select("*")
        .eq("workspace_id", currentWorkspace.id)
        .order("created_at", { ascending: false })
        .limit(limit);
      if (error) throw error;
      return (data ?? []) as unknown as ProviderRequestLog[];
    },
    enabled: !!currentWorkspace,
    refetchInterval: 30000,
  });
}

export function useRegenerateWebhookToken() {
  const qc = useQueryClient();
  const { currentWorkspace } = useWorkspace();
  return useMutation({
    mutationFn: async (instanceId: string) => {
      const { data, error } = await supabase.rpc(
        "regenerate_provider_webhook_token" as never,
        { p_instance_id: instanceId } as never,
      );
      if (error) throw error;
      return data as unknown as string;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["whatsapp-provider-instance", currentWorkspace?.id] });
      toast.success("Token de webhook regenerado");
    },
    onError: (e: Error) => toast.error("Falha ao regenerar token: " + e.message),
  });
}

export function useTestProviderConnection() {
  const { currentWorkspace } = useWorkspace();
  return useMutation({
    mutationFn: async () => {
      if (!currentWorkspace) throw new Error("no_workspace");
      const { data, error } = await supabase.functions.invoke("whatsapp-test-provider", {
        body: { workspaceId: currentWorkspace.id },
      });
      if (error) throw error;
      if (data?.error && !data?.ok) throw new Error(data.error);
      return data;
    },
    onSuccess: (data) => {
      if (data?.ok) toast.success(`Provider ${data.provider} OK${data.connection_status ? ` (${data.connection_status})` : ""}`);
      else toast.error(`Provider não configurado: ${data?.error ?? "erro"}`);
    },
    onError: (e: Error) => toast.error("Teste falhou: " + e.message),
  });
}

export function useSimulateInbound() {
  const qc = useQueryClient();
  const { currentWorkspace } = useWorkspace();
  return useMutation({
    mutationFn: async (input: {
      phone: string;
      contactName?: string;
      messageType?: "text" | "image" | "audio" | "document" | "video";
      text?: string;
      mediaUrl?: string;
      mediaMimeType?: string;
    }) => {
      if (!currentWorkspace) throw new Error("no_workspace");
      const { data, error } = await supabase.functions.invoke("whatsapp-simulate-inbound", {
        body: { workspaceId: currentWorkspace.id, ...input },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      return data;
    },
    onSuccess: () => {
      toast.success("Mensagem inbound simulada");
      qc.invalidateQueries({ queryKey: ["whatsapp-webhook-logs"] });
      qc.invalidateQueries({ queryKey: ["conversations"] });
    },
    onError: (e: Error) => toast.error("Falha na simulação: " + e.message),
  });
}
