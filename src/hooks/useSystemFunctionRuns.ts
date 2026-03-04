import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useWorkspace } from "@/contexts/WorkspaceContext";

interface Filters {
  moduleId?: string;
  status?: string;
  limit?: number;
}

export function useSystemFunctionRuns(filters: Filters = {}) {
  const { currentWorkspace } = useWorkspace();
  const wsId = currentWorkspace?.id;

  return useQuery({
    queryKey: ["system-function-runs", wsId, filters],
    queryFn: async () => {
      if (!wsId) return [];
      let q = supabase
        .from("system_function_runs")
        .select("*")
        .eq("workspace_id", wsId)
        .order("created_at", { ascending: false })
        .limit(filters.limit ?? 50);

      if (filters.moduleId) q = q.eq("module_id", filters.moduleId);
      if (filters.status) q = q.eq("status", filters.status);

      const { data, error } = await q;
      if (error) throw error;
      return data ?? [];
    },
    enabled: !!wsId,
  });
}
