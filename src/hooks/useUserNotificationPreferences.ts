import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useWorkspace } from "@/contexts/WorkspaceContext";

export interface UserNotificationPreferences {
  id: string;
  user_id: string;
  workspace_id: string;
  channel_email: boolean;
  channel_push: boolean;
  channel_in_app: boolean;
  type_new_leads: boolean;
  type_deal_updates: boolean;
  type_mentions: boolean;
}

const DEFAULTS: Omit<UserNotificationPreferences, "id" | "user_id" | "workspace_id"> = {
  channel_email: true,
  channel_push: true,
  channel_in_app: true,
  type_new_leads: true,
  type_deal_updates: true,
  type_mentions: true,
};

export function useUserNotificationPreferences() {
  const { user } = useAuth();
  const { currentWorkspace } = useWorkspace();
  const qc = useQueryClient();
  const userId = user?.id;
  const wsId = currentWorkspace?.id;
  const queryKey = ["user-notification-preferences", userId, wsId];

  const query = useQuery({
    queryKey,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("user_notification_preferences")
        .select("*")
        .eq("user_id", userId!)
        .eq("workspace_id", wsId!)
        .maybeSingle();
      if (error) throw error;
      return data as UserNotificationPreferences | null;
    },
    enabled: !!userId && !!wsId,
  });

  const upsert = useMutation({
    mutationFn: async (updates: Partial<Omit<UserNotificationPreferences, "id" | "user_id" | "workspace_id">>) => {
      const payload = {
        user_id: userId!,
        workspace_id: wsId!,
        ...DEFAULTS,
        ...(query.data || {}),
        ...updates,
        updated_at: new Date().toISOString(),
      };
      delete (payload as any).id;
      const { data, error } = await supabase
        .from("user_notification_preferences")
        .upsert(payload as any, { onConflict: "user_id,workspace_id" })
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey });
    },
  });

  const prefs = query.data
    ? query.data
    : { ...DEFAULTS } as Omit<UserNotificationPreferences, "id" | "user_id" | "workspace_id">;

  return {
    preferences: prefs,
    isLoading: query.isLoading,
    updatePreferences: upsert.mutate,
    saving: upsert.isPending,
  };
}
