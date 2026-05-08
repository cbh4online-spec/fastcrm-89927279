import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useWorkspace } from "@/contexts/WorkspaceContext";
import type { LeadChefReferral } from "@/types/leadchef";

export interface LeadChefReferralWithRelations extends LeadChefReferral {
  referrer_lead?: { id: string; name: string; phone: string | null; email: string | null } | null;
  converted_lead?: { id: string; name: string; phone: string | null } | null;
}

export function useLeadChefReferral(referralId?: string) {
  const { currentWorkspace } = useWorkspace();
  const workspaceId = currentWorkspace?.id;
  return useQuery({
    queryKey: ["leadchef-referral", workspaceId, referralId],
    enabled: !!workspaceId && !!referralId,
    queryFn: async (): Promise<LeadChefReferralWithRelations | null> => {
      const { data, error } = await (supabase as any)
        .from("leadchef_referrals")
        .select(
          "*, referrer_lead:leads!leadchef_referrals_referred_by_lead_id_fkey(id,name,phone,email), converted_lead:leads!leadchef_referrals_converted_lead_id_fkey(id,name,phone)"
        )
        .eq("workspace_id", workspaceId!)
        .eq("id", referralId!)
        .limit(1)
        .maybeSingle();
      if (error) {
        // fallback sem joins, se FK names diferentes
        const fb = await (supabase as any)
          .from("leadchef_referrals")
          .select("*")
          .eq("workspace_id", workspaceId!)
          .eq("id", referralId!)
          .limit(1)
          .maybeSingle();
        if (fb.error) throw fb.error;
        return fb.data as LeadChefReferralWithRelations | null;
      }
      return data as LeadChefReferralWithRelations | null;
    },
  });
}
