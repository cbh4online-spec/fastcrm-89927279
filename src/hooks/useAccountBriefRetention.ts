import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useWorkspace } from "@/contexts/WorkspaceContext";
import { toast } from "sonner";

export function useAccountBriefRetention() {
  const { currentWorkspace } = useWorkspace();
  const workspaceId = currentWorkspace?.id;
  const queryClient = useQueryClient();

  const policiesQuery = useQuery({
    queryKey: ["account-brief-retention", workspaceId],
    queryFn: async () => {
      if (!workspaceId) return [];
      const { data, error } = await supabase
        .from("account_brief_retention_policies")
        .select("*")
        .eq("workspace_id", workspaceId)
        .order("policy_key");
      if (error) throw error;
      return data || [];
    },
    enabled: !!workspaceId,
  });

  const updatePolicy = useMutation({
    mutationFn: async (input: { policy_key: string; retention_days: number; archive_after_days?: number; purge_after_days?: number }) => {
      if (!workspaceId) throw new Error("Workspace não encontrado");
      const existing = policiesQuery.data?.find((p) => p.policy_key === input.policy_key);
      if (existing) {
        const { error } = await supabase
          .from("account_brief_retention_policies")
          .update({
            retention_days: input.retention_days,
            archive_after_days: input.archive_after_days ?? null,
            purge_after_days: input.purge_after_days ?? null,
            updated_at: new Date().toISOString(),
          })
          .eq("id", existing.id);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from("account_brief_retention_policies")
          .insert({
            workspace_id: workspaceId,
            policy_key: input.policy_key,
            retention_days: input.retention_days,
            archive_after_days: input.archive_after_days ?? null,
            purge_after_days: input.purge_after_days ?? null,
          });
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["account-brief-retention"] });
      toast.success("Política de retenção atualizada");
    },
    onError: (err: Error) => toast.error(err.message),
  });

  return {
    policies: policiesQuery.data || [],
    isLoading: policiesQuery.isLoading,
    updatePolicy,
  };
}

export const RETENTION_POLICY_LABELS: Record<string, string> = {
  analysis_runs: "Runs de Análise",
  page_snapshots: "Snapshots de Páginas",
  field_lineage: "Lineage de Campos",
  pdf_exports: "PDFs Exportados",
  outreach_generations: "Gerações de Outreach",
  technical_logs: "Logs Técnicos",
  old_alerts: "Alertas Antigos",
  job_errors: "Erros de Jobs",
};
