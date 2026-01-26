/**
 * Context Window Optimization & Control Layer
 * 
 * Type definitions for the deterministic context management system.
 * Controls how AI agents select, prioritize, compress, and inject context.
 */

// =============================================================================
// TOKEN BUDGET TYPES
// =============================================================================

export interface TokenBudget {
  total: number;           // Total budget for this agent type
  systemPrompt: number;    // Reserved for system prompt
  responseBuffer: number;  // Reserved for LLM response
  available: number;       // Budget - reserves
  used: number;           // Currently used tokens
  remaining: number;      // Available - used
}

export type AgentTokenBudgetType = 'lead' | 'contact' | 'opportunity' | 'client';

export const AGENT_TOKEN_BUDGETS: Record<AgentTokenBudgetType, number> = {
  lead: 8000,
  contact: 6000,
  opportunity: 12000,
  client: 10000,
};

// =============================================================================
// CONTEXT TIER TYPES
// =============================================================================

export type ContextTierLevel = 1 | 2 | 3 | 4;

export type ContextPriority = 'critical' | 'high' | 'medium' | 'low';

export interface ContextTier {
  tier: ContextTierLevel;
  priority: ContextPriority;
  compressible: boolean;
  discardable: boolean;
}

export const CONTEXT_TIERS: Record<ContextTierLevel, ContextTier> = {
  1: {
    tier: 1,
    priority: 'critical',
    compressible: false,
    discardable: false,
  },
  2: {
    tier: 2,
    priority: 'high',
    compressible: true,
    discardable: false,
  },
  3: {
    tier: 3,
    priority: 'medium',
    compressible: true,
    discardable: true,
  },
  4: {
    tier: 4,
    priority: 'low',
    compressible: true,
    discardable: true,
  },
};

// =============================================================================
// CONTEXT ITEM TYPES
// =============================================================================

export type ContextSource = 
  | 'live_entity'
  | 'risk_indicators'
  | 'guardrails'
  | 'validated_memory'
  | 'high_relevance_facts'
  | 'recent_conclusions'
  | 'patterns'
  | 'preferences'
  | 'interaction_history'
  | 'important_signals'
  | 'old_memories'
  | 'low_relevance'
  | 'redundant';

export interface ContextItem {
  id: string;
  source: ContextSource;
  tier: ContextTierLevel;
  content: string;
  tokenCount: number;
  relevanceScore: number;
  timestamp: string;
  isLiveData: boolean;
  isValidated?: boolean;
  category?: string;
  priority: number; // Computed priority score (0-200)
}

// =============================================================================
// CONTEXT STRATEGY TYPES
// =============================================================================

export type ContextStrategyType = 'SMALL' | 'MEDIUM' | 'LARGE';

export interface ContextStrategy {
  type: ContextStrategyType;
  summarizeTiers: ContextTierLevel[];
  discardTiers: ContextTierLevel[];
  maxContextTokens: number;
  description: string;
}

// =============================================================================
// ASSEMBLED PROMPT TYPES
// =============================================================================

export interface ContextMetadata {
  strategy: ContextStrategyType;
  tiersIncluded: ContextTierLevel[];
  itemsIncluded: number;
  itemsDiscarded: number;
  itemsSummarized: number;
  summariesGenerated: number;
  dataFreshness: string; // e.g., "updated 2 days ago"
  freshnessStatus: 'fresh' | 'stale' | 'expired';
  overallConfidence: 'high' | 'medium' | 'low';
  warnings: string[];
  tokenUsage: {
    used: number;
    available: number;
    percentage: number;
  };
}

export interface AssembledPrompt {
  systemPrompt: string;
  userPrompt: string;
  totalTokens: number;
  sections: {
    constraints: string;
    currentEntityData: string;
    knownFacts: string;
    historicalPatterns: string;
    contextMetadata: string;
    agentTask: string;
  };
  contextMetadata: ContextMetadata;
}

// =============================================================================
// CONTEXT COLLECTION TYPES
// =============================================================================

export interface ContextCollectionResult {
  success: boolean;
  items: ContextItem[];
  budget: TokenBudget;
  strategy: ContextStrategy;
  warnings: string[];
  partialAnalysis?: PartialAnalysisInfo;
}

export interface PartialAnalysisInfo {
  isPartial: boolean;
  reason: string;
  completedSteps: number;
  totalSteps: number;
  analysisPerformed: string[];
  missingData: string[];
  recommendation: string;
}

// =============================================================================
// SUMMARIZATION TYPES
// =============================================================================

export interface SummarizationResult {
  originalTokens: number;
  summarizedTokens: number;
  compressionRatio: number;
  summaries: SummaryItem[];
  discardedItems: ContextItem[];
}

export interface SummaryItem {
  source: ContextSource;
  tier: ContextTierLevel;
  originalContent: string;
  summarizedContent: string;
  originalTokens: number;
  summarizedTokens: number;
}

// =============================================================================
// GUARDRAILS & CONFIGURATION
// =============================================================================

export interface ContextGuardrails {
  tokenBudgets: Record<AgentTokenBudgetType, number>;
  systemPromptReserve: number;
  responseBufferReserve: number;
  maxSummaryLength: number;
  minContextForAnalysis: number;
  staleDataWarningDays: number;
  expiredDataDays: number;
  maxMemoryEntries: number;
  maxCharactersPerMemory: number;
}

export const CONTEXT_GUARDRAILS: ContextGuardrails = {
  tokenBudgets: AGENT_TOKEN_BUDGETS,
  systemPromptReserve: 2000,
  responseBufferReserve: 3000,
  maxSummaryLength: 500,
  minContextForAnalysis: 500,
  staleDataWarningDays: 30,
  expiredDataDays: 90,
  maxMemoryEntries: 50,
  maxCharactersPerMemory: 2000,
};

// =============================================================================
// FORBIDDEN PATTERNS
// =============================================================================

export const CONTEXT_FORBIDDEN_PATTERNS = {
  NO_RAW_HISTORY: 'Histórico bruto de conversas nunca é injetado',
  NO_UNBOUNDED_CONTEXT: 'Contexto deve respeitar budget de tokens',
  NO_RANDOM_SELECTION: 'Seleção de contexto deve ser determinística',
  NO_LIVE_DATA_COMPRESSION: 'Dados CRM ao vivo nunca são comprimidos',
  NO_MEMORY_OVERRIDE: 'Memória não pode sobrepor dados ao vivo',
  NO_NAIVE_TRUNCATION: 'Truncagem cega é proibida',
  NO_ONE_SIZE_FITS_ALL: 'Contexto deve ser adaptado ao agente',
} as const;

// =============================================================================
// HELPER TYPES
// =============================================================================

export interface EntityDataForContext {
  id: string;
  type: string;
  name: string;
  data: Record<string, unknown>;
  lastUpdated: string;
}

export interface MemoryDataForContext {
  id: string;
  content: string;
  memoryType: string;
  category?: string;
  relevanceScore: number;
  isValidated: boolean;
  createdAt: string;
  expiresAt?: string;
}

export interface ContextBuildRequest {
  agentType: AgentTokenBudgetType;
  entityId: string;
  entityType: string;
  workspaceId: string;
  entityData: EntityDataForContext;
  memories: MemoryDataForContext[];
  constraints: string[];
  taskDescription: string;
}
