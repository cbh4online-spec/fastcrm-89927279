/**
 * AI Safety Rules for Inbox
 * 
 * Strict rules for AI behavior in the inbox:
 * 
 * ❌ AI must NEVER:
 *   - Send messages automatically
 *   - Create or modify critical CRM data without confirmation
 *   - Invent information (hallucinate)
 * 
 * ✅ AI is ALLOWED to:
 *   - Read conversation data
 *   - Summarize conversations
 *   - Classify messages and intent
 *   - Suggest actions (user must approve)
 */

// Critical CRM actions that require explicit user confirmation
export type CriticalCrmAction =
  | "create_lead"
  | "update_lead"
  | "delete_lead"
  | "create_opportunity"
  | "update_opportunity"
  | "delete_opportunity"
  | "create_proposal"
  | "update_proposal"
  | "delete_proposal"
  | "create_contact"
  | "update_contact"
  | "delete_contact"
  | "create_company"
  | "update_company"
  | "delete_company"
  | "change_pipeline_stage"
  | "send_message"
  | "send_template_message"
  | "send_followup"
  | "schedule_followup";

// Allowed AI operations (read-only or suggestions)
export type AllowedAiOperation =
  | "read_conversation"
  | "read_lead"
  | "read_opportunity"
  | "read_proposal"
  | "summarize_conversation"
  | "classify_intent"
  | "classify_sentiment"
  | "detect_temperature"
  | "suggest_reply"
  | "suggest_tags"
  | "suggest_followup"
  | "suggest_action"
  | "analyze_context"
  | "generate_draft";

// AI Safety Rules Configuration
export interface AiSafetyRulesConfig {
  // Core prohibitions (always true, cannot be changed)
  autoSendMessagesProhibited: boolean;
  autoCrmModificationProhibited: boolean;
  inventInformationProhibited: boolean;
  
  // Confirmation requirements
  requireConfirmationForCrmChanges: boolean;
  requireConfirmationForMessages: boolean;
  requireConfirmationForFollowups: boolean;
  
  // Rate limiting
  maxSuggestionsPerMinute: number;
  maxDraftsPerConversation: number;
  
  // Safety indicators
  showAiIndicatorOnSuggestions: boolean;
  showConfidenceScores: boolean;
  showSourceReferences: boolean;
}

// =============================================================================
// CONTEXT WINDOW GUARDRAILS
// =============================================================================

export type AgentTokenBudgetType = 'lead' | 'contact' | 'opportunity' | 'client';

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
  // Token budgets per agent type
  tokenBudgets: {
    lead: 8000,
    contact: 6000,
    opportunity: 12000,
    client: 10000,
  },
  
  // Mandatory reserves
  systemPromptReserve: 2000,
  responseBufferReserve: 3000,
  
  // Compression limits
  maxSummaryLength: 500,
  minContextForAnalysis: 500,
  
  // Freshness thresholds
  staleDataWarningDays: 30,
  expiredDataDays: 90,
  
  // Memory limits
  maxMemoryEntries: 50,
  maxCharactersPerMemory: 2000,
};

// Context forbidden patterns (for validation)
export const CONTEXT_FORBIDDEN_PATTERNS = {
  NO_RAW_HISTORY: 'Histórico bruto de conversas nunca é injetado',
  NO_UNBOUNDED_CONTEXT: 'Contexto deve respeitar budget de tokens',
  NO_RANDOM_SELECTION: 'Seleção de contexto deve ser determinística',
  NO_LIVE_DATA_COMPRESSION: 'Dados CRM ao vivo nunca são comprimidos',
  NO_MEMORY_OVERRIDE: 'Memória não pode sobrepor dados ao vivo',
  NO_NAIVE_TRUNCATION: 'Truncagem cega é proibida',
  NO_ONE_SIZE_FITS_ALL: 'Contexto deve ser adaptado ao agente',
} as const;

export type ContextForbiddenPattern = keyof typeof CONTEXT_FORBIDDEN_PATTERNS;

// =============================================================================
// RAG LAYER GUARDRAILS
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

export const RAG_GUARDRAILS: RAGGuardrails = {
  // Retrieval limits
  maxRetrievedChunks: 20,
  maxFinalContextChunks: 5,
  relevanceThreshold: 0.6,
  
  // Token budgets
  maxRAGContextTokens: 1500,  // ~20% of typical budget
  maxChunkTokens: 500,
  
  // Quality controls
  minChunkQualityScore: 0.5,
  requireOutcomeForOpportunities: true,
  
  // Safety
  neverOverrideLiveData: true,
  alwaysLabelAsHistorical: true,
  logAllRetrievals: true,
};

// RAG forbidden patterns (for validation)
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

// =============================================================================
// CACHE LAYER GUARDRAILS
// =============================================================================

export type CacheConfidenceLevel = 'low' | 'medium' | 'high';

export interface CacheGuardrails {
  // Cache eligibility
  minConfidenceForCache: CacheConfidenceLevel;
  maxTemperatureForCache: number;
  
  // TTL limits (in hours)
  ttlByEntityType: Record<string, number>;
  
  // Invalidation
  autoInvalidateOnEntityChange: boolean;
  autoInvalidateOnMemoryUpdate: boolean;
  autoInvalidateOnPromptVersionChange: boolean;
  
  // Limits
  maxCacheEntriesPerEntity: number;
  maxCacheAgeHours: number;
  
  // Safety
  alwaysFetchLiveEntityData: boolean;
  neverCacheManualTriggers: boolean;
  logAllCacheHits: boolean;
}

export const CACHE_GUARDRAILS: CacheGuardrails = {
  // Cache eligibility
  minConfidenceForCache: 'medium',
  maxTemperatureForCache: 0,
  
  // TTL limits (in hours)
  ttlByEntityType: {
    lead: 4,
    opportunity: 2,
    contact: 12,
    client: 24,
    company: 24,
  },
  
  // Invalidation
  autoInvalidateOnEntityChange: true,
  autoInvalidateOnMemoryUpdate: true,
  autoInvalidateOnPromptVersionChange: true,
  
  // Limits
  maxCacheEntriesPerEntity: 5,
  maxCacheAgeHours: 48,
  
  // Safety
  alwaysFetchLiveEntityData: true,
  neverCacheManualTriggers: true,
  logAllCacheHits: true,
};

// Cache forbidden patterns (for validation)
export const CACHE_FORBIDDEN_PATTERNS = {
  NO_CACHE_LOW_CONFIDENCE: 'Respostas low confidence nunca são cacheadas',
  NO_CACHE_HIGH_TEMPERATURE: 'Outputs com temperature > 0 nunca são cacheados',
  NO_CACHE_WITHOUT_STATE_HASH: 'Cache sem entity state hash é proibido',
  NO_SILENT_CACHE: 'Uso de cache deve ser indicado na resposta',
  NO_STALE_CACHE: 'Cache com estado desatualizado deve ser invalidado',
  NO_CACHE_MANUAL_TRIGGERS: 'Triggers manuais nunca são servidos do cache',
} as const;

export type CacheForbiddenPattern = keyof typeof CACHE_FORBIDDEN_PATTERNS;

// Default configuration - enforces all safety rules
export const DEFAULT_AI_SAFETY_RULES: AiSafetyRulesConfig = {
  autoSendMessagesProhibited: true,
  autoCrmModificationProhibited: true,
  inventInformationProhibited: true,
  requireConfirmationForCrmChanges: true,
  requireConfirmationForMessages: true,
  requireConfirmationForFollowups: true,
  maxSuggestionsPerMinute: 10,
  maxDraftsPerConversation: 5,
  showAiIndicatorOnSuggestions: true,
  showConfidenceScores: true,
  showSourceReferences: true,
};

// All critical actions that require confirmation
export const CRITICAL_CRM_ACTIONS: CriticalCrmAction[] = [
  "create_lead",
  "update_lead",
  "delete_lead",
  "create_opportunity",
  "update_opportunity",
  "delete_opportunity",
  "create_proposal",
  "update_proposal",
  "delete_proposal",
  "create_contact",
  "update_contact",
  "delete_contact",
  "create_company",
  "update_company",
  "delete_company",
  "change_pipeline_stage",
  "send_message",
  "send_template_message",
  "send_followup",
  "schedule_followup",
];

// Actions that involve sending messages
export const MESSAGE_ACTIONS: CriticalCrmAction[] = [
  "send_message",
  "send_template_message",
  "send_followup",
];

// CRM data modification actions
export const CRM_MODIFICATION_ACTIONS: CriticalCrmAction[] = [
  "create_lead",
  "update_lead",
  "delete_lead",
  "create_opportunity",
  "update_opportunity",
  "delete_opportunity",
  "create_proposal",
  "update_proposal",
  "delete_proposal",
  "create_contact",
  "update_contact",
  "delete_contact",
  "create_company",
  "update_company",
  "delete_company",
  "change_pipeline_stage",
];

// Check if an action is a critical CRM action
export function isCriticalAction(action: string): boolean {
  return CRITICAL_CRM_ACTIONS.includes(action as CriticalCrmAction);
}

// Check if action involves sending a message
export function isMessageAction(action: string): boolean {
  return MESSAGE_ACTIONS.includes(action as CriticalCrmAction);
}

// Check if action modifies CRM data
export function isCrmModificationAction(action: string): boolean {
  return CRM_MODIFICATION_ACTIONS.includes(action as CriticalCrmAction);
}

// AI action validation result
export interface AiActionValidation {
  allowed: boolean;
  requiresConfirmation: boolean;
  reason?: string;
  ruleViolated?: string;
}

// Validate an AI action against safety rules
export function validateAiAction(
  action: string,
  isAutomated: boolean = false,
  config: AiSafetyRulesConfig = DEFAULT_AI_SAFETY_RULES
): AiActionValidation {
  // Rule 1: AI can NEVER send messages automatically
  if (isAutomated && isMessageAction(action)) {
    return {
      allowed: false,
      requiresConfirmation: true,
      reason: "IA não pode enviar mensagens automaticamente. Aprovação do utilizador é obrigatória.",
      ruleViolated: "NO_AUTO_SEND",
    };
  }

  // Rule 2: AI can NEVER modify CRM data without confirmation
  if (isAutomated && isCrmModificationAction(action)) {
    return {
      allowed: false,
      requiresConfirmation: true,
      reason: "IA não pode modificar dados críticos do CRM automaticamente. Aprovação do utilizador é obrigatória.",
      ruleViolated: "NO_AUTO_CRM_MODIFICATION",
    };
  }

  // Rule 3: Critical actions always require confirmation
  if (isCriticalAction(action)) {
    return {
      allowed: true,
      requiresConfirmation: true,
      reason: "Esta ação requer confirmação do utilizador.",
    };
  }

  // Allowed AI operations
  return {
    allowed: true,
    requiresConfirmation: false,
  };
}

// AI safety status for display
export interface AiSafetyStatus {
  rulesActive: boolean;
  autoSendBlocked: boolean;
  autoCrmModificationBlocked: boolean;
  hallucinationPrevented: boolean;
  pendingConfirmations: number;
  recentSuggestions: number;
  maxSuggestionsPerMinute: number;
}

// Get human-readable description of safety rules
export function getSafetyRuleDescription(rule: string): string {
  const descriptions: Record<string, string> = {
    NO_AUTO_SEND: "Mensagens nunca são enviadas automaticamente",
    NO_AUTO_CRM_MODIFICATION: "Dados do CRM nunca são alterados automaticamente",
    NO_HALLUCINATION: "IA não inventa informações",
    REQUIRES_CONFIRMATION: "Ação requer confirmação do utilizador",
  };
  return descriptions[rule] || rule;
}

// AI capability labels for UI
export const AI_CAPABILITY_LABELS = {
  allowed: {
    read: "Ler conversas e dados",
    summarize: "Resumir conversas",
    classify: "Classificar intenção e sentimento",
    suggest: "Sugerir ações e respostas",
  },
  prohibited: {
    autoSend: "Enviar mensagens automaticamente",
    autoModify: "Modificar dados do CRM sem confirmação",
    invent: "Inventar informações",
  },
};

// AI action tracking for rate limiting
interface AiActionTracker {
  conversationId: string;
  action: string;
  timestamp: number;
}

const aiActionHistory: AiActionTracker[] = [];

// Record an AI action
export function recordAiAction(conversationId: string, action: string): void {
  aiActionHistory.push({
    conversationId,
    action,
    timestamp: Date.now(),
  });

  // Keep only last 5 minutes of actions
  const fiveMinutesAgo = Date.now() - 5 * 60 * 1000;
  const filtered = aiActionHistory.filter((a) => a.timestamp > fiveMinutesAgo);
  aiActionHistory.length = 0;
  aiActionHistory.push(...filtered);
}

// Check if AI actions are within rate limits
export function checkAiRateLimits(
  config: AiSafetyRulesConfig = DEFAULT_AI_SAFETY_RULES
): { allowed: boolean; reason?: string } {
  const oneMinuteAgo = Date.now() - 60 * 1000;
  const recentActions = aiActionHistory.filter((a) => a.timestamp > oneMinuteAgo);

  if (recentActions.length >= config.maxSuggestionsPerMinute) {
    return {
      allowed: false,
      reason: `Limite de ${config.maxSuggestionsPerMinute} sugestões por minuto atingido.`,
    };
  }

  return { allowed: true };
}

// Get count of AI drafts for a conversation
export function getAiDraftCount(conversationId: string): number {
  const fiveMinutesAgo = Date.now() - 5 * 60 * 1000;
  return aiActionHistory.filter(
    (a) =>
      a.conversationId === conversationId &&
      a.action === "generate_draft" &&
      a.timestamp > fiveMinutesAgo
  ).length;
}

// Check if more drafts are allowed for conversation
export function canGenerateMoreDrafts(
  conversationId: string,
  config: AiSafetyRulesConfig = DEFAULT_AI_SAFETY_RULES
): boolean {
  return getAiDraftCount(conversationId) < config.maxDraftsPerConversation;
}
