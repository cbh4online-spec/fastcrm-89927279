import { useCallback, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useWorkspace } from '@/contexts/WorkspaceContext';
import { useAuth } from '@/contexts/AuthContext';

// Event types matching database enum
export type AnalyticsEventType =
  | 'recommendation_generated'
  | 'recommendation_viewed'
  | 'recommendation_accepted'
  | 'recommendation_dismissed'
  | 'recommendation_rated'
  | 'action_executed'
  | 'entity_outcome_updated'
  | 'agent_run_failed'
  | 'rag_retrieval_quality';

export type AnalyticsPriority = 'low' | 'medium' | 'high';
export type AnalyticsConfidence = 'low' | 'medium' | 'high';

export type EntityType = 'lead' | 'opportunity' | 'contact' | 'company';
export type AgentType = 'lead' | 'opportunity' | 'client' | 'orchestrator';
export type RecommendationType = 'call' | 'email' | 'whatsapp' | 'proposal' | 'task' | 'nurture' | 'archive' | 'meeting' | 'follow_up';
export type Surface = 'dashboard' | 'entity_page' | 'notification' | 'inbox';
export type ExecutionChannel = 'crm' | 'whatsapp' | 'email' | 'calendar';
export type OutcomeType = 'reply_received' | 'stage_progressed' | 'won' | 'lost' | 'stalled';
export type DismissReason = 'not_relevant' | 'already_done' | 'wrong_contact_method' | 'other';

interface BaseEventParams {
  entityType?: EntityType;
  entityId?: string;
  agentType?: AgentType;
  recommendationId?: string;
  properties?: Record<string, unknown>;
}

interface RecommendationGeneratedParams extends BaseEventParams {
  recommendationType: RecommendationType;
  priority?: AnalyticsPriority;
  confidence?: AnalyticsConfidence;
  modelVersion?: string;
  promptVersion?: string;
  usedRag?: boolean;
  usedCache?: boolean;
  latencyMs?: number;
}

interface RecommendationViewedParams extends BaseEventParams {
  surface: Surface;
}

interface RecommendationAcceptedParams extends BaseEventParams {
  acceptMethod?: 'manual' | 'automation';
  timeToAcceptSeconds?: number;
}

interface RecommendationDismissedParams extends BaseEventParams {
  dismissReason?: DismissReason;
  timeToDismissSeconds?: number;
}

interface RecommendationRatedParams extends BaseEventParams {
  rating: 1 | 2 | 3 | 4 | 5;
}

interface ActionExecutedParams extends BaseEventParams {
  actionType: string;
  executionChannel?: ExecutionChannel;
  automationId?: string;
}

interface EntityOutcomeParams extends BaseEventParams {
  outcomeType: OutcomeType;
  newStage?: string;
  timeSinceActionHours?: number;
}

interface AgentRunFailedParams extends BaseEventParams {
  errorType: string;
  errorReason?: string;
  timeout?: boolean;
  latencyMs?: number;
}

interface RagQualityParams extends BaseEventParams {
  retrievalCandidates: number;
  chunksUsed: number;
  avgRelevanceScore?: number;
  rerankUsed?: boolean;
}

// Generate unique recommendation ID for attribution tracking
export function generateRecommendationId(): string {
  return crypto.randomUUID();
}

export function useAgentAnalytics() {
  const { currentWorkspace } = useWorkspace();
  const { user } = useAuth();
  const viewStartTimeRef = useRef<Record<string, number>>({});

  // Core tracking function
  const trackEvent = useCallback(async (
    eventType: AnalyticsEventType,
    params: Record<string, unknown>
  ) => {
    if (!currentWorkspace?.id || !user?.id) {
      console.warn('[AgentAnalytics] Missing workspace or user context');
      return;
    }

    try {
      const { error } = await supabase
        .from('ai_analytics_events')
        .insert({
          workspace_id: currentWorkspace.id,
          user_id: user.id,
          event_type: eventType,
          ...params,
        });

      if (error) {
        console.error('[AgentAnalytics] Failed to track event:', error);
      }
    } catch (err) {
      console.error('[AgentAnalytics] Error tracking event:', err);
    }
  }, [currentWorkspace?.id, user?.id]);

  // Track recommendation generated (called by agent execution)
  const trackRecommendationGenerated = useCallback((params: RecommendationGeneratedParams) => {
    return trackEvent('recommendation_generated', {
      entity_type: params.entityType,
      entity_id: params.entityId,
      agent_type: params.agentType,
      recommendation_id: params.recommendationId,
      recommendation_type: params.recommendationType,
      priority: params.priority,
      confidence: params.confidence,
      model_version: params.modelVersion,
      prompt_version: params.promptVersion,
      used_rag: params.usedRag,
      used_cache: params.usedCache,
      latency_ms: params.latencyMs,
      properties: params.properties,
    });
  }, [trackEvent]);

  // Track recommendation viewed
  const trackRecommendationViewed = useCallback((params: RecommendationViewedParams) => {
    // Record view start time for time-to-action calculation
    const key = params.recommendationId || `${params.entityType}-${params.entityId}`;
    viewStartTimeRef.current[key] = Date.now();

    return trackEvent('recommendation_viewed', {
      entity_type: params.entityType,
      entity_id: params.entityId,
      agent_type: params.agentType,
      recommendation_id: params.recommendationId,
      surface: params.surface,
      properties: params.properties,
    });
  }, [trackEvent]);

  // Track recommendation accepted
  const trackRecommendationAccepted = useCallback((params: RecommendationAcceptedParams) => {
    // Calculate time to accept
    const key = params.recommendationId || `${params.entityType}-${params.entityId}`;
    const startTime = viewStartTimeRef.current[key];
    const timeToAccept = startTime ? Math.round((Date.now() - startTime) / 1000) : undefined;

    return trackEvent('recommendation_accepted', {
      entity_type: params.entityType,
      entity_id: params.entityId,
      agent_type: params.agentType,
      recommendation_id: params.recommendationId,
      properties: {
        accept_method: params.acceptMethod || 'manual',
        ...params.properties,
      },
      time_to_action_seconds: params.timeToAcceptSeconds || timeToAccept,
    });
  }, [trackEvent]);

  // Track recommendation dismissed
  const trackRecommendationDismissed = useCallback((params: RecommendationDismissedParams) => {
    const key = params.recommendationId || `${params.entityType}-${params.entityId}`;
    const startTime = viewStartTimeRef.current[key];
    const timeToDismiss = startTime ? Math.round((Date.now() - startTime) / 1000) : undefined;

    return trackEvent('recommendation_dismissed', {
      entity_type: params.entityType,
      entity_id: params.entityId,
      agent_type: params.agentType,
      recommendation_id: params.recommendationId,
      dismiss_reason: params.dismissReason,
      time_to_action_seconds: params.timeToDismissSeconds || timeToDismiss,
      properties: params.properties,
    });
  }, [trackEvent]);

  // Track recommendation rated
  const trackRecommendationRated = useCallback((params: RecommendationRatedParams) => {
    return trackEvent('recommendation_rated', {
      entity_type: params.entityType,
      entity_id: params.entityId,
      agent_type: params.agentType,
      recommendation_id: params.recommendationId,
      rating: params.rating,
      properties: params.properties,
    });
  }, [trackEvent]);

  // Track action executed
  const trackActionExecuted = useCallback((params: ActionExecutedParams) => {
    return trackEvent('action_executed', {
      entity_type: params.entityType,
      entity_id: params.entityId,
      agent_type: params.agentType,
      recommendation_id: params.recommendationId,
      action_type: params.actionType,
      execution_channel: params.executionChannel,
      automation_id: params.automationId,
      properties: params.properties,
    });
  }, [trackEvent]);

  // Track entity outcome updated
  const trackEntityOutcome = useCallback((params: EntityOutcomeParams) => {
    return trackEvent('entity_outcome_updated', {
      entity_type: params.entityType,
      entity_id: params.entityId,
      agent_type: params.agentType,
      recommendation_id: params.recommendationId,
      outcome_type: params.outcomeType,
      new_stage: params.newStage,
      time_since_action_hours: params.timeSinceActionHours,
      properties: params.properties,
    });
  }, [trackEvent]);

  // Track agent run failure
  const trackAgentRunFailed = useCallback((params: AgentRunFailedParams) => {
    return trackEvent('agent_run_failed', {
      entity_type: params.entityType,
      entity_id: params.entityId,
      agent_type: params.agentType,
      error_type: params.errorType,
      error_reason: params.errorReason,
      timeout: params.timeout,
      latency_ms: params.latencyMs,
      properties: params.properties,
    });
  }, [trackEvent]);

  // Track RAG retrieval quality
  const trackRagQuality = useCallback((params: RagQualityParams) => {
    return trackEvent('rag_retrieval_quality', {
      entity_type: params.entityType,
      entity_id: params.entityId,
      agent_type: params.agentType,
      retrieval_candidates: params.retrievalCandidates,
      chunks_used: params.chunksUsed,
      avg_relevance_score: params.avgRelevanceScore,
      rerank_used: params.rerankUsed,
      properties: params.properties,
    });
  }, [trackEvent]);

  return {
    // Core
    trackEvent,
    generateRecommendationId,
    
    // Recommendation lifecycle
    trackRecommendationGenerated,
    trackRecommendationViewed,
    trackRecommendationAccepted,
    trackRecommendationDismissed,
    trackRecommendationRated,
    
    // Execution & outcomes
    trackActionExecuted,
    trackEntityOutcome,
    
    // System events
    trackAgentRunFailed,
    trackRagQuality,
  };
}

// Hook for tracking funnel metrics
export function useAgentFunnelMetrics(agentType?: AgentType, startDate?: Date, endDate?: Date) {
  const { currentWorkspace } = useWorkspace();

  const fetchMetrics = useCallback(async () => {
    if (!currentWorkspace?.id) return null;

    const { data, error } = await supabase.rpc('get_agent_funnel_metrics', {
      p_workspace_id: currentWorkspace.id,
      p_agent_type: agentType || null,
      p_start_date: startDate?.toISOString() || new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(),
      p_end_date: endDate?.toISOString() || new Date().toISOString(),
    });

    if (error) {
      console.error('[AgentAnalytics] Failed to fetch funnel metrics:', error);
      return null;
    }

    return data;
  }, [currentWorkspace?.id, agentType, startDate, endDate]);

  return { fetchMetrics };
}
