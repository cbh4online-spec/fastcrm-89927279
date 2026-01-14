/**
 * Inbox Safety Controls
 * 
 * Rules enforced:
 * 1. No auto-send without confirmation
 * 2. Respect global automation limits
 * 3. Prevent message loops
 * 4. Support global pause for inbox automations
 */

import { SafetyCheckResult, RateLimitConfig, DEFAULT_RATE_LIMITS } from "./automationSafety";

// Message loop detection configuration
export interface MessageLoopConfig {
  maxMessagesPerConversationPerHour: number;
  maxConsecutiveOutbound: number;
  minSecondsBetweenMessages: number;
  cooldownAfterLoopDetection: number; // minutes
}

export const DEFAULT_MESSAGE_LOOP_CONFIG: MessageLoopConfig = {
  maxMessagesPerConversationPerHour: 20,
  maxConsecutiveOutbound: 5,
  minSecondsBetweenMessages: 10,
  cooldownAfterLoopDetection: 30,
};

// Inbox automation safety config
export interface InboxSafetyConfig {
  requireConfirmationForSend: boolean;
  requireConfirmationForStatusChange: boolean;
  requireConfirmationForOpportunityCreate: boolean;
  enableLoopPrevention: boolean;
  enableRateLimiting: boolean;
  messageLoopConfig: MessageLoopConfig;
  rateLimitConfig: RateLimitConfig;
}

export const DEFAULT_INBOX_SAFETY_CONFIG: InboxSafetyConfig = {
  requireConfirmationForSend: true,
  requireConfirmationForStatusChange: false,
  requireConfirmationForOpportunityCreate: true,
  enableLoopPrevention: true,
  enableRateLimiting: true,
  messageLoopConfig: DEFAULT_MESSAGE_LOOP_CONFIG,
  rateLimitConfig: DEFAULT_RATE_LIMITS,
};

// Actions that require user confirmation before execution
export type ConfirmableAction = 
  | "send_message"
  | "send_template_message"
  | "create_opportunity"
  | "create_proposal"
  | "change_lead_status"
  | "send_followup";

export const ACTIONS_REQUIRING_CONFIRMATION: ConfirmableAction[] = [
  "send_message",
  "send_template_message",
  "send_followup",
];

// Check if action requires confirmation
export function requiresConfirmation(action: string): boolean {
  return ACTIONS_REQUIRING_CONFIRMATION.includes(action as ConfirmableAction);
}

// Message history for loop detection
interface MessageRecord {
  conversationId: string;
  direction: "inbound" | "outbound";
  timestamp: number;
  isAutomated: boolean;
}

// In-memory message history for loop detection (per session)
const messageHistory: Map<string, MessageRecord[]> = new Map();

// Add message to history
export function recordMessage(
  conversationId: string,
  direction: "inbound" | "outbound",
  isAutomated: boolean = false
): void {
  const history = messageHistory.get(conversationId) || [];
  history.push({
    conversationId,
    direction,
    timestamp: Date.now(),
    isAutomated,
  });
  
  // Keep only last hour of messages
  const hourAgo = Date.now() - 60 * 60 * 1000;
  const filtered = history.filter(m => m.timestamp > hourAgo);
  messageHistory.set(conversationId, filtered);
}

// Check for message loops
export function checkMessageLoop(
  conversationId: string,
  config: MessageLoopConfig = DEFAULT_MESSAGE_LOOP_CONFIG
): SafetyCheckResult {
  const history = messageHistory.get(conversationId) || [];
  const hourAgo = Date.now() - 60 * 60 * 1000;
  const recentMessages = history.filter(m => m.timestamp > hourAgo);
  
  // Check total messages per hour
  if (recentMessages.length >= config.maxMessagesPerConversationPerHour) {
    return {
      canExecute: false,
      reason: `Limite de ${config.maxMessagesPerConversationPerHour} mensagens por hora atingido para esta conversa.`,
      code: "RATE_LIMIT",
    };
  }
  
  // Check consecutive outbound messages
  const lastMessages = recentMessages.slice(-config.maxConsecutiveOutbound);
  if (
    lastMessages.length >= config.maxConsecutiveOutbound &&
    lastMessages.every(m => m.direction === "outbound")
  ) {
    return {
      canExecute: false,
      reason: `Detectado loop: ${config.maxConsecutiveOutbound} mensagens de saída consecutivas.`,
      code: "CHAIN_DEPTH",
    };
  }
  
  // Check minimum time between automated messages
  const lastOutbound = recentMessages.filter(m => m.direction === "outbound" && m.isAutomated).pop();
  if (lastOutbound) {
    const secondsSince = (Date.now() - lastOutbound.timestamp) / 1000;
    if (secondsSince < config.minSecondsBetweenMessages) {
      return {
        canExecute: false,
        reason: `Aguarde ${Math.ceil(config.minSecondsBetweenMessages - secondsSince)}s antes de enviar outra mensagem automática.`,
        code: "RATE_LIMIT",
      };
    }
  }
  
  return { canExecute: true };
}

// Clear message history for a conversation (e.g., after cooldown)
export function clearMessageHistory(conversationId: string): void {
  messageHistory.delete(conversationId);
}

// Pending confirmation state
interface PendingAction {
  id: string;
  action: ConfirmableAction;
  conversationId: string;
  leadId?: string;
  data: Record<string, unknown>;
  createdAt: number;
  expiresAt: number;
}

const pendingActions: Map<string, PendingAction> = new Map();

// Generate unique action ID
function generateActionId(): string {
  return `action_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

// Queue action for confirmation
export function queueActionForConfirmation(
  action: ConfirmableAction,
  conversationId: string,
  data: Record<string, unknown>,
  leadId?: string,
  expirationMinutes: number = 30
): PendingAction {
  const id = generateActionId();
  const now = Date.now();
  
  const pending: PendingAction = {
    id,
    action,
    conversationId,
    leadId,
    data,
    createdAt: now,
    expiresAt: now + expirationMinutes * 60 * 1000,
  };
  
  pendingActions.set(id, pending);
  
  // Clean up expired actions
  cleanupExpiredActions();
  
  return pending;
}

// Get pending action
export function getPendingAction(actionId: string): PendingAction | null {
  const action = pendingActions.get(actionId);
  if (!action) return null;
  
  // Check expiration
  if (Date.now() > action.expiresAt) {
    pendingActions.delete(actionId);
    return null;
  }
  
  return action;
}

// Confirm and remove pending action
export function confirmAction(actionId: string): PendingAction | null {
  const action = getPendingAction(actionId);
  if (action) {
    pendingActions.delete(actionId);
  }
  return action;
}

// Cancel pending action
export function cancelAction(actionId: string): boolean {
  return pendingActions.delete(actionId);
}

// Get all pending actions for a conversation
export function getPendingActionsForConversation(conversationId: string): PendingAction[] {
  const result: PendingAction[] = [];
  const now = Date.now();
  
  pendingActions.forEach((action) => {
    if (action.conversationId === conversationId && action.expiresAt > now) {
      result.push(action);
    }
  });
  
  return result;
}

// Clean up expired actions
function cleanupExpiredActions(): void {
  const now = Date.now();
  const toDelete: string[] = [];
  
  pendingActions.forEach((action, id) => {
    if (action.expiresAt <= now) {
      toDelete.push(id);
    }
  });
  
  toDelete.forEach(id => pendingActions.delete(id));
}

// Full inbox safety check
export interface InboxSafetyCheckParams {
  action: string;
  conversationId: string;
  isGloballyPaused: boolean;
  isInboxAutomationsPaused: boolean;
  entityExecutionCount?: number;
  maxPerEntityPerHour?: number;
  isAutomatedAction?: boolean;
}

export function performInboxSafetyCheck(
  params: InboxSafetyCheckParams
): SafetyCheckResult {
  // Check global pause
  if (params.isGloballyPaused) {
    return {
      canExecute: false,
      reason: "Todas as automações estão pausadas globalmente.",
      code: "GLOBAL_PAUSE",
    };
  }
  
  // Check inbox-specific pause
  if (params.isInboxAutomationsPaused) {
    return {
      canExecute: false,
      reason: "Automações de inbox estão pausadas.",
      code: "GLOBAL_PAUSE",
    };
  }
  
  // Check message loops for send actions
  if (
    params.action === "send_message" ||
    params.action === "send_template_message" ||
    params.action === "send_followup"
  ) {
    const loopCheck = checkMessageLoop(params.conversationId);
    if (!loopCheck.canExecute) {
      return loopCheck;
    }
  }
  
  // Check rate limits
  if (params.entityExecutionCount !== undefined && params.maxPerEntityPerHour !== undefined) {
    if (params.entityExecutionCount >= params.maxPerEntityPerHour) {
      return {
        canExecute: false,
        reason: `Limite de ${params.maxPerEntityPerHour} ações por hora atingido.`,
        code: "RATE_LIMIT",
      };
    }
  }
  
  // Check if action requires confirmation
  if (params.isAutomatedAction && requiresConfirmation(params.action)) {
    return {
      canExecute: false,
      reason: "Esta ação requer confirmação do utilizador antes de ser executada.",
      code: "RULE_PAUSED",
    };
  }
  
  return { canExecute: true };
}

// Summary of safety status for UI display
export interface InboxSafetyStatus {
  isGloballyPaused: boolean;
  isInboxPaused: boolean;
  pendingConfirmations: number;
  recentMessageCount: number;
  maxMessagesPerHour: number;
  loopDetected: boolean;
  rateLimitPercentage: number;
}

export function getInboxSafetyStatus(
  conversationId: string,
  isGloballyPaused: boolean,
  isInboxPaused: boolean,
  config: InboxSafetyConfig = DEFAULT_INBOX_SAFETY_CONFIG
): InboxSafetyStatus {
  const history = messageHistory.get(conversationId) || [];
  const hourAgo = Date.now() - 60 * 60 * 1000;
  const recentMessages = history.filter(m => m.timestamp > hourAgo);
  const maxMessages = config.messageLoopConfig.maxMessagesPerConversationPerHour;
  
  const loopCheck = checkMessageLoop(conversationId, config.messageLoopConfig);
  
  return {
    isGloballyPaused,
    isInboxPaused,
    pendingConfirmations: getPendingActionsForConversation(conversationId).length,
    recentMessageCount: recentMessages.length,
    maxMessagesPerHour: maxMessages,
    loopDetected: !loopCheck.canExecute && loopCheck.code === "CHAIN_DEPTH",
    rateLimitPercentage: Math.min((recentMessages.length / maxMessages) * 100, 100),
  };
}
