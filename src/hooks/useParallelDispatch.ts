/**
 * React Hook for Parallel Agent Dispatch
 * 
 * Provides UI integration for batch dispatching and monitoring.
 */

import { useState, useCallback } from 'react';
import { useToast } from '@/hooks/use-toast';
import {
  dispatchBatch,
  dispatchParallelAnalysis,
  getBatchMetrics,
  checkConcurrencyLevels,
  cleanupExpiredLocks,
  type BatchDispatchRequest,
  type BatchDispatchResult,
  type BatchMetrics,
  type ParallelTask,
  type ConcurrencyConfig,
  DEFAULT_CONCURRENCY_CONFIG,
} from '@/trigger/parallelDispatch';
import type { EntityType } from '@/types/trigger';

interface UseParallelDispatchOptions {
  workspaceId: string;
  config?: Partial<ConcurrencyConfig>;
  onBatchComplete?: (result: BatchDispatchResult) => void;
  onError?: (error: Error) => void;
}

interface DispatchState {
  isDispatching: boolean;
  lastResult: BatchDispatchResult | null;
  metrics: BatchMetrics | null;
  canDispatch: boolean;
  concurrencyReason: string | null;
}

export function useParallelDispatch(options: UseParallelDispatchOptions) {
  const { workspaceId, config, onBatchComplete, onError } = options;
  const { toast } = useToast();

  const [state, setState] = useState<DispatchState>({
    isDispatching: false,
    lastResult: null,
    metrics: null,
    canDispatch: true,
    concurrencyReason: null,
  });

  /**
   * Dispatch a batch of tasks
   */
  const dispatch = useCallback(
    async (tasks: ParallelTask[]): Promise<BatchDispatchResult | null> => {
      if (tasks.length === 0) {
        toast({
          title: 'Sem tarefas',
          description: 'Nenhuma tarefa para executar.',
          variant: 'destructive',
        });
        return null;
      }

      setState((prev) => ({ ...prev, isDispatching: true }));

      try {
        const request: BatchDispatchRequest = {
          batchId: crypto.randomUUID(),
          workspaceId,
          tasks,
          config,
        };

        const result = await dispatchBatch(request);

        setState((prev) => ({
          ...prev,
          isDispatching: false,
          lastResult: result,
        }));

        // Show toast based on result
        if (result.tasksFailed === 0) {
          toast({
            title: 'Batch executado',
            description: `${result.tasksDispatched} tarefas iniciadas, ${result.tasksQueued} em fila.`,
          });
        } else {
          toast({
            title: 'Batch parcial',
            description: `${result.tasksDispatched} OK, ${result.tasksFailed} falharam, ${result.tasksQueued} em fila.`,
            variant: 'destructive',
          });
        }

        onBatchComplete?.(result);
        return result;
      } catch (error) {
        setState((prev) => ({ ...prev, isDispatching: false }));

        const err = error instanceof Error ? error : new Error('Unknown error');
        toast({
          title: 'Erro no dispatch',
          description: err.message,
          variant: 'destructive',
        });

        onError?.(err);
        return null;
      }
    },
    [workspaceId, config, toast, onBatchComplete, onError]
  );

  /**
   * Dispatch parallel analysis for multiple entities
   */
  const dispatchAnalysis = useCallback(
    async (
      entities: Array<{ entityType: EntityType; entityId: string; agentType: string }>,
      triggerType: string = 'batch'
    ): Promise<BatchDispatchResult | null> => {
      if (entities.length === 0) {
        toast({
          title: 'Sem entidades',
          description: 'Nenhuma entidade para analisar.',
          variant: 'destructive',
        });
        return null;
      }

      setState((prev) => ({ ...prev, isDispatching: true }));

      try {
        const result = await dispatchParallelAnalysis(workspaceId, entities, triggerType);

        setState((prev) => ({
          ...prev,
          isDispatching: false,
          lastResult: result,
        }));

        toast({
          title: 'Análise iniciada',
          description: `${result.tasksDispatched} análises em paralelo iniciadas.`,
        });

        onBatchComplete?.(result);
        return result;
      } catch (error) {
        setState((prev) => ({ ...prev, isDispatching: false }));

        const err = error instanceof Error ? error : new Error('Unknown error');
        toast({
          title: 'Erro na análise',
          description: err.message,
          variant: 'destructive',
        });

        onError?.(err);
        return null;
      }
    },
    [workspaceId, toast, onBatchComplete, onError]
  );

  /**
   * Check if dispatch is currently allowed
   */
  const checkDispatchAvailability = useCallback(async () => {
    try {
      const check = await checkConcurrencyLevels(
        workspaceId,
        { ...DEFAULT_CONCURRENCY_CONFIG, ...config }
      );

      setState((prev) => ({
        ...prev,
        canDispatch: check.canDispatch,
        concurrencyReason: check.reason || null,
      }));

      return check;
    } catch (error) {
      console.error('Failed to check dispatch availability:', error);
      return { canDispatch: false, reason: 'Failed to check availability' };
    }
  }, [workspaceId, config]);

  /**
   * Refresh batch metrics
   */
  const refreshMetrics = useCallback(async () => {
    try {
      const metrics = await getBatchMetrics(workspaceId);
      setState((prev) => ({ ...prev, metrics }));
      return metrics;
    } catch (error) {
      console.error('Failed to fetch batch metrics:', error);
      return null;
    }
  }, [workspaceId]);

  /**
   * Cleanup expired locks
   */
  const cleanup = useCallback(async () => {
    try {
      const cleaned = await cleanupExpiredLocks(workspaceId);
      if (cleaned > 0) {
        toast({
          title: 'Locks limpos',
          description: `${cleaned} locks expirados removidos.`,
        });
      }
      return cleaned;
    } catch (error) {
      console.error('Failed to cleanup locks:', error);
      return 0;
    }
  }, [workspaceId, toast]);

  return {
    // State
    isDispatching: state.isDispatching,
    lastResult: state.lastResult,
    metrics: state.metrics,
    canDispatch: state.canDispatch,
    concurrencyReason: state.concurrencyReason,

    // Actions
    dispatch,
    dispatchAnalysis,
    checkDispatchAvailability,
    refreshMetrics,
    cleanup,
  };
}
