import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useWorkspace } from "@/contexts/WorkspaceContext";
import { MenuSection } from "@/types/entity";
import { toast } from "sonner";

export type EntityType = 'lead' | 'contact' | 'company';

// Default sections for each entity type
const DEFAULT_SECTIONS: Record<EntityType, MenuSection[]> = {
  lead: ['overview', 'insights', 'timeline', 'notes', 'communication', 'activity', 'team', 'files', 'business', 'data'],
  contact: ['overview', 'insights', 'timeline', 'notes', 'communication', 'activity', 'team', 'files', 'business', 'financial', 'data'],
  company: ['overview', 'insights', 'timeline', 'notes', 'communication', 'activity', 'team', 'files', 'business', 'financial', 'data', 'contacts'],
};

export interface WorkspaceLayoutConfig {
  id: string;
  workspace_id: string;
  entity_type: EntityType;
  visible_sections: MenuSection[];
  section_order: MenuSection[] | null;
  created_at: string;
  updated_at: string;
}

export function useWorkspaceLayoutConfig(entityType: EntityType) {
  const { currentWorkspace } = useWorkspace();
  const workspaceId = currentWorkspace?.id;

  return useQuery({
    queryKey: ['workspace-layout-config', workspaceId, entityType],
    queryFn: async (): Promise<WorkspaceLayoutConfig | null> => {
      if (!workspaceId) return null;

      const { data, error } = await supabase
        .from('workspace_layout_config')
        .select('*')
        .eq('workspace_id', workspaceId)
        .eq('entity_type', entityType)
        .maybeSingle();

      if (error) {
        console.error('Error fetching layout config:', error);
        return null;
      }

      return data as WorkspaceLayoutConfig | null;
    },
    enabled: !!workspaceId,
  });
}

export function useUpdateWorkspaceLayoutConfig() {
  const queryClient = useQueryClient();
  const { currentWorkspace } = useWorkspace();

  return useMutation({
    mutationFn: async ({ 
      entityType, 
      visibleSections, 
      sectionOrder 
    }: { 
      entityType: EntityType; 
      visibleSections: MenuSection[];
      sectionOrder?: MenuSection[] | null;
    }) => {
      if (!currentWorkspace?.id) throw new Error('No workspace selected');

      const { data, error } = await supabase
        .from('workspace_layout_config')
        .upsert({
          workspace_id: currentWorkspace.id,
          entity_type: entityType,
          visible_sections: visibleSections,
          section_order: sectionOrder || null,
          updated_at: new Date().toISOString(),
        }, {
          onConflict: 'workspace_id,entity_type',
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ 
        queryKey: ['workspace-layout-config', currentWorkspace?.id, variables.entityType] 
      });
      toast.success('Configuração de layout guardada');
    },
    onError: (error) => {
      console.error('Error updating layout config:', error);
      toast.error('Erro ao guardar configuração');
    },
  });
}

export function getVisibleSections(
  entityType: EntityType,
  config: WorkspaceLayoutConfig | null | undefined
): MenuSection[] {
  if (!config) {
    return DEFAULT_SECTIONS[entityType];
  }

  // If there's a custom order, use it to sort the visible sections
  if (config.section_order && config.section_order.length > 0) {
    return config.section_order.filter(section => 
      config.visible_sections.includes(section)
    );
  }

  return config.visible_sections;
}

export function getDefaultSections(entityType: EntityType): MenuSection[] {
  return DEFAULT_SECTIONS[entityType];
}
