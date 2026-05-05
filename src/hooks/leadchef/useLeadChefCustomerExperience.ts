import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useWorkspace } from "@/contexts/WorkspaceContext";
import type { LeadChefCustomerExperience } from "@/types/leadchef";

export function useLeadChefCustomerExperience(leadId: string | undefined) {
  const { currentWorkspace } = useWorkspace();
  const workspaceId = currentWorkspace?.id;
  return useQuery({
    queryKey: ["leadchef-cx", workspaceId, leadId],
    enabled: !!workspaceId && !!leadId,
    queryFn: async (): Promise<LeadChefCustomerExperience | null> => {
      const { data, error } = await (supabase as any)
        .from("leadchef_customer_experiences")
        .select("*")
        .eq("workspace_id", workspaceId!)
        .eq("lead_id", leadId!)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
  });
}
