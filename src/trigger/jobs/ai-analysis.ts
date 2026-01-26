/**
 * AI Analysis Job Definition
 * 
 * Handles durable execution of AI agent analysis for leads, opportunities, and clients.
 * Integrates with the existing ai-agent-orchestrator edge function.
 */

import type {
  AIAnalysisJobPayload,
  AIAnalysisJobResult,
  TriggerJobProgressEvent,
} from '@/types/trigger';

// Job configuration
export const AI_ANALYSIS_JOB_CONFIG = {
  id: 'ai-analysis',
  name: 'AI Entity Analysis',
  version: '1.0.0',
  maxDuration: 120, // 2 minutes max
  retry: {
    maxAttempts: 3,
    factor: 2,
    minTimeout: 2000,
    maxTimeout: 30000,
  },
  concurrency: {
    perEntity: 1,
    perWorkspace: 3,
  },
};

// Agent type mapping
export const AGENT_TYPES = {
  lead: 'lead-agent',
  opportunity: 'opportunity-agent',
  client: 'client-agent',
} as const;

// Job step definitions
export interface AIAnalysisStep {
  name: string;
  action: 'validate' | 'fetch_context' | 'check_cache' | 'execute_agent' | 'store_result' | 'emit_event';
  required: boolean;
}

export const AI_ANALYSIS_STEPS: AIAnalysisStep[] = [
  { name: 'validate_input', action: 'validate', required: true },
  { name: 'acquire_lock', action: 'validate', required: true },
  { name: 'fetch_entity', action: 'fetch_context', required: true },
  { name: 'check_cooldown', action: 'check_cache', required: true },
  { name: 'fetch_memory', action: 'fetch_context', required: false },
  { name: 'check_cache', action: 'check_cache', required: false },
  { name: 'execute_agent', action: 'execute_agent', required: true },
  { name: 'store_execution', action: 'store_result', required: true },
  { name: 'update_memory', action: 'store_result', required: false },
  { name: 'release_lock', action: 'store_result', required: true },
  { name: 'emit_analytics', action: 'emit_event', required: false },
];

/**
 * Validate AI analysis job payload
 */
export function validateAIAnalysisPayload(payload: unknown): payload is AIAnalysisJobPayload {
  if (!payload || typeof payload !== 'object') return false;
  
  const p = payload as Record<string, unknown>;
  
  if (p.jobType !== 'ai-analysis') return false;
  if (!p.workspaceId || typeof p.workspaceId !== 'string') return false;
  if (!p.entityType || !['lead', 'opportunity', 'client'].includes(p.entityType as string)) return false;
  if (!p.entityId || typeof p.entityId !== 'string') return false;
  if (!p.inputData || typeof p.inputData !== 'object') return false;
  
  const inputData = p.inputData as Record<string, unknown>;
  if (!inputData.agentType || typeof inputData.agentType !== 'string') return false;
  if (!inputData.triggerType) return false;
  
  return true;
}

/**
 * Create default AI analysis result structure
 */
export function createDefaultAIAnalysisResult(): AIAnalysisJobResult {
  return {
    success: false,
    output: {
      executionId: '',
      executiveSummary: '',
      statusAssessment: '',
      keySignals: [],
      riskIndicators: [],
      recommendedAction: '',
      confidenceLevel: 'low',
    },
    durationMs: 0,
  };
}

/**
 * Create progress event for AI analysis
 */
export function createProgressEvent(
  jobId: string,
  runId: string,
  event: TriggerJobProgressEvent['event'],
  stepIndex?: number,
  stepName?: string,
  message?: string
): TriggerJobProgressEvent {
  return {
    jobId,
    runId,
    event,
    timestamp: new Date().toISOString(),
    data: {
      stepIndex,
      stepName,
      progress: stepIndex !== undefined ? Math.round((stepIndex / AI_ANALYSIS_STEPS.length) * 100) : undefined,
      message,
    },
  };
}

/**
 * Map entity type to agent type
 */
export function getAgentTypeForEntity(entityType: 'lead' | 'opportunity' | 'client'): string {
  return AGENT_TYPES[entityType];
}

/**
 * Calculate cooldown remaining for an entity
 */
export function calculateCooldownRemaining(
  lastExecutionAt: string | null,
  cooldownMs: number
): number {
  if (!lastExecutionAt) return 0;
  
  const lastExecution = new Date(lastExecutionAt).getTime();
  const now = Date.now();
  const elapsed = now - lastExecution;
  
  return Math.max(0, cooldownMs - elapsed);
}

/**
 * Check if entity should skip cache
 */
export function shouldSkipCache(
  inputData: AIAnalysisJobPayload['inputData'],
  triggerType: string
): boolean {
  // Always skip cache for manual triggers or explicit flag
  if (inputData.skipCache) return true;
  if (triggerType === 'manual') return true;
  if (triggerType === 'recommendation_accepted') return true;
  
  return false;
}
