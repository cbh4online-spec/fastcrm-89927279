import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

export interface PendingInvite {
  id: string;
  workspace_id: string;
  workspace_name: string;
  role: string;
  invite_token: string;
  expires_at: string | null;
  invited_by_email: string | null;
}

export function usePendingInvites() {
  const { user } = useAuth();
  return useQuery({
    queryKey: ["onboarding-pending-invites", user?.id],
    enabled: !!user,
    queryFn: async (): Promise<PendingInvite[]> => {
      const { data, error } = await supabase.rpc("get_pending_invites_for_user");
      if (error) throw error;
      return (data as PendingInvite[]) ?? [];
    },
  });
}
