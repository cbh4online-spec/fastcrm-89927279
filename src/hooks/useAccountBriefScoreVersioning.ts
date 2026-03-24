import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useWorkspace } from "@/contexts/WorkspaceContext";
import { toast } from "sonner";

export function useAccountBriefScoreVersioning() {
  const { currentWorkspace } = useWorkspace();
  const workspaceId = currentWorkspace?.id;
  const queryClient = useQueryClient();

  const versionsQuery = useQuery({
    queryKey: ["account-brief-score-versions", workspaceId],
    queryFn: async () => {
      if (!workspaceId) return [];
      const { data, error } = await supabase
        .from("account_brief_score_model_versions")
        .select("*")
        .eq("workspace_id", workspaceId)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data || [];
    },
    enabled: !!workspaceId,
  });

  const activeVersion = versionsQuery.data?.find((v) => v.is_active) || null;

  const createVersion = useMutation({
    mutationFn: async (input: { version_code: string; model_name: string; config_json: Record<string, unknown> }) => {
      if (!workspaceId) throw new Error("Workspace não encontrado");
      // Deactivate current
      if (activeVersion) {
        await supabase
          .from("account_brief_score_model_versions")
          .update({ is_active: false })
          .eq("id", activeVersion.id);
      }
      const { data, error } = await supabase
        .from("account_brief_score_model_versions")
        .insert([{
          workspace_id: workspaceId,
          version_code: input.version_code,
          model_name: input.model_name,
          config_json: input.config_json as unknown as import("@/integrations/supabase/types").Json,
          is_active: true,
          activated_at: new Date().toISOString(),
        }])
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["account-brief-score-versions"] });
      toast.success("Nova versão do modelo de score criada");
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const activateVersion = useMutation({
    mutationFn: async (versionId: string) => {
      if (!workspaceId) throw new Error("Workspace não encontrado");
      // Deactivate all
      await supabase
        .from("account_brief_score_model_versions")
        .update({ is_active: false })
        .eq("workspace_id", workspaceId);
      // Activate chosen
      const { error } = await supabase
        .from("account_brief_score_model_versions")
        .update({ is_active: true, activated_at: new Date().toISOString() })
        .eq("id", versionId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["account-brief-score-versions"] });
      toast.success("Versão ativada");
    },
    onError: (err: Error) => toast.error(err.message),
  });

  return {
    versions: versionsQuery.data || [],
    activeVersion,
    isLoading: versionsQuery.isLoading,
    createVersion,
    activateVersion,
  };
}
