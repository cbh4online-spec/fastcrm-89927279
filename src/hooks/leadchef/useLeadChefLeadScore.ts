import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useWorkspace } from "@/contexts/WorkspaceContext";
import type { LeadScoreData } from "@/utils/leadchef/scoring";

export function useLeadChefLeadScore(leadId?: string) {
  const { currentWorkspace } = useWorkspace();
  const workspaceId = currentWorkspace?.id;

  return useQuery({
    queryKey: ["leadchef", "lead-score", workspaceId, leadId],
    enabled: !!workspaceId && !!leadId,
    staleTime: 60_000,
    queryFn: async (): Promise<LeadScoreData | null> => {
      const { data, error } = await (supabase as any)
        .from("leadchef_lead_scores")
        .select("score, breakdown, is_cold, calculated_at")
        .eq("workspace_id", workspaceId)
        .eq("lead_id", leadId)
        .maybeSingle();
      if (error) {
        console.warn("[useLeadChefLeadScore]", error);
        return null;
      }
      return data as LeadScoreData | null;
    },
  });
}
