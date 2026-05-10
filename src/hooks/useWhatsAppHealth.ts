import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useWorkspace } from "@/contexts/WorkspaceContext";
import { supabase } from "@/integrations/supabase/client";

export interface WhatsAppHealthEvent {
  id: string;
  workspace_id: string;
  connection_id: string | null;
  event_type: "disconnected" | "recovered" | "qr_expired" | "error" | "degraded";
  from_status: string | null;
  to_status: string | null;
  message: string | null;
  created_at: string;
}

/**
 * Lista eventos de saúde recentes do workspace atual.
 */
export function useWhatsAppHealthEvents(limit = 20) {
  const { currentWorkspace } = useWorkspace();
  return useQuery({
    queryKey: ["whatsapp-health-events", currentWorkspace?.id, limit],
    queryFn: async () => {
      if (!currentWorkspace?.id) return [];
      const { data, error } = await supabase
        .from("whatsapp_health_events" as any)
        .select("id, workspace_id, connection_id, event_type, from_status, to_status, message, created_at")
        .eq("workspace_id", currentWorkspace.id)
        .order("created_at", { ascending: false })
        .limit(limit);
      if (error) throw error;
      return ((data as unknown) as WhatsAppHealthEvent[]) ?? [];
    },
    enabled: !!currentWorkspace,
    refetchInterval: 60_000,
  });
}

/**
 * Dispensa o banner de saúde por N horas (default 4h).
 * Atualiza `health_alert_dismissed_until` na ligação.
 */
export function useDismissWhatsAppHealthAlert() {
  const queryClient = useQueryClient();
  const { currentWorkspace } = useWorkspace();
  return useMutation({
    mutationFn: async (hours: number = 4) => {
      if (!currentWorkspace?.id) throw new Error("No workspace");
      const until = new Date(Date.now() + hours * 3600_000).toISOString();
      const { error } = await supabase
        .from("whatsapp_zapi_connections" as any)
        .update({ health_alert_dismissed_until: until })
        .eq("workspace_id", currentWorkspace.id);
      if (error) throw error;
      return until;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["whatsapp-zapi-connection", currentWorkspace?.id] });
    },
  });
}
