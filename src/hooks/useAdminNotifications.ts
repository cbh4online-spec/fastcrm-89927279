import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useWorkspace } from "@/contexts/WorkspaceContext";
import { useEffect } from "react";

export interface AdminNotification {
  id: string;
  workspace_id: string;
  user_id: string | null;
  type: string;
  title: string;
  message: string | null;
  metadata: Record<string, unknown>;
  is_read: boolean;
  created_at: string;
}

export function useAdminNotifications() {
  const { currentWorkspace } = useWorkspace();
  const qc = useQueryClient();
  const wsId = currentWorkspace?.id;

  const query = useQuery({
    queryKey: ["admin-notifications", wsId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("admin_notifications")
        .select("*")
        .eq("workspace_id", wsId!)
        .order("created_at", { ascending: false })
        .limit(50);
      if (error) throw error;
      return data as AdminNotification[];
    },
    enabled: !!wsId,
    refetchInterval: 30000,
  });

  // Realtime subscription
  useEffect(() => {
    if (!wsId) return;

    const channel = supabase
      .channel(`admin-notifications-${wsId}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "admin_notifications",
          filter: `workspace_id=eq.${wsId}`,
        },
        () => {
          qc.invalidateQueries({ queryKey: ["admin-notifications", wsId] });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [wsId, qc]);

  const markAsRead = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("admin_notifications")
        .update({ is_read: true } as any)
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin-notifications", wsId] });
    },
  });

  const markAllAsRead = useMutation({
    mutationFn: async () => {
      const { error } = await supabase
        .from("admin_notifications")
        .update({ is_read: true } as any)
        .eq("workspace_id", wsId!)
        .eq("is_read", false);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin-notifications", wsId] });
    },
  });

  const unreadCount = (query.data || []).filter((n) => !n.is_read).length;

  return {
    notifications: query.data || [],
    isLoading: query.isLoading,
    unreadCount,
    markAsRead,
    markAllAsRead,
  };
}
