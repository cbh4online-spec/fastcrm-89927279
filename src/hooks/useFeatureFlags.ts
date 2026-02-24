import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useWorkspace } from "@/contexts/WorkspaceContext";

interface FeatureFlag {
  id: string;
  flag_key: string;
  enabled: boolean;
}

export function useFeatureFlags() {
  const { currentWorkspace } = useWorkspace();
  const workspaceId = currentWorkspace?.id;

  return useQuery({
    queryKey: ["feature-flags", workspaceId],
    queryFn: async () => {
      if (!workspaceId) return [] as FeatureFlag[];
      const { data, error } = await supabase
        .from("workspace_feature_flags" as any)
        .select("id, flag_key, enabled")
        .eq("workspace_id", workspaceId);
      if (error) throw error;
      return (data as unknown as FeatureFlag[]) || [];
    },
    enabled: !!workspaceId,
    staleTime: 5 * 60 * 1000,
  });
}

export function useFeatureFlag(key: string) {
  const { data: flags, isLoading } = useFeatureFlags();
  const flag = flags?.find((f) => f.flag_key === key);
  return { enabled: flag?.enabled ?? false, isLoading };
}

export function useToggleFeatureFlag() {
  const queryClient = useQueryClient();
  const { currentWorkspace } = useWorkspace();
  const workspaceId = currentWorkspace?.id;

  return useMutation({
    mutationFn: async ({ flagKey, enabled }: { flagKey: string; enabled: boolean }) => {
      if (!workspaceId) throw new Error("No workspace");
      
      const { data: existing } = await supabase
        .from("workspace_feature_flags" as any)
        .select("id")
        .eq("workspace_id", workspaceId)
        .eq("flag_key", flagKey)
        .maybeSingle();

      if (existing) {
        const { error } = await supabase
          .from("workspace_feature_flags" as any)
          .update({ enabled })
          .eq("id", (existing as any).id);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from("workspace_feature_flags" as any)
          .insert({ workspace_id: workspaceId, flag_key: flagKey, enabled });
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["feature-flags", workspaceId] });
    },
  });
}
