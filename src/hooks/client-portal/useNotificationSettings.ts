import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useClientAuth } from "./useClientAuth";
import { emitKernelEvent } from "@/lib/kernelEmitter";
import { toast } from "sonner";

interface NotificationSettings {
  id: string;
  workspace_id: string;
  company_id: string;
  channel_email: boolean;
  channel_whatsapp: boolean;
  frequency: string;
  opt_in_whatsapp: boolean;
  quiet_hours_start: string | null;
  quiet_hours_end: string | null;
}

export function useNotificationSettings() {
  const { clientUser } = useClientAuth();
  const queryClient = useQueryClient();
  const companyId = clientUser?.company_id;
  const workspaceId = clientUser?.workspace_id;

  const { data: settings, isLoading } = useQuery({
    queryKey: ["client-notification-settings", companyId],
    queryFn: async () => {
      if (!companyId) return null;
      const { data, error } = await supabase
        .from("client_notification_settings")
        .select("*")
        .eq("company_id", companyId)
        .maybeSingle();
      if (error) throw error;
      return data as NotificationSettings | null;
    },
    enabled: !!companyId,
  });

  const upsertSettings = useMutation({
    mutationFn: async (updates: Partial<NotificationSettings>) => {
      if (!companyId || !workspaceId) throw new Error("No company");
      const payload = {
        workspace_id: workspaceId,
        company_id: companyId,
        ...updates,
        updated_at: new Date().toISOString(),
      };
      const { data, error } = await supabase
        .from("client_notification_settings")
        .upsert(payload, { onConflict: "workspace_id,company_id" })
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["client-notification-settings"] });
      console.log(`[NOTIF-SETTINGS] NOTIFICATIONS_UPDATED company=${companyId}`);
      if (workspaceId && companyId) {
        emitKernelEvent({
          workspace_id: workspaceId,
          type: 'SETTINGS.NOTIFICATIONS_UPDATED',
          entity_kind: 'client_notification_settings',
          entity_id: companyId,
          source_module: 'admin-settings',
          payload: { company_id: companyId },
        });
      }
      toast.success("Preferências guardadas!");
    },
    onError: () => {
      console.warn('[NOTIF-SETTINGS] UPDATE_FAILED');
      toast.error("Erro ao guardar preferências");
    },
  });

  return { settings, isLoading, upsertSettings: upsertSettings.mutateAsync, saving: upsertSettings.isPending };
}
