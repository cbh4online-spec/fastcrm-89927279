/**
 * Cache Manager
 * 
 * Core caching logic for AI agent responses.
 * Handles cache lookup, storage, and metrics tracking.
 */

import type {
  CacheKey,
  CacheEntry,
  CacheCheckResult,
  CacheEligibility,
  CacheEligibilityParams,
  CacheStoreParams,
  CacheLookupParams,
  CacheLayerResult,
  CacheConfidenceLevel,
  CacheMissReason,
  CacheConfig,
  AgentOutput,
  AgentType,
} from './cache-types.ts';
import { DEFAULT_CACHE_CONFIG } from './cache-types.ts';
import { buildEntityCacheKey, PROMPT_VERSION } from './cache-key-builder.ts';

// Use a generic type for Supabase client to avoid version conflicts
// deno-lint-ignore no-explicit-any
type SupabaseClientAny = any;

// =============================================================================
// CACHE ELIGIBILITY
// =============================================================================

/**
 * Check if a response is eligible for caching
 */
export function checkCacheEligibility(
  params: CacheEligibilityParams,
  config: CacheConfig = DEFAULT_CACHE_CONFIG
): CacheEligibility {
  // Rule 1: Low confidence responses are never cached
  if (params.confidenceLevel === 'low') {
    return {
      eligible: false,
      reason: 'Low confidence responses are not cached',
      suggestedTTLHours: 0,
    };
  }
  
  // Rule 2: Manual triggers are never cached (user expects fresh analysis)
  if (config.neverCacheManualTriggers && params.triggerType === 'manual') {
    return {
      eligible: false,
      reason: 'Manual trigger responses are not cached',
      suggestedTTLHours: 0,
    };
  }
  
  // Rule 3: High temperature outputs are not deterministic
  if (params.temperature > config.maxTemperatureForCache) {
    return {
      eligible: false,
      reason: `Temperature ${params.temperature} exceeds maximum ${config.maxTemperatureForCache}`,
      suggestedTTLHours: 0,
    };
  }
  
  // Get TTL for entity type
  const ttl = config.ttlByEntityType[params.entityType] || 4;
  
  return {
    eligible: true,
    suggestedTTLHours: ttl,
  };
}

// =============================================================================
// CACHE LOOKUP
// =============================================================================

/**
 * Look up a cached response
 */
export async function lookupCache(
  supabase: SupabaseClientAny,
  params: CacheLookupParams
): Promise<CacheCheckResult> {
  const startTime = Date.now();
  
  try {
    // Query for valid cache entry
    const { data, error } = await supabase
      .from('ai_agent_response_cache')
      .select('*')
      .eq('cache_key', params.cacheKey)
      .is('invalidated_at', null)
      .gt('expires_at', new Date().toISOString())
      .maybeSingle();
    
    const lookupTimeMs = Date.now() - startTime;
    
    if (error) {
      console.error('[CACHE] Lookup error:', error);
      return {
        hit: false,
        reason: 'not_found',
        lookupTimeMs,
      };
    }
    
    if (!data) {
      return {
        hit: false,
        reason: 'not_found',
        lookupTimeMs,
      };
    }
    
    // Update hit count and last used
    await supabase
      .from('ai_agent_response_cache')
      .update({
        hit_count: (data.hit_count || 0) + 1,
        last_used_at: new Date().toISOString(),
      })
      .eq('id', data.id);
    
    console.log(`[CACHE] HIT for ${params.agentType}/${params.entityId} (${lookupTimeMs}ms)`);
    
    return {
      hit: true,
      entry: data as CacheEntry,
      lookupTimeMs,
    };
    
  } catch (err) {
    console.error('[CACHE] Lookup exception:', err);
    return {
      hit: false,
      reason: 'not_found',
      lookupTimeMs: Date.now() - startTime,
    };
  }
}

// =============================================================================
// CACHE STORAGE
// =============================================================================

/**
 * Store a response in the cache
 */
export async function storeInCache(
  supabase: SupabaseClientAny,
  params: CacheStoreParams,
  config: CacheConfig = DEFAULT_CACHE_CONFIG
): Promise<{ success: boolean; error?: string }> {
  try {
    // Calculate expiry
    const ttlHours = config.ttlByEntityType[params.entityType] || 4;
    const expiresAt = new Date(Date.now() + ttlHours * 60 * 60 * 1000).toISOString();
    
    // Prepare cache entry
    const cacheEntry = {
      workspace_id: params.workspaceId,
      agent_type: params.agentType,
      entity_id: params.entityId,
      entity_type: params.entityType,
      cache_key: params.cacheKey.compositeKey,
      entity_state_hash: params.cacheKey.entityStateHash,
      memory_version: params.cacheKey.memoryVersion,
      prompt_version: params.cacheKey.promptVersion,
      context_hash: params.cacheKey.contextHash,
      response: params.response,
      executive_summary: params.response.executiveSummary,
      confidence_level: params.confidenceLevel,
      expires_at: expiresAt,
      original_duration_ms: params.durationMs,
      tokens_saved: params.tokensUsed,
    };
    
    // Upsert cache entry
    const { error } = await supabase
      .from('ai_agent_response_cache')
      .upsert(cacheEntry, {
        onConflict: 'cache_key',
      });
    
    if (error) {
      console.error('[CACHE] Store error:', error);
      return { success: false, error: error.message };
    }
    
    console.log(`[CACHE] Stored for ${params.agentType}/${params.entityId} (TTL: ${ttlHours}h)`);
    
    return { success: true };
    
  } catch (err) {
    console.error('[CACHE] Store exception:', err);
    return { 
      success: false, 
      error: err instanceof Error ? err.message : 'Unknown error' 
    };
  }
}

// =============================================================================
// CACHE INVALIDATION
// =============================================================================

/**
 * Invalidate cache entries for an entity
 */
export async function invalidateCache(
  supabase: SupabaseClientAny,
  params: {
    entityId?: string;
    agentType?: string;
    workspaceId?: string;
    reason: string;
  }
): Promise<{ success: boolean; invalidatedCount: number }> {
  try {
    let query = supabase
      .from('ai_agent_response_cache')
      .update({
        invalidated_at: new Date().toISOString(),
        invalidation_reason: params.reason,
      })
      .is('invalidated_at', null);
    
    if (params.entityId) {
      query = query.eq('entity_id', params.entityId);
    }
    
    if (params.agentType) {
      query = query.eq('agent_type', params.agentType);
    }
    
    if (params.workspaceId) {
      query = query.eq('workspace_id', params.workspaceId);
    }
    
    const { data, error } = await query.select('id');
    
    if (error) {
      console.error('[CACHE] Invalidation error:', error);
      return { success: false, invalidatedCount: 0 };
    }
    
    const count = data?.length || 0;
    console.log(`[CACHE] Invalidated ${count} entries: ${params.reason}`);
    
    return { success: true, invalidatedCount: count };
    
  } catch (err) {
    console.error('[CACHE] Invalidation exception:', err);
    return { success: false, invalidatedCount: 0 };
  }
}

// =============================================================================
// METRICS TRACKING
// =============================================================================

/**
 * Record cache metrics
 */
export async function recordCacheMetrics(
  supabase: SupabaseClientAny,
  workspaceId: string,
  agentType: string,
  cacheHit: boolean,
  tokensSaved: number = 0,
  latencyMs: number = 0
): Promise<void> {
  try {
    await supabase.rpc('upsert_cache_metrics', {
      p_workspace_id: workspaceId,
      p_agent_type: agentType,
      p_cache_hit: cacheHit,
      p_tokens_saved: tokensSaved,
      p_latency_ms: latencyMs,
    });
  } catch (err) {
    console.error('[CACHE] Metrics recording error:', err);
    // Don't fail the main operation for metrics errors
  }
}

// =============================================================================
// CACHE LAYER INTEGRATION
// =============================================================================

/**
 * Main cache layer interface for agents
 * Uses any types for flexibility with different agent response shapes
 */
// deno-lint-ignore no-explicit-any
export async function withCache(
  supabase: SupabaseClientAny,
  params: {
    workspaceId: string;
    agentType: string;
    entityId: string;
    entityType: string;
    entityData: Record<string, unknown>;
    memories?: Array<{ updated_at?: string; created_at?: string }>;
    contextItems?: Array<{ source: string; content: string; tier: number }>;
    triggerType: string;
    config?: Partial<CacheConfig>;
  },
  // deno-lint-ignore no-explicit-any
  executeFn: () => Promise<{
    response: any;
    confidenceLevel: CacheConfidenceLevel;
    durationMs: number;
    tokensUsed: number;
  }>
  // deno-lint-ignore no-explicit-any
): Promise<{ fromCache: boolean; cacheKey: string; response: any; lookupTimeMs: number; reason?: CacheMissReason; tokensSaved?: number; originalDurationMs?: number }> {
  const config = { ...DEFAULT_CACHE_CONFIG, ...params.config };
  
  // Build cache key
  const cacheKey = buildEntityCacheKey({
    agentType: params.agentType,
    entityId: params.entityId,
    entityType: params.entityType,
    entityData: params.entityData,
    memories: params.memories,
    contextItems: params.contextItems,
  });
  
  // Check eligibility before lookup
  const eligibility = checkCacheEligibility({
    confidenceLevel: 'medium', // Assume medium for lookup
    triggerType: params.triggerType,
    temperature: 0,
    entityType: params.entityType,
  }, config);
  
  // Skip cache entirely for manual triggers
  if (!eligibility.eligible && params.triggerType === 'manual') {
    console.log(`[CACHE] Skipping cache for manual trigger`);
    const result = await executeFn();
    
    return {
      fromCache: false,
      cacheKey: cacheKey.compositeKey,
      response: result.response,
      lookupTimeMs: 0,
      reason: 'manual_trigger',
    };
  }
  
  // Try cache lookup
  const lookupResult = await lookupCache(supabase, {
    workspaceId: params.workspaceId,
    agentType: params.agentType as AgentType,
    entityId: params.entityId,
    cacheKey: cacheKey.compositeKey,
  });
  
  if (lookupResult.hit && lookupResult.entry) {
    // Cache hit - record metrics and return
    await recordCacheMetrics(
      supabase,
      params.workspaceId,
      params.agentType,
      true,
      lookupResult.entry.tokens_saved,
      lookupResult.lookupTimeMs
    );
    
    return {
      fromCache: true,
      cacheKey: cacheKey.compositeKey,
      response: lookupResult.entry.response,
      lookupTimeMs: lookupResult.lookupTimeMs,
      tokensSaved: lookupResult.entry.tokens_saved,
      originalDurationMs: lookupResult.entry.original_duration_ms || undefined,
    };
  }
  
  // Cache miss - execute the function
  const result = await executeFn();
  
  // Record miss metrics
  await recordCacheMetrics(
    supabase,
    params.workspaceId,
    params.agentType,
    false,
    0,
    result.durationMs
  );
  
  // Check if we should cache the result
  const storeEligibility = checkCacheEligibility({
    confidenceLevel: result.confidenceLevel,
    triggerType: params.triggerType,
    temperature: 0,
    entityType: params.entityType,
  }, config);
  
  if (storeEligibility.eligible) {
    await storeInCache(supabase, {
      workspaceId: params.workspaceId,
      agentType: params.agentType as AgentType,
      entityId: params.entityId,
      entityType: params.entityType,
      cacheKey,
      response: result.response,
      confidenceLevel: result.confidenceLevel,
      durationMs: result.durationMs,
      tokensUsed: result.tokensUsed,
    }, config);
  }
  
  return {
    fromCache: false,
    cacheKey: cacheKey.compositeKey,
    response: result.response,
    lookupTimeMs: lookupResult.lookupTimeMs,
    reason: lookupResult.reason,
  };
}

// Re-export for convenience
export { buildEntityCacheKey, PROMPT_VERSION };
export { DEFAULT_CACHE_CONFIG };
