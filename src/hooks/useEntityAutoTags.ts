import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useWorkspace } from '@/contexts/WorkspaceContext';
import { toast } from 'sonner';
import type { SuggestionEntityType } from '@/types/ai-suggestions';

/**
 * Entity-level auto-tag generation (different from conversation-level useAutoTags).
 * Analyses entity data and suggests tags.
 */
export function useEntityAutoTags(entityType: SuggestionEntityType, entityId: string) {
  const { currentWorkspace } = useWorkspace();
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async () => {
      if (!currentWorkspace?.id) throw new Error('No workspace');
      const { data, error } = await supabase.functions.invoke('ai-entity-tags', {
        body: { entity_type: entityType, entity_id: entityId, workspace_id: currentWorkspace.id },
      });
      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      qc.invalidateQueries({ queryKey: ['ai-suggestions-hub', 'entity', entityType, entityId] });
      const count = data?.created ?? 0;
      if (count > 0) toast.success(`${count} tag(s) sugerida(s)`);
      else toast.info('Nenhuma nova tag sugerida');
    },
    onError: () => toast.error('Erro ao gerar tags'),
  });
}
