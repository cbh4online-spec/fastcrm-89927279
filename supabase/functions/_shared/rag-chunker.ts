/**
 * RAG Semantic Chunker
 * 
 * Divides content into semantic chunks based on meaning, not fixed size.
 * Respects document structure, extracts metadata, and calculates quality scores.
 */

import { RAGChunkType } from './rag-types.ts';

// =============================================================================
// CONFIGURATION
// =============================================================================

export interface ChunkingConfig {
  maxChunkSize: number;       // Max tokens per chunk
  minChunkSize: number;       // Min tokens per chunk
  overlapSentences: number;   // Sentences to overlap between chunks
  preserveStructure: boolean; // Respect headers/paragraphs
}

export const DEFAULT_CHUNKING_CONFIG: ChunkingConfig = {
  maxChunkSize: 500,
  minChunkSize: 50,
  overlapSentences: 1,
  preserveStructure: true,
};

// =============================================================================
// CHUNK OUTPUT TYPES
// =============================================================================

export interface SemanticChunk {
  index: number;
  content: string;
  metadata: ChunkMetadata;
  qualityScore: number;
  tokenEstimate: number;
}

export interface ChunkMetadata {
  sourceType: RAGChunkType;
  section?: string;
  keywords: string[];
  hasNumbers: boolean;
  hasEntities: boolean;
  sentenceCount: number;
  [key: string]: unknown;
}

export interface ChunkedDocument {
  sourceId: string;
  sourceTable: string;
  chunks: SemanticChunk[];
  totalTokens: number;
  avgQuality: number;
}

// =============================================================================
// TEXT UTILITIES
// =============================================================================

/**
 * Estimate token count (~4 chars = 1 token for PT/EN)
 */
export function estimateTokens(text: string): number {
  if (!text) return 0;
  return Math.ceil(text.length / 4);
}

/**
 * Split text into sentences
 */
export function splitIntoSentences(text: string): string[] {
  if (!text) return [];
  
  // Handle common abbreviations
  const normalized = text
    .replace(/Dr\./g, 'Dr·')
    .replace(/Sr\./g, 'Sr·')
    .replace(/Sra\./g, 'Sra·')
    .replace(/etc\./g, 'etc·')
    .replace(/vs\./g, 'vs·')
    .replace(/\.\.\./g, '…');
  
  // Split on sentence boundaries
  const sentences = normalized
    .split(/(?<=[.!?])\s+/)
    .map(s => s
      .replace(/Dr·/g, 'Dr.')
      .replace(/Sr·/g, 'Sr.')
      .replace(/Sra·/g, 'Sra.')
      .replace(/etc·/g, 'etc.')
      .replace(/vs·/g, 'vs.')
      .replace(/…/g, '...')
      .trim()
    )
    .filter(s => s.length > 0);
  
  return sentences;
}

/**
 * Extract keywords from text (simple extraction)
 */
export function extractKeywords(text: string): string[] {
  if (!text) return [];
  
  // Common Portuguese/English stop words
  const stopWords = new Set([
    'de', 'da', 'do', 'das', 'dos', 'em', 'no', 'na', 'nos', 'nas',
    'por', 'para', 'com', 'sem', 'sob', 'sobre', 'entre',
    'que', 'qual', 'quais', 'como', 'onde', 'quando',
    'um', 'uma', 'uns', 'umas', 'o', 'a', 'os', 'as',
    'e', 'ou', 'mas', 'porém', 'contudo', 'todavia',
    'se', 'não', 'sim', 'mais', 'menos', 'muito', 'pouco',
    'the', 'a', 'an', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for',
    'of', 'with', 'by', 'from', 'as', 'is', 'was', 'are', 'were', 'be',
  ]);
  
  // Extract words, filter stop words, get unique
  const words = text
    .toLowerCase()
    .replace(/[^\w\sáéíóúâêîôûãõç]/g, ' ')
    .split(/\s+/)
    .filter(w => w.length > 3 && !stopWords.has(w));
  
  // Count frequency
  const freq = new Map<string, number>();
  for (const word of words) {
    freq.set(word, (freq.get(word) || 0) + 1);
  }
  
  // Return top 10 by frequency
  return Array.from(freq.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10)
    .map(([word]) => word);
}

/**
 * Detect if text contains numbers/metrics
 */
export function hasNumbers(text: string): boolean {
  return /\d+(?:[.,]\d+)?(?:\s*%|\s*€|\s*\$)?/.test(text);
}

/**
 * Detect if text contains named entities (capitalized words)
 */
export function hasEntities(text: string): boolean {
  // Look for capitalized words that aren't at sentence start
  return /(?<=[.!?]\s+|\n)[A-Z][a-záéíóúâêîôûãõç]+/.test(text) ||
         /[A-Z][a-záéíóúâêîôûãõç]+\s+[A-Z][a-záéíóúâêîôûãõç]+/.test(text);
}

/**
 * Detect section headers in text
 */
export function detectSections(text: string): string[] {
  const sections: string[] = [];
  
  // Markdown headers
  const mdHeaders = text.match(/^#{1,3}\s+.+$/gm);
  if (mdHeaders) {
    sections.push(...mdHeaders.map(h => h.replace(/^#+\s*/, '').trim()));
  }
  
  // All caps lines (common header format)
  const capsHeaders = text.match(/^[A-ZÁÉÍÓÚÂÊÎÔÛÃÕÇ\s]{5,}$/gm);
  if (capsHeaders) {
    sections.push(...capsHeaders.map(h => h.trim()));
  }
  
  return sections;
}

// =============================================================================
// QUALITY SCORING
// =============================================================================

/**
 * Calculate quality score for a chunk (0-1)
 */
export function calculateQualityScore(chunk: string, metadata: ChunkMetadata): number {
  let score = 0.5; // Base score
  
  const tokens = estimateTokens(chunk);
  
  // Length penalties
  if (tokens < 20) score -= 0.2;  // Too short
  if (tokens > 400) score -= 0.1; // Too long
  if (tokens >= 50 && tokens <= 300) score += 0.1; // Ideal length
  
  // Content bonuses
  if (metadata.hasNumbers) score += 0.1;  // Contains data
  if (metadata.hasEntities) score += 0.05; // Contains entities
  if (metadata.keywords.length >= 3) score += 0.1; // Rich content
  if (metadata.sentenceCount >= 2 && metadata.sentenceCount <= 5) score += 0.1; // Good sentence count
  
  // Section bonus
  if (metadata.section) score += 0.05;
  
  return Math.max(0, Math.min(1, score));
}

// =============================================================================
// SEMANTIC CHUNKING
// =============================================================================

/**
 * Chunk text semantically based on content structure
 */
export function chunkText(
  text: string,
  sourceType: RAGChunkType,
  config: ChunkingConfig = DEFAULT_CHUNKING_CONFIG
): SemanticChunk[] {
  if (!text || text.trim().length === 0) {
    return [];
  }
  
  const chunks: SemanticChunk[] = [];
  const sections = detectSections(text);
  
  // Split by paragraphs first (respects structure)
  const paragraphs = text
    .split(/\n\n+/)
    .map(p => p.trim())
    .filter(p => p.length > 0);
  
  let currentChunk = '';
  let currentSection = sections[0] || undefined;
  let chunkIndex = 0;
  
  for (const paragraph of paragraphs) {
    // Check if paragraph is a header
    const isHeader = sections.includes(paragraph.replace(/^#+\s*/, '').trim());
    if (isHeader) {
      currentSection = paragraph.replace(/^#+\s*/, '').trim();
    }
    
    const combinedTokens = estimateTokens(currentChunk + ' ' + paragraph);
    
    // If adding this paragraph exceeds max, finalize current chunk
    if (currentChunk && combinedTokens > config.maxChunkSize) {
      const sentences = splitIntoSentences(currentChunk);
      const keywords = extractKeywords(currentChunk);
      
      const metadata: ChunkMetadata = {
        sourceType,
        section: currentSection,
        keywords,
        hasNumbers: hasNumbers(currentChunk),
        hasEntities: hasEntities(currentChunk),
        sentenceCount: sentences.length,
      };
      
      const qualityScore = calculateQualityScore(currentChunk, metadata);
      
      // Only add if meets minimum size and quality
      if (estimateTokens(currentChunk) >= config.minChunkSize && qualityScore >= 0.3) {
        chunks.push({
          index: chunkIndex++,
          content: currentChunk.trim(),
          metadata,
          qualityScore,
          tokenEstimate: estimateTokens(currentChunk),
        });
      }
      
      // Start new chunk with overlap
      if (config.overlapSentences > 0 && sentences.length > config.overlapSentences) {
        currentChunk = sentences.slice(-config.overlapSentences).join(' ') + ' ' + paragraph;
      } else {
        currentChunk = paragraph;
      }
    } else {
      // Add to current chunk
      currentChunk = currentChunk ? currentChunk + '\n\n' + paragraph : paragraph;
    }
  }
  
  // Finalize last chunk
  if (currentChunk && estimateTokens(currentChunk) >= config.minChunkSize) {
    const sentences = splitIntoSentences(currentChunk);
    const keywords = extractKeywords(currentChunk);
    
    const metadata: ChunkMetadata = {
      sourceType,
      section: currentSection,
      keywords,
      hasNumbers: hasNumbers(currentChunk),
      hasEntities: hasEntities(currentChunk),
      sentenceCount: sentences.length,
    };
    
    const qualityScore = calculateQualityScore(currentChunk, metadata);
    
    if (qualityScore >= 0.3) {
      chunks.push({
        index: chunkIndex,
        content: currentChunk.trim(),
        metadata,
        qualityScore,
        tokenEstimate: estimateTokens(currentChunk),
      });
    }
  }
  
  return chunks;
}

// =============================================================================
// SPECIALIZED CHUNKERS
// =============================================================================

/**
 * Chunk an opportunity outcome for RAG indexing
 */
export function chunkOpportunityOutcome(
  opportunity: Record<string, unknown>,
  outcome: 'won' | 'lost',
  outcomeReason?: string
): SemanticChunk[] {
  const parts: string[] = [];
  
  // Build narrative from opportunity data
  parts.push(`Oportunidade: ${opportunity.title || 'Sem título'}`);
  parts.push(`Resultado: ${outcome === 'won' ? 'GANHA' : 'PERDIDA'}`);
  
  if (opportunity.value) {
    parts.push(`Valor: €${Number(opportunity.value).toLocaleString('pt-PT')}`);
  }
  
  if (outcome === 'lost' && outcomeReason) {
    parts.push(`Motivo da perda: ${outcomeReason}`);
  }
  
  if (opportunity.source) {
    parts.push(`Origem: ${opportunity.source}`);
  }
  
  if (opportunity.notes) {
    parts.push(`Notas: ${opportunity.notes}`);
  }
  
  if (opportunity.ai_insight) {
    parts.push(`Análise AI: ${opportunity.ai_insight}`);
  }
  
  const content = parts.join('\n');
  
  return chunkText(content, 'outcome', {
    ...DEFAULT_CHUNKING_CONFIG,
    maxChunkSize: 400,
    minChunkSize: 30,
  });
}

/**
 * Chunk knowledge base entry for RAG indexing
 */
export function chunkKnowledgeEntry(
  entry: { question: string; answer: string; category?: string; keywords?: string[] }
): SemanticChunk[] {
  const content = `Pergunta: ${entry.question}\n\nResposta: ${entry.answer}`;
  
  const chunks = chunkText(content, 'knowledge', {
    ...DEFAULT_CHUNKING_CONFIG,
    maxChunkSize: 600,
  });
  
  // Add category to metadata
  for (const chunk of chunks) {
    if (entry.category) {
      chunk.metadata.category = entry.category;
    }
    if (entry.keywords) {
      chunk.metadata.keywords = [...new Set([...chunk.metadata.keywords, ...entry.keywords])];
    }
  }
  
  return chunks;
}

/**
 * Chunk strategic pattern for RAG indexing
 */
export function chunkStrategicPattern(
  pattern: {
    patternType: string;
    patternDescription: string;
    recommendedActions?: string[];
    contraindicatedActions?: string[];
  }
): SemanticChunk[] {
  const parts: string[] = [];
  
  parts.push(`Padrão: ${pattern.patternType}`);
  parts.push(pattern.patternDescription);
  
  if (pattern.recommendedActions?.length) {
    parts.push(`Ações recomendadas: ${pattern.recommendedActions.join(', ')}`);
  }
  
  if (pattern.contraindicatedActions?.length) {
    parts.push(`Ações a evitar: ${pattern.contraindicatedActions.join(', ')}`);
  }
  
  const content = parts.join('\n\n');
  
  return chunkText(content, 'pattern', {
    ...DEFAULT_CHUNKING_CONFIG,
    maxChunkSize: 400,
  });
}

// =============================================================================
// DOCUMENT CHUNKING
// =============================================================================

/**
 * Chunk an entire document and return structured result
 */
export function chunkDocument(
  sourceId: string,
  sourceTable: string,
  content: string,
  sourceType: RAGChunkType,
  config: ChunkingConfig = DEFAULT_CHUNKING_CONFIG
): ChunkedDocument {
  const chunks = chunkText(content, sourceType, config);
  
  const totalTokens = chunks.reduce((sum, c) => sum + c.tokenEstimate, 0);
  const avgQuality = chunks.length > 0
    ? chunks.reduce((sum, c) => sum + c.qualityScore, 0) / chunks.length
    : 0;
  
  return {
    sourceId,
    sourceTable,
    chunks,
    totalTokens,
    avgQuality,
  };
}

/**
 * Generate embedding text from chunks
 */
export function generateEmbeddingText(chunks: SemanticChunk[]): string {
  return chunks
    .sort((a, b) => b.qualityScore - a.qualityScore)
    .slice(0, 3) // Top 3 quality chunks
    .map(c => c.content)
    .join('\n\n');
}
