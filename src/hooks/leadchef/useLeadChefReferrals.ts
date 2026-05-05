import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useWorkspace } from "@/contexts/WorkspaceContext";
import type { LeadChefReferral } from "@/types/leadchef";

export function useLeadChefReferrals() {
  const { currentWorkspace } = useWorkspace();
  const workspaceId = currentWorkspace?.id;
  return useQuery({
    queryKey: ["leadchef-referrals", workspaceId],
    enabled: !!workspaceId,
    queryFn: async (): Promise<LeadChefReferral[]> => {
      const { data, error } = await (supabase as any)
        .from("leadchef_referrals")
        .select("*")
        .eq("workspace_id", workspaceId!)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as LeadChefReferral[];
    },
  });
}
