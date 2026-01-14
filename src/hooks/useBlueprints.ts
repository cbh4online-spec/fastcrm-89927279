import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useWorkspace } from '@/contexts/WorkspaceContext';
import { CrmBlueprint } from '@/types/blueprint';
import { toast } from 'sonner';

interface BlueprintRow {
  id: string;
  workspace_id: string;
  name: string;
  description: string | null;
  entity_type: string;
  schema: Record<string, unknown>;
  status: string;
  version: number;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

export function useBlueprints() {
  const { currentWorkspace } = useWorkspace();
  const queryClient = useQueryClient();

  const {
    data: blueprints,
    isLoading,
    error,
    refetch,
  } = useQuery({
    queryKey: ['blueprints', currentWorkspace?.id],
    queryFn: async () => {
      if (!currentWorkspace?.id) return [];

      const { data, error } = await supabase
        .from('crm_blueprints')
        .select('*')
        .eq('workspace_id', currentWorkspace.id)
        .order('updated_at', { ascending: false });

      if (error) throw error;

      return (data as BlueprintRow[]).map((row) => ({
        id: row.id,
        name: row.name,
        description: row.description,
        entityType: row.entity_type,
        status: row.status,
        version: row.version,
        createdAt: row.created_at,
        updatedAt: row.updated_at,
        schema: row.schema as unknown as CrmBlueprint,
      }));
    },
    enabled: !!currentWorkspace?.id,
  });

  const loadBlueprint = async (id: string): Promise<{ blueprint: CrmBlueprint; dbId: string } | null> => {
    const { data, error } = await supabase
      .from('crm_blueprints')
      .select('*')
      .eq('id', id)
      .maybeSingle();

    if (error) {
      toast.error('Erro ao carregar blueprint');
      return null;
    }

    if (!data) {
      toast.error('Blueprint não encontrado');
      return null;
    }

    const row = data as BlueprintRow;
    return {
      blueprint: row.schema as unknown as CrmBlueprint,
      dbId: row.id,
    };
  };

  const deleteBlueprint = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('crm_blueprints')
        .delete()
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['blueprints', currentWorkspace?.id] });
      toast.success('Blueprint eliminado');
    },
    onError: () => {
      toast.error('Erro ao eliminar blueprint');
    },
  });

  const updateBlueprintStatus = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: string }) => {
      const { error } = await supabase
        .from('crm_blueprints')
        .update({ status, updated_at: new Date().toISOString() })
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['blueprints', currentWorkspace?.id] });
      toast.success('Estado do blueprint atualizado');
    },
    onError: () => {
      toast.error('Erro ao atualizar estado');
    },
  });

  return {
    blueprints: blueprints || [],
    isLoading,
    error,
    refetch,
    loadBlueprint,
    deleteBlueprint: deleteBlueprint.mutate,
    updateBlueprintStatus: updateBlueprintStatus.mutate,
    isDeleting: deleteBlueprint.isPending,
  };
}
