import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useWorkspace } from "@/contexts/WorkspaceContext";
import { useWorkspaceInstance } from "@/contexts/WorkspaceInstanceContext";
import { toast } from "sonner";

export interface LeadEnricherSettings {
  id?: string;
  workspace_id?: string;
  google_enabled: boolean;
  linkedin_enabled: boolean;
  webscraping_enabled: boolean;
  auto_enrich_enabled: boolean;
  email_validation_enabled: boolean;
}

const DEFAULT_SETTINGS: LeadEnricherSettings = {
  google_enabled: true,
  linkedin_enabled: true,
  webscraping_enabled: true,
  auto_enrich_enabled: false,
  email_validation_enabled: false,
};

export function useLeadEnricherSettings() {
  const { currentWorkspace } = useWorkspace();
  const { workspaceClient } = useWorkspaceInstance();
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: ["lead-enricher-settings", currentWorkspace?.id],
    queryFn: async (): Promise<LeadEnricherSettings> => {
      if (!currentWorkspace) return DEFAULT_SETTINGS;

      const { data, error } = await workspaceClient
        .from("lead_enricher_settings" as any)
        .select("*")
        .eq("workspace_id", currentWorkspace.id)
        .maybeSingle();

      if (error) throw error;
      if (!data) return DEFAULT_SETTINGS;

      return {
        id: (data as any).id,
        workspace_id: (data as any).workspace_id,
        google_enabled: (data as any).google_enabled,
        linkedin_enabled: (data as any).linkedin_enabled,
        webscraping_enabled: (data as any).webscraping_enabled,
        auto_enrich_enabled: (data as any).auto_enrich_enabled,
        email_validation_enabled: (data as any).email_validation_enabled,
      };
    },
    enabled: !!currentWorkspace,
  });

  const updateSettings = useMutation({
    mutationFn: async (updates: Partial<LeadEnricherSettings>) => {
      if (!currentWorkspace) throw new Error("No workspace");

      const { data: existing } = await workspaceClient
        .from("lead_enricher_settings" as any)
        .select("id")
        .eq("workspace_id", currentWorkspace.id)
        .maybeSingle();

      if (existing) {
        const { error } = await workspaceClient
          .from("lead_enricher_settings" as any)
          .update(updates as any)
          .eq("workspace_id", currentWorkspace.id);
        if (error) throw error;
      } else {
        const { error } = await workspaceClient
          .from("lead_enricher_settings" as any)
          .insert({ workspace_id: currentWorkspace.id, ...updates } as any);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["lead-enricher-settings", currentWorkspace?.id] });
      toast.success("Configurações guardadas");
    },
    onError: (error) => {
      toast.error(`Erro ao guardar: ${error.message}`);
    },
  });

  return {
    settings: query.data ?? DEFAULT_SETTINGS,
    isLoading: query.isLoading,
    updateSettings,
  };
}
