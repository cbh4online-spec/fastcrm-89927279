import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useWorkspace } from "@/contexts/WorkspaceContext";

export interface UpcomingEventWithRsvps {
  id: string;
  title: string;
  starts_at: string;
  event_type: string;
  pendingCount: number;
}

export function useUpcomingEventsWithRsvps(limit = 5) {
  const { currentWorkspace } = useWorkspace();

  return useQuery({
    queryKey: ["upcoming-events-rsvps", currentWorkspace?.id, limit],
    queryFn: async () => {
      if (!currentWorkspace) return [];

      const { data: events, error } = await supabase
        .from("community_events")
        .select("id, title, starts_at, event_type")
        .eq("workspace_id", currentWorkspace.id)
        .gte("starts_at", new Date().toISOString())
        .order("starts_at")
        .limit(limit);

      if (error) throw error;
      if (!events?.length) return [];

      const eventIds = events.map((e) => e.id);
      const { data: rsvps } = await supabase
        .from("event_rsvps")
        .select("event_id, status")
        .in("event_id", eventIds)
        .eq("status", "invited");

      const countMap: Record<string, number> = {};
      (rsvps || []).forEach((r: any) => {
        countMap[r.event_id] = (countMap[r.event_id] || 0) + 1;
      });

      return events.map((e) => ({
        id: e.id,
        title: e.title,
        starts_at: e.starts_at,
        event_type: e.event_type,
        pendingCount: countMap[e.id] || 0,
      })) as UpcomingEventWithRsvps[];
    },
    enabled: !!currentWorkspace,
  });
}
