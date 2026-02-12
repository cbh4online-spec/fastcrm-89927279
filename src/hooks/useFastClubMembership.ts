import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/contexts/AuthContext";
import { useWorkspace } from "@/contexts/WorkspaceContext";
import { supabase } from "@/integrations/supabase/client";

export type MembershipTier = "visitor" | "free" | "premium";

interface FastClubMembership {
  tier: MembershipTier;
  isCrmVerified: boolean;
  isLoading: boolean;
}

export function useFastClubMembership(): FastClubMembership {
  const { user } = useAuth();
  const { currentWorkspace } = useWorkspace();

  const { data, isLoading } = useQuery({
    queryKey: ["fastclub-membership", currentWorkspace?.id, user?.id],
    queryFn: async () => {
      if (!user || !currentWorkspace) return null;

      const { data: member } = await supabase
        .from("community_members")
        .select("membership_tier, is_crm_verified")
        .eq("workspace_id", currentWorkspace.id)
        .eq("user_id", user.id)
        .eq("status", "active")
        .maybeSingle();

      return member;
    },
    enabled: !!user && !!currentWorkspace,
  });

  if (!user) {
    return { tier: "visitor", isCrmVerified: false, isLoading: false };
  }

  return {
    tier: (data?.membership_tier as MembershipTier) || "free",
    isCrmVerified: data?.is_crm_verified || false,
    isLoading,
  };
}
