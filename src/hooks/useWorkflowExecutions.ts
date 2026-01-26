/**
 * Hook for fetching and managing workflow executions
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useWorkspace } from '@/contexts/WorkspaceContext';
import { toast } from 'sonner';

export interface WorkflowExecutionSummary {
  id: string;
  workflow_code: string;
  workflow_version: number;
  status: 'pending' | 'queued' | 'running' | 'completed' | 'failed' | 'partial' | 'cancelled';
  trigger_type: string;
  trigger_source?: string;
  entity_type?: string;
  entity_id?: string;
  initiated_by?: string;
  started_at?: string;
  completed_at?: string;
  total_duration_ms?: number;
  error_message?: string;
  created_at: string;
}

export interface WorkflowStepSummary {
  id: string;
  step_index: number;
  step_code: string;
  step_type: string;
  status: 'pending' | 'running' | 'completed' | 'failed' | 'skipped';
  started_at?: string;
  completed_at?: string;
  duration_ms?: number;
  retry_count: number;
  error_message?: string;
}

export function useWorkflowExecutions(options?: {
  status?: string;
  entityType?: string;
  entityId?: string;
  limit?: number;
}) {
  const { currentWorkspace } = useWorkspace();
  const { status, entityType, entityId, limit = 20 } = options || {};

  return useQuery({
    queryKey: ['workflow-executions', currentWorkspace?.id, status, entityType, entityId, limit],
    queryFn: async () => {
      if (!currentWorkspace?.id) return [];

      let query = supabase
        .from('workflow_executions')
        .select('*')
        .eq('workspace_id', currentWorkspace.id)
        .order('created_at', { ascending: false })
        .limit(limit);

      if (status) {
        query = query.eq('status', status);
      }

      if (entityType) {
        query = query.eq('entity_type', entityType);
      }

      if (entityId) {
        query = query.eq('entity_id', entityId);
      }

      const { data, error } = await query;

      if (error) {
        console.error('Failed to fetch workflow executions:', error);
        throw error;
      }

      return data as unknown as WorkflowExecutionSummary[];
    },
    enabled: !!currentWorkspace?.id,
    refetchInterval: 5000, // Poll for updates
  });
}

export function useWorkflowExecutionDetails(executionId: string | null) {
  const { currentWorkspace } = useWorkspace();

  return useQuery({
    queryKey: ['workflow-execution', executionId],
    queryFn: async () => {
      if (!executionId || !currentWorkspace?.id) return null;

      const [executionResult, stepsResult] = await Promise.all([
        supabase
          .from('workflow_executions')
          .select('*')
          .eq('id', executionId)
          .eq('workspace_id', currentWorkspace.id)
          .single(),
        supabase
          .from('workflow_steps')
          .select('*')
          .eq('execution_id', executionId)
          .order('step_index', { ascending: true }),
      ]);

      if (executionResult.error) {
        throw executionResult.error;
      }

      return {
        execution: executionResult.data as unknown as WorkflowExecutionSummary,
        steps: (stepsResult.data || []) as unknown as WorkflowStepSummary[],
      };
    },
    enabled: !!executionId && !!currentWorkspace?.id,
    refetchInterval: 2000, // Poll more frequently for active execution
  });
}

export function useCancelWorkflowExecution() {
  const queryClient = useQueryClient();
  const { currentWorkspace } = useWorkspace();

  return useMutation({
    mutationFn: async (executionId: string) => {
      if (!currentWorkspace?.id) {
        throw new Error('Workspace not found');
      }

      // Update execution status
      const { error: execError } = await supabase
        .from('workflow_executions')
        .update({
          status: 'cancelled',
          completed_at: new Date().toISOString(),
        })
        .eq('id', executionId)
        .eq('workspace_id', currentWorkspace.id);

      if (execError) throw execError;

      // Remove from queue if present
      await supabase
        .from('workflow_queue')
        .delete()
        .eq('execution_id', executionId);

      return { success: true };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['workflow-executions'] });
      queryClient.invalidateQueries({ queryKey: ['workflow-execution'] });
      toast.success('Workflow cancelado');
    },
    onError: (error) => {
      toast.error('Erro ao cancelar workflow', {
        description: error instanceof Error ? error.message : 'Erro desconhecido',
      });
    },
  });
}

export function useRetryWorkflowExecution() {
  const queryClient = useQueryClient();
  const { currentWorkspace } = useWorkspace();

  return useMutation({
    mutationFn: async (executionId: string) => {
      if (!currentWorkspace?.id) {
        throw new Error('Workspace not found');
      }

      // Reset execution status
      const { error: execError } = await supabase
        .from('workflow_executions')
        .update({
          status: 'pending',
          error_message: null,
          completed_at: null,
        })
        .eq('id', executionId)
        .eq('workspace_id', currentWorkspace.id);

      if (execError) throw execError;

      // Re-add to queue
      const { error: queueError } = await supabase
        .from('workflow_queue')
        .insert({
          workspace_id: currentWorkspace.id,
          execution_id: executionId,
          priority: 0,
          scheduled_for: new Date().toISOString(),
          status: 'pending',
        });

      if (queueError) throw queueError;

      return { success: true };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['workflow-executions'] });
      queryClient.invalidateQueries({ queryKey: ['workflow-execution'] });
      toast.success('Workflow reagendado');
    },
    onError: (error) => {
      toast.error('Erro ao reagendar workflow', {
        description: error instanceof Error ? error.message : 'Erro desconhecido',
      });
    },
  });
}

export function useWorkflowStats() {
  const { currentWorkspace } = useWorkspace();

  return useQuery({
    queryKey: ['workflow-stats', currentWorkspace?.id],
    queryFn: async () => {
      if (!currentWorkspace?.id) return null;

      const { data, error } = await supabase
        .from('workflow_executions')
        .select('status')
        .eq('workspace_id', currentWorkspace.id);

      if (error) throw error;

      const stats = {
        total: data.length,
        pending: data.filter(e => e.status === 'pending' || e.status === 'queued').length,
        running: data.filter(e => e.status === 'running').length,
        completed: data.filter(e => e.status === 'completed').length,
        failed: data.filter(e => e.status === 'failed').length,
        partial: data.filter(e => e.status === 'partial').length,
      };

      return stats;
    },
    enabled: !!currentWorkspace?.id,
    refetchInterval: 10000,
  });
}
