import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useWorkspace } from "@/contexts/WorkspaceContext";
import { toast } from "sonner";
import type { 
  AgentType, 
  AgentTrigger, 
  AgentResponse, 
  AgentOutput,
  ReasoningStep 
} from "@/types/aiAgents";
import {
  checkAgentRateLimit, 
  recordAgentExecution,
  validateAgentAction 
} from "@/lib/agentSafetyRules";

interface UseAgentAnalysisOptions {
  onSuccess?: (response: AgentResponse) => void;
  onError?: (error: Error) => void;
  skipRateLimit?: boolean;
}

/**
 * Hook to trigger and manage AI agent analysis
 * 
 * Usage:
 * const { analyze, isAnalyzing, lastAnalysis } = useAgentAnalysis('lead', leadId, 'lead');
 * 
 * // Trigger analysis
 * await analyze('manual');
 */
export function useAgentAnalysis(
  agentType: AgentType,
  entityId: string | undefined,
  entityType: string,
  options: UseAgentAnalysisOptions = {}
) {
  const { currentWorkspace } = useWorkspace();
  const queryClient = useQueryClient();
  const workspaceId = currentWorkspace?.id;

  // Fetch last analysis for this entity
  const { data: lastAnalysis, isLoading: isLoadingLast } = useQuery({
    queryKey: ['agent-analysis', agentType, entityId],
    queryFn: async () => {
      if (!entityId || !workspaceId) return null;
      
      const { data, error } = await supabase
        .from('ai_agent_executions')
        .select('*')
        .eq('workspace_id', workspaceId)
        .eq('agent_type', agentType)
        .eq('entity_id', entityId)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();
      
      if (error) throw error;
      
      if (!data) return null;
      
      // Transform to AgentResponse format
      return {
        success: !data.error_message,
        executionId: data.id,
        output: data.output as unknown as AgentOutput,
        reasoningTrace: data.reasoning_trace as unknown as ReasoningStep[],
        dataSourcesUsed: [],
        durationMs: data.duration_ms || 0,
        tokensUsed: data.tokens_used || 0,
        error: data.error_message || undefined,
      } as AgentResponse;
    },
    enabled: !!entityId && !!workspaceId,
  });

  // Mutation to trigger new analysis
  const analyzeMutation = useMutation({
    mutationFn: async (triggerType: AgentTrigger) => {
      if (!entityId || !workspaceId) {
        throw new Error('Entity ID e Workspace ID são obrigatórios');
      }

      // Check rate limits (unless skipped)
      if (!options.skipRateLimit) {
        const rateLimitCheck = checkAgentRateLimit(entityId, workspaceId);
        if (!rateLimitCheck.allowed) {
          throw new Error(rateLimitCheck.reason);
        }
      }

      // Call the orchestrator edge function
      const { data, error } = await supabase.functions.invoke('ai-agent-orchestrator', {
        body: {
          agentType,
          entityId,
          entityType,
          triggerType,
          workspaceId,
        },
      });

      if (error) throw error;
      
      // Record execution for rate limiting
      recordAgentExecution(entityId, workspaceId);
      
      return data as AgentResponse;
    },
    onSuccess: (response) => {
      // Invalidate queries to refresh data
      queryClient.invalidateQueries({ 
        queryKey: ['agent-analysis', agentType, entityId] 
      });
      queryClient.invalidateQueries({ 
        queryKey: ['agent-history', entityId] 
      });
      
      if (response.success) {
        toast.success('Análise concluída', {
          description: response.output.executiveSummary.substring(0, 100) + '...',
        });
      } else if (response.partialAnalysis) {
        toast.warning('Análise parcial', {
          description: 'Não foi possível completar a análise. Verifique os dados em falta.',
        });
      }
      
      options.onSuccess?.(response);
    },
    onError: (error: Error) => {
      toast.error('Erro na análise', {
        description: error.message,
      });
      options.onError?.(error);
    },
  });

  return {
    // Trigger analysis
    analyze: analyzeMutation.mutateAsync,
    
    // Loading states
    isAnalyzing: analyzeMutation.isPending,
    isLoadingLast,
    
    // Last analysis result
    lastAnalysis,
    
    // Error state
    error: analyzeMutation.error,
    
    // Helpers
    canAnalyze: !!entityId && !!workspaceId && !analyzeMutation.isPending,
    
    // Action validation
    validateAction: validateAgentAction,
  };
}

/**
 * Hook to check if analysis is available for an entity
 */
export function useCanAnalyze(
  entityId: string | undefined,
  workspaceId: string | undefined
) {
  if (!entityId || !workspaceId) {
    return { canAnalyze: false, reason: 'Missing entity or workspace' };
  }
  
  const rateLimitCheck = checkAgentRateLimit(entityId, workspaceId);
  
  return {
    canAnalyze: rateLimitCheck.allowed,
    reason: rateLimitCheck.reason,
    waitMs: rateLimitCheck.waitMs,
  };
}
