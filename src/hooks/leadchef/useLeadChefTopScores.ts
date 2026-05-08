import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useWorkspace } from "@/contexts/WorkspaceContext";

export interface TopScoreRow {
  lead_id: string;
  score: number;
  is_cold: boolean;
  lead?: { name: string | null; phone: string | null; email: string | null };
}

export function useLeadChefTopScores(limit = 10) {
  const { currentWorkspace } = useWorkspace();
  const workspaceId = currentWorkspace?.id;

  return useQuery({
    queryKey: ["leadchef", "top-scores", workspaceId, limit],
    enabled: !!workspaceId,
    staleTime: 60_000,
    queryFn: async (): Promise<TopScoreRow[]> => {
      const { data, error } = await (supabase as any)
        .from("leadchef_lead_scores")
        .select("lead_id, score, is_cold, lead:leads(name, phone, email)")
        .eq("workspace_id", workspaceId)
        .eq("is_cold", false)
        .order("score", { ascending: false })
        .limit(limit);
      if (error) {
        console.warn("[useLeadChefTopScores]", error);
        return [];
      }
      return (data ?? []) as TopScoreRow[];
    },
  });
}

export function useLeadChefColdLeads(limit = 20) {
  const { currentWorkspace } = useWorkspace();
  const workspaceId = currentWorkspace?.id;

  return useQuery({
    queryKey: ["leadchef", "cold-leads", workspaceId, limit],
    enabled: !!workspaceId,
    staleTime: 60_000,
    queryFn: async (): Promise<TopScoreRow[]> => {
      const { data, error } = await (supabase as any)
        .from("leadchef_lead_scores")
        .select("lead_id, score, is_cold, lead:leads(name, phone, email)")
        .eq("workspace_id", workspaceId)
        .eq("is_cold", true)
        .order("calculated_at", { ascending: false })
        .limit(limit);
      if (error) {
        console.warn("[useLeadChefColdLeads]", error);
        return [];
      }
      return (data ?? []) as TopScoreRow[];
    },
  });
}
