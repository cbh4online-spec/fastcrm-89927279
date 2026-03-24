import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useWorkspace } from "@/contexts/WorkspaceContext";

export function useAccountBriefDashboard() {
  const { currentWorkspace } = useWorkspace();
  const workspaceId = currentWorkspace?.id;

  return useQuery({
    queryKey: ["account-brief-dashboard", workspaceId],
    queryFn: async () => {
      if (!workspaceId) return null;

      const { data: accounts } = await supabase
        .from("account_brief_accounts")
        .select("id, name, domain, total_score, score_label, favorite, commercial_status, last_analysis_at, probable_sector, probable_geography, executive_summary")
        .eq("workspace_id", workspaceId)
        .is("archived_at", null)
        .order("total_score", { ascending: false });

      const all = accounts || [];
      const topScored = all.filter(a => a.total_score > 0).slice(0, 5);
      const recent = [...all].sort((a, b) => 
        (b.last_analysis_at || "").localeCompare(a.last_analysis_at || "")
      ).slice(0, 5);
      const favorites = all.filter(a => a.favorite);

      return {
        totalAccounts: all.length,
        topScored,
        recent,
        favorites,
        highScoreCount: all.filter(a => a.total_score >= 60).length,
        accounts: all,
      };
    },
    enabled: !!workspaceId,
  });
}
