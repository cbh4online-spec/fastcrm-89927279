/**
 * RAG Agent Helper
 * 
 * Simplifies RAG integration for AI agents.
 * Provides a single function to retrieve and format RAG context.
 */

import { retrieve, RetrieverConfig, DEFAULT_RETRIEVER_CONFIG } from './rag-retriever.ts';
import { buildContextInjection, generateRAGSummary } from './rag-context-builder.ts';
import { DEFAULT_RAG_GUARDRAILS, RAGGuardrails, RAGQuery } from './rag-types.ts';

// =============================================================================
// TYPES
// =============================================================================

export interface RAGAgentContext {
  /** Formatted text to inject in prompt (labeled as historical evidence) */
  formattedContext: string;
  /** Token count of the injected context */
  tokenCount: number;
  /** Confidence level based on retrieval quality */
  confidenceLevel: 'high' | 'medium' | 'low' | 'none';
  /** Number of sources used */
  sourcesUsed: number;
  /** Summary for logging */
  summary: string;
  /** Whether RAG found useful content */
  hasContext: boolean;
  /** Historical outcomes found (for direct access) */
  outcomes: {
    won: number;
    lost: number;
    topSimilarity: number;
  };
  /** Retrieval timing */
  retrievalTimeMs: number;
}

export interface RAGAgentOptions {
  /** Query text for semantic search */
  queryText?: string;
  /** Filter by outcome type */
  outcomeFilter?: 'won' | 'lost' | 'all';
  /** Industry filter */
  industryFilter?: string;
  /** Custom guardrails (optional) */
  guardrails?: Partial<RAGGuardrails>;
  /** Custom retriever config (optional) */
  retrieverConfig?: Partial<RetrieverConfig>;
}

// =============================================================================
// MAIN FUNCTION
// =============================================================================

/**
 * Retrieve RAG context for an agent analysis
 * 
 * @param supabase - Supabase client
 * @param workspaceId - Workspace ID
 * @param entityId - Entity being analyzed
 * @param entityType - Type of entity (lead, opportunity, contact, company)
 * @param entityData - Entity data for context extraction
 * @param options - Additional options
 * @returns RAG context ready for prompt injection
 */
export async function getRAGContext(
  supabase: any,
  workspaceId: string,
  entityId: string,
  entityType: string,
  entityData: Record<string, unknown>,
  options: RAGAgentOptions = {}
): Promise<RAGAgentContext> {
  const openaiKey = Deno.env.get('OPENAI_API_KEY');
  
  // Build query text from entity data if not provided
  let queryText = options.queryText;
  if (!queryText) {
    queryText = buildQueryTextFromEntity(entityType, entityData);
  }
  
  // Skip RAG if insufficient query context
  if (!queryText || queryText.length < 20) {
    console.log('[RAG-Helper] Insufficient query context, skipping RAG');
    return createEmptyContext();
  }
  
  // Generate query embedding
  let queryEmbedding: number[] | null = null;
  
  if (openaiKey) {
    try {
      const embeddingResponse = await fetch('https://api.openai.com/v1/embeddings', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${openaiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: 'text-embedding-ada-002',
          input: queryText.slice(0, 8000),
        }),
      });
      
      if (embeddingResponse.ok) {
        const embeddingData = await embeddingResponse.json();
        queryEmbedding = embeddingData.data?.[0]?.embedding || null;
      }
    } catch (error) {
      console.error('[RAG-Helper] Embedding generation error:', error);
    }
  }
  
  // Build RAG query
  const ragQuery: RAGQuery = {
    text: queryText,
    entityContext: {
      entityId,
      entityType,
      entityData,
    },
    filters: {
      outcome: options.outcomeFilter,
      industry: options.industryFilter,
    },
  };
  
  // Merge guardrails
  const guardrails: RAGGuardrails = {
    ...DEFAULT_RAG_GUARDRAILS,
    ...options.guardrails,
  };
  
  // Merge retriever config
  const retrieverConfig: RetrieverConfig = {
    ...DEFAULT_RETRIEVER_CONFIG,
    ...options.retrieverConfig,
  };
  
  // Execute retrieval
  const retrievalResult = await retrieve(
    supabase,
    workspaceId,
    ragQuery,
    queryEmbedding,
    guardrails,
    retrieverConfig
  );
  
  // Build context injection
  const contextInjection = buildContextInjection(
    retrievalResult,
    guardrails.maxRAGContextTokens
  );
  
  // Generate summary for logging
  const summary = generateRAGSummary(retrievalResult);
  
  // Count outcomes
  const wonOutcomes = retrievalResult.historicalOutcomes.filter(o => o.outcome === 'won').length;
  const lostOutcomes = retrievalResult.historicalOutcomes.filter(o => o.outcome === 'lost').length;
  const topSimilarity = retrievalResult.historicalOutcomes.length > 0
    ? Math.max(...retrievalResult.historicalOutcomes.map(o => o.similarity))
    : 0;
  
  // Log metrics (async, don't await)
  logRAGMetrics(supabase, workspaceId, entityType, retrievalResult).catch(err => 
    console.error('[RAG-Helper] Failed to log metrics:', err)
  );
  
  console.log(`[RAG-Helper] Retrieved ${retrievalResult.totalUsed}/${retrievalResult.totalRetrieved} chunks, ` +
    `${wonOutcomes} won / ${lostOutcomes} lost outcomes, ` +
    `${retrievalResult.retrievalTimeMs}ms`);
  
  return {
    formattedContext: contextInjection.formattedContext,
    tokenCount: contextInjection.tokenCount,
    confidenceLevel: contextInjection.confidenceLevel,
    sourcesUsed: contextInjection.sources.length,
    summary,
    hasContext: retrievalResult.success && contextInjection.tokenCount > 0,
    outcomes: {
      won: wonOutcomes,
      lost: lostOutcomes,
      topSimilarity,
    },
    retrievalTimeMs: retrievalResult.retrievalTimeMs,
  };
}

// =============================================================================
// HELPER FUNCTIONS
// =============================================================================

/**
 * Build query text from entity data based on entity type
 */
function buildQueryTextFromEntity(
  entityType: string,
  entityData: Record<string, unknown>
): string {
  const parts: string[] = [];
  
  switch (entityType) {
    case 'opportunity':
      if (entityData.title) parts.push(String(entityData.title));
      if (entityData.value) parts.push(`Valor: €${entityData.value}`);
      if (entityData.source) parts.push(`Origem: ${entityData.source}`);
      if (entityData.notes) parts.push(String(entityData.notes).slice(0, 300));
      if (entityData.ai_insight) parts.push(String(entityData.ai_insight));
      // Include related entity info
      const company = entityData.company as Record<string, unknown> | undefined;
      const contact = entityData.contact as Record<string, unknown> | undefined;
      if (company?.name) parts.push(`Empresa: ${company.name}`);
      if (contact?.name) parts.push(`Contacto: ${contact.name}`);
      break;
      
    case 'lead':
      if (entityData.name) parts.push(String(entityData.name));
      if (entityData.source) parts.push(`Origem: ${entityData.source}`);
      if (entityData.business_category) parts.push(`Categoria: ${entityData.business_category}`);
      if (entityData.notes) parts.push(String(entityData.notes).slice(0, 300));
      if (entityData.ai_insight) parts.push(String(entityData.ai_insight));
      break;
      
    case 'contact':
    case 'company':
      if (entityData.name) parts.push(String(entityData.name));
      if (entityData.industry) parts.push(`Indústria: ${entityData.industry}`);
      if (entityData.notes) parts.push(String(entityData.notes).slice(0, 300));
      break;
      
    default:
      // Generic extraction
      if (entityData.title) parts.push(String(entityData.title));
      if (entityData.name) parts.push(String(entityData.name));
      if (entityData.notes) parts.push(String(entityData.notes).slice(0, 300));
  }
  
  return parts.join(' ');
}

/**
 * Create empty context when RAG is not applicable
 */
function createEmptyContext(): RAGAgentContext {
  return {
    formattedContext: '',
    tokenCount: 0,
    confidenceLevel: 'low',
    sourcesUsed: 0,
    summary: 'Sem contexto histórico disponível',
    hasContext: false,
    outcomes: {
      won: 0,
      lost: 0,
      topSimilarity: 0,
    },
    retrievalTimeMs: 0,
  };
}

/**
 * Log RAG metrics asynchronously
 */
async function logRAGMetrics(
  supabase: any,
  workspaceId: string,
  agentType: string,
  result: { totalRetrieved: number; totalUsed: number; avgRelevance: number; retrievalTimeMs: number }
): Promise<void> {
  try {
    await supabase.from('rag_retrieval_metrics').insert({
      workspace_id: workspaceId,
      agent_type: agentType,
      query_type: 'agent_analysis',
      chunks_retrieved: result.totalRetrieved,
      chunks_used: result.totalUsed,
      avg_relevance_score: result.avgRelevance,
      retrieval_time_ms: result.retrievalTimeMs,
      context_tokens_used: 0, // Will be updated by caller
    });
  } catch (error) {
    // Silently fail - metrics are not critical
  }
}

/**
 * Format RAG context for prompt injection
 * Returns an empty string if no context is available
 */
export function formatRAGForPrompt(ragContext: RAGAgentContext): string {
  if (!ragContext.hasContext) {
    return '';
  }
  
  return `

${ragContext.formattedContext}

`;
}
