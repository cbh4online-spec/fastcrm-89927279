import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useWorkspace } from "@/contexts/WorkspaceContext";
import { useWorkspaceInstance } from "@/contexts/WorkspaceInstanceContext";
import { toast } from "sonner";
import { IndustryType, IndustryLabels, INDUSTRY_PRESETS } from "@/types/import";

export interface WorkspaceIndustryLabels {
  id: string;
  workspace_id: string;
  industry_type: IndustryType;
  entity_labels: IndustryLabels;
  field_labels: Record<string, Record<string, string>>;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  created_by?: string;
}

export function useIndustryLabels() {
  const { currentWorkspace } = useWorkspace();
  const { workspaceClient } = useWorkspaceInstance();

  return useQuery({
    queryKey: ["industry_labels", currentWorkspace?.id],
    queryFn: async () => {
      if (!currentWorkspace) return null;

      const { data, error } = await workspaceClient
        .from("workspace_industry_labels")
        .select("*")
        .eq("workspace_id", currentWorkspace.id)
        .eq("is_active", true)
        .maybeSingle();

      if (error && error.code !== 'PGRST116') throw error;
      return data as WorkspaceIndustryLabels | null;
    },
    enabled: !!currentWorkspace,
  });
}

export function useSetIndustryLabels() {
  const queryClient = useQueryClient();
  const { currentWorkspace } = useWorkspace();
  const { workspaceClient } = useWorkspaceInstance();

  return useMutation({
    mutationFn: async ({
      industryType,
      entityLabels,
      fieldLabels,
    }: {
      industryType: IndustryType;
      entityLabels?: IndustryLabels;
      fieldLabels?: Record<string, Record<string, string>>;
    }) => {
      if (!currentWorkspace) throw new Error("No workspace selected");

      // Get preset labels for the industry type
      const presetLabels = INDUSTRY_PRESETS[industryType] || INDUSTRY_PRESETS.default;
      
      // Merge with custom labels
      const mergedEntityLabels = {
        ...presetLabels,
        ...entityLabels,
      };

      const mergedFieldLabels = {
        ...(presetLabels.fieldLabels || {}),
        ...fieldLabels,
      };

      // First, deactivate any existing active labels
      await workspaceClient
        .from("workspace_industry_labels")
        .update({ is_active: false })
        .eq("workspace_id", currentWorkspace.id)
        .eq("is_active", true);

      // Upsert the new labels
      const { data, error } = await workspaceClient
        .from("workspace_industry_labels")
        .upsert({
          workspace_id: currentWorkspace.id,
          industry_type: industryType,
          entity_labels: mergedEntityLabels,
          field_labels: mergedFieldLabels,
          is_active: true,
        }, {
          onConflict: "workspace_id,industry_type",
        })
        .select()
        .single();

      if (error) throw error;
      return data as WorkspaceIndustryLabels;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["industry_labels", currentWorkspace?.id] });
      toast.success("Modelo de negócio atualizado");
    },
    onError: (error: Error) => {
      console.error("Error setting industry labels:", error);
      toast.error("Erro ao atualizar modelo de negócio");
    },
  });
}

// Helper hook to get the label for an entity
export function useEntityLabel(entityType: string): string {
  const { data: labels } = useIndustryLabels();
  
  if (labels?.entity_labels) {
    const customLabel = labels.entity_labels[entityType as keyof IndustryLabels];
    if (typeof customLabel === 'string') return customLabel;
  }
  
  return INDUSTRY_PRESETS.default[entityType as keyof IndustryLabels] as string || entityType;
}

// Helper hook to get the label for a field
export function useFieldLabel(entityType: string, fieldName: string, defaultLabel: string): string {
  const { data: labels } = useIndustryLabels();
  
  if (labels?.field_labels?.[entityType]?.[fieldName]) {
    return labels.field_labels[entityType][fieldName];
  }
  
  if (labels?.entity_labels?.fieldLabels?.[entityType]?.[fieldName]) {
    return labels.entity_labels.fieldLabels[entityType][fieldName];
  }
  
  return defaultLabel;
}
