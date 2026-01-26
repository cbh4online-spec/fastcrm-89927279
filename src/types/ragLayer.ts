/**
 * RAG Layer Type Definitions
 * 
 * Types for the Retrieval-Augmented Reasoning layer that enables
 * AI agents to justify recommendations with historical evidence.
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

export interface RAGIndexedChunk {
  id: string;
  workspaceId: string;
  sourceTable: string;
  sourceId: string;
  chunkIndex: number;
  chunkContent: string;
  chunkMetadata: Record<string, unknown>;
  qualityScore: number;
  embedding?: number[];
  createdAt: string;
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
  initialStage?: string;
  finalStage?: string;
  successFactors?: string[];
  failureFactors?: string[];
  lessonsLearned?: string;
}

export interface HistoricalOutcomeInput {
  workspaceId: string;
  sourceEntityId: string;
  sourceEntityType: string;
  outcome: OutcomeType;
  outcomeReason?: string;
  outcomeValue?: number;
  outcomeDate?: string;
  entitySnapshot: Record<string, unknown>;
  industry?: string;
  companySize?: string;
  dealCycleDays?: number;
  initialStage?: string;
  finalStage?: string;
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
  entityTypes: string[];
  conditions?: Record<string, unknown>;
  lastOccurrenceAt?: string;
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
  retrievalMetadata: {
    outcomesUsed: number;
    patternsUsed: number;
    chunksUsed: number;
    avgRelevance: number;
  };
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
  // Retrieval limits
  maxRetrievedChunks: number;
  maxFinalContextChunks: number;
  relevanceThreshold: number;
  
  // Token budgets
  maxRAGContextTokens: number;
  maxChunkTokens: number;
  
  // Quality controls
  minChunkQualityScore: number;
  requireOutcomeForOpportunities: boolean;
  
  // Safety
  neverOverrideLiveData: boolean;
  alwaysLabelAsHistorical: boolean;
  logAllRetrievals: boolean;
}

// =============================================================================
// METRICS TYPES
// =============================================================================

export interface RAGMetrics {
  totalQueries: number;
  avgRetrievalTimeMs: number;
  avgChunksRetrieved: number;
  avgRelevanceScore: number;
  hitRatio: number;
  tokensSaved: number;
}

export interface RAGRetrievalMetric {
  id: string;
  workspaceId: string;
  agentType: string;
  queryType: string;
  chunksRetrieved: number;
  chunksUsed: number;
  avgRelevanceScore: number;
  retrievalTimeMs: number;
  contextTokensUsed: number;
  queryDate: string;
}

// =============================================================================
// HYBRID SEARCH TYPES
// =============================================================================

export interface HybridSearchWeights {
  semantic: number;
  keyword: number;
  metadata: number;
}

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
// CHUNKING TYPES
// =============================================================================

export type ChunkSourceType = 'knowledge' | 'outcome' | 'memory' | 'pattern';

export interface ChunkingConfig {
  sourceType: ChunkSourceType;
  maxChunkSize: number;
  minChunkSize: number;
  overlapSize: number;
  preserveStructure: boolean;
}

export interface ChunkedDocument {
  sourceId: string;
  sourceTable: string;
  chunks: Array<{
    index: number;
    content: string;
    metadata: Record<string, unknown>;
    qualityScore: number;
  }>;
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
