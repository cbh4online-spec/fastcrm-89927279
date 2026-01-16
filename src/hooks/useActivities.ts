import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useWorkspace } from "@/contexts/WorkspaceContext";

interface UseActivitiesOptions {
  limit?: number;
  entityType?: string;
  entityId?: string;
}

export function useActivities(options: UseActivitiesOptions = {}) {
  const { currentWorkspace } = useWorkspace();
  const { limit = 10, entityType, entityId } = options;

  return useQuery({
    queryKey: ["activities", currentWorkspace?.id, limit, entityType, entityId],
    queryFn: async () => {
      if (!currentWorkspace?.id) return [];

      let query = supabase
        .from("crm_activities")
        .select("*")
        .eq("workspace_id", currentWorkspace.id)
        .order("created_at", { ascending: false })
        .limit(limit);

      if (entityType) {
        query = query.eq("entity_type", entityType);
      }

      if (entityId) {
        query = query.eq("entity_id", entityId);
      }

      const { data, error } = await query;

      if (error) {
        console.error("Error fetching activities:", error);
        throw error;
      }

      return data || [];
    },
    enabled: !!currentWorkspace?.id,
  });
}
