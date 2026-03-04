import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useWorkspace } from "@/contexts/WorkspaceContext";
import { toast } from "sonner";
import { emitKernelEvent } from "@/lib/kernelEmitter";
import { generateRequestId } from "@/lib/requestId";
import type {
  AgentJob,
  LifecycleResponse,
  AgentTrigger,
  RateLimitResult,
  getDefaultPriority,
} from "@/types/agentLifecycle";

interface UseAgentLifecycleOptions {
  entityId: string | undefined;
  entityType: string;
  agentType?: string;
}

/**
 * Hook to manage AI agent job lifecycle for an entity
 * 
 * Usage:
 * const { dispatch, cancel, pendingJobs, isLocked, canDispatch } = useAgentLifecycle({
 *   entityId: lead.id,
 *   entityType: 'lead',
 * });
 */
export function useAgentLifecycle(options: UseAgentLifecycleOptions) {
  const { entityId, entityType, agentType } = options;
  const { currentWorkspace } = useWorkspace();
  const queryClient = useQueryClient();
  const workspaceId = currentWorkspace?.id;

  // Fetch pending/running jobs for this entity
  const { data: jobs, isLoading: isLoadingJobs } = useQuery({
    queryKey: ['agent-jobs', workspaceId, entityId],
    queryFn: async () => {
      if (!entityId || !workspaceId) return [];

      const { data, error } = await supabase
        .from('ai_agent_jobs')
        .select('*')
        .eq('workspace_id', workspaceId)
        .eq('entity_id', entityId)
        .in('status', ['pending', 'running'])
        .order('priority', { ascending: false })
        .order('created_at', { ascending: false });

      if (error) throw error;
      return (data || []) as unknown as AgentJob[];
    },
    enabled: !!entityId && !!workspaceId,
    refetchInterval: 5000, // Poll every 5 seconds
  });

  // Fetch locks for this entity
  const { data: locks } = useQuery({
    queryKey: ['agent-locks', workspaceId, entityId],
    queryFn: async () => {
      if (!entityId || !workspaceId) return [];

      const { data, error } = await supabase
        .from('ai_agent_locks')
        .select('*')
        .eq('workspace_id', workspaceId)
        .eq('entity_id', entityId)
        .gt('expires_at', new Date().toISOString());

      if (error) throw error;
      return data || [];
    },
    enabled: !!entityId && !!workspaceId,
    refetchInterval: 10000,
  });

  // Dispatch mutation
  const dispatchMutation = useMutation({
    mutationFn: async ({
      triggerType,
      priority,
      context,
    }: {
      triggerType: AgentTrigger;
      priority?: number;
      context?: Record<string, unknown>;
    }) => {
      if (!entityId || !workspaceId) {
        throw new Error('Entity ID e Workspace ID são obrigatórios');
      }

      const agent = agentType || entityType;

      const { data, error } = await supabase.functions.invoke('ai-agent-lifecycle/dispatch', {
        body: {
          workspaceId,
          agentType: agent,
          entityId,
          entityType,
          triggerType,
          priority,
          context,
        },
      });

      if (error) throw error;
      return data as LifecycleResponse;
    },
    onSuccess: (response, variables) => {
      queryClient.invalidateQueries({ queryKey: ['agent-jobs', workspaceId, entityId] });

      if (response.alreadyExists) {
        toast.info('Análise já agendada', {
          description: 'Já existe uma análise pendente para esta entidade.',
        });
      } else {
        toast.success('Análise agendada', {
          description: `Posição na fila: ${response.queuePosition}`,
        });

        // Kernel event: job dispatched
        if (workspaceId && entityId) {
          emitKernelEvent({
            workspace_id: workspaceId,
            type: 'AGENT.JOB_DISPATCHED',
            entity_kind: 'ai_agent_job',
            entity_id: response.jobId,
            payload: {
              agent_type: agentType || entityType,
              entity_id: entityId,
              entity_type: entityType,
              trigger_type: variables.triggerType,
              queue_position: response.queuePosition,
            },
            source_module: 'ai-agents',
            correlation_id: generateRequestId(),
          });
        }
      }
    },
    onError: (error: Error) => {
      if (error.message.includes('Rate limit')) {
        toast.warning('Limite de execuções atingido', {
          description: 'Aguarde alguns minutos antes de solicitar nova análise.',
        });
      } else {
        toast.error('Erro ao agendar análise', {
          description: error.message,
        });
      }
    },
  });

  // Cancel mutation
  const cancelMutation = useMutation({
    mutationFn: async (jobId: string) => {
      const { data, error } = await supabase.functions.invoke('ai-agent-lifecycle/cancel', {
        body: { jobId },
      });

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['agent-jobs', workspaceId, entityId] });
      toast.success('Análise cancelada');
    },
    onError: (error: Error) => {
      toast.error('Erro ao cancelar análise', {
        description: error.message,
      });
    },
  });

  // Computed values
  const pendingJobs = (jobs || []).filter((j) => j.status === 'pending');
  const runningJobs = (jobs || []).filter((j) => j.status === 'running');
  const isLocked = (locks || []).length > 0;
  const hasActiveJob = pendingJobs.length > 0 || runningJobs.length > 0;
  const canDispatch = !!entityId && !!workspaceId && !hasActiveJob && !dispatchMutation.isPending;

  return {
    // Job management
    dispatch: (triggerType: AgentTrigger, priority?: number, context?: Record<string, unknown>) =>
      dispatchMutation.mutateAsync({ triggerType, priority, context }),
    cancel: (jobId: string) => cancelMutation.mutateAsync(jobId),

    // Status
    pendingJobs,
    runningJobs,
    allJobs: jobs || [],
    isLoadingJobs,

    // Availability
    isLocked,
    hasActiveJob,
    canDispatch,
    isDispatching: dispatchMutation.isPending,
    isCancelling: cancelMutation.isPending,

    // Errors
    dispatchError: dispatchMutation.error,
    cancelError: cancelMutation.error,
  };
}

/**
 * Hook to check rate limits for an entity
 */
export function useAgentRateLimits(entityId: string | undefined, agentType: string) {
  const { currentWorkspace } = useWorkspace();
  const workspaceId = currentWorkspace?.id;

  return useQuery({
    queryKey: ['agent-rate-limits', workspaceId, entityId, agentType],
    queryFn: async (): Promise<RateLimitResult> => {
      if (!entityId || !workspaceId) {
        return { allowed: false, reason: 'Missing entity or workspace' };
      }

      const { data, error } = await supabase.functions.invoke('ai-agent-lifecycle/rate-limit', {
        body: { workspaceId, entityId, agentType },
      });

      if (error) {
        return { allowed: false, reason: error.message };
      }

      return data as RateLimitResult;
    },
    enabled: !!entityId && !!workspaceId,
    staleTime: 30000, // Cache for 30 seconds
  });
}

/**
 * Hook to get job queue for workspace
 */
export function useAgentQueue(workspaceId: string | undefined) {
  return useQuery({
    queryKey: ['agent-queue', workspaceId],
    queryFn: async () => {
      if (!workspaceId) return { jobs: [], total: 0 };

      const { data, error } = await supabase.functions.invoke('ai-agent-lifecycle/queue', {
        body: {},
        headers: {},
      });

      // Use query params approach
      const { data: jobs, error: queryError } = await supabase
        .from('ai_agent_jobs')
        .select('*')
        .eq('workspace_id', workspaceId)
        .in('status', ['pending', 'running'])
        .order('priority', { ascending: false })
        .order('scheduled_for', { ascending: true })
        .limit(50);

      if (queryError) throw queryError;

      return {
        jobs: (jobs || []) as unknown as AgentJob[],
        total: jobs?.length || 0,
      };
    },
    enabled: !!workspaceId,
    refetchInterval: 10000,
  });
}
