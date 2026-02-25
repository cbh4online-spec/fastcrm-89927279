import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useWorkspace } from '@/contexts/WorkspaceContext';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';

export function useTemplateFavorites() {
  const { currentWorkspace } = useWorkspace();
  const { user } = useAuth();

  return useQuery({
    queryKey: ['template-favorites', currentWorkspace?.id, user?.id],
    queryFn: async () => {
      if (!currentWorkspace?.id || !user?.id) return [];

      const { data, error } = await supabase
        .from('template_favorites')
        .select('template_id')
        .eq('workspace_id', currentWorkspace.id)
        .eq('user_id', user.id);

      if (error) throw error;
      return (data || []).map(d => d.template_id);
    },
    enabled: !!currentWorkspace?.id && !!user?.id,
  });
}

export function useToggleFavorite() {
  const queryClient = useQueryClient();
  const { currentWorkspace } = useWorkspace();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async ({ templateId, isFavorite }: { templateId: string; isFavorite: boolean }) => {
      if (!currentWorkspace?.id || !user?.id) throw new Error('Not authenticated');

      if (isFavorite) {
        const { error } = await supabase
          .from('template_favorites')
          .delete()
          .eq('template_id', templateId)
          .eq('user_id', user.id);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('template_favorites')
          .insert({
            workspace_id: currentWorkspace.id,
            template_id: templateId,
            user_id: user.id,
          });
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['template-favorites'] });
    },
    onError: () => {
      toast.error('Erro ao atualizar favorito');
    },
  });
}
