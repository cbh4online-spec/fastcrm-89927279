import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

export interface C2CNotification {
  id: string;
  workspace_id: string;
  user_id: string;
  type: string;
  title: string;
  body: string | null;
  listing_id: string | null;
  related_user_id: string | null;
  is_read: boolean;
  created_at: string;
}

export function useC2CNotifications(workspaceId: string | undefined) {
  const { user } = useAuth();
  return useQuery({
    queryKey: ["c2c-notifications", workspaceId, user?.id],
    queryFn: async () => {
      if (!workspaceId || !user) return [];
      const { data, error } = await supabase
        .from("c2c_notifications")
        .select("*")
        .eq("workspace_id", workspaceId)
        .eq("user_id", user.id)
        .order("created_at", { ascending: false })
        .limit(50);
      if (error) throw error;
      return data as C2CNotification[];
    },
    enabled: !!workspaceId && !!user,
  });
}

export function useUnreadCount(workspaceId: string | undefined) {
  const { user } = useAuth();
  return useQuery({
    queryKey: ["c2c-notifications-unread", workspaceId, user?.id],
    queryFn: async () => {
      if (!workspaceId || !user) return 0;
      const { count, error } = await supabase
        .from("c2c_notifications")
        .select("id", { count: "exact", head: true })
        .eq("workspace_id", workspaceId)
        .eq("user_id", user.id)
        .eq("is_read", false);
      if (error) throw error;
      return count || 0;
    },
    enabled: !!workspaceId && !!user,
    refetchInterval: 30000,
  });
}

export function useMarkNotificationRead() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (notificationId: string) => {
      const { error } = await supabase
        .from("c2c_notifications")
        .update({ is_read: true })
        .eq("id", notificationId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["c2c-notifications"] });
      queryClient.invalidateQueries({ queryKey: ["c2c-notifications-unread"] });
    },
  });
}

export function useMarkAllRead(workspaceId: string | undefined) {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  return useMutation({
    mutationFn: async () => {
      if (!workspaceId || !user) throw new Error("Sem sessão");
      const { error } = await supabase
        .from("c2c_notifications")
        .update({ is_read: true })
        .eq("workspace_id", workspaceId)
        .eq("user_id", user.id)
        .eq("is_read", false);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["c2c-notifications"] });
      queryClient.invalidateQueries({ queryKey: ["c2c-notifications-unread"] });
    },
  });
}
