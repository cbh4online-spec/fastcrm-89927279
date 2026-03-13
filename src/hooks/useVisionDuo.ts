import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase as _supabase } from "@/integrations/supabase/client";
const supabase = _supabase as any;
import { useAuth } from "@/contexts/AuthContext";
import { useEffect } from "react";

// ─── Duo Notifications ───
export function useVisionDuoNotifications(visionId: string | undefined) {
  const { user } = useAuth();
  const qc = useQueryClient();

  const query = useQuery({
    queryKey: ["vision-duo-notifications", visionId],
    queryFn: async () => {
      if (!user || !visionId) return [];
      const { data, error } = await supabase
        .from("vision_duo_notifications")
        .select("*")
        .eq("recipient_id", user.id)
        .eq("vision_id", visionId)
        .order("created_at", { ascending: false })
        .limit(20);
      if (error) throw error;
      return data || [];
    },
    enabled: !!user && !!visionId,
  });

  // Realtime subscription for new notifications
  useEffect(() => {
    if (!user) return;

    const channel = supabase
      .channel(`duo-notifications-${visionId}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "vision_duo_notifications",
          filter: `recipient_id=eq.${user.id}`,
        },
        () => {
          qc.invalidateQueries({ queryKey: ["vision-duo-notifications", visionId] });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user, visionId, qc]);

  const markAsReadMutation = useMutation({
    mutationFn: async (notificationId: string) => {
      const { error } = await supabase
        .from("vision_duo_notifications")
        .update({ is_read: true })
        .eq("id", notificationId);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["vision-duo-notifications", visionId] });
    },
  });

  return {
    notifications: query.data || [],
    isLoading: query.isLoading,
    markAsRead: (id: string) => markAsReadMutation.mutate(id),
  };
}

// ─── Duo Partner Vision Data ───
export function useDuoPartnerVisions() {
  const { user } = useAuth();

  return useQuery({
    queryKey: ["duo-partner-visions"],
    queryFn: async () => {
      if (!user) return [];

      // Get accepted duo links where I am invitee OR inviter
      const { data: asInvitee, error: e1 } = await supabase
        .from("vision_duo_links")
        .select("*, vision_profiles(*)")
        .eq("invitee_id", user.id)
        .eq("status", "accepted");

      const { data: asInviter, error: e2 } = await supabase
        .from("vision_duo_links")
        .select("*, vision_profiles(*)")
        .eq("inviter_id", user.id)
        .eq("status", "accepted");

      if (e1) throw e1;
      if (e2) throw e2;

      // Combine and deduplicate by link id
      const all = [...(asInvitee || []), ...(asInviter || [])];
      const seen = new Set<string>();
      return all.filter((link) => {
        if (seen.has(link.id)) return false;
        seen.add(link.id);
        // Exclude links where the vision belongs to the current user
        return link.vision_profiles?.user_id !== user.id;
      });
    },
    enabled: !!user,
  });
}

// ─── Send Duo Notification ───
export function useSendDuoNotification() {
  return useMutation({
    mutationFn: async (payload: {
      visionId: string;
      type: string;
      title: string;
      message?: string;
      metadata?: Record<string, unknown>;
    }) => {
      const { data, error } = await supabase.functions.invoke("vision-duo-invite", {
        body: { action: "notify_duo", ...payload },
      });
      if (error) throw new Error(error.message);
      return data;
    },
  });
}
