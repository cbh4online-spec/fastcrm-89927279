import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useWorkspace } from '@/contexts/WorkspaceContext';
import { toast } from 'sonner';

export function useJobs() {
  const { currentWorkspace } = useWorkspace();
  const queryClient = useQueryClient();
  const workspaceId = currentWorkspace?.id;

  const { data: jobs, isLoading } = useQuery({
    queryKey: ['jobs', workspaceId],
    queryFn: async () => {
      if (!workspaceId) return [];
      const { data, error } = await supabase
        .from('jobs' as any)
        .select('*')
        .eq('workspace_id', workspaceId)
        .order('created_at', { ascending: false })
        .limit(50);
      if (error) throw error;
      return (data ?? []) as any[];
    },
    enabled: !!workspaceId,
  });

  const createJob = useMutation({
    mutationFn: async (job: { type: string; payload_json?: Record<string, unknown>; run_after?: string }) => {
      if (!workspaceId) throw new Error('No workspace');
      const { error } = await supabase.from('jobs' as any).insert({
        workspace_id: workspaceId,
        type: job.type,
        payload_json: job.payload_json ?? { workspace_id: workspaceId },
        run_after: job.run_after ?? new Date().toISOString(),
      } as any);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['jobs', workspaceId] });
      toast.success('Job criado');
    },
    onError: (err: Error) => toast.error('Erro ao criar job: ' + err.message),
  });

  return { jobs, isLoading, createJob };
}
