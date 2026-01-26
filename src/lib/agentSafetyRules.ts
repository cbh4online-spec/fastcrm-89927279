/**
 * AI Agent Safety Rules & Guardrails
 * 
 * Strict rules for AI agent behavior in the CRM:
 * 
 * ❌ Agents must NEVER:
 *   - Execute irreversible actions without confirmation
 *   - Send messages automatically
 *   - Delete entities without explicit user approval
 *   - Run unlimited reasoning loops
 *   - Store excessive memory/context
 * 
 * ✅ Agents are ALLOWED to:
 *   - Read and analyze data
 *   - Generate recommendations
 *   - Calculate scores and probabilities
 *   - Store selective conclusions in memory
 */

import type { AgentType, AgentTrigger, AgentActionType } from '@/types/aiAgents';

// =============================================================================
// GUARDRAILS CONFIGURATION
// =============================================================================

export interface AgentGuardrails {
  // Autonomy limits
  maxReasoningIterations: number;
  maxToolCallsPerExecution: number;
  executionTimeoutMs: number;
  
  // Actions that require user confirmation
  prohibitedAutoActions: AgentActionType[];
  
  // Rate limiting
  maxExecutionsPerEntity: number;    // Per hour
  maxExecutionsPerWorkspace: number; // Per hour
  cooldownBetweenExecutionsMs: number;
  
  // Memory limits
  maxMemoryEntriesPerEntity: number;
  memoryRetentionDays: number;
  maxMemoryContentLength: number;
  
  // Output limits
  maxReasoningTraceSteps: number;
  maxKeySignals: number;
  maxRiskIndicators: number;
}

export const AGENT_GUARDRAILS: AgentGuardrails = {
  // Autonomy limits - prevent runaway loops
  maxReasoningIterations: 5,
  maxToolCallsPerExecution: 10,
  executionTimeoutMs: 30000, // 30 seconds
  
  // Actions that ALWAYS require user confirmation
  prohibitedAutoActions: [
    'send_template',
    'reply_manual',
    'create_opportunity',
    'close_won',
    'close_lost',
    'archive',
    'merge_duplicate',
    'escalate_issue',
    'renew_contract',
    'schedule_meeting',
    'send_proposal',
  ],
  
  // Rate limiting - prevent abuse
  maxExecutionsPerEntity: 10,        // Max 10 analyses per entity per hour
  maxExecutionsPerWorkspace: 100,    // Max 100 analyses per workspace per hour
  cooldownBetweenExecutionsMs: 5000, // 5 second cooldown between executions
  
  // Memory limits - prevent hoarding
  maxMemoryEntriesPerEntity: 50,     // Max 50 memory entries per entity
  memoryRetentionDays: 90,           // Auto-expire after 90 days
  maxMemoryContentLength: 2000,      // Max 2000 chars per memory entry
  
  // Output limits
  maxReasoningTraceSteps: 10,
  maxKeySignals: 10,
  maxRiskIndicators: 5,
};

// =============================================================================
// ACTION VALIDATION
// =============================================================================

export interface ActionValidation {
  allowed: boolean;
  requiresConfirmation: boolean;
  reason?: string;
  ruleViolated?: string;
}

/**
 * Validate if an agent action can be executed
 */
export function validateAgentAction(
  action: AgentActionType,
  isAutomated: boolean = false
): ActionValidation {
  // Check if action requires confirmation
  const requiresConfirmation = AGENT_GUARDRAILS.prohibitedAutoActions.includes(action);
  
  // If automated and requires confirmation, block it
  if (isAutomated && requiresConfirmation) {
    return {
      allowed: false,
      requiresConfirmation: true,
      reason: 'Esta ação requer confirmação do utilizador e não pode ser executada automaticamente.',
      ruleViolated: 'NO_AUTO_EXECUTE',
    };
  }
  
  // All actions allowed with confirmation
  return {
    allowed: true,
    requiresConfirmation,
    reason: requiresConfirmation 
      ? 'Esta ação requer confirmação antes de ser executada.'
      : undefined,
  };
}

// =============================================================================
// RATE LIMITING
// =============================================================================

interface RateLimitEntry {
  entityId: string;
  workspaceId: string;
  timestamp: number;
}

const executionHistory: RateLimitEntry[] = [];

/**
 * Record an agent execution for rate limiting
 */
export function recordAgentExecution(
  entityId: string,
  workspaceId: string
): void {
  executionHistory.push({
    entityId,
    workspaceId,
    timestamp: Date.now(),
  });
  
  // Clean old entries (older than 1 hour)
  const oneHourAgo = Date.now() - 60 * 60 * 1000;
  const filtered = executionHistory.filter(e => e.timestamp > oneHourAgo);
  executionHistory.length = 0;
  executionHistory.push(...filtered);
}

/**
 * Check if an execution is allowed based on rate limits
 */
export function checkAgentRateLimit(
  entityId: string,
  workspaceId: string
): { allowed: boolean; reason?: string; waitMs?: number } {
  const now = Date.now();
  const oneHourAgo = now - 60 * 60 * 1000;
  
  // Check entity rate limit
  const entityExecutions = executionHistory.filter(
    e => e.entityId === entityId && e.timestamp > oneHourAgo
  );
  
  if (entityExecutions.length >= AGENT_GUARDRAILS.maxExecutionsPerEntity) {
    return {
      allowed: false,
      reason: `Limite de ${AGENT_GUARDRAILS.maxExecutionsPerEntity} análises por hora para esta entidade atingido.`,
    };
  }
  
  // Check workspace rate limit
  const workspaceExecutions = executionHistory.filter(
    e => e.workspaceId === workspaceId && e.timestamp > oneHourAgo
  );
  
  if (workspaceExecutions.length >= AGENT_GUARDRAILS.maxExecutionsPerWorkspace) {
    return {
      allowed: false,
      reason: `Limite de ${AGENT_GUARDRAILS.maxExecutionsPerWorkspace} análises por hora para este workspace atingido.`,
    };
  }
  
  // Check cooldown
  const lastExecution = executionHistory
    .filter(e => e.entityId === entityId)
    .sort((a, b) => b.timestamp - a.timestamp)[0];
  
  if (lastExecution) {
    const timeSinceLastExecution = now - lastExecution.timestamp;
    if (timeSinceLastExecution < AGENT_GUARDRAILS.cooldownBetweenExecutionsMs) {
      const waitMs = AGENT_GUARDRAILS.cooldownBetweenExecutionsMs - timeSinceLastExecution;
      return {
        allowed: false,
        reason: `Aguarde ${Math.ceil(waitMs / 1000)} segundos antes de executar nova análise.`,
        waitMs,
      };
    }
  }
  
  return { allowed: true };
}

// =============================================================================
// ANTI-PATTERNS (FORBIDDEN)
// =============================================================================

export const FORBIDDEN_PATTERNS = {
  // Data integrity
  NO_AUTO_SEND: 'Agentes não podem enviar mensagens automaticamente',
  NO_AUTO_DELETE: 'Agentes não podem eliminar dados automaticamente',
  NO_AUTO_MODIFY_CRITICAL: 'Agentes não podem modificar dados críticos sem confirmação',
  
  // Reasoning limits
  NO_INFINITE_LOOPS: 'Agentes devem respeitar limite de iterações',
  NO_UNBOUNDED_TOOLS: 'Agentes devem respeitar limite de chamadas a ferramentas',
  NO_TIMEOUT_BYPASS: 'Agentes devem respeitar timeout de execução',
  
  // Memory abuse
  NO_MEMORY_HOARDING: 'Agentes devem respeitar limite de memória por entidade',
  NO_RAW_LOGS_STORAGE: 'Agentes não podem armazenar logs brutos de conversação',
  
  // Output quality
  NO_HALLUCINATION: 'Agentes não podem inventar informação',
  NO_UNEXPLAINED_DECISIONS: 'Todas as decisões devem ser explicadas',
};

// =============================================================================
// FAILURE HANDLING
// =============================================================================

export interface PartialAnalysisResult {
  completed: boolean;
  stepsCompleted: number;
  totalStepsPlanned: number;
  analysisPerformed: string[];
  missingData: string[];
  suggestedActions: string[];
  partialConclusion?: string;
}

/**
 * Create a partial analysis result when agent cannot complete
 */
export function createPartialAnalysis(
  stepsCompleted: number,
  totalStepsPlanned: number,
  analysisPerformed: string[],
  missingData: string[],
  reason: string
): PartialAnalysisResult {
  return {
    completed: false,
    stepsCompleted,
    totalStepsPlanned,
    analysisPerformed,
    missingData,
    suggestedActions: missingData.map(data => `Obter ${data} para análise completa`),
    partialConclusion: `Análise parcial: ${reason}. Consegui analisar ${stepsCompleted} de ${totalStepsPlanned} passos.`,
  };
}

// =============================================================================
// AGENT CONFIG BY TYPE
// =============================================================================

export interface AgentTypeConfig {
  agentType: AgentType;
  displayName: string;
  description: string;
  icon: string;
  primaryColor: string;
  enabledTriggers: AgentTrigger[];
  defaultCooldownMs: number;
}

export const AGENT_CONFIGS: Record<AgentType, AgentTypeConfig> = {
  lead: {
    agentType: 'lead',
    displayName: 'Lead Agent',
    description: 'Qualificação e análise de intenção de compra',
    icon: 'UserPlus',
    primaryColor: 'hsl(var(--primary))',
    enabledTriggers: ['manual', 'entity_created', 'message_received', 'status_changed'],
    defaultCooldownMs: 5000,
  },
  contact: {
    agentType: 'contact',
    displayName: 'Contact Agent',
    description: 'Enriquecimento e gestão de contactos',
    icon: 'User',
    primaryColor: 'hsl(var(--secondary))',
    enabledTriggers: ['manual', 'entity_created'],
    defaultCooldownMs: 10000,
  },
  opportunity: {
    agentType: 'opportunity',
    displayName: 'Opportunity Agent',
    description: 'Probabilidade de fecho e análise de risco',
    icon: 'Target',
    primaryColor: 'hsl(var(--accent))',
    enabledTriggers: ['manual', 'entity_created', 'status_changed'],
    defaultCooldownMs: 5000,
  },
  client: {
    agentType: 'client',
    displayName: 'Client Agent',
    description: 'Saúde do cliente e retenção',
    icon: 'Heart',
    primaryColor: 'hsl(var(--destructive))',
    enabledTriggers: ['manual', 'time_based'],
    defaultCooldownMs: 30000,
  },
};

// =============================================================================
// HELPER FUNCTIONS
// =============================================================================

/**
 * Check if a trigger is enabled for an agent type
 */
export function isTriggerEnabled(
  agentType: AgentType,
  trigger: AgentTrigger
): boolean {
  return AGENT_CONFIGS[agentType].enabledTriggers.includes(trigger);
}

/**
 * Get human-readable description of a safety rule violation
 */
export function getRuleViolationDescription(ruleViolated: string): string {
  return FORBIDDEN_PATTERNS[ruleViolated as keyof typeof FORBIDDEN_PATTERNS] || ruleViolated;
}

/**
 * Validate memory content before storage
 */
export function validateMemoryContent(content: string): {
  valid: boolean;
  sanitized: string;
  warning?: string;
} {
  // Truncate if too long
  if (content.length > AGENT_GUARDRAILS.maxMemoryContentLength) {
    return {
      valid: true,
      sanitized: content.substring(0, AGENT_GUARDRAILS.maxMemoryContentLength) + '...',
      warning: `Conteúdo truncado para ${AGENT_GUARDRAILS.maxMemoryContentLength} caracteres.`,
    };
  }
  
  return {
    valid: true,
    sanitized: content,
  };
}
