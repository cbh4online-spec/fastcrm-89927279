import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useWorkspace } from "@/contexts/WorkspaceContext";
import type { 
  AgentExecution, 
  AgentType, 
  AgentOutput, 
  ReasoningStep,
  ConfidenceLevel 
} from "@/types/aiAgents";

interface UseAgentHistoryOptions {
  agentType?: AgentType;
  limit?: number;
  includeReasoningTrace?: boolean;
}

/**
 * Hook to fetch past agent executions for an entity
 * 
 * Usage:
 * const { history, isLoading } = useAgentHistory(entityId, { limit: 10 });
 */
export function useAgentHistory(
  entityId: string | undefined,
  options: UseAgentHistoryOptions = {}
) {
  const { currentWorkspace } = useWorkspace();
  const workspaceId = currentWorkspace?.id;
  const { agentType, limit = 20 } = options;

  const { data: history, isLoading, error, refetch } = useQuery({
    queryKey: ['agent-history', entityId, agentType, limit],
    queryFn: async () => {
      if (!entityId || !workspaceId) return [];

      // Use raw SQL-like query since types aren't generated yet
      const { data, error } = await supabase
        .from('ai_agent_executions')
        .select('*')
        .eq('workspace_id', workspaceId)
        .eq('entity_id', entityId)
        .order('created_at', { ascending: false })
        .limit(limit);

      if (agentType) {
        // Filter client-side since we already fetched
      }
      
      if (error) throw error;
      
      // Transform to AgentExecution format - cast to any since types not generated
      const rows = (data || []) as any[];
      const filtered = agentType 
        ? rows.filter(r => r.agent_type === agentType)
        : rows;
        
      return filtered.map((row: any) => ({
        id: row.id,
        workspaceId: workspaceId,
        agentType: row.agent_type as AgentType,
        entityId: entityId,
        entityType: row.entity_type || '',
        triggerType: row.trigger_type,
        inputSummary: row.input_summary || {},
        output: {
          executiveSummary: row.executive_summary,
          statusAssessment: row.status_assessment || '',
          keySignals: row.key_signals || [],
          riskIndicators: row.risk_indicators || [],
          recommendedAction: row.recommended_action || '',
          recommendedActionType: row.recommended_action_type || '',
          confidenceLevel: row.confidence_level as ConfidenceLevel,
        } as AgentOutput,
        reasoningTrace: row.reasoning_trace as ReasoningStep[] || [],
        executiveSummary: row.executive_summary,
        statusAssessment: row.status_assessment,
        keySignals: row.key_signals || [],
        riskIndicators: row.risk_indicators || [],
        recommendedAction: row.recommended_action,
        recommendedActionType: row.recommended_action_type,
        confidenceLevel: row.confidence_level as ConfidenceLevel | null,
        durationMs: row.duration_ms,
        tokensUsed: row.tokens_used,
        errorMessage: row.error_message,
        createdAt: row.created_at,
      })) as AgentExecution[];
    },
    enabled: !!entityId && !!workspaceId,
  });

  return {
    history: history || [],
    isLoading,
    error,
    refetch,
    
    // Helpers
    hasHistory: (history?.length || 0) > 0,
    latestExecution: history?.[0] || null,
    successfulExecutions: history?.filter(e => !e.errorMessage) || [],
    failedExecutions: history?.filter(e => !!e.errorMessage) || [],
  };
}

/**
 * Hook to get workspace-level agent execution stats
 */
export function useAgentStats() {
  const { currentWorkspace } = useWorkspace();
  const workspaceId = currentWorkspace?.id;

  return useQuery({
    queryKey: ['agent-stats', workspaceId],
    queryFn: async () => {
      if (!workspaceId) return null;

      // Get last 24 hours of executions - cast to any since types not generated
      const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
      
      const { data, error } = await supabase
        .from('ai_agent_executions')
        .select('*')
        .eq('workspace_id', workspaceId)
        .gte('created_at', oneDayAgo);
      
      if (error) throw error;
      
      const executions = (data || []) as any[];
      
      // Calculate stats
      const byAgentType: Record<AgentType, number> = {
        lead: 0,
        contact: 0,
        opportunity: 0,
        client: 0,
      };
      
      const byConfidence: Record<string, number> = {
        high: 0,
        medium: 0,
        low: 0,
      };
      
      let totalDuration = 0;
      let successCount = 0;
      let errorCount = 0;
      
      executions.forEach(e => {
        byAgentType[e.agent_type as AgentType]++;
        
        if (e.confidence_level) {
          byConfidence[e.confidence_level]++;
        }
        
        if (e.duration_ms) {
          totalDuration += e.duration_ms;
        }
        
        if (e.error_message) {
          errorCount++;
        } else {
          successCount++;
        }
      });
      
      return {
        totalExecutions: executions.length,
        byAgentType,
        byConfidence,
        averageDurationMs: executions.length > 0 
          ? Math.round(totalDuration / executions.length) 
          : 0,
        successRate: executions.length > 0 
          ? Math.round((successCount / executions.length) * 100) 
          : 0,
        successCount,
        errorCount,
      };
    },
    enabled: !!workspaceId,
  });
}
