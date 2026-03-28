import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useWorkspace } from "@/contexts/WorkspaceContext";

export interface SessionTimeLog {
  id: string;
  workspace_id: string;
  user_id: string;
  date: string;
  active_seconds: number;
  idle_seconds: number;
  total_seconds: number;
  page_views: number;
  last_activity_at: string | null;
}

export function useSessionTimeLogs(days = 7) {
  const { currentWorkspace } = useWorkspace();
  const wsId = currentWorkspace?.id;
  const since = new Date();
  since.setDate(since.getDate() - days);

  const { data: logs = [], isLoading } = useQuery({
    queryKey: ["session-time-logs", wsId, days],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("session_time_logs")
        .select("*")
        .eq("workspace_id", wsId!)
        .gte("date", since.toISOString().split("T")[0])
        .order("date", { ascending: false });
      if (error) throw error;
      return data as SessionTimeLog[];
    },
    enabled: !!wsId,
  });

  return { logs, isLoading };
}
