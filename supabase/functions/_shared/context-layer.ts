/**
 * Context Layer Integration
 * 
 * Main integration module that combines all context control layer components
 * to provide a unified API for AI agents.
 */

import {
  estimateTokens,
  createBudget,
  updateBudget,
  selectStrategy,
  validateBudget,
  getTokenMetrics,
  AgentType,
  TokenBudget,
  StrategyConfig,
} from './context-manager.ts';

import {
  collectEntityContext,
  collectMemoryContext,
  collectGuardrailsContext,
  collectAllContext,
  sortByPriority,
  fitToBudget,
  ContextItem,
  EntityData,
  MemoryData,
  CollectionResult,
} from './context-collector.ts';

import {
  summarizeContext,
  SummarizationResult,
} from './context-summarizer.ts';

import {
  assemblePrompt,
  buildPartialAnalysisResponse,
  AssembledPrompt,
  ContextMetadata,
  PartialAnalysisResponse,
} from './prompt-assembler.ts';

// =============================================================================
// RE-EXPORTS
// =============================================================================

export {
  // Context Manager
  estimateTokens,
  createBudget,
  updateBudget,
  selectStrategy,
  validateBudget,
  getTokenMetrics,
  
  // Context Collector
  collectEntityContext,
  collectMemoryContext,
  collectGuardrailsContext,
  collectAllContext,
  sortByPriority,
  fitToBudget,
  
  // Context Summarizer
  summarizeContext,
  
  // Prompt Assembler
  assemblePrompt,
  buildPartialAnalysisResponse,
};

// Re-export types
export type {
  AgentType,
  TokenBudget,
  StrategyConfig,
  ContextItem,
  EntityData,
  MemoryData,
  CollectionResult,
  SummarizationResult,
  AssembledPrompt,
  ContextMetadata,
  PartialAnalysisResponse,
};

// =============================================================================
// MAIN INTEGRATION API
// =============================================================================

export interface ContextBuildOptions {
  agentType: AgentType;
  entityId: string;
  entityType: string;
  entityData: EntityData;
  memories: MemoryData[];
}

export interface ContextBuildResult {
  success: boolean;
  prompt: AssembledPrompt | null;
  budget: TokenBudget;
  strategy: StrategyConfig;
  metrics: {
    totalItems: number;
    includedItems: number;
    discardedItems: number;
    summarizedItems: number;
    compressionRatio: number;
  };
  warnings: string[];
  partialAnalysis?: PartialAnalysisResponse;
}

/**
 * Build optimized context for an AI agent
 * 
 * This is the main entry point for the Context Control Layer.
 * It handles the full flow:
 * 1. Create token budget for agent type
 * 2. Collect context from all sources
 * 3. Select compression strategy
 * 4. Apply summarization if needed
 * 5. Assemble structured prompt
 */
export function buildOptimizedContext(options: ContextBuildOptions): ContextBuildResult {
  const { agentType, entityId, entityType, entityData, memories } = options;
  const warnings: string[] = [];
  
  // Step 1: Create budget for this agent type
  const budget = createBudget(agentType);
  console.log(`[ContextLayer] Budget for ${agentType}: ${budget.available} tokens available`);
  
  // Step 2: Collect all context
  const collection = collectAllContext(entityData, entityType, memories, agentType);
  warnings.push(...collection.warnings);
  console.log(`[ContextLayer] Collected ${collection.items.length} items, ${collection.totalTokens} tokens`);
  
  // Step 3: Select strategy based on available tokens
  const strategy = selectStrategy(budget.available);
  console.log(`[ContextLayer] Strategy: ${strategy.type} - ${strategy.description}`);
  
  // Step 4: Apply summarization if needed
  const summarization = summarizeContext(collection.items, strategy, strategy.maxContextTokens);
  warnings.push(...summarization.warnings);
  
  const finalTokens = summarization.totalFinalTokens;
  const updatedBudget = updateBudget(budget, finalTokens);
  
  console.log(`[ContextLayer] After summarization: ${summarization.items.length} items, ${finalTokens} tokens (${Math.round(summarization.overallCompressionRatio * 100)}% of original)`);
  
  // Step 5: Validate budget
  const validation = validateBudget(updatedBudget);
  if (!validation.canProceed) {
    // Return partial analysis
    const partial = buildPartialAnalysisResponse(
      ['entity_data', 'memory_retrieval'],
      ['context_assembly'],
      validation.errors.join('; ')
    );
    
    return {
      success: false,
      prompt: null,
      budget: updatedBudget,
      strategy,
      metrics: {
        totalItems: collection.items.length,
        includedItems: summarization.items.length,
        discardedItems: summarization.discardedItems.length,
        summarizedItems: summarization.summaries.length,
        compressionRatio: summarization.overallCompressionRatio,
      },
      warnings: [...warnings, ...validation.warnings, ...validation.errors],
      partialAnalysis: partial,
    };
  }
  
  warnings.push(...validation.warnings);
  
  // Step 6: Assemble structured prompt
  const prompt = assemblePrompt({
    agentType,
    entityType,
    items: summarization.items,
    budget: updatedBudget,
    strategy: strategy.type,
    discardedCount: summarization.discardedItems.length,
    warnings,
  });
  
  console.log(`[ContextLayer] Prompt assembled: ${prompt.totalTokens} tokens, confidence: ${prompt.metadata.overallConfidence}`);
  
  return {
    success: true,
    prompt,
    budget: updatedBudget,
    strategy,
    metrics: {
      totalItems: collection.items.length,
      includedItems: summarization.items.length,
      discardedItems: summarization.discardedItems.length,
      summarizedItems: summarization.summaries.length,
      compressionRatio: summarization.overallCompressionRatio,
    },
    warnings,
  };
}

// =============================================================================
// CONVENIENCE FUNCTIONS
// =============================================================================

/**
 * Quick check if context can be built within budget
 */
export function canBuildContext(
  agentType: AgentType,
  entityData: EntityData,
  memories: MemoryData[]
): { possible: boolean; estimatedTokens: number; budgetAvailable: number } {
  const budget = createBudget(agentType);
  const collection = collectAllContext(entityData, 'entity', memories, agentType);
  
  return {
    possible: collection.totalTokens <= budget.available,
    estimatedTokens: collection.totalTokens,
    budgetAvailable: budget.available,
  };
}

/**
 * Get token metrics for logging/debugging
 */
export function getContextMetrics(
  agentType: AgentType,
  entityData: EntityData,
  memories: MemoryData[]
): {
  budget: TokenBudget;
  collectedTokens: number;
  tierCounts: Record<number, number>;
  strategy: StrategyConfig;
} {
  const budget = createBudget(agentType);
  const collection = collectAllContext(entityData, 'entity', memories, agentType);
  const strategy = selectStrategy(budget.available);
  
  return {
    budget,
    collectedTokens: collection.totalTokens,
    tierCounts: collection.tierCounts,
    strategy,
  };
}
