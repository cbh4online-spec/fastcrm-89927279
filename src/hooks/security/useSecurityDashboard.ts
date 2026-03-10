import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useWorkspace } from "@/contexts/WorkspaceContext";

export function useSecurityDashboard() {
  const { currentWorkspace } = useWorkspace();
  const workspaceId = currentWorkspace?.id;

  const { data: stats, isLoading } = useQuery({
    queryKey: ["security-dashboard-stats", workspaceId],
    queryFn: async () => {
      if (!workspaceId) return null;

      const [
        { count: pendingRequests },
        { count: activeSystems },
        { count: openOccurrences },
        { count: activeContracts },
        { count: pendingDocs },
        { count: overdueMaintenances },
      ] = await Promise.all([
        supabase.from("security_partner_requests").select("*", { count: "exact", head: true })
          .eq("workspace_id", workspaceId).in("extraction_status", ["pending", "extracted", "needs_review"]),
        supabase.from("security_systems").select("*", { count: "exact", head: true })
          .eq("workspace_id", workspaceId).eq("status", "active"),
        supabase.from("security_occurrences").select("*", { count: "exact", head: true })
          .eq("workspace_id", workspaceId).in("status", ["open", "in_progress"]),
        supabase.from("security_contracts").select("*", { count: "exact", head: true })
          .eq("workspace_id", workspaceId).eq("contract_status", "active"),
        supabase.from("security_documents").select("*", { count: "exact", head: true })
          .eq("workspace_id", workspaceId).in("status", ["draft", "por_validar"]),
        supabase.from("security_maintenance_visits").select("*", { count: "exact", head: true })
          .eq("workspace_id", workspaceId).eq("visit_status", "scheduled")
          .lt("scheduled_at", new Date().toISOString()),
      ]);

      return {
        pendingRequests: pendingRequests ?? 0,
        activeSystems: activeSystems ?? 0,
        openOccurrences: openOccurrences ?? 0,
        activeContracts: activeContracts ?? 0,
        pendingDocs: pendingDocs ?? 0,
        overdueMaintenances: overdueMaintenances ?? 0,
      };
    },
    enabled: !!workspaceId,
  });

  return { stats, isLoading };
}
