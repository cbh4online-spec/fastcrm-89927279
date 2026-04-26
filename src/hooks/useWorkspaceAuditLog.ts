import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export type WorkspaceAuditEntry = {
  id: string;
  admin_user_id: string;
  action_type: string;
  target_type: string;
  target_id: string | null;
  workspace_id: string | null;
  details: {
    actor_email?: string | null;
    reason?: string | null;
    before?: Record<string, unknown> | null;
    after?: Record<string, unknown> | null;
    metadata?: Record<string, unknown> | null;
  } | null;
  ip_address: string | null;
  user_agent: string | null;
  created_at: string;
};

/**
 * Lê o histórico de auditoria de um workspace (Backoffice V2).
 * Acesso protegido por RLS: apenas super admins podem SELECT.
 */
export function useWorkspaceAuditLog(workspaceId: string | null | undefined) {
  return useQuery({
    queryKey: ["wsv2-workspace-audit", workspaceId],
    enabled: !!workspaceId,
    staleTime: 30_000,
    queryFn: async (): Promise<WorkspaceAuditEntry[]> => {
      const { data, error } = await supabase
        .from("admin_audit_logs")
        .select(
          "id, admin_user_id, action_type, target_type, target_id, workspace_id, details, ip_address, user_agent, created_at",
        )
        .eq("workspace_id", workspaceId!)
        .order("created_at", { ascending: false })
        .limit(50);
      if (error) throw error;
      return (data ?? []) as WorkspaceAuditEntry[];
    },
  });
}
