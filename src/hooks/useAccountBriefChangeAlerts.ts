import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useWorkspace } from "@/contexts/WorkspaceContext";

export interface ChangeAlert {
  id: string;
  workspace_id: string;
  account_id: string;
  current_run_id: string | null;
  previous_run_id: string | null;
  alert_type: string;
  severity: string;
  commercial_relevance: string;
  title: string;
  summary: string | null;
  payload_json: Record<string, unknown> | null;
  is_read: boolean;
  created_at: string;
  account_brief_accounts?: {
    id: string;
    name: string;
    domain: string;
  };
}

export function useAccountBriefChangeAlerts(accountId?: string) {
  const { currentWorkspace } = useWorkspace();
  const queryClient = useQueryClient();
  const workspaceId = currentWorkspace?.id;

  const alertsQuery = useQuery({
    queryKey: ["account-brief-change-alerts", workspaceId, accountId],
    queryFn: async () => {
      if (!workspaceId) return [];
      let query = supabase
        .from("account_brief_change_alerts" as any)
        .select("*, account_brief_accounts(id, name, domain)")
        .eq("workspace_id", workspaceId)
        .order("created_at", { ascending: false })
        .limit(100) as any;
      if (accountId) query = query.eq("account_id", accountId);
      const { data, error } = await query;
      if (error) throw error;
      return (data || []) as ChangeAlert[];
    },
    enabled: !!workspaceId,
  });

  const unreadCount = alertsQuery.data?.filter((a) => !a.is_read).length ?? 0;

  const markRead = useMutation({
    mutationFn: async (alertId: string) => {
      const { error } = await (supabase
        .from("account_brief_change_alerts" as any)
        .update({ is_read: true })
        .eq("id", alertId) as any);
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["account-brief-change-alerts"] }),
  });

  const markAllRead = useMutation({
    mutationFn: async () => {
      if (!workspaceId) return;
      const { error } = await (supabase
        .from("account_brief_change_alerts" as any)
        .update({ is_read: true })
        .eq("workspace_id", workspaceId)
        .eq("is_read", false) as any);
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["account-brief-change-alerts"] }),
  });

  return {
    alerts: alertsQuery.data || [],
    isLoading: alertsQuery.isLoading,
    unreadCount,
    markRead,
    markAllRead,
  };
}
