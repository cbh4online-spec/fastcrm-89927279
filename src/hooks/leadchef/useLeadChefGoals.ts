import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useWorkspace } from "@/contexts/WorkspaceContext";
import { useAuth } from "@/contexts/AuthContext";
import type { LeadChefGoal } from "@/types/leadchef";

export function useLeadChefGoals(periodMonth?: string) {
  const { currentWorkspace } = useWorkspace();
  const { user } = useAuth();

  return useQuery({
    queryKey: ["leadchef-goals", currentWorkspace?.id, user?.id, periodMonth],
    enabled: !!currentWorkspace?.id && !!user?.id,
    queryFn: async (): Promise<LeadChefGoal | null> => {
      const month =
        periodMonth ||
        new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().slice(0, 10);
      const { data, error } = await (supabase as any)
        .from("leadchef_goals")
        .select("*")
        .eq("workspace_id", currentWorkspace!.id)
        .eq("user_id", user!.id)
        .eq("period_month", month)
        .limit(1)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
  });
}
