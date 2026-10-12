import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useWorkspace } from "@/contexts/WorkspaceContext";

export interface OutreachSentInfo {
  sentAt: string;
  stepIndex: number;
  message: string | null;
}

/** Latest sent outreach per profile, scoped to the current workspace. */
export function useOutreachSentStatus(profileIds: string[]) {
  const { currentWorkspace } = useWorkspace();
  const workspaceId = currentWorkspace?.id;
  const ids = [...new Set(profileIds)].sort();
  return useQuery({
    queryKey: ["pending-outreach", "sent-status", workspaceId, ids],
    enabled: !!workspaceId && ids.length > 0,
    staleTime: 30_000,
    queryFn: async () => {
      const map = new Map<string, OutreachSentInfo>();
      for (let i = 0; i < ids.length; i += 200) {
        const { data, error } = await supabase
          .from("prospecting_outreach_queue")
          .select("profile_id, step_index, sent_at, sent_message")
          .eq("workspace_id", workspaceId!)
          .eq("status", "sent")
          .not("sent_at", "is", null)
          .in("profile_id", ids.slice(i, i + 200));
        if (error) throw error;
        for (const row of data ?? []) {
          if (!row.profile_id || !row.sent_at) continue;
          const prev = map.get(row.profile_id);
          if (!prev || row.sent_at > prev.sentAt) {
            map.set(row.profile_id, { sentAt: row.sent_at, stepIndex: row.step_index ?? 1, message: row.sent_message ?? null });
          }
        }
      }
      return map;
    },
  });
}
