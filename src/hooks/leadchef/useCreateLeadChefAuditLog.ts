import { useMutation } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useWorkspace } from "@/contexts/WorkspaceContext";
import { useAuth } from "@/contexts/AuthContext";
import type { LeadChefAuditAction } from "@/utils/leadchef/audit";

export interface CreateAuditInput {
  action: LeadChefAuditAction;
  entityType: string;
  entityId?: string | null;
  description?: string;
  metadata?: Record<string, unknown>;
}

export function useCreateLeadChefAuditLog() {
  const { currentWorkspace } = useWorkspace();
  const { user } = useAuth();
  const workspaceId = currentWorkspace?.id;

  return useMutation({
    mutationFn: async (input: CreateAuditInput) => {
      if (!workspaceId) return null;
      const { error } = await (supabase as any).from("leadchef_audit_logs").insert({
        workspace_id: workspaceId,
        user_id: user?.id ?? null,
        entity_type: input.entityType,
        entity_id: input.entityId ?? null,
        action: input.action,
        description: input.description ?? null,
        metadata: input.metadata ?? {},
      });
      if (error) {
        // Best-effort: nunca bloquear fluxo principal
        // eslint-disable-next-line no-console
        console.warn("[LeadChef] audit log falhou", error);
        return null;
      }
      return true;
    },
  });
}
