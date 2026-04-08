import { useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useWorkspace } from '@/contexts/WorkspaceContext';
import { useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';

interface BulkProgress {
  total: number;
  completed: number;
  failed: number;
  isRunning: boolean;
}

interface ActiveOpportunity {
  id: string;
  title: string;
  stage_name: string;
  value: number;
}

export function useActiveOpportunities() {
  const { currentWorkspace } = useWorkspace();

  return {
    fetch: useCallback(async (): Promise<ActiveOpportunity[]> => {
      if (!currentWorkspace?.id) return [];

      const { data, error } = await supabase
        .from('opportunities')
        .select('id, title, value, pipeline_stages!inner(name)')
        .eq('workspace_id', currentWorkspace.id)
        .eq('status', 'open')
        .order('value', { ascending: false })
        .limit(50);

      if (error) {
        console.error('Error fetching opportunities:', error);
        // Fallback: try without join
        const { data: fallback } = await supabase
          .from('opportunities')
          .select('id, title, value, stage_id')
          .eq('workspace_id', currentWorkspace.id)
          .eq('status', 'open')
          .order('value', { ascending: false })
          .limit(50);

        return (fallback ?? []).map((o: any) => ({
          id: o.id,
          title: o.title ?? 'Sem título',
          stage_name: '',
          value: o.value ?? 0,
        }));
      }

      return (data ?? []).map((o: any) => ({
        id: o.id,
        title: o.title ?? 'Sem título',
        stage_name: o.pipeline_stages?.name ?? '',
        value: o.value ?? 0,
      }));
    }, [currentWorkspace?.id]),
  };
}

export function useBulkDealIntelligence() {
  const { currentWorkspace } = useWorkspace();
  const qc = useQueryClient();
  const [progress, setProgress] = useState<BulkProgress>({
    total: 0, completed: 0, failed: 0, isRunning: false,
  });

  const analyzeAll = useCallback(async (opportunityIds: string[]) => {
    if (!currentWorkspace?.id || opportunityIds.length === 0) return;

    setProgress({ total: opportunityIds.length, completed: 0, failed: 0, isRunning: true });

    const CONCURRENCY = 3;
    let completed = 0;
    let failed = 0;

    // Process in chunks
    for (let i = 0; i < opportunityIds.length; i += CONCURRENCY) {
      const chunk = opportunityIds.slice(i, i + CONCURRENCY);
      const results = await Promise.allSettled(
        chunk.map(async (oppId) => {
          const { data, error } = await supabase.functions.invoke('deal-intelligence-ai', {
            body: {
              opportunity_id: oppId,
              workspace_id: currentWorkspace.id,
              force_refresh: false,
            },
          });
          if (error) throw error;
          if (data?.error) throw new Error(data.error);
          return data;
        })
      );

      results.forEach((r) => {
        if (r.status === 'fulfilled') completed++;
        else failed++;
      });

      setProgress({ total: opportunityIds.length, completed, failed, isRunning: true });
    }

    setProgress((prev) => ({ ...prev, isRunning: false }));

    // Invalidate queries
    qc.invalidateQueries({ queryKey: ['all-deal-intel-reports'] });
    qc.invalidateQueries({ queryKey: ['deal-intel-report'] });

    if (failed === 0) {
      toast.success(`${completed} deals analisados com sucesso`);
    } else {
      toast.warning(`${completed} analisados, ${failed} com erro`);
    }
  }, [currentWorkspace?.id, qc]);

  return { analyzeAll, progress };
}
