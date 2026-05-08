import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useWorkspace } from "@/contexts/WorkspaceContext";
import type { LeadChefClientStatus } from "@/components/leadchef/constants";

export interface LeadChefClientDetail {
  leadId: string;
  profileId: string;
  clientProfileId: string | null;
  name: string;
  phone: string | null;
  email: string | null;
  wonAt: string | null;
  status: LeadChefClientStatus;
  postSaleStatus: string | null;
  nextFollowUpAt: string | null;
  potentialReferral: boolean;
  potentialRecruitment: boolean;
  customerCycle: Record<string, any>;
  notes: string | null;
}

export function useLeadChefClient(leadId?: string) {
  const { currentWorkspace } = useWorkspace();
  const workspaceId = currentWorkspace?.id;

  return useQuery({
    queryKey: ["leadchef-client", workspaceId, leadId],
    enabled: !!workspaceId && !!leadId,
    queryFn: async (): Promise<LeadChefClientDetail | null> => {
      const { data: profile, error: profErr } = await (supabase as any)
        .from("leadchef_lead_profiles")
        .select("id,lead_id,stage,updated_at,customer_experience,lead:leads(id,name,phone,email)")
        .eq("workspace_id", workspaceId!)
        .eq("lead_id", leadId!)
        .limit(1)
        .maybeSingle();
      if (profErr) throw profErr;
      if (!profile || !profile.lead) return null;

      const { data: cp } = await (supabase as any)
        .from("leadchef_client_profiles")
        .select("*")
        .eq("workspace_id", workspaceId!)
        .eq("lead_id", leadId!)
        .limit(1)
        .maybeSingle();

      return {
        leadId: profile.lead_id,
        profileId: profile.id,
        clientProfileId: cp?.id ?? null,
        name: profile.lead.name,
        phone: profile.lead.phone,
        email: profile.lead.email,
        wonAt: profile.updated_at,
        status: (cp?.status as LeadChefClientStatus) ?? "new_customer",
        postSaleStatus: cp?.post_sale_status ?? null,
        nextFollowUpAt: cp?.next_follow_up_at ?? null,
        potentialReferral: !!cp?.potential_referral,
        potentialRecruitment: !!cp?.potential_recruitment,
        customerCycle: cp?.customer_cycle ?? {},
        notes: cp?.notes ?? null,
      };
    },
  });
}
