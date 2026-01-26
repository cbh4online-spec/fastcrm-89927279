/**
 * RAG Context Builder
 * 
 * Builds formatted context from RAG retrieval results.
 * Ensures proper labeling, separation from live data, and token compliance.
 */

import {
  RAGChunk,
  RAGRetrievalResult,
  RAGContext,
  RAGContextInjection,
  RAGConfidenceLevel,
  HistoricalOutcome,
  StrategicPattern,
  DEFAULT_RAG_GUARDRAILS,
} from './rag-types.ts';
import { determineConfidence } from './rag-guardrails.ts';

// =============================================================================
// CONTEXT FORMATTING
// =============================================================================

const RAG_HEADER = `
═══════════════════════════════════════════════════════════════
📊 EVIDÊNCIA HISTÓRICA (não confundir com dados atuais)
═══════════════════════════════════════════════════════════════
`.trim();

const RAG_FOOTER = `
═══════════════════════════════════════════════════════════════
`.trim();

/**
 * Format a single outcome for context injection
 */
function formatOutcome(outcome: HistoricalOutcome, index: number): string {
  const lines: string[] = [];
  
  const outcomeLabel = outcome.outcome === 'won' ? 'GANHA' : 'PERDIDA';
  const similarity = Math.round(outcome.similarity * 100);
  
  lines.push(`### ${index}. Oportunidade ${outcomeLabel} (similaridade: ${similarity}%)`);
  
  if (outcome.outcomeValue) {
    lines.push(`- Valor: €${outcome.outcomeValue.toLocaleString('pt-PT')}`);
  }
  
  if (outcome.outcomeReason) {
    lines.push(`- ${outcome.outcome === 'won' ? 'Razão do sucesso' : 'Motivo da perda'}: ${outcome.outcomeReason}`);
  }
  
  if (outcome.successFactors?.length) {
    lines.push(`- Fatores de sucesso: ${outcome.successFactors.join(', ')}`);
  }
  
  if (outcome.failureFactors?.length) {
    lines.push(`- Fatores de falha: ${outcome.failureFactors.join(', ')}`);
  }
  
  if (outcome.lessonsLearned) {
    lines.push(`- Lição aprendida: ${outcome.lessonsLearned}`);
  }
  
  return lines.join('\n');
}

/**
 * Format a strategic pattern for context injection
 */
function formatPattern(pattern: StrategicPattern): string {
  const lines: string[] = [];
  
  lines.push(`- **${pattern.patternType}**: ${pattern.patternDescription}`);
  
  if (pattern.recommendedActions?.length) {
    lines.push(`  - Recomendado: ${pattern.recommendedActions.slice(0, 3).join(', ')}`);
  }
  
  if (pattern.occurrenceCount > 1) {
    lines.push(`  - Ocorrências: ${pattern.occurrenceCount} vezes`);
  }
  
  return lines.join('\n');
}

/**
 * Format a generic chunk for context injection
 */
function formatChunk(chunk: RAGChunk): string {
  const relevance = Math.round(chunk.relevanceScore * 100);
  const typeLabel = getChunkTypeLabel(chunk.chunkType);
  
  return `- [${typeLabel}] (${relevance}% relevante): ${chunk.content.slice(0, 200)}${chunk.content.length > 200 ? '...' : ''}`;
}

function getChunkTypeLabel(type: RAGChunk['chunkType']): string {
  switch (type) {
    case 'outcome': return 'Histórico';
    case 'pattern': return 'Padrão';
    case 'knowledge': return 'Conhecimento';
    case 'memory': return 'Memória';
    default: return 'Info';
  }
}

// =============================================================================
// CONTEXT BUILDING
// =============================================================================

/**
 * Build formatted RAG context from retrieval result
 */
export function buildRAGContext(
  result: RAGRetrievalResult
): RAGContext {
  if (!result.success || result.chunks.length === 0) {
    return {
      historicalEvidence: '',
      patternsIdentified: '',
      confidenceLevel: 'none',
      sourcesUsed: 0,
      tokenCount: 0,
    };
  }
  
  const sections: string[] = [];
  
  // Section 1: Historical outcomes
  const outcomes = result.historicalOutcomes.filter(o => o.similarity >= 0.6);
  if (outcomes.length > 0) {
    sections.push('## Casos Similares Relevantes:\n');
    outcomes.forEach((outcome, i) => {
      sections.push(formatOutcome(outcome, i + 1));
    });
  }
  
  // Section 2: Strategic patterns
  const patterns = result.strategicPatterns.filter(p => p.confidenceScore >= 0.5);
  if (patterns.length > 0) {
    sections.push('\n## Padrões Identificados:\n');
    patterns.forEach(pattern => {
      sections.push(formatPattern(pattern));
    });
  }
  
  // Section 3: Additional knowledge chunks
  const knowledgeChunks = result.chunks.filter(c => 
    c.chunkType === 'knowledge' && c.relevanceScore >= 0.6
  );
  if (knowledgeChunks.length > 0) {
    sections.push('\n## Conhecimento Relevante:\n');
    knowledgeChunks.slice(0, 3).forEach(chunk => {
      sections.push(formatChunk(chunk));
    });
  }
  
  const historicalEvidence = sections.join('\n');
  
  // Build patterns summary
  const patternsIdentified = patterns
    .map(p => p.patternDescription)
    .join('; ');
  
  // Determine confidence
  const confidenceLevel = determineConfidence(
    result.avgRelevance,
    result.totalUsed
  );
  
  // Count tokens
  const tokenCount = estimateTokens(historicalEvidence);
  
  return {
    historicalEvidence,
    patternsIdentified,
    confidenceLevel,
    sourcesUsed: result.totalUsed,
    tokenCount,
  };
}

/**
 * Build complete context injection with headers
 */
export function buildContextInjection(
  result: RAGRetrievalResult,
  maxTokens: number = DEFAULT_RAG_GUARDRAILS.maxRAGContextTokens
): RAGContextInjection {
  const context = buildRAGContext(result);
  
  if (context.sourcesUsed === 0) {
    return {
      formattedContext: '',
      tokenCount: 0,
      sources: [],
      confidenceLevel: 'none',
    };
  }
  
  // Build full formatted context with headers
  let formattedContext = `${RAG_HEADER}\n\n${context.historicalEvidence}\n\n${RAG_FOOTER}`;
  
  // Truncate if exceeds budget
  let tokenCount = estimateTokens(formattedContext);
  if (tokenCount > maxTokens) {
    // Progressive truncation
    const ratio = maxTokens / tokenCount;
    const truncatedLength = Math.floor(context.historicalEvidence.length * ratio * 0.9);
    const truncated = context.historicalEvidence.slice(0, truncatedLength) + '\n\n[... contexto truncado por limite de tokens]';
    formattedContext = `${RAG_HEADER}\n\n${truncated}\n\n${RAG_FOOTER}`;
    tokenCount = estimateTokens(formattedContext);
  }
  
  // Build source references
  const sources = result.chunks.map(chunk => ({
    type: chunk.chunkType,
    id: chunk.id,
    relevance: chunk.relevanceScore,
  }));
  
  return {
    formattedContext,
    tokenCount,
    sources,
    confidenceLevel: context.confidenceLevel,
  };
}

// =============================================================================
// HELPERS
// =============================================================================

function estimateTokens(text: string): number {
  return Math.ceil(text.length / 4);
}

/**
 * Generate a summary of RAG usage for logging
 */
export function generateRAGSummary(result: RAGRetrievalResult): string {
  if (!result.success) {
    return 'RAG: Sem resultados relevantes encontrados';
  }
  
  const parts: string[] = [];
  parts.push(`RAG: ${result.totalUsed} fontes utilizadas`);
  parts.push(`(${Math.round(result.avgRelevance * 100)}% relevância média)`);
  
  const outcomeCount = result.historicalOutcomes.length;
  const patternCount = result.strategicPatterns.length;
  
  if (outcomeCount > 0) {
    parts.push(`${outcomeCount} casos históricos`);
  }
  if (patternCount > 0) {
    parts.push(`${patternCount} padrões`);
  }
  
  parts.push(`em ${result.retrievalTimeMs}ms`);
  
  return parts.join(', ');
}

/**
 * Check if RAG context is worth including
 */
export function isRAGContextWorthIncluding(
  context: RAGContext,
  minRelevance: number = 0.6
): boolean {
  if (context.sourcesUsed === 0) return false;
  if (context.confidenceLevel === 'none' || context.confidenceLevel === 'low') return false;
  if (context.tokenCount < 50) return false; // Too little content
  
  return true;
}
