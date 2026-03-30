import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useWorkspace } from '@/contexts/WorkspaceContext';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';

export interface ActionExecution {
  id: string;
  workspace_id: string;
  source_type: string;
  source_id: string | null;
  action_type: string;
  title: string;
  description: string | null;
  payload_json: Record<string, unknown>;
  result_json: Record<string, unknown> | null;
  entity_type: string | null;
  entity_id: string | null;
  created_by: string | null;
  execution_mode: string;
  status: string;
  executed_at: string | null;
  failed_at: string | null;
  cancelled_at: string | null;
  error_message: string | null;
  correlation_id: string | null;
  created_at: string;
  updated_at: string;
}

export interface ExecuteActionParams {
  action_type: string;
  title: string;
  description?: string;
  payload?: Record<string, unknown>;
  source_type?: string;
  source_id?: string;
  entity_type?: string;
  entity_id?: string;
  execution_mode?: string;
  correlation_id?: string;
}

export function useExecuteAction() {
  const { currentWorkspace } = useWorkspace();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (params: ExecuteActionParams) => {
      if (!currentWorkspace?.id) throw new Error('No workspace');

      const { data, error } = await supabase.functions.invoke('process-action-execution', {
        body: {
          workspace_id: currentWorkspace.id,
          ...params,
        },
      });

      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['action-executions'] });
      queryClient.invalidateQueries({ queryKey: ['action-stats'] });
      queryClient.invalidateQueries({ queryKey: ['action-approvals'] });

      if (data.status === 'completed') {
        toast.success('Ação executada', { description: data.result?.summary });
      } else if (data.status === 'pending_approval') {
        toast.info('Ação requer aprovação', { description: data.message });
      } else if (data.status === 'failed') {
        toast.error('Ação falhou', { description: data.error });
      }
    },
    onError: (err: Error) => {
      toast.error('Erro ao executar ação', { description: err.message });
    },
  });
}

export function useActionExecutions(filters?: Record<string, string>) {
  const { currentWorkspace } = useWorkspace();
  const workspaceId = currentWorkspace?.id;

  return useQuery({
    queryKey: ['action-executions', workspaceId, filters],
    queryFn: async () => {
      if (!workspaceId) return [];
      let query = supabase
        .from('action_executions' as any)
        .select('*')
        .eq('workspace_id', workspaceId)
        .order('created_at', { ascending: false })
        .limit(50);

      if (filters?.status) query = query.eq('status', filters.status);
      if (filters?.source_type) query = query.eq('source_type', filters.source_type);
      if (filters?.action_type) query = query.eq('action_type', filters.action_type);

      const { data, error } = await query;
      if (error) throw error;
      return (data ?? []) as unknown as ActionExecution[];
    },
    enabled: !!workspaceId,
    refetchInterval: 15_000,
  });
}

export function useActionStats() {
  const { currentWorkspace } = useWorkspace();
  const workspaceId = currentWorkspace?.id;

  return useQuery({
    queryKey: ['action-stats', workspaceId],
    queryFn: async () => {
      if (!workspaceId) return null;

      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const todayISO = today.toISOString();

      const [pendingRes, completedTodayRes, failedRes, approvalsRes] = await Promise.all([
        supabase.from('action_executions' as any).select('id', { count: 'exact', head: true })
          .eq('workspace_id', workspaceId).eq('status', 'pending'),
        supabase.from('action_executions' as any).select('id', { count: 'exact', head: true })
          .eq('workspace_id', workspaceId).eq('status', 'completed').gte('executed_at', todayISO),
        supabase.from('action_executions' as any).select('id', { count: 'exact', head: true })
          .eq('workspace_id', workspaceId).eq('status', 'failed'),
        supabase.from('action_approvals' as any).select('id', { count: 'exact', head: true })
          .eq('workspace_id', workspaceId).eq('approval_status', 'pending'),
      ]);

      return {
        pending: pendingRes.count ?? 0,
        completed_today: completedTodayRes.count ?? 0,
        failed: failedRes.count ?? 0,
        approvals_pending: approvalsRes.count ?? 0,
      };
    },
    enabled: !!workspaceId,
    refetchInterval: 30_000,
  });
}

export function useActionApprovals() {
  const { currentWorkspace } = useWorkspace();
  const workspaceId = currentWorkspace?.id;

  return useQuery({
    queryKey: ['action-approvals', workspaceId],
    queryFn: async () => {
      if (!workspaceId) return [];
      const { data, error } = await supabase
        .from('action_approvals' as any)
        .select('*, action_executions(*)')
        .eq('workspace_id', workspaceId)
        .eq('approval_status', 'pending')
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
    enabled: !!workspaceId,
  });
}

export function useApproveAction() {
  const { currentWorkspace } = useWorkspace();
  const { user } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (approvalId: string) => {
      if (!currentWorkspace?.id || !user?.id) throw new Error('No context');

      await supabase
        .from('action_approvals' as any)
        .update({
          approval_status: 'approved',
          approved_by: user.id,
          approved_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .eq('id', approvalId);

      // Get the execution and re-trigger it
      const { data: approval } = await supabase
        .from('action_approvals' as any)
        .select('action_execution_id')
        .eq('id', approvalId)
        .single();

      if (approval) {
        await supabase.functions.invoke('process-action-execution', {
          body: {
            workspace_id: currentWorkspace.id,
            action_execution_id: (approval as any).action_execution_id,
          },
        });
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['action-approvals'] });
      queryClient.invalidateQueries({ queryKey: ['action-executions'] });
      queryClient.invalidateQueries({ queryKey: ['action-stats'] });
      toast.success('Ação aprovada e executada');
    },
    onError: () => toast.error('Erro ao aprovar ação'),
  });
}

export function useRejectAction() {
  const { currentWorkspace } = useWorkspace();
  const { user } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ approvalId, notes }: { approvalId: string; notes?: string }) => {
      if (!currentWorkspace?.id || !user?.id) throw new Error('No context');

      await supabase
        .from('action_approvals' as any)
        .update({
          approval_status: 'rejected',
          approved_by: user.id,
          rejected_at: new Date().toISOString(),
          notes: notes || null,
          updated_at: new Date().toISOString(),
        })
        .eq('id', approvalId);

      // Cancel the execution
      const { data: approval } = await supabase
        .from('action_approvals' as any)
        .select('action_execution_id')
        .eq('id', approvalId)
        .single();

      if (approval) {
        await supabase
          .from('action_executions' as any)
          .update({
            status: 'cancelled',
            cancelled_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          })
          .eq('id', (approval as any).action_execution_id);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['action-approvals'] });
      queryClient.invalidateQueries({ queryKey: ['action-executions'] });
      queryClient.invalidateQueries({ queryKey: ['action-stats'] });
      toast.success('Ação rejeitada');
    },
    onError: () => toast.error('Erro ao rejeitar ação'),
  });
}

export function useActionExecutionSettings() {
  const { currentWorkspace } = useWorkspace();
  const workspaceId = currentWorkspace?.id;
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: ['action-execution-settings', workspaceId],
    queryFn: async () => {
      if (!workspaceId) return null;
      const { data } = await supabase
        .from('action_execution_settings' as any)
        .select('*')
        .eq('workspace_id', workspaceId)
        .maybeSingle();
      return data;
    },
    enabled: !!workspaceId,
  });

  const upsert = useMutation({
    mutationFn: async (settings: Record<string, unknown>) => {
      if (!workspaceId) throw new Error('No workspace');
      const { error } = await supabase
        .from('action_execution_settings' as any)
        .upsert({
          workspace_id: workspaceId,
          ...settings,
          updated_at: new Date().toISOString(),
        }, { onConflict: 'workspace_id' });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['action-execution-settings'] });
      toast.success('Definições de execução atualizadas');
    },
  });

  return { ...query, upsert };
}
