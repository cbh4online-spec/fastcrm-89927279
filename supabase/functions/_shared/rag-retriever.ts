/**
 * RAG Hierarchical Retriever
 * 
 * Implements two-phase retrieval:
 * 1. Coarse retrieval: Get top-K candidates by category
 * 2. Fine retrieval: Re-rank and filter by relevance
 */

import {
  RAGQuery,
  RAGChunk,
  RAGRetrievalResult,
  HistoricalOutcome,
  StrategicPattern,
  CoarseRetrievalResult,
  FineRetrievalResult,
  DEFAULT_RAG_GUARDRAILS,
  RAGGuardrails,
} from './rag-types.ts';

// =============================================================================
// CONFIGURATION
// =============================================================================

export interface RetrieverConfig {
  coarseOutcomesLimit: number;
  coarsePatternsLimit: number;
  coarseChunksLimit: number;
  fineLimit: number;
  recencyBoostDays: number;
  recencyBoostWeight: number;
}

export const DEFAULT_RETRIEVER_CONFIG: RetrieverConfig = {
  coarseOutcomesLimit: 10,
  coarsePatternsLimit: 5,
  coarseChunksLimit: 10,
  fineLimit: 5,
  recencyBoostDays: 90, // Boost items from last 90 days
  recencyBoostWeight: 0.1, // 10% boost for recent items
};

// =============================================================================
// COARSE RETRIEVAL
// =============================================================================

/**
 * Perform coarse retrieval across all sources
 */
export async function coarseRetrieve(
  supabase: any,
  workspaceId: string,
  query: RAGQuery,
  queryEmbedding: number[] | null,
  config: RetrieverConfig = DEFAULT_RETRIEVER_CONFIG
): Promise<CoarseRetrievalResult> {
  const outcomes: HistoricalOutcome[] = [];
  const patterns: StrategicPattern[] = [];
  const chunks: RAGChunk[] = [];
  
  // 1. Retrieve historical outcomes
  if (queryEmbedding) {
    try {
      const { data: outcomeData } = await supabase.rpc('match_historical_outcomes', {
        query_embedding: `[${queryEmbedding.join(',')}]`,
        match_threshold: 0.5, // Lower for coarse pass
        match_count: config.coarseOutcomesLimit,
        filter_workspace_id: workspaceId,
        filter_outcome: query.filters?.outcome === 'all' ? null : query.filters?.outcome,
      });
      
      if (outcomeData) {
        for (const row of outcomeData) {
          outcomes.push({
            id: row.id,
            sourceEntityId: row.source_entity_id,
            sourceEntityType: row.source_entity_type,
            outcome: row.outcome,
            outcomeReason: row.outcome_reason,
            outcomeValue: row.outcome_value,
            similarity: row.similarity,
            entitySnapshot: row.entity_snapshot || {},
            successFactors: row.success_factors,
            failureFactors: row.failure_factors,
            lessonsLearned: row.lessons_learned,
          });
        }
      }
    } catch (error) {
      console.error('[RAG-Retriever] Outcome retrieval error:', error);
    }
  }
  
  // 2. Retrieve strategic patterns
  try {
    const { data: patternData } = await supabase
      .from('ai_agent_strategic_memory')
      .select('*')
      .eq('workspace_id', workspaceId)
      .eq('is_active', true)
      .contains('entity_types', [query.entityContext.entityType])
      .order('confidence_score', { ascending: false })
      .limit(config.coarsePatternsLimit);
    
    if (patternData) {
      for (const row of patternData) {
        patterns.push({
          id: row.id,
          patternType: row.pattern_type,
          patternDescription: row.pattern_description,
          occurrenceCount: row.occurrence_count || 0,
          confidenceScore: row.confidence_score || 0.5,
          recommendedActions: row.recommended_actions || [],
          contraindicatedActions: row.contraindicated_actions || [],
        });
      }
    }
  } catch (error) {
    console.error('[RAG-Retriever] Pattern retrieval error:', error);
  }
  
  // 3. Retrieve indexed chunks via hybrid search
  if (queryEmbedding && query.text) {
    try {
      const { data: chunkData } = await supabase.rpc('rag_hybrid_search', {
        query_text: query.text,
        query_embedding: `[${queryEmbedding.join(',')}]`,
        filter_workspace_id: workspaceId,
        semantic_weight: 0.6,
        keyword_weight: 0.25,
        match_count: config.coarseChunksLimit,
      });
      
      if (chunkData) {
        for (const row of chunkData) {
          chunks.push({
            id: `${row.source_table}-${row.source_id}`,
            sourceTable: row.source_table,
            sourceId: row.source_id,
            content: row.chunk_content,
            metadata: row.chunk_metadata || {},
            relevanceScore: row.combined_score,
            chunkType: inferChunkType(row.source_table),
          });
        }
      }
    } catch (error) {
      console.error('[RAG-Retriever] Chunk retrieval error:', error);
    }
  }
  
  const totalCandidates = outcomes.length + patterns.length + chunks.length;
  console.log(`[RAG-Retriever] Coarse retrieval: ${outcomes.length} outcomes, ${patterns.length} patterns, ${chunks.length} chunks`);
  
  return {
    outcomes,
    patterns,
    chunks,
    totalCandidates,
  };
}

/**
 * Infer chunk type from source table
 */
function inferChunkType(sourceTable: string): RAGChunk['chunkType'] {
  if (sourceTable.includes('outcome')) return 'outcome';
  if (sourceTable.includes('memory')) return 'memory';
  if (sourceTable.includes('pattern') || sourceTable.includes('strategic')) return 'pattern';
  if (sourceTable.includes('knowledge')) return 'knowledge';
  return 'memory';
}

// =============================================================================
// FINE RETRIEVAL (RE-RANKING)
// =============================================================================

/**
 * Re-rank and filter coarse results
 */
export function fineRetrieve(
  coarseResult: CoarseRetrievalResult,
  query: RAGQuery,
  guardrails: RAGGuardrails = DEFAULT_RAG_GUARDRAILS,
  config: RetrieverConfig = DEFAULT_RETRIEVER_CONFIG
): FineRetrievalResult {
  // Combine all chunks for unified ranking
  const allChunks: RAGChunk[] = [...coarseResult.chunks];
  
  // Convert outcomes to chunks for unified processing
  for (const outcome of coarseResult.outcomes) {
    const content = formatOutcomeAsChunk(outcome);
    allChunks.push({
      id: outcome.id,
      sourceTable: 'rag_historical_outcomes',
      sourceId: outcome.sourceEntityId,
      content,
      metadata: {
        outcome: outcome.outcome,
        outcomeValue: outcome.outcomeValue,
        successFactors: outcome.successFactors,
        failureFactors: outcome.failureFactors,
      },
      relevanceScore: outcome.similarity,
      chunkType: 'outcome',
      tokenCount: estimateTokens(content),
    });
  }
  
  // Convert patterns to chunks
  for (const pattern of coarseResult.patterns) {
    const content = formatPatternAsChunk(pattern);
    allChunks.push({
      id: pattern.id,
      sourceTable: 'ai_agent_strategic_memory',
      sourceId: pattern.id,
      content,
      metadata: {
        patternType: pattern.patternType,
        occurrenceCount: pattern.occurrenceCount,
        recommendedActions: pattern.recommendedActions,
      },
      relevanceScore: pattern.confidenceScore,
      chunkType: 'pattern',
      tokenCount: estimateTokens(content),
    });
  }
  
  // Apply relevance threshold filter
  const thresholdFiltered = allChunks.filter(
    c => c.relevanceScore >= guardrails.relevanceThreshold
  );
  
  // Sort by relevance
  const sorted = thresholdFiltered.sort((a, b) => b.relevanceScore - a.relevanceScore);
  
  // Apply token budget
  let tokenBudget = guardrails.maxRAGContextTokens;
  const selected: RAGChunk[] = [];
  
  for (const chunk of sorted) {
    const tokens = chunk.tokenCount || estimateTokens(chunk.content);
    if (tokens > guardrails.maxChunkTokens) {
      // Skip oversized chunks
      continue;
    }
    if (tokenBudget >= tokens && selected.length < config.fineLimit) {
      selected.push({ ...chunk, tokenCount: tokens });
      tokenBudget -= tokens;
    }
  }
  
  // Calculate metrics
  const avgRelevance = selected.length > 0
    ? selected.reduce((sum, c) => sum + c.relevanceScore, 0) / selected.length
    : 0;
  
  const tokenBudgetUsed = guardrails.maxRAGContextTokens - tokenBudget;
  
  console.log(`[RAG-Retriever] Fine retrieval: ${selected.length} chunks selected, ${tokenBudgetUsed} tokens used`);
  
  return {
    selectedChunks: selected,
    discardedCount: allChunks.length - selected.length,
    avgRelevance,
    tokenBudgetUsed,
  };
}

// =============================================================================
// HELPER FUNCTIONS
// =============================================================================

function estimateTokens(text: string): number {
  return Math.ceil(text.length / 4);
}

function formatOutcomeAsChunk(outcome: HistoricalOutcome): string {
  const parts: string[] = [];
  
  parts.push(`Oportunidade ${outcome.outcome === 'won' ? 'GANHA' : 'PERDIDA'}`);
  
  if (outcome.outcomeValue) {
    parts.push(`Valor: €${outcome.outcomeValue.toLocaleString('pt-PT')}`);
  }
  
  if (outcome.outcomeReason) {
    parts.push(`Motivo: ${outcome.outcomeReason}`);
  }
  
  if (outcome.successFactors?.length) {
    parts.push(`Fatores de sucesso: ${outcome.successFactors.join(', ')}`);
  }
  
  if (outcome.failureFactors?.length) {
    parts.push(`Fatores de falha: ${outcome.failureFactors.join(', ')}`);
  }
  
  if (outcome.lessonsLearned) {
    parts.push(`Lição: ${outcome.lessonsLearned}`);
  }
  
  return parts.join(' | ');
}

function formatPatternAsChunk(pattern: StrategicPattern): string {
  const parts: string[] = [];
  
  parts.push(`Padrão: ${pattern.patternType}`);
  parts.push(pattern.patternDescription);
  
  if (pattern.recommendedActions?.length) {
    parts.push(`Recomendado: ${pattern.recommendedActions.slice(0, 3).join(', ')}`);
  }
  
  return parts.join(' | ');
}

// =============================================================================
// MAIN RETRIEVAL FUNCTION
// =============================================================================

/**
 * Execute full hierarchical retrieval
 */
export async function retrieve(
  supabase: any,
  workspaceId: string,
  query: RAGQuery,
  queryEmbedding: number[] | null,
  guardrails: RAGGuardrails = DEFAULT_RAG_GUARDRAILS,
  config: RetrieverConfig = DEFAULT_RETRIEVER_CONFIG
): Promise<RAGRetrievalResult> {
  const startTime = Date.now();
  
  // Phase 1: Coarse retrieval
  const coarseResult = await coarseRetrieve(
    supabase,
    workspaceId,
    query,
    queryEmbedding,
    config
  );
  
  // Phase 2: Fine retrieval (re-ranking)
  const fineResult = fineRetrieve(coarseResult, query, guardrails, config);
  
  const retrievalTimeMs = Date.now() - startTime;
  
  // Build final result
  return {
    success: fineResult.selectedChunks.length > 0,
    chunks: fineResult.selectedChunks,
    historicalOutcomes: coarseResult.outcomes.filter(o => 
      fineResult.selectedChunks.some(c => c.id === o.id)
    ),
    strategicPatterns: coarseResult.patterns.filter(p =>
      fineResult.selectedChunks.some(c => c.id === p.id)
    ),
    totalRetrieved: coarseResult.totalCandidates,
    totalUsed: fineResult.selectedChunks.length,
    avgRelevance: fineResult.avgRelevance,
    retrievalTimeMs,
    warnings: fineResult.discardedCount > 0
      ? [`${fineResult.discardedCount} candidates discarded (below threshold or budget)`]
      : undefined,
  };
}
