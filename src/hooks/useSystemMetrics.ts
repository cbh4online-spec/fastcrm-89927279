import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useWorkspace } from '@/contexts/WorkspaceContext';

export interface SystemMetric {
  id: string;
  workspace_id: string;
  metric_date: string;
  commands_executed: number;
  alerts_generated: number;
  alerts_resolved: number;
  tasks_created_system: number;
  tasks_completed: number;
  drift_blocks_warn: number;
  drift_blocks_risk: number;
  drift_blocks_critical: number;
  health_score: number;
}

export function useSystemMetrics(days = 30) {
  const { currentWorkspace } = useWorkspace();
  const workspaceId = currentWorkspace?.id;

  const { data: metrics, isLoading } = useQuery({
    queryKey: ['system-metrics', workspaceId, days],
    queryFn: async () => {
      if (!workspaceId) return [];
      const since = new Date(Date.now() - days * 86400000).toISOString().split('T')[0];
      const { data, error } = await supabase
        .from('system_metrics_daily' as any)
        .select('*')
        .eq('workspace_id', workspaceId)
        .gte('metric_date', since)
        .order('metric_date', { ascending: true });
      if (error) throw error;
      return (data ?? []) as unknown as SystemMetric[];
    },
    enabled: !!workspaceId,
  });

  const latestHealthScore = metrics?.length ? metrics[metrics.length - 1].health_score : null;

  return { metrics, isLoading, latestHealthScore };
}

export function getHealthLabel(score: number): { label: string; color: string } {
  if (score >= 90) return { label: 'Excelente', color: 'text-green-500' };
  if (score >= 70) return { label: 'Estável', color: 'text-blue-500' };
  if (score >= 50) return { label: 'Atenção', color: 'text-yellow-500' };
  return { label: 'Crítico', color: 'text-destructive' };
}
