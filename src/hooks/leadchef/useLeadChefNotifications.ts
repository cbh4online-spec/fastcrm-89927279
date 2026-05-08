import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useWorkspace } from "@/contexts/WorkspaceContext";
import { toast } from "sonner";

export interface LeadChefNotificationPrefs {
  id?: string;
  workspace_id: string;
  user_id: string;
  remind_next_actions: boolean;
  remind_window_minutes: number;
  alert_cold_leads: boolean;
  cold_lead_inactive_days: number;
  quiet_hours_start: number | null;
  quiet_hours_end: number | null;
}

const DEFAULTS = {
  remind_next_actions: true,
  remind_window_minutes: 30,
  alert_cold_leads: true,
  cold_lead_inactive_days: 7,
  quiet_hours_start: 22,
  quiet_hours_end: 8,
};

export function useLeadChefNotificationPrefs() {
  const { user } = useAuth();
  const { currentWorkspace } = useWorkspace();
  const qc = useQueryClient();
  const wsId = currentWorkspace?.id;
  const userId = user?.id;

  const query = useQuery({
    queryKey: ["leadchef-notif-prefs", wsId, userId],
    enabled: !!wsId && !!userId,
    queryFn: async (): Promise<LeadChefNotificationPrefs> => {
      const sb = supabase as any;
      const { data, error } = await sb
        .from("leadchef_notification_prefs")
        .select("*")
        .eq("workspace_id", wsId)
        .eq("user_id", userId)
        .limit(1);
      if (error) throw error;
      const row = data?.[0];
      if (row) return row;
      return { workspace_id: wsId!, user_id: userId!, ...DEFAULTS };
    },
  });

  const save = useMutation({
    mutationFn: async (patch: Partial<LeadChefNotificationPrefs>) => {
      const sb = supabase as any;
      const current = query.data ?? { workspace_id: wsId!, user_id: userId!, ...DEFAULTS };
      const next = { ...current, ...patch, workspace_id: wsId, user_id: userId };
      const { error } = await sb
        .from("leadchef_notification_prefs")
        .upsert(next, { onConflict: "workspace_id,user_id" });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Preferências guardadas.");
      qc.invalidateQueries({ queryKey: ["leadchef-notif-prefs"] });
    },
    onError: (e: any) => toast.error(e.message ?? "Falha ao guardar."),
  });

  return {
    prefs: query.data,
    isLoading: query.isLoading,
    save: (patch: Partial<LeadChefNotificationPrefs>) => save.mutate(patch),
    isSaving: save.isPending,
  };
}

export interface LeadChefPushQueueItem {
  id: string;
  title: string;
  body: string;
  url: string | null;
  status: string;
  scheduled_at: string;
  sent_at: string | null;
  attempts: number;
  last_error: string | null;
  payload: any;
}

export function useLeadChefPushHistory(limit = 30) {
  const { user } = useAuth();
  const { currentWorkspace } = useWorkspace();
  const wsId = currentWorkspace?.id;
  const userId = user?.id;

  return useQuery({
    queryKey: ["leadchef-push-history", wsId, userId, limit],
    enabled: !!wsId && !!userId,
    queryFn: async (): Promise<LeadChefPushQueueItem[]> => {
      const sb = supabase as any;
      const { data, error } = await sb
        .from("leadchef_push_queue")
        .select("id, title, body, url, status, scheduled_at, sent_at, attempts, last_error, payload")
        .eq("workspace_id", wsId)
        .eq("user_id", userId)
        .order("scheduled_at", { ascending: false })
        .limit(limit);
      if (error) throw error;
      return data ?? [];
    },
    refetchInterval: 30_000,
  });
}
