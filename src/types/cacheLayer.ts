/**
 * Cache Layer Types
 * 
 * Types for the multi-level caching system:
 * - Level 1: Prompt Prefix Caching (in-memory)
 * - Level 2: Response Caching (database)
 * - Level 3: Cache-Augmented Generation (CAG)
 */

import type { AgentType, AgentOutput } from './aiAgents';

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
  compositeKey: string; // Final hash of all components
}

// =============================================================================
// CACHE ENTRY TYPES
// =============================================================================

export type CacheConfidenceLevel = 'low' | 'medium' | 'high';

export interface CacheEntry {
  id: string;
  workspaceId: string;
  agentType: string;
  entityId: string;
  entityType: string;
  cacheKey: string;
  entityStateHash: string;
  memoryVersion: string | null;
  promptVersion: string;
  contextHash: string | null;
  
  // Cached response
  response: AgentOutput;
  executiveSummary: string | null;
  confidenceLevel: CacheConfidenceLevel | null;
  
  // Timing
  createdAt: string;
  expiresAt: string;
  lastUsedAt: string | null;
  
  // Metrics
  hitCount: number;
  originalDurationMs: number | null;
  tokensSaved: number;
  
  // Invalidation
  invalidatedAt: string | null;
  invalidationReason: string | null;
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
// CACHE METRICS TYPES
// =============================================================================

export interface CacheMetrics {
  workspaceId: string;
  agentType: string;
  periodStart: string;
  periodEnd: string;
  cacheHits: number;
  cacheMisses: number;
  invalidations: number;
  tokensSaved: number;
  avgHitLatencyMs: number | null;
  avgMissLatencyMs: number | null;
}

export interface CacheMetricsSummary {
  totalHits: number;
  totalMisses: number;
  hitRatio: number;
  totalTokensSaved: number;
  estimatedCostSaved: number;
  avgHitLatencyMs: number;
  avgMissLatencyMs: number;
  latencyImprovement: number;
}

// =============================================================================
// CACHE CONFIG TYPES
// =============================================================================

export interface CacheTTLConfig {
  lead: number;
  opportunity: number;
  contact: number;
  client: number;
  company: number;
  [key: string]: number;
}

export interface CacheConfig {
  enabled: boolean;
  ttlByEntityType: CacheTTLConfig;
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
// PROMPT PREFIX CACHE TYPES
// =============================================================================

export interface PromptPrefixEntry {
  key: string;
  content: string;
  version: string;
  hash: string;
  createdAt: number;
  hitCount: number;
}

export interface PromptPrefixCache {
  entries: Map<string, PromptPrefixEntry>;
  totalHits: number;
  totalMisses: number;
}

// =============================================================================
// CAG (CACHE-AUGMENTED GENERATION) TYPES
// =============================================================================

export interface CAGDataEntry {
  key: string;
  type: 'business_rules' | 'scoring_heuristics' | 'industry_templates' | 'static_references';
  content: string;
  version: string;
  entityTypes: string[];
  lastUpdated: string;
}

export interface CAGContext {
  businessRules: string[];
  scoringHeuristics: string[];
  industryTemplates: string[];
  staticReferences: Record<string, string>;
  version: string;
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
  response: AgentOutput;
  confidenceLevel: CacheConfidenceLevel;
  durationMs: number;
  tokensUsed: number;
}

export interface CacheLookupParams {
  workspaceId: string;
  agentType: AgentType;
  entityId: string;
  entityType: string;
  cacheKey: string;
}

export interface CacheInvalidateParams {
  entityId?: string;
  agentType?: AgentType;
  workspaceId?: string;
  reason: string;
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
  
  // Only present if cache hit
  tokensSaved?: number;
  originalDurationMs?: number;
}

export interface CacheOperationResult {
  success: boolean;
  operation: 'store' | 'lookup' | 'invalidate';
  cacheKey?: string;
  error?: string;
  durationMs: number;
}

// =============================================================================
// CACHE STATISTICS TYPES
// =============================================================================

export interface CacheStatsByAgent {
  agentType: string;
  totalCacheEntries: number;
  validEntries: number;
  expiredEntries: number;
  invalidatedEntries: number;
  hitRatio: number;
  avgTTLRemainingHours: number;
}

export interface WorkspaceCacheStats {
  workspaceId: string;
  totalEntries: number;
  totalHits: number;
  totalMisses: number;
  overallHitRatio: number;
  totalTokensSaved: number;
  estimatedCostSaved: number;
  byAgent: CacheStatsByAgent[];
  periodStart: string;
  periodEnd: string;
}
