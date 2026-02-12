import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useWorkspace } from "@/contexts/WorkspaceContext";
import { useFastMatchProfile } from "./useFastMatchProfile";

export function useFastMatchQuota() {
  const { currentWorkspace } = useWorkspace();
  const { data: profile } = useFastMatchProfile();

  const effectiveQuota = (() => {
    if (!profile) return { monthly: 1, used: 0, remaining: 1, isFounder: false };
    
    const isFounderActive = profile.is_founder &&
      profile.founder_expiry_date &&
      new Date(profile.founder_expiry_date) > new Date() &&
      profile.founder_quota_override !== null;

    const monthly = isFounderActive ? profile.founder_quota_override! : profile.match_quota_monthly;
    const used = profile.match_used_current_period;
    const remaining = Math.max(0, monthly - used);

    return {
      monthly,
      used,
      remaining,
      extraCredits: profile.extra_credits_balance,
      isFounder: !!isFounderActive,
      hasQuota: remaining > 0 || profile.extra_credits_balance > 0,
    };
  })();

  return {
    ...effectiveQuota,
    profile,
  };
}

export function useConsumeMatchQuota() {
  const { currentWorkspace } = useWorkspace();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (profileId: string) => {
      if (!currentWorkspace) throw new Error("No workspace");

      const { data, error } = await supabase.rpc("consume_fastmatch_quota", {
        p_profile_id: profileId,
        p_workspace_id: currentWorkspace.id,
      });

      if (error) throw error;
      const result = (data as any)?.[0] || data;
      if (!result?.success) throw new Error(result?.message || "Quota esgotada");
      return result;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["fastmatch-profile"] });
    },
  });
}
