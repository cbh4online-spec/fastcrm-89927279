/**
 * RAG Layer Type Definitions for Edge Functions
 * 
 * Types for the Retrieval-Augmented Reasoning layer.
 */

// =============================================================================
// QUERY TYPES
// =============================================================================

export interface RAGQuery {
  text: string;
  entityContext: {
    entityId: string;
    entityType: string;
    entityData: Record<string, unknown>;
  };
  filters?: RAGQueryFilters;
  limits?: RAGQueryLimits;
}

export interface RAGQueryFilters {
  outcome?: 'won' | 'lost' | 'all';
  industry?: string;
  dateRange?: { start: string; end: string };
  minValue?: number;
  maxValue?: number;
  source?: string;
}

export interface RAGQueryLimits {
  maxChunks?: number;
  relevanceThreshold?: number;
  maxTokens?: number;
}

// =============================================================================
// CHUNK TYPES
// =============================================================================

export type RAGChunkType = 'outcome' | 'pattern' | 'knowledge' | 'memory';

export interface RAGChunk {
  id: string;
  sourceTable: string;
  sourceId: string;
  content: string;
  metadata: Record<string, unknown>;
  relevanceScore: number;
  chunkType: RAGChunkType;
  tokenCount?: number;
}

// =============================================================================
// HISTORICAL OUTCOME TYPES
// =============================================================================

export type OutcomeType = 'won' | 'lost' | 'stalled' | 'converted' | 'churned';

export interface HistoricalOutcome {
  id: string;
  sourceEntityId: string;
  sourceEntityType: string;
  outcome: OutcomeType;
  outcomeReason?: string;
  outcomeValue?: number;
  outcomeDate?: string;
  similarity: number;
  entitySnapshot: Record<string, unknown>;
  industry?: string;
  companySize?: string;
  dealCycleDays?: number;
  successFactors?: string[];
  failureFactors?: string[];
  lessonsLearned?: string;
}

// =============================================================================
// STRATEGIC PATTERN TYPES
// =============================================================================

export interface StrategicPattern {
  id: string;
  patternType: string;
  patternDescription: string;
  occurrenceCount: number;
  confidenceScore: number;
  recommendedActions: string[];
  contraindicatedActions: string[];
}

// =============================================================================
// RETRIEVAL RESULT TYPES
// =============================================================================

export interface RAGRetrievalResult {
  success: boolean;
  chunks: RAGChunk[];
  historicalOutcomes: HistoricalOutcome[];
  strategicPatterns: StrategicPattern[];
  totalRetrieved: number;
  totalUsed: number;
  avgRelevance: number;
  retrievalTimeMs: number;
  warnings?: string[];
}

export interface CoarseRetrievalResult {
  outcomes: HistoricalOutcome[];
  patterns: StrategicPattern[];
  chunks: RAGChunk[];
  totalCandidates: number;
}

export interface FineRetrievalResult {
  selectedChunks: RAGChunk[];
  discardedCount: number;
  avgRelevance: number;
  tokenBudgetUsed: number;
}

// =============================================================================
// CONTEXT TYPES
// =============================================================================

export type RAGConfidenceLevel = 'high' | 'medium' | 'low' | 'none';

export interface RAGContext {
  historicalEvidence: string;
  patternsIdentified: string;
  confidenceLevel: RAGConfidenceLevel;
  sourcesUsed: number;
  tokenCount: number;
}

export interface RAGContextInjection {
  formattedContext: string;
  tokenCount: number;
  sources: Array<{
    type: RAGChunkType;
    id: string;
    relevance: number;
  }>;
  confidenceLevel: RAGConfidenceLevel;
}

// =============================================================================
// GUARDRAILS TYPES
// =============================================================================

export interface RAGGuardrails {
  maxRetrievedChunks: number;
  maxFinalContextChunks: number;
  relevanceThreshold: number;
  maxRAGContextTokens: number;
  maxChunkTokens: number;
  minChunkQualityScore: number;
  requireOutcomeForOpportunities: boolean;
  neverOverrideLiveData: boolean;
  alwaysLabelAsHistorical: boolean;
  logAllRetrievals: boolean;
}

export const DEFAULT_RAG_GUARDRAILS: RAGGuardrails = {
  maxRetrievedChunks: 20,
  maxFinalContextChunks: 5,
  relevanceThreshold: 0.6,
  maxRAGContextTokens: 1500,
  maxChunkTokens: 500,
  minChunkQualityScore: 0.5,
  requireOutcomeForOpportunities: true,
  neverOverrideLiveData: true,
  alwaysLabelAsHistorical: true,
  logAllRetrievals: true,
};

// =============================================================================
// HYBRID SEARCH TYPES
// =============================================================================

export interface HybridSearchWeights {
  semantic: number;
  keyword: number;
  metadata: number;
}

export const DEFAULT_HYBRID_WEIGHTS: HybridSearchWeights = {
  semantic: 0.6,
  keyword: 0.25,
  metadata: 0.15,
};

export interface HybridSearchResult {
  sourceTable: string;
  sourceId: string;
  chunkContent: string;
  chunkMetadata: Record<string, unknown>;
  semanticScore: number;
  keywordScore: number;
  combinedScore: number;
}

// =============================================================================
// METRICS TYPES
// =============================================================================

export interface RAGRetrievalMetric {
  workspaceId: string;
  agentType: string;
  queryType: string;
  chunksRetrieved: number;
  chunksUsed: number;
  avgRelevanceScore: number;
  retrievalTimeMs: number;
  contextTokensUsed: number;
}

// =============================================================================
// ERROR TYPES
// =============================================================================

export type RAGErrorType = 
  | 'RETRIEVAL_FAILED'
  | 'NO_RELEVANT_RESULTS'
  | 'TOKEN_BUDGET_EXCEEDED'
  | 'EMBEDDING_FAILED'
  | 'INVALID_QUERY'
  | 'WORKSPACE_NOT_FOUND';

export interface RAGError {
  type: RAGErrorType;
  message: string;
  details?: Record<string, unknown>;
}

// =============================================================================
// FORBIDDEN PATTERNS
// =============================================================================

export const RAG_FORBIDDEN_PATTERNS = {
  NO_FIXED_CHUNKING: 'Chunking deve ser semântico, não por tamanho fixo',
  NO_EMBED_EVERYTHING: 'Apenas conteúdo de qualidade é embedido',
  NO_BLIND_INJECTION: 'RAG context deve ter relevance >= threshold',
  NO_SINGLE_PASS: 'Retrieval deve ser hierárquico (2 fases)',
  NO_MAXIMIZE_CONTEXT: 'Priorizar relevância sobre quantidade',
  NO_OVERRIDE_LIVE: 'RAG nunca sobrepõe dados ao vivo',
  NO_UNLABELED_RAG: 'RAG context deve ser claramente rotulado',
} as const;

export type RAGForbiddenPattern = keyof typeof RAG_FORBIDDEN_PATTERNS;
