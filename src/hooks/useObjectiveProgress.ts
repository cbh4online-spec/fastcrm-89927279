/**
 * Hook for fetching objective progress metrics
 * Aggregates data from conversation_objective_progress
 */

import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useWorkspace } from "@/contexts/WorkspaceContext";

export interface ObjectiveProgressMetrics {
  objectiveId: string;
  total: number;
  collected: number;
  failed: number;
  crmSynced: number;
  successRate: number;
  lastCollectedAt: string | null;
}

export interface ObjectiveProgressDetail {
  id: string;
  status: string;
  collected_value: string | null;
  collected_at: string | null;
  crm_updated: boolean | null;
  crm_update_error: string | null;
  attempts: number | null;
}

export function useObjectiveProgress(objectiveIds: string[]) {
  const { currentWorkspace } = useWorkspace();
  const workspaceId = currentWorkspace?.id;

  // Aggregated metrics per objective
  const {
    data: metrics = {},
    isLoading,
  } = useQuery({
    queryKey: ["objective-progress", workspaceId, objectiveIds],
    queryFn: async () => {
      if (!workspaceId || objectiveIds.length === 0) return {};

      const { data, error } = await supabase
        .from("conversation_objective_progress")
        .select("objective_id, status, crm_updated, collected_at")
        .eq("workspace_id", workspaceId)
        .in("objective_id", objectiveIds);

      if (error) throw error;

      // Aggregate client-side
      const metricsMap: Record<string, ObjectiveProgressMetrics> = {};

      for (const id of objectiveIds) {
        metricsMap[id] = {
          objectiveId: id,
          total: 0,
          collected: 0,
          failed: 0,
          crmSynced: 0,
          successRate: 0,
          lastCollectedAt: null,
        };
      }

      for (const row of data || []) {
        const m = metricsMap[row.objective_id];
        if (!m) continue;
        m.total++;
        if (row.status === "collected") m.collected++;
        if (row.status === "failed") m.failed++;
        if (row.crm_updated) m.crmSynced++;
        if (row.collected_at && (!m.lastCollectedAt || row.collected_at > m.lastCollectedAt)) {
          m.lastCollectedAt = row.collected_at;
        }
      }

      // Calculate success rate
      for (const m of Object.values(metricsMap)) {
        m.successRate = m.total > 0 ? Math.round((m.collected / m.total) * 100) : 0;
      }

      return metricsMap;
    },
    enabled: !!workspaceId && objectiveIds.length > 0,
  });

  return { metrics, isLoading };
}

/**
 * Hook for fetching recent progress details for a single objective
 */
export function useObjectiveProgressDetails(objectiveId: string | null) {
  const { currentWorkspace } = useWorkspace();
  const workspaceId = currentWorkspace?.id;

  const { data: details = [], isLoading } = useQuery({
    queryKey: ["objective-progress-details", workspaceId, objectiveId],
    queryFn: async () => {
      if (!workspaceId || !objectiveId) return [];

      const { data, error } = await supabase
        .from("conversation_objective_progress")
        .select("id, status, collected_value, collected_at, crm_updated, crm_update_error, attempts")
        .eq("workspace_id", workspaceId)
        .eq("objective_id", objectiveId)
        .order("created_at", { ascending: false })
        .limit(10);

      if (error) throw error;
      return data as ObjectiveProgressDetail[];
    },
    enabled: !!workspaceId && !!objectiveId,
  });

  const recentCollected = details.filter((d) => d.status === "collected").slice(0, 5);
  const recentFailed = details.filter((d) => d.status === "failed").slice(0, 5);
  const avgAttempts =
    details.length > 0
      ? Math.round(details.reduce((sum, d) => sum + (d.attempts || 1), 0) / details.length * 10) / 10
      : 0;

  return { details, recentCollected, recentFailed, avgAttempts, isLoading };
}
