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
  google_places_enabled: boolean;
  nif_lookup_enabled: boolean;
  instagram_enrich_enabled: boolean;
  icp_score_enabled: boolean;
  default_prospecting_tone: string;
  service_offer: string;
  service_pain_points: string;
}

const DEFAULT_SETTINGS: LeadEnricherSettings = {
  google_enabled: true,
  linkedin_enabled: true,
  webscraping_enabled: true,
  auto_enrich_enabled: false,
  email_validation_enabled: false,
  google_places_enabled: false,
  nif_lookup_enabled: false,
  instagram_enrich_enabled: false,
  icp_score_enabled: false,
  default_prospecting_tone: "casual",
  service_offer: "",
  service_pain_points: "",
};

export function useLeadEnricherSettings() {
  const { currentWorkspace } = useWorkspace();
  const { workspaceClient } = useWorkspaceInstance();
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: ["lead-enricher-settings", currentWorkspace?.id],
    queryFn: async (): Promise<LeadEnricherSettings> => {
      if (!currentWorkspace) return DEFAULT_SETTINGS;

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const wc = workspaceClient as any;
      const { data, error } = await wc
        .from("lead_enricher_settings")
        .select("*")
        .eq("workspace_id", currentWorkspace.id)
        .maybeSingle();

      if (error) throw error;
      if (!data) return DEFAULT_SETTINGS;

      const row = data as LeadEnricherSettings & { id?: string; workspace_id?: string };
      return {
        id: row.id,
        workspace_id: row.workspace_id,
        google_enabled: row.google_enabled,
        linkedin_enabled: row.linkedin_enabled,
        webscraping_enabled: row.webscraping_enabled,
        auto_enrich_enabled: row.auto_enrich_enabled,
        email_validation_enabled: row.email_validation_enabled,
        google_places_enabled: row.google_places_enabled ?? false,
        nif_lookup_enabled: row.nif_lookup_enabled ?? false,
        instagram_enrich_enabled: row.instagram_enrich_enabled ?? false,
        icp_score_enabled: row.icp_score_enabled ?? false,
        default_prospecting_tone: row.default_prospecting_tone ?? "casual",
        service_offer: row.service_offer ?? "",
        service_pain_points: row.service_pain_points ?? "",
      };
    },
    enabled: !!currentWorkspace,
  });

  const updateSettings = useMutation({
    mutationFn: async (updates: Partial<LeadEnricherSettings>) => {
      if (!currentWorkspace) throw new Error("No workspace");

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const wc = workspaceClient as any;
      const { data: existing } = await wc
        .from("lead_enricher_settings")
        .select("id")
        .eq("workspace_id", currentWorkspace.id)
        .maybeSingle();

      if (existing) {
        const { error } = await wc
          .from("lead_enricher_settings")
          .update(updates)
          .eq("workspace_id", currentWorkspace.id);
        if (error) throw error;
      } else {
        const { error } = await wc
          .from("lead_enricher_settings")
          .insert({ workspace_id: currentWorkspace.id, ...updates });
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["lead-enricher-settings", currentWorkspace?.id] });
      console.debug('[ENRICHER] Settings updated');
      toast.success("Configurações guardadas");
    },
    onError: (error) => {
      console.warn('[ENRICHER] SETTINGS_UPDATE_FAILED', error.message);
      toast.error(`Erro ao guardar: ${error.message}`);
    },
  });

  return {
    settings: query.data ?? DEFAULT_SETTINGS,
    isLoading: query.isLoading,
    updateSettings,
  };
}
