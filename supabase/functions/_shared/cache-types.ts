/**
 * Cache Layer Types for Edge Functions
 * 
 * Mirrors the frontend types in src/types/cacheLayer.ts
 * for use in Deno/Edge Functions
 */

// =============================================================================
// AGENT TYPES
// =============================================================================

export type AgentType = 'lead' | 'contact' | 'opportunity' | 'client';

// Generic agent output - each agent may extend this
// The cache layer stores the raw JSON, so it's flexible
export interface AgentOutput {
  executiveSummary: string;
  statusAssessment: string;
  keySignals: string[];
  riskIndicators: string[];
  recommendedAction: string;
  recommendedActionType: string;
  confidenceLevel: 'low' | 'medium' | 'high';
  score?: number;
  temperature?: 'cold' | 'warm' | 'hot';
  probability?: number;
  pipelineHealth?: 'excellent' | 'good' | 'attention' | 'critical';
  healthScore?: number;
  lifetimeValue?: number;
  churnRisk?: 'low' | 'medium' | 'high';
  [key: string]: unknown; // Allow additional fields
}

// =============================================================================
// CACHE KEY TYPES
// =============================================================================

export interface CacheKeyComponents {
  agentType: AgentType;
  entityId: string;
  entityType: string;
  entityStateHash: string;
  memoryVersion: string | null;
  contextHash: string;
  promptVersion: string;
}

export interface CacheKey extends CacheKeyComponents {
  compositeKey: string;
}

// =============================================================================
// CACHE ENTRY TYPES
// =============================================================================

export type CacheConfidenceLevel = 'low' | 'medium' | 'high';

export interface CacheEntry {
  id: string;
  workspace_id: string;
  agent_type: string;
  entity_id: string;
  entity_type: string;
  cache_key: string;
  entity_state_hash: string;
  memory_version: string | null;
  prompt_version: string;
  context_hash: string | null;
  response: AgentOutput;
  executive_summary: string | null;
  confidence_level: CacheConfidenceLevel | null;
  created_at: string;
  expires_at: string;
  last_used_at: string | null;
  hit_count: number;
  original_duration_ms: number | null;
  tokens_saved: number;
  invalidated_at: string | null;
  invalidation_reason: string | null;
}

// =============================================================================
// CACHE CHECK TYPES
// =============================================================================

export type CacheMissReason = 
  | 'not_found'
  | 'expired'
  | 'invalidated'
  | 'stale_state'
  | 'manual_trigger'
  | 'low_confidence';

export interface CacheCheckResult {
  hit: boolean;
  entry?: CacheEntry;
  reason?: CacheMissReason;
  lookupTimeMs: number;
}

// =============================================================================
// CACHE ELIGIBILITY TYPES
// =============================================================================

export interface CacheEligibility {
  eligible: boolean;
  reason?: string;
  suggestedTTLHours: number;
}

export interface CacheEligibilityParams {
  confidenceLevel: CacheConfidenceLevel;
  triggerType: string;
  temperature: number;
  entityType: string;
}

// =============================================================================
// CACHE CONFIG TYPES
// =============================================================================

export interface CacheConfig {
  enabled: boolean;
  ttlByEntityType: Record<string, number>;
  maxEntriesPerEntity: number;
  autoInvalidation: boolean;
  trackMetrics: boolean;
  minConfidenceForCache: CacheConfidenceLevel;
  maxTemperatureForCache: number;
  alwaysFetchLiveEntityData: boolean;
  neverCacheManualTriggers: boolean;
  logAllCacheHits: boolean;
}

// =============================================================================
// CACHE OPERATION TYPES
// =============================================================================

export interface CacheStoreParams {
  workspaceId: string;
  agentType: AgentType;
  entityId: string;
  entityType: string;
  cacheKey: CacheKey;
  // deno-lint-ignore no-explicit-any
  response: any; // Generic to support different agent output shapes
  confidenceLevel: CacheConfidenceLevel;
  durationMs: number;
  tokensUsed: number;
}

export interface CacheLookupParams {
  workspaceId: string;
  agentType: AgentType;
  entityId: string;
  cacheKey: string;
}

// =============================================================================
// CACHE LAYER RESULT TYPES
// =============================================================================

export interface CacheLayerResult {
  fromCache: boolean;
  cacheKey: string;
  response?: AgentOutput;
  lookupTimeMs: number;
  reason?: CacheMissReason;
  tokensSaved?: number;
  originalDurationMs?: number;
}

// =============================================================================
// DEFAULT CONFIG
// =============================================================================

export const DEFAULT_CACHE_CONFIG: CacheConfig = {
  enabled: true,
  ttlByEntityType: {
    lead: 4,
    opportunity: 2,
    contact: 12,
    client: 24,
    company: 24,
  },
  maxEntriesPerEntity: 5,
  autoInvalidation: true,
  trackMetrics: true,
  minConfidenceForCache: 'medium',
  maxTemperatureForCache: 0,
  alwaysFetchLiveEntityData: true,
  neverCacheManualTriggers: true,
  logAllCacheHits: true,
};
