import { useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useWorkspace } from '@/contexts/WorkspaceContext';
import { toast } from 'sonner';

export function useDynamicSegment() {
  const { currentWorkspace } = useWorkspace();

  const evaluateSegment = useMutation({
    mutationFn: async ({ segment_type, rules }: { segment_type: string; rules?: any }) => {
      if (!currentWorkspace?.id) throw new Error('No workspace');
      const { data, error } = await supabase.functions.invoke('email-dynamic-segments', {
        body: {
          workspace_id: currentWorkspace.id,
          segment_type,
          rules,
        },
      });
      if (error) throw error;
      return data as { count: number; contact_ids: string[] };
    },
    onError: (e: any) => toast.error(e.message || 'Erro ao avaliar segmento'),
  });

  return {
    evaluateSegment,
    isEvaluating: evaluateSegment.isPending,
  };
}
