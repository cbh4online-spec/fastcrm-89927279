import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useWorkspace } from "@/contexts/WorkspaceContext";
import { toast } from "sonner";

export function useAccountBriefSettings() {
  const { currentWorkspace } = useWorkspace();
  const queryClient = useQueryClient();
  const workspaceId = currentWorkspace?.id;

  const profileQuery = useQuery({
    queryKey: ["account-brief-profile", workspaceId],
    queryFn: async () => {
      if (!workspaceId) return null;
      const { data } = await supabase
        .from("account_brief_profiles")
        .select("*")
        .eq("workspace_id", workspaceId)
        .maybeSingle();
      return data;
    },
    enabled: !!workspaceId,
  });

  const icpQuery = useQuery({
    queryKey: ["account-brief-icp", workspaceId],
    queryFn: async () => {
      if (!workspaceId) return null;
      const { data } = await supabase
        .from("account_brief_icp_profiles")
        .select("*")
        .eq("workspace_id", workspaceId)
        .eq("is_default", true)
        .maybeSingle();
      return data;
    },
    enabled: !!workspaceId,
  });

  const updateProfile = useMutation({
    mutationFn: async (updates: Record<string, unknown>) => {
      if (!workspaceId) throw new Error("Workspace não encontrado");
      const { error } = await supabase
        .from("account_brief_profiles")
        .update({ ...updates, updated_at: new Date().toISOString() })
        .eq("workspace_id", workspaceId);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Perfil atualizado");
      queryClient.invalidateQueries({ queryKey: ["account-brief-profile"] });
    },
  });

  const updateICP = useMutation({
    mutationFn: async (updates: Record<string, unknown>) => {
      if (!workspaceId) throw new Error("Workspace não encontrado");
      const { error } = await supabase
        .from("account_brief_icp_profiles")
        .update({ ...updates, updated_at: new Date().toISOString() })
        .eq("workspace_id", workspaceId)
        .eq("is_default", true);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("ICP atualizado");
      queryClient.invalidateQueries({ queryKey: ["account-brief-icp"] });
    },
  });

  return {
    profile: profileQuery.data,
    icp: icpQuery.data,
    isLoading: profileQuery.isLoading || icpQuery.isLoading,
    updateProfile,
    updateICP,
  };
}
