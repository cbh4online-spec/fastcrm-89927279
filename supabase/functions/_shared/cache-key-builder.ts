/**
 * Cache Key Builder
 * 
 * Generates deterministic cache keys for response caching.
 * Keys are composed of multiple factors to ensure cache validity.
 */

import type { CacheKey, CacheKeyComponents } from './cache-types.ts';

// =============================================================================
// HASH UTILITIES
// =============================================================================

/**
 * Generate a simple hash from a string using a fast algorithm
 */
function simpleHash(str: string): string {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convert to 32-bit integer
  }
  // Convert to hex and ensure positive
  return Math.abs(hash).toString(16).padStart(8, '0');
}

/**
 * Generate a more robust hash by combining multiple simple hashes
 */
function robustHash(str: string): string {
  const part1 = simpleHash(str);
  const part2 = simpleHash(str.split('').reverse().join(''));
  const part3 = simpleHash(str + str.length);
  return `${part1}${part2}${part3}`.substring(0, 24);
}

// =============================================================================
// ENTITY STATE HASHING
// =============================================================================

/**
 * Fields to include in entity state hash by entity type
 */
const ENTITY_STATE_FIELDS: Record<string, string[]> = {
  lead: [
    'id', 'name', 'email', 'phone', 'status', 'temperature', 'score',
    'pipeline_id', 'stage_id', 'source', 'assigned_to', 'updated_at'
  ],
  opportunity: [
    'id', 'name', 'status', 'value', 'probability', 'stage_id',
    'pipeline_id', 'expected_close_date', 'assigned_to', 'updated_at'
  ],
  contact: [
    'id', 'name', 'email', 'phone', 'company_id', 'position',
    'is_primary', 'updated_at'
  ],
  client: [
    'id', 'name', 'email', 'phone', 'status', 'company_id',
    'lifetime_value', 'health_score', 'updated_at'
  ],
  company: [
    'id', 'name', 'industry', 'size', 'website', 'status', 'updated_at'
  ],
};

/**
 * Extract relevant fields from entity data for hashing
 */
function extractHashableFields(entityData: Record<string, unknown>, entityType: string): Record<string, unknown> {
  const fields = ENTITY_STATE_FIELDS[entityType] || ['id', 'updated_at'];
  const result: Record<string, unknown> = {};
  
  for (const field of fields) {
    if (field in entityData) {
      result[field] = entityData[field];
    }
  }
  
  return result;
}

/**
 * Generate a hash of the entity's current state
 */
export function generateEntityStateHash(
  entityData: Record<string, unknown>,
  entityType: string
): string {
  const hashableFields = extractHashableFields(entityData, entityType);
  const sortedJson = JSON.stringify(hashableFields, Object.keys(hashableFields).sort());
  return robustHash(sortedJson);
}

// =============================================================================
// MEMORY VERSION HASHING
// =============================================================================

/**
 * Generate memory version from the latest memory update timestamp
 */
export function generateMemoryVersion(
  memories: Array<{ updated_at?: string; created_at?: string }>
): string | null {
  if (!memories || memories.length === 0) {
    return null;
  }
  
  // Find the most recent update
  let latestTimestamp = '';
  for (const memory of memories) {
    const timestamp = memory.updated_at || memory.created_at || '';
    if (timestamp > latestTimestamp) {
      latestTimestamp = timestamp;
    }
  }
  
  if (!latestTimestamp) {
    return null;
  }
  
  // Return ISO timestamp as version
  return latestTimestamp;
}

// =============================================================================
// CONTEXT HASH
// =============================================================================

/**
 * Generate a hash of the context items included in the analysis
 */
export function generateContextHash(
  contextItems: Array<{ source: string; content: string; tier: number }>
): string {
  // Sort items for determinism
  const sorted = [...contextItems].sort((a, b) => {
    if (a.tier !== b.tier) return a.tier - b.tier;
    return a.source.localeCompare(b.source);
  });
  
  // Create a summary string
  const summary = sorted.map(item => 
    `${item.tier}:${item.source}:${item.content.length}`
  ).join('|');
  
  return robustHash(summary);
}

// =============================================================================
// CACHE KEY BUILDER
// =============================================================================

/**
 * Current prompt version - update when prompts change
 */
export const PROMPT_VERSION = 'v1.0.0';

/**
 * Build a complete cache key from components
 */
export function buildCacheKey(components: Omit<CacheKeyComponents, 'promptVersion'>): CacheKey {
  const fullComponents: CacheKeyComponents = {
    ...components,
    promptVersion: PROMPT_VERSION,
  };
  
  // Build composite key from all components
  const keyParts = [
    fullComponents.agentType,
    fullComponents.entityId,
    fullComponents.entityType,
    fullComponents.entityStateHash,
    fullComponents.memoryVersion || 'no-memory',
    fullComponents.contextHash,
    fullComponents.promptVersion,
  ];
  
  const compositeKey = robustHash(keyParts.join('::'));
  
  return {
    ...fullComponents,
    compositeKey,
  };
}

/**
 * Build cache key for a specific entity
 */
export function buildEntityCacheKey(params: {
  agentType: string;
  entityId: string;
  entityType: string;
  entityData: Record<string, unknown>;
  memories?: Array<{ updated_at?: string; created_at?: string }>;
  contextItems?: Array<{ source: string; content: string; tier: number }>;
}): CacheKey {
  const entityStateHash = generateEntityStateHash(params.entityData, params.entityType);
  const memoryVersion = generateMemoryVersion(params.memories || []);
  const contextHash = generateContextHash(params.contextItems || []);
  
  return buildCacheKey({
    agentType: params.agentType as CacheKeyComponents['agentType'],
    entityId: params.entityId,
    entityType: params.entityType,
    entityStateHash,
    memoryVersion,
    contextHash,
  });
}

/**
 * Parse a cache key back to components (for debugging)
 */
export function parseCacheKeyMetadata(cacheKey: CacheKey): {
  summary: string;
  components: string[];
} {
  return {
    summary: `${cacheKey.agentType}:${cacheKey.entityType}:${cacheKey.entityId.substring(0, 8)}`,
    components: [
      `Agent: ${cacheKey.agentType}`,
      `Entity: ${cacheKey.entityType}/${cacheKey.entityId}`,
      `State Hash: ${cacheKey.entityStateHash}`,
      `Memory Version: ${cacheKey.memoryVersion || 'none'}`,
      `Context Hash: ${cacheKey.contextHash}`,
      `Prompt Version: ${cacheKey.promptVersion}`,
    ],
  };
}

// =============================================================================
// VALIDATION
// =============================================================================

/**
 * Validate cache key components
 */
export function validateCacheKey(cacheKey: CacheKey): {
  valid: boolean;
  errors: string[];
} {
  const errors: string[] = [];
  
  if (!cacheKey.agentType) {
    errors.push('Missing agent type');
  }
  
  if (!cacheKey.entityId) {
    errors.push('Missing entity ID');
  }
  
  if (!cacheKey.entityStateHash) {
    errors.push('Missing entity state hash');
  }
  
  if (!cacheKey.promptVersion) {
    errors.push('Missing prompt version');
  }
  
  if (!cacheKey.compositeKey) {
    errors.push('Missing composite key');
  }
  
  return {
    valid: errors.length === 0,
    errors,
  };
}
