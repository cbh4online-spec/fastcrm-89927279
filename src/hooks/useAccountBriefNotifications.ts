import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useWorkspace } from "@/hooks/useWorkspace";

export interface ABNotification {
  id: string;
  workspace_id: string;
  account_id: string | null;
  notification_type: string;
  priority: string;
  title: string;
  body: string | null;
  channel: string;
  is_read: boolean;
  is_muted: boolean;
  snoozed_until: string | null;
  created_at: string;
}

export function useAccountBriefNotifications() {
  const { currentWorkspace } = useWorkspace();
  const workspaceId = currentWorkspace?.id;
  const queryClient = useQueryClient();

  const { data: notifications = [], isLoading } = useQuery({
    queryKey: ["account-brief-notifications", workspaceId],
    queryFn: async () => {
      if (!workspaceId) return [];
      const now = new Date().toISOString();
      const { data, error } = await supabase
        .from("account_brief_notifications")
        .select("*")
        .eq("workspace_id", workspaceId)
        .eq("is_muted", false)
        .or(`snoozed_until.is.null,snoozed_until.lt.${now}`)
        .order("created_at", { ascending: false })
        .limit(50);
      if (error) throw error;
      return (data || []) as ABNotification[];
    },
    enabled: !!workspaceId,
  });

  const markRead = useMutation({
    mutationFn: async (id: string) => {
      await supabase.from("account_brief_notifications").update({ is_read: true }).eq("id", id);
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["account-brief-notifications"] }),
  });

  const snooze = useMutation({
    mutationFn: async ({ id, days }: { id: string; days: number }) => {
      const until = new Date(Date.now() + days * 86400000).toISOString();
      await supabase.from("account_brief_notifications").update({ snoozed_until: until }).eq("id", id);
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["account-brief-notifications"] }),
  });

  const mute = useMutation({
    mutationFn: async (id: string) => {
      await supabase.from("account_brief_notifications").update({ is_muted: true }).eq("id", id);
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["account-brief-notifications"] }),
  });

  const unreadCount = notifications.filter(n => !n.is_read).length;

  return { notifications, isLoading, markRead, snooze, mute, unreadCount };
}
