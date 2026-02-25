import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useWorkspace } from "@/contexts/WorkspaceContext";
import { useAuth } from "@/contexts/AuthContext";

export function useRecentAskQueries() {
  const { currentWorkspace } = useWorkspace();
  const { user } = useAuth();

  return useQuery({
    queryKey: ["ask-fastcrm-recent", currentWorkspace?.id, user?.id],
    queryFn: async () => {
      if (!currentWorkspace?.id || !user?.id) return [];

      const { data, error } = await supabase
        .from("ask_fastcrm_query_logs")
        .select("question, intent, created_at")
        .eq("workspace_id", currentWorkspace.id)
        .eq("user_id", user.id)
        .order("created_at", { ascending: false })
        .limit(5);

      if (error) throw error;

      // Deduplicate by question text
      const seen = new Set<string>();
      return (data || []).filter((q) => {
        const key = q.question.toLowerCase().trim();
        if (seen.has(key)) return false;
        seen.add(key);
        return true;
      });
    },
    enabled: !!currentWorkspace?.id && !!user?.id,
    staleTime: 30_000,
  });
}
