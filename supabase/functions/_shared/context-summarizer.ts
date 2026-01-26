/**
 * Context Summarizer - Adaptive Compression Logic
 * 
 * Responsibilities:
 * - Apply compression strategies per tier
 * - Summarize by importance, not time
 * - Maintain structured output (bullet points)
 * - Ensure stability across executions
 * 
 * Rules:
 * ❌ NEVER summarize live CRM data
 * ❌ NEVER summarize validated facts
 * ✅ Summarize by importance, not by time
 * ✅ Format structured (bullet points)
 * ✅ Stable across executions
 */

import { estimateTokens, StrategyConfig } from './context-manager.ts';
import { ContextItem, ContextTierLevel } from './context-collector.ts';

// =============================================================================
// TYPES
// =============================================================================

export interface SummaryItem {
  originalItem: ContextItem;
  summarizedContent: string;
  originalTokens: number;
  summarizedTokens: number;
  compressionRatio: number;
}

export interface SummarizationResult {
  items: ContextItem[];
  summaries: SummaryItem[];
  discardedItems: ContextItem[];
  totalOriginalTokens: number;
  totalFinalTokens: number;
  overallCompressionRatio: number;
  warnings: string[];
}

// =============================================================================
// SUMMARIZATION RULES
// =============================================================================

const MAX_SUMMARY_LENGTH = 500; // Characters per summary
const MIN_CONTENT_FOR_SUMMARY = 100; // Don't summarize very short content

/**
 * Check if an item can be summarized
 */
function canSummarize(item: ContextItem): boolean {
  // NEVER summarize live data
  if (item.isLiveData) return false;
  
  // NEVER summarize validated facts
  if (item.isValidated && item.source === 'validated_memory') return false;
  
  // NEVER summarize TIER 1
  if (item.tier === 1) return false;
  
  // Don't summarize very short content
  if (item.content.length < MIN_CONTENT_FOR_SUMMARY) return false;
  
  return true;
}

/**
 * Check if an item can be discarded
 */
function canDiscard(item: ContextItem): boolean {
  // NEVER discard TIER 1 or 2
  if (item.tier <= 2) return false;
  
  // NEVER discard live data
  if (item.isLiveData) return false;
  
  // NEVER discard validated items
  if (item.isValidated) return false;
  
  return true;
}

// =============================================================================
// SUMMARIZATION STRATEGIES
// =============================================================================

/**
 * Summarize a single context item
 * Uses rule-based summarization (no AI needed)
 */
function summarizeContent(content: string, category?: string): string {
  // Split into lines/sentences
  const lines = content
    .split(/[\n.!?]+/)
    .map((l) => l.trim())
    .filter((l) => l.length > 0);
  
  if (lines.length === 0) return content;
  
  // Strategy: Keep most important lines, structure as bullets
  const importantLines = extractImportantLines(lines, category);
  
  // Format as concise bullets
  const summary = importantLines
    .slice(0, 5) // Max 5 bullet points
    .map((line) => `• ${truncateLine(line, 100)}`)
    .join('\n');
  
  return summary.substring(0, MAX_SUMMARY_LENGTH);
}

/**
 * Extract most important lines based on category
 */
function extractImportantLines(lines: string[], category?: string): string[] {
  // Score each line by importance signals
  const scored = lines.map((line) => {
    let score = 0;
    
    // Important keywords boost
    const importantKeywords = [
      'cliente', 'risco', 'urgente', 'importante', 'validado',
      'compra', 'valor', 'decisor', 'objeção', 'interesse',
      'problema', 'solução', 'preço', 'prazo', 'contrato',
    ];
    
    importantKeywords.forEach((kw) => {
      if (line.toLowerCase().includes(kw)) score += 2;
    });
    
    // Numbers often indicate important facts
    if (/\d+/.test(line)) score += 1;
    
    // Currency indicates business value
    if (/€|\$|eur|usd/i.test(line)) score += 2;
    
    // Longer lines often contain more information
    if (line.length > 50) score += 1;
    
    // Category-specific boosts
    if (category === 'risk' && line.toLowerCase().includes('risco')) score += 3;
    if (category === 'pattern' && line.toLowerCase().includes('padrão')) score += 3;
    
    return { line, score };
  });
  
  // Sort by score and return lines
  return scored
    .sort((a, b) => b.score - a.score)
    .map((s) => s.line);
}

/**
 * Truncate a line to max length
 */
function truncateLine(line: string, maxLength: number): string {
  if (line.length <= maxLength) return line;
  return line.substring(0, maxLength - 3) + '...';
}

// =============================================================================
// MAIN SUMMARIZATION FLOW
// =============================================================================

/**
 * Apply summarization strategy to context items
 */
export function summarizeContext(
  items: ContextItem[],
  strategy: StrategyConfig,
  maxTokens: number
): SummarizationResult {
  const warnings: string[] = [];
  const summaries: SummaryItem[] = [];
  const discardedItems: ContextItem[] = [];
  const resultItems: ContextItem[] = [];
  
  let totalOriginalTokens = 0;
  let totalFinalTokens = 0;
  
  // Process items by tier
  for (const item of items) {
    totalOriginalTokens += item.tokenCount;
    
    // Check if should discard
    if (strategy.discardTiers.includes(item.tier) && canDiscard(item)) {
      discardedItems.push(item);
      warnings.push(`Discarded: ${item.source} (TIER ${item.tier})`);
      continue;
    }
    
    // Check if should summarize
    if (strategy.summarizeTiers.includes(item.tier) && canSummarize(item)) {
      const summarizedContent = summarizeContent(item.content, item.category);
      const summarizedTokens = estimateTokens(summarizedContent);
      
      summaries.push({
        originalItem: item,
        summarizedContent,
        originalTokens: item.tokenCount,
        summarizedTokens,
        compressionRatio: summarizedTokens / item.tokenCount,
      });
      
      // Add summarized version
      resultItems.push({
        ...item,
        content: summarizedContent,
        tokenCount: summarizedTokens,
      });
      totalFinalTokens += summarizedTokens;
    } else {
      // Keep as-is
      resultItems.push(item);
      totalFinalTokens += item.tokenCount;
    }
  }
  
  // Final budget check - drop lowest priority items if still over budget
  if (totalFinalTokens > maxTokens) {
    const sorted = [...resultItems].sort((a, b) => a.priority - b.priority);
    let currentTokens = totalFinalTokens;
    
    while (currentTokens > maxTokens && sorted.length > 0) {
      const toRemove = sorted.shift();
      if (toRemove && canDiscard(toRemove)) {
        const idx = resultItems.findIndex((i) => i.id === toRemove.id);
        if (idx !== -1) {
          resultItems.splice(idx, 1);
          currentTokens -= toRemove.tokenCount;
          discardedItems.push(toRemove);
          warnings.push(`Budget overflow: removed ${toRemove.source}`);
        }
      } else {
        break; // Can't remove any more items
      }
    }
    
    totalFinalTokens = currentTokens;
  }
  
  return {
    items: resultItems,
    summaries,
    discardedItems,
    totalOriginalTokens,
    totalFinalTokens,
    overallCompressionRatio: totalOriginalTokens > 0 
      ? totalFinalTokens / totalOriginalTokens 
      : 1,
    warnings,
  };
}

// =============================================================================
// HELPER FUNCTIONS
// =============================================================================

/**
 * Group memories by category for summary
 */
export function groupMemoriesByCategory(items: ContextItem[]): Map<string, ContextItem[]> {
  const groups = new Map<string, ContextItem[]>();
  
  for (const item of items) {
    const category = item.category || 'general';
    if (!groups.has(category)) {
      groups.set(category, []);
    }
    groups.get(category)!.push(item);
  }
  
  return groups;
}

/**
 * Create a category summary from multiple items
 */
export function createCategorySummary(items: ContextItem[], category: string): string {
  if (items.length === 0) return '';
  
  // Combine all content
  const allContent = items.map((i) => i.content).join('\n');
  
  // Summarize
  return summarizeContent(allContent, category);
}
