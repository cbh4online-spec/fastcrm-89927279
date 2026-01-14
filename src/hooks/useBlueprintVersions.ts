import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { CrmBlueprint } from '@/types/blueprint';
import { toast } from 'sonner';

interface BlueprintVersion {
  id: string;
  blueprintId: string;
  version: number;
  schema: CrmBlueprint;
  changeSummary: string | null;
  createdBy: string | null;
  createdAt: string;
}

interface BlueprintVersionRow {
  id: string;
  blueprint_id: string;
  version: number;
  schema: Record<string, unknown>;
  change_summary: string | null;
  created_by: string | null;
  created_at: string;
}

export function useBlueprintVersions(blueprintId: string | null) {
  const queryClient = useQueryClient();

  const {
    data: versions,
    isLoading,
    error,
    refetch,
  } = useQuery({
    queryKey: ['blueprint-versions', blueprintId],
    queryFn: async () => {
      if (!blueprintId) return [];

      const { data, error } = await supabase
        .from('blueprint_versions')
        .select('*')
        .eq('blueprint_id', blueprintId)
        .order('version', { ascending: false });

      if (error) throw error;

      return (data as BlueprintVersionRow[]).map((row): BlueprintVersion => ({
        id: row.id,
        blueprintId: row.blueprint_id,
        version: row.version,
        schema: row.schema as unknown as CrmBlueprint,
        changeSummary: row.change_summary,
        createdBy: row.created_by,
        createdAt: row.created_at,
      }));
    },
    enabled: !!blueprintId,
  });

  const createVersion = useMutation({
    mutationFn: async ({
      blueprintId,
      version,
      schema,
      changeSummary,
    }: {
      blueprintId: string;
      version: number;
      schema: CrmBlueprint;
      changeSummary?: string;
    }) => {
      const { data: { user } } = await supabase.auth.getUser();

      const { error } = await supabase
        .from('blueprint_versions')
        .insert([{
          blueprint_id: blueprintId,
          version,
          schema: JSON.parse(JSON.stringify(schema)),
          change_summary: changeSummary || null,
          created_by: user?.id || null,
        }]);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['blueprint-versions', blueprintId] });
    },
    onError: (error) => {
      console.error('Error creating version:', error);
      toast.error('Erro ao criar versão');
    },
  });

  const restoreVersion = async (versionId: string): Promise<CrmBlueprint | null> => {
    const version = versions?.find((v) => v.id === versionId);
    if (!version) {
      toast.error('Versão não encontrada');
      return null;
    }

    toast.success(`Versão ${version.version} restaurada`);
    return version.schema;
  };

  const getVersionDiff = (versionA: BlueprintVersion, versionB: BlueprintVersion) => {
    const diff: { field: string; oldValue: unknown; newValue: unknown }[] = [];

    // Compare custom fields count
    if (versionA.schema.customFields?.length !== versionB.schema.customFields?.length) {
      diff.push({
        field: 'Campos personalizados',
        oldValue: versionA.schema.customFields?.length || 0,
        newValue: versionB.schema.customFields?.length || 0,
      });
    }

    // Compare pipeline stages count
    if (versionA.schema.pipelineStages?.length !== versionB.schema.pipelineStages?.length) {
      diff.push({
        field: 'Etapas do pipeline',
        oldValue: versionA.schema.pipelineStages?.length || 0,
        newValue: versionB.schema.pipelineStages?.length || 0,
      });
    }

    // Compare automations count
    if (versionA.schema.automations?.length !== versionB.schema.automations?.length) {
      diff.push({
        field: 'Automações',
        oldValue: versionA.schema.automations?.length || 0,
        newValue: versionB.schema.automations?.length || 0,
      });
    }

    return diff;
  };

  return {
    versions: versions || [],
    isLoading,
    error,
    refetch,
    createVersion: createVersion.mutateAsync,
    restoreVersion,
    getVersionDiff,
    isCreating: createVersion.isPending,
  };
}
