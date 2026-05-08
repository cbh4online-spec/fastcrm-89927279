import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useWorkspace } from "@/contexts/WorkspaceContext";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import {
  LEADCHEF_DEFAULT_AUTOMATIONS,
  type LeadChefAutomationDefault,
} from "@/utils/leadchef/templates";
import type { LeadChefAutomationRule } from "@/types/leadchefTemplates";

/**
 * Devolve uma lista combinada: defaults + estado atual em DB.
 * Para automações que ainda não foram persistidas, devolve o default desativável.
 */
export function useLeadChefAutomations() {
  const { currentWorkspace } = useWorkspace();
  const workspaceId = currentWorkspace?.id;

  return useQuery({
    queryKey: ["leadchef-automations", workspaceId],
    enabled: !!workspaceId,
    queryFn: async () => {
      if (!workspaceId) return { rules: [] as Array<LeadChefAutomationRule | (LeadChefAutomationDefault & { id?: string })> };
      const { data, error } = await (supabase as any)
        .from("leadchef_automation_rules")
        .select("*")
        .eq("workspace_id", workspaceId);
      if (error) throw error;
      const persisted = (data ?? []) as LeadChefAutomationRule[];
      const persistedByKey = new Map(persisted.map((r) => [r.key, r]));

      const merged = LEADCHEF_DEFAULT_AUTOMATIONS.map((d) => {
        const p = persistedByKey.get(d.key);
        if (p) return p;
        return { ...d, id: undefined } as LeadChefAutomationDefault & { id?: string };
      });

      return { rules: merged };
    },
  });
}

interface ToggleInput {
  key: string;
  name: string;
  description?: string | null;
  trigger_type: string;
  action_type: string;
  config?: Record<string, unknown>;
  is_enabled: boolean;
}

export function useUpdateLeadChefAutomation() {
  const qc = useQueryClient();
  const { currentWorkspace } = useWorkspace();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async (input: ToggleInput) => {
      if (!currentWorkspace?.id) throw new Error("Workspace não selecionado.");
      const { data, error } = await (supabase as any)
        .from("leadchef_automation_rules")
        .upsert(
          {
            workspace_id: currentWorkspace.id,
            key: input.key,
            name: input.name,
            description: input.description ?? null,
            trigger_type: input.trigger_type,
            action_type: input.action_type,
            config: input.config ?? {},
            is_enabled: input.is_enabled,
            created_by: user?.id ?? null,
          },
          { onConflict: "workspace_id,key" }
        )
        .select("*")
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["leadchef-automations"] });
    },
    onError: (e: any) => toast.error(e?.message || "Falha ao atualizar automação."),
  });
}
