import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export type UserAuditEntry = {
  id: string;
  admin_user_id: string;
  action_type: string;
  target_type: string;
  target_id: string | null;
  workspace_id: string | null;
  details: {
    actor_email?: string | null;
    target_email?: string | null;
    target_name?: string | null;
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
 * Lê o histórico de auditoria de um utilizador (Backoffice V2 — Fase 2F.2).
 * Acesso protegido por RLS: apenas super admins podem SELECT.
 */
export function useUserAuditLog(targetUserId: string | null | undefined) {
  return useQuery({
    queryKey: ["wsv2-user-audit", targetUserId],
    enabled: !!targetUserId,
    staleTime: 30_000,
    queryFn: async (): Promise<UserAuditEntry[]> => {
      const { data, error } = await supabase
        .from("admin_audit_logs")
        .select(
          "id, admin_user_id, action_type, target_type, target_id, workspace_id, details, ip_address, user_agent, created_at",
        )
        .eq("target_type", "user")
        .eq("target_id", targetUserId!)
        .order("created_at", { ascending: false })
        .limit(50);
      if (error) throw error;
      return (data ?? []) as UserAuditEntry[];
    },
  });
}
