import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useWorkspace } from "@/contexts/WorkspaceContext";

export interface LeadChefAuditLog {
  id: string;
  workspace_id: string;
  user_id: string | null;
  entity_type: string;
  entity_id: string | null;
  action: string;
  description: string | null;
  metadata: Record<string, unknown>;
  created_at: string;
}

export interface AuditLogsFilters {
  action?: string;
  userId?: string;
  entityType?: string;
  from?: string;
  to?: string;
  limit?: number;
}

export function useLeadChefAuditLogs(filters: AuditLogsFilters = {}) {
  const { currentWorkspace } = useWorkspace();
  const workspaceId = currentWorkspace?.id;

  return useQuery({
    queryKey: ["leadchef-audit-logs", workspaceId, filters],
    enabled: !!workspaceId,
    staleTime: 30_000,
    queryFn: async (): Promise<LeadChefAuditLog[]> => {
      let q = (supabase as any)
        .from("leadchef_audit_logs")
        .select("*")
        .eq("workspace_id", workspaceId)
        .order("created_at", { ascending: false })
        .limit(filters.limit ?? 200);

      if (filters.action) q = q.eq("action", filters.action);
      if (filters.userId) q = q.eq("user_id", filters.userId);
      if (filters.entityType) q = q.eq("entity_type", filters.entityType);
      if (filters.from) q = q.gte("created_at", filters.from);
      if (filters.to) q = q.lte("created_at", filters.to);

      const { data, error } = await q;
      if (error) throw error;
      return (data ?? []) as LeadChefAuditLog[];
    },
  });
}
