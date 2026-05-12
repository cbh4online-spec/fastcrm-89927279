import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useWorkspace } from "@/contexts/WorkspaceContext";
import type { LeadChefLeadWithProfile } from "@/types/leadchef";

export function useLeadChefLead(leadId: string | undefined) {
  const { currentWorkspace } = useWorkspace();
  const workspaceId = currentWorkspace?.id;

  return useQuery({
    queryKey: ["leadchef-lead", workspaceId, leadId],
    enabled: !!workspaceId && !!leadId,
    queryFn: async (): Promise<LeadChefLeadWithProfile | null> => {
      if (!workspaceId || !leadId) return null;
      const { data, error } = await (supabase as any)
        .from("leadchef_lead_profiles")
        .select(
          "*, lead:leads(id,name,email,phone,source,status,last_contact_at,ai_temperature,address,city,postal_code)"
        )
        .eq("workspace_id", workspaceId)
        .eq("lead_id", leadId)
        .limit(1)
        .maybeSingle();
      if (error) throw error;
      if (!data || !data.lead) return null;
      return { profile: data, lead: data.lead };
    },
  });
}
