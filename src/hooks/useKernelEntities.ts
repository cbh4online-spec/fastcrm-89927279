import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useWorkspace } from '@/contexts/WorkspaceContext';

export function useKernelEntities(kind?: string) {
  const { currentWorkspace } = useWorkspace();
  const workspaceId = currentWorkspace?.id;

  const { data: entities, isLoading } = useQuery({
    queryKey: ['kernel-entities', workspaceId, kind],
    queryFn: async () => {
      if (!workspaceId) return [];
      let query = supabase
        .from('kernel_entities')
        .select('*')
        .eq('workspace_id', workspaceId);
      if (kind) query = query.eq('kind', kind);
      const { data, error } = await query.order('updated_at', { ascending: false }).limit(200);
      if (error) throw error;
      return data ?? [];
    },
    enabled: !!workspaceId,
  });

  return { entities, isLoading };
}

export function useKernelLinks() {
  const { currentWorkspace } = useWorkspace();
  const queryClient = useQueryClient();
  const workspaceId = currentWorkspace?.id;

  const { data: links, isLoading } = useQuery({
    queryKey: ['kernel-links', workspaceId],
    queryFn: async () => {
      if (!workspaceId) return [];
      const { data, error } = await supabase
        .from('kernel_links')
        .select('*')
        .eq('workspace_id', workspaceId);
      if (error) throw error;
      return data ?? [];
    },
    enabled: !!workspaceId,
  });

  const addLink = useMutation({
    mutationFn: async (link: { from_kind: string; from_id: string; to_kind: string; to_id: string; relation_type?: string; confidence?: number }) => {
      if (!workspaceId) throw new Error('No workspace');
      const { error } = await supabase.from('kernel_links').insert({ workspace_id: workspaceId, ...link });
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['kernel-links'] }),
  });

  const removeLink = useMutation({
    mutationFn: async (linkId: string) => {
      const { error } = await supabase.from('kernel_links').delete().eq('id', linkId);
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['kernel-links'] }),
  });

  return { links, isLoading, addLink, removeLink };
}
