/**
 * Context Manager - Token Estimation & Budget Enforcement
 * 
 * Responsibilities:
 * - Estimate tokens from text (rule: ~4 chars = 1 token)
 * - Define and enforce budgets per agent type
 * - Calculate remaining space in real-time
 * - Return usage metrics
 */

// =============================================================================
// TOKEN BUDGET DEFINITIONS
// =============================================================================

export type AgentType = 'lead' | 'contact' | 'opportunity' | 'client';

export interface TokenBudget {
  total: number;
  systemPrompt: number;
  responseBuffer: number;
  available: number;
  used: number;
  remaining: number;
}

// Token budgets by agent type
const AGENT_TOKEN_BUDGETS: Record<AgentType, number> = {
  lead: 8000,
  contact: 6000,
  opportunity: 12000,
  client: 10000,
};

// Mandatory reserves
const SYSTEM_PROMPT_RESERVE = 2000;
const RESPONSE_BUFFER_RESERVE = 3000;

// =============================================================================
// TOKEN ESTIMATION
// =============================================================================

/**
 * Estimate token count from text
 * Rule: ~4 characters = 1 token for PT/EN
 * Adds 10% safety margin
 */
export function estimateTokens(text: string): number {
  if (!text) return 0;
  // Base estimation: 1 token ≈ 4 characters
  // Add 10% safety margin
  return Math.ceil((text.length / 4) * 1.1);
}

/**
 * Estimate tokens for an object (JSON stringified)
 */
export function estimateObjectTokens(obj: unknown): number {
  if (!obj) return 0;
  try {
    const jsonStr = JSON.stringify(obj, null, 0);
    return estimateTokens(jsonStr);
  } catch {
    return 0;
  }
}

// =============================================================================
// BUDGET MANAGEMENT
// =============================================================================

/**
 * Create initial budget for an agent type
 */
export function createBudget(agentType: AgentType): TokenBudget {
  const total = AGENT_TOKEN_BUDGETS[agentType] || 8000;
  const available = total - SYSTEM_PROMPT_RESERVE - RESPONSE_BUFFER_RESERVE;
  
  return {
    total,
    systemPrompt: SYSTEM_PROMPT_RESERVE,
    responseBuffer: RESPONSE_BUFFER_RESERVE,
    available,
    used: 0,
    remaining: available,
  };
}

/**
 * Update budget with used tokens
 */
export function updateBudget(budget: TokenBudget, usedTokens: number): TokenBudget {
  const newUsed = budget.used + usedTokens;
  return {
    ...budget,
    used: newUsed,
    remaining: Math.max(0, budget.available - newUsed),
  };
}

/**
 * Check if budget has room for additional tokens
 */
export function hasBudgetRoom(budget: TokenBudget, requiredTokens: number): boolean {
  return budget.remaining >= requiredTokens;
}

/**
 * Get budget usage percentage
 */
export function getBudgetUsagePercent(budget: TokenBudget): number {
  if (budget.available === 0) return 100;
  return Math.round((budget.used / budget.available) * 100);
}

// =============================================================================
// STRATEGY SELECTION
// =============================================================================

export type ContextStrategy = 'SMALL' | 'MEDIUM' | 'LARGE';

export interface StrategyConfig {
  type: ContextStrategy;
  summarizeTiers: number[];
  discardTiers: number[];
  maxContextTokens: number;
  description: string;
}

/**
 * Select compression strategy based on available tokens
 */
export function selectStrategy(availableTokens: number): StrategyConfig {
  if (availableTokens >= 8000) {
    return {
      type: 'SMALL',
      summarizeTiers: [],
      discardTiers: [],
      maxContextTokens: availableTokens,
      description: 'Full context - no compression needed',
    };
  }
  
  if (availableTokens >= 4000) {
    return {
      type: 'MEDIUM',
      summarizeTiers: [3, 4],
      discardTiers: [],
      maxContextTokens: Math.floor(availableTokens * 0.95),
      description: 'Medium compression - summarize TIER 3/4',
    };
  }
  
  return {
    type: 'LARGE',
    summarizeTiers: [2, 3],
    discardTiers: [4],
    maxContextTokens: Math.floor(availableTokens * 0.9),
    description: 'Heavy compression - discard TIER 4, summarize TIER 2/3',
  };
}

// =============================================================================
// BUDGET VALIDATION
// =============================================================================

export interface BudgetValidation {
  isValid: boolean;
  canProceed: boolean;
  warnings: string[];
  errors: string[];
  suggestedAction?: string;
}

/**
 * Validate budget state and determine if analysis can proceed
 */
export function validateBudget(budget: TokenBudget): BudgetValidation {
  const warnings: string[] = [];
  const errors: string[] = [];
  
  const usagePercent = getBudgetUsagePercent(budget);
  
  // Check for critical budget issues
  if (budget.remaining < 500) {
    errors.push('Token budget critically low - cannot proceed with analysis');
    return {
      isValid: false,
      canProceed: false,
      warnings,
      errors,
      suggestedAction: 'Reduce context or increase budget',
    };
  }
  
  // Check for warning conditions
  if (usagePercent >= 80) {
    warnings.push(`High token usage: ${usagePercent}%`);
  }
  
  if (budget.remaining < 1000) {
    warnings.push('Limited space remaining - some context may be truncated');
  }
  
  return {
    isValid: true,
    canProceed: budget.remaining >= 500,
    warnings,
    errors,
    suggestedAction: warnings.length > 0 ? 'Consider context reduction' : undefined,
  };
}

// =============================================================================
// METRICS
// =============================================================================

export interface TokenMetrics {
  budget: TokenBudget;
  strategy: StrategyConfig;
  usagePercent: number;
  isHealthy: boolean;
  warnings: string[];
}

/**
 * Get comprehensive token metrics
 */
export function getTokenMetrics(agentType: AgentType, usedTokens: number): TokenMetrics {
  const budget = updateBudget(createBudget(agentType), usedTokens);
  const strategy = selectStrategy(budget.remaining);
  const usagePercent = getBudgetUsagePercent(budget);
  const validation = validateBudget(budget);
  
  return {
    budget,
    strategy,
    usagePercent,
    isHealthy: validation.isValid && validation.warnings.length === 0,
    warnings: validation.warnings,
  };
}
