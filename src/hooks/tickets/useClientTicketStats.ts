import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useWorkspace } from "@/contexts/WorkspaceContext";

export interface TicketStats {
  openCount: number;
  resolvedToday: number;
  avgFirstResponseMinutes: number | null;
  avgResolutionMinutes: number | null;
  slaBreachRate: number;
  avgSatisfaction: number | null;
  totalCount: number;
  byStatus: Record<string, number>;
  byPriority: Record<string, number>;
  byType: Record<string, number>;
}

export function useClientTicketStats() {
  const { currentWorkspace } = useWorkspace();
  const workspaceId = currentWorkspace?.id;

  return useQuery({
    queryKey: ["client-ticket-stats", workspaceId],
    queryFn: async (): Promise<TicketStats> => {
      const { data: tickets, error } = await supabase
        .from("client_tickets")
        .select("status, priority, type, sla_breached, first_response_at, resolved_at, satisfaction_rating, created_at")
        .eq("workspace_id", workspaceId!);

      if (error) throw error;
      const all = tickets || [];

      const openStatuses = ["open", "in_progress", "waiting_client", "waiting_internal"];
      const openCount = all.filter((t: any) => openStatuses.includes(t.status)).length;

      const today = new Date().toISOString().slice(0, 10);
      const resolvedToday = all.filter((t: any) => t.resolved_at?.startsWith(today)).length;

      // Avg first response time
      const frtItems = all.filter((t: any) => t.first_response_at && t.created_at);
      const avgFrt = frtItems.length > 0
        ? frtItems.reduce((sum: number, t: any) => sum + (new Date(t.first_response_at).getTime() - new Date(t.created_at).getTime()) / 60000, 0) / frtItems.length
        : null;

      // Avg resolution time
      const resItems = all.filter((t: any) => t.resolved_at && t.created_at);
      const avgRes = resItems.length > 0
        ? resItems.reduce((sum: number, t: any) => sum + (new Date(t.resolved_at).getTime() - new Date(t.created_at).getTime()) / 60000, 0) / resItems.length
        : null;

      // SLA breach rate
      const withSla = all.filter((t: any) => t.sla_breached !== null);
      const slaBreachRate = withSla.length > 0
        ? all.filter((t: any) => t.sla_breached === true).length / withSla.length
        : 0;

      // Satisfaction
      const rated = all.filter((t: any) => t.satisfaction_rating != null);
      const avgSatisfaction = rated.length > 0
        ? rated.reduce((s: number, t: any) => s + t.satisfaction_rating, 0) / rated.length
        : null;

      // Group by
      const byStatus: Record<string, number> = {};
      const byPriority: Record<string, number> = {};
      const byType: Record<string, number> = {};
      all.forEach((t: any) => {
        byStatus[t.status] = (byStatus[t.status] || 0) + 1;
        byPriority[t.priority] = (byPriority[t.priority] || 0) + 1;
        byType[t.type] = (byType[t.type] || 0) + 1;
      });

      return {
        openCount,
        resolvedToday,
        avgFirstResponseMinutes: avgFrt,
        avgResolutionMinutes: avgRes,
        slaBreachRate,
        avgSatisfaction,
        totalCount: all.length,
        byStatus,
        byPriority,
        byType,
      };
    },
    enabled: !!workspaceId,
  });
}
