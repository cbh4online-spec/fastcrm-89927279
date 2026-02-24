import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { useWorkspace } from "@/contexts/WorkspaceContext";
import { useWorkspaceInstance } from "@/contexts/WorkspaceInstanceContext";
import { Opportunity } from "@/types/opportunity";
import { Task } from "@/hooks/useTasks";
import { computeDealIntelligence, DealIntelligence } from "@/hooks/useDealIntelligence";

export function useBulkDealIntelligence(opportunities: Opportunity[] | undefined) {
  const { currentWorkspace } = useWorkspace();
  const { workspaceClient } = useWorkspaceInstance();

  const oppIds = useMemo(
    () => (opportunities || []).map((o) => o.id),
    [opportunities]
  );

  const { data: activitiesMap = new Map() } = useQuery({
    queryKey: ["bulk-activities", currentWorkspace?.id, oppIds],
    queryFn: async () => {
      if (!oppIds.length) return new Map<string, { created_at: string }[]>();
      const { data, error } = await workspaceClient
        .from("crm_activities")
        .select("entity_id, created_at")
        .eq("entity_type", "opportunity")
        .in("entity_id", oppIds)
        .order("created_at", { ascending: false });
      if (error) throw error;
      const map = new Map<string, { created_at: string }[]>();
      (data || []).forEach((a: any) => {
        const list = map.get(a.entity_id) || [];
        list.push({ created_at: a.created_at });
        map.set(a.entity_id, list);
      });
      return map;
    },
    enabled: !!currentWorkspace && oppIds.length > 0,
  });

  const { data: tasksMap = new Map() } = useQuery({
    queryKey: ["bulk-tasks", currentWorkspace?.id, oppIds],
    queryFn: async () => {
      if (!oppIds.length) return new Map<string, Task[]>();
      const { data, error } = await workspaceClient
        .from("tasks")
        .select("*")
        .eq("related_type", "opportunity")
        .in("related_id", oppIds)
        .order("due_at", { ascending: true, nullsFirst: false });
      if (error) throw error;
      const map = new Map<string, Task[]>();
      (data || []).forEach((t: any) => {
        const list = map.get(t.related_id) || [];
        list.push(t as Task);
        map.set(t.related_id, list);
      });
      return map;
    },
    enabled: !!currentWorkspace && oppIds.length > 0,
  });

  const scoresMap = useMemo(() => {
    const map = new Map<string, DealIntelligence>();
    (opportunities || []).forEach((opp) => {
      const acts = activitiesMap.get(opp.id) || [];
      const tasks = tasksMap.get(opp.id) || [];
      map.set(opp.id, computeDealIntelligence(opp, acts, tasks));
    });
    return map;
  }, [opportunities, activitiesMap, tasksMap]);

  return { scoresMap };
}
