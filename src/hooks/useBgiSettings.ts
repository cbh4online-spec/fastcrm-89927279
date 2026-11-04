import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useWorkspace } from "@/contexts/WorkspaceContext";
import { BUSINESS_TEMPLATES, type BusinessTemplateId } from "@/lib/bgi/indicatorCatalog";

export function sanitizeTemplateIds(ids: string[]): BusinessTemplateId[] {
  return [...new Set(ids)].filter((t): t is BusinessTemplateId => t in BUSINESS_TEMPLATES);
}

export function useBgiSettings() {
  const { currentWorkspace } = useWorkspace();
  const workspaceId = currentWorkspace?.id;
  const qc = useQueryClient();

  const query = useQuery({
    queryKey: ["bgi-settings", workspaceId],
    enabled: !!workspaceId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("workspace_bgi_settings")
        .select("template_ids, updated_at")
        .eq("workspace_id", workspaceId!)
        .maybeSingle();
      if (error) throw error;
      return { templateIds: sanitizeTemplateIds(data?.template_ids ?? []), updatedAt: data?.updated_at ?? null };
    },
  });

  const save = useMutation({
    mutationFn: async (ids: string[]) => {
      if (!workspaceId) throw new Error("Workspace não encontrado");
      const template_ids = sanitizeTemplateIds(ids);
      const { error } = await supabase
        .from("workspace_bgi_settings")
        .upsert({ workspace_id: workspaceId, template_ids }, { onConflict: "workspace_id" });
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["bgi-settings", workspaceId] }),
  });

  return { ...query, save };
}
