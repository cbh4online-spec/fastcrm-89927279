/**
 * RAG Guardrails
 * 
 * Enforces safety rules and quality controls for the RAG layer.
 * Prevents anti-patterns and ensures reliable retrieval.
 */

import {
  RAGGuardrails,
  RAGChunk,
  RAGRetrievalResult,
  RAGConfidenceLevel,
  DEFAULT_RAG_GUARDRAILS,
  RAG_FORBIDDEN_PATTERNS,
} from './rag-types.ts';

// =============================================================================
// GUARDRAILS VALIDATION
// =============================================================================

export interface GuardrailValidation {
  passed: boolean;
  violations: string[];
  warnings: string[];
}

/**
 * Validate chunks against guardrails
 */
export function validateChunks(
  chunks: RAGChunk[],
  guardrails: RAGGuardrails = DEFAULT_RAG_GUARDRAILS
): GuardrailValidation {
  const violations: string[] = [];
  const warnings: string[] = [];
  
  // Check max retrieved chunks
  if (chunks.length > guardrails.maxRetrievedChunks) {
    violations.push(
      `Exceeded max retrieved chunks: ${chunks.length} > ${guardrails.maxRetrievedChunks}`
    );
  }
  
  // Check relevance threshold
  const lowRelevanceChunks = chunks.filter(c => c.relevanceScore < guardrails.relevanceThreshold);
  if (lowRelevanceChunks.length > 0) {
    warnings.push(
      `${lowRelevanceChunks.length} chunks below relevance threshold (${guardrails.relevanceThreshold})`
    );
  }
  
  // Check token budget
  const totalTokens = chunks.reduce((sum, c) => sum + (c.tokenCount || 0), 0);
  if (totalTokens > guardrails.maxRAGContextTokens) {
    violations.push(
      `Exceeded token budget: ${totalTokens} > ${guardrails.maxRAGContextTokens}`
    );
  }
  
  // Check individual chunk size
  const oversizedChunks = chunks.filter(c => (c.tokenCount || 0) > guardrails.maxChunkTokens);
  if (oversizedChunks.length > 0) {
    warnings.push(`${oversizedChunks.length} chunks exceed max size (${guardrails.maxChunkTokens})`);
  }
  
  return {
    passed: violations.length === 0,
    violations,
    warnings,
  };
}

/**
 * Enforce guardrails on retrieval result
 */
export function enforceGuardrails(
  result: RAGRetrievalResult,
  guardrails: RAGGuardrails = DEFAULT_RAG_GUARDRAILS
): RAGRetrievalResult {
  // Filter by relevance threshold
  const filteredChunks = result.chunks.filter(
    c => c.relevanceScore >= guardrails.relevanceThreshold
  );
  
  // Limit to max final chunks
  const limitedChunks = filteredChunks
    .sort((a, b) => b.relevanceScore - a.relevanceScore)
    .slice(0, guardrails.maxFinalContextChunks);
  
  // Enforce token budget
  let tokenBudget = guardrails.maxRAGContextTokens;
  const budgetedChunks: RAGChunk[] = [];
  
  for (const chunk of limitedChunks) {
    const chunkTokens = chunk.tokenCount || estimateTokens(chunk.content);
    if (tokenBudget >= chunkTokens) {
      budgetedChunks.push(chunk);
      tokenBudget -= chunkTokens;
    }
  }
  
  // Filter outcomes by relevance
  const filteredOutcomes = result.historicalOutcomes.filter(
    o => o.similarity >= guardrails.relevanceThreshold
  );
  
  // Calculate new averages
  const avgRelevance = budgetedChunks.length > 0
    ? budgetedChunks.reduce((sum, c) => sum + c.relevanceScore, 0) / budgetedChunks.length
    : 0;
  
  return {
    ...result,
    chunks: budgetedChunks,
    historicalOutcomes: filteredOutcomes,
    totalUsed: budgetedChunks.length + filteredOutcomes.length,
    avgRelevance,
    warnings: [
      ...(result.warnings || []),
      ...(filteredChunks.length !== result.chunks.length
        ? [`Filtered ${result.chunks.length - filteredChunks.length} chunks below threshold`]
        : []),
    ],
  };
}

// =============================================================================
// HELPER FUNCTIONS
// =============================================================================

function estimateTokens(text: string): number {
  return Math.ceil(text.length / 4);
}

/**
 * Determine confidence level based on retrieval quality
 */
export function determineConfidence(
  avgRelevance: number,
  chunksUsed: number,
  guardrails: RAGGuardrails = DEFAULT_RAG_GUARDRAILS
): RAGConfidenceLevel {
  if (chunksUsed === 0) {
    return 'none';
  }
  
  if (avgRelevance >= 0.8 && chunksUsed >= 3) {
    return 'high';
  }
  
  if (avgRelevance >= guardrails.relevanceThreshold && chunksUsed >= 1) {
    return 'medium';
  }
  
  return 'low';
}

/**
 * Check if RAG should be used for this query
 */
export function shouldUseRAG(
  entityType: string,
  triggerType: string,
  guardrails: RAGGuardrails = DEFAULT_RAG_GUARDRAILS
): boolean {
  // Always use RAG for opportunities (historical comparison is valuable)
  if (entityType === 'opportunity' && guardrails.requireOutcomeForOpportunities) {
    return true;
  }
  
  // Use RAG for analysis triggers
  if (['scheduled', 'periodic', 'analysis'].includes(triggerType)) {
    return true;
  }
  
  // Skip RAG for quick actions
  if (['quick_action', 'real_time'].includes(triggerType)) {
    return false;
  }
  
  return true;
}

/**
 * Validate that forbidden patterns are not violated
 */
export function checkForbiddenPatterns(
  context: {
    isFixedChunking?: boolean;
    embeddingAll?: boolean;
    blindInjection?: boolean;
    singlePass?: boolean;
    maximizingContext?: boolean;
    overridingLiveData?: boolean;
    unlabeledRAG?: boolean;
  }
): { valid: boolean; violations: string[] } {
  const violations: string[] = [];
  
  if (context.isFixedChunking) {
    violations.push(RAG_FORBIDDEN_PATTERNS.NO_FIXED_CHUNKING);
  }
  
  if (context.embeddingAll) {
    violations.push(RAG_FORBIDDEN_PATTERNS.NO_EMBED_EVERYTHING);
  }
  
  if (context.blindInjection) {
    violations.push(RAG_FORBIDDEN_PATTERNS.NO_BLIND_INJECTION);
  }
  
  if (context.singlePass) {
    violations.push(RAG_FORBIDDEN_PATTERNS.NO_SINGLE_PASS);
  }
  
  if (context.maximizingContext) {
    violations.push(RAG_FORBIDDEN_PATTERNS.NO_MAXIMIZE_CONTEXT);
  }
  
  if (context.overridingLiveData) {
    violations.push(RAG_FORBIDDEN_PATTERNS.NO_OVERRIDE_LIVE);
  }
  
  if (context.unlabeledRAG) {
    violations.push(RAG_FORBIDDEN_PATTERNS.NO_UNLABELED_RAG);
  }
  
  return {
    valid: violations.length === 0,
    violations,
  };
}

// =============================================================================
// LOGGING
// =============================================================================

export interface RAGLogEntry {
  timestamp: string;
  workspaceId: string;
  agentType: string;
  entityId: string;
  queryType: string;
  chunksRetrieved: number;
  chunksUsed: number;
  avgRelevance: number;
  confidenceLevel: RAGConfidenceLevel;
  retrievalTimeMs: number;
  tokensBudget: number;
  tokensUsed: number;
  warnings: string[];
}

/**
 * Create log entry for RAG retrieval (for metrics table)
 */
export function createLogEntry(
  workspaceId: string,
  agentType: string,
  entityId: string,
  result: RAGRetrievalResult,
  tokensBudget: number
): RAGLogEntry {
  const tokensUsed = result.chunks.reduce((sum, c) => sum + (c.tokenCount || 0), 0);
  
  return {
    timestamp: new Date().toISOString(),
    workspaceId,
    agentType,
    entityId,
    queryType: 'standard',
    chunksRetrieved: result.totalRetrieved,
    chunksUsed: result.totalUsed,
    avgRelevance: result.avgRelevance,
    confidenceLevel: determineConfidence(result.avgRelevance, result.totalUsed),
    retrievalTimeMs: result.retrievalTimeMs,
    tokensBudget,
    tokensUsed,
    warnings: result.warnings || [],
  };
}

// Re-export defaults
export { DEFAULT_RAG_GUARDRAILS, RAG_FORBIDDEN_PATTERNS };
