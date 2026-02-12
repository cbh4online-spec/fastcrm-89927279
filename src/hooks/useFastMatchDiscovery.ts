import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useWorkspace } from "@/contexts/WorkspaceContext";
import type { FastMatchProfile } from "./useFastMatchProfile";

interface DiscoveryFilters {
  industry?: string;
  services?: string;
  ticketRange?: string;
}

export function useFastMatchDiscovery(filters?: DiscoveryFilters) {
  const { user } = useAuth();
  const { currentWorkspace } = useWorkspace();

  return useQuery({
    queryKey: ["fastmatch-discovery", currentWorkspace?.id, filters],
    queryFn: async () => {
      if (!currentWorkspace) return [];

      let query = supabase
        .from("fastmatch_profiles")
        .select("*")
        .eq("workspace_id", currentWorkspace.id)
        .eq("status", "active")
        .neq("user_id", user?.id || "");

      if (filters?.industry) {
        query = query.eq("industry", filters.industry);
      }
      if (filters?.ticketRange) {
        query = query.eq("ticket_range", filters.ticketRange);
      }

      const { data, error } = await query.order("strategic_score", { ascending: false, nullsFirst: false });

      if (error) throw error;
      return (data || []) as FastMatchProfile[];
    },
    enabled: !!currentWorkspace && !!user,
  });
}
