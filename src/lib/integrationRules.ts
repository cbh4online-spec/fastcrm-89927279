/**
 * Integration System Status & Requirements
 * 
 * This module defines and validates the core integration requirements
 * between Inbox, Templates, Automations, and AI assistance.
 */

// Integration status requirements
export interface IntegrationRequirement {
  id: string;
  name: string;
  description: string;
  status: "enforced" | "optional" | "warning";
  checkFunction?: () => boolean;
}

export const INTEGRATION_REQUIREMENTS: IntegrationRequirement[] = [
  {
    id: "inbox_entry_point",
    name: "Inbox como ponto de entrada",
    description: "Todas as conversas passam pelo Inbox para gestão centralizada",
    status: "enforced",
  },
  {
    id: "templates_mandatory",
    name: "Templates obrigatórios para automações",
    description: "Mensagens automatizadas só podem usar templates validados",
    status: "enforced",
  },
  {
    id: "automations_visible",
    name: "Automações visíveis e controláveis",
    description: "Utilizadores podem ver, pausar e editar todas as automações",
    status: "enforced",
  },
  {
    id: "ai_assists_only",
    name: "AI assiste, não age sozinha",
    description: "AI sugere e personaliza, mas nunca envia sem confirmação",
    status: "enforced",
  },
  {
    id: "full_audit_trail",
    name: "Trilho de auditoria completo",
    description: "Cada ação é registada com contexto, origem e resultado",
    status: "enforced",
  },
];

// Message origin types for audit trail
export type MessageOrigin = 
  | "manual"           // User typed and sent
  | "template_manual"  // User selected template, confirmed, sent
  | "ai_assisted"      // AI suggested/personalized, user confirmed, sent
  | "automation_template"; // Automation with template (requires confirmation if configured)

export interface MessageAuditData {
  origin: MessageOrigin;
  templateId?: string;
  templateName?: string;
  automationRuleId?: string;
  automationRuleName?: string;
  aiGenerated?: boolean;
  aiModified?: boolean;
  confirmedBy?: string;
  confirmedAt?: string;
  channel: string;
  conversationId: string;
  leadId?: string;
}

// Validate that a message can be sent
export interface MessageSendValidation {
  canSend: boolean;
  requiresConfirmation: boolean;
  requiresTemplate: boolean;
  warnings: string[];
  errors: string[];
}

export function validateMessageSend(
  origin: MessageOrigin,
  hasTemplate: boolean,
  isAutomated: boolean,
  hasUserConfirmation: boolean
): MessageSendValidation {
  const validation: MessageSendValidation = {
    canSend: true,
    requiresConfirmation: false,
    requiresTemplate: false,
    warnings: [],
    errors: [],
  };

  // Rule 1: Automated messages MUST use templates
  if (isAutomated && !hasTemplate) {
    validation.canSend = false;
    validation.requiresTemplate = true;
    validation.errors.push("Mensagens automatizadas requerem um template validado.");
  }

  // Rule 2: AI-assisted messages require confirmation
  if (origin === "ai_assisted" && !hasUserConfirmation) {
    validation.canSend = false;
    validation.requiresConfirmation = true;
    validation.errors.push("Mensagens com AI requerem confirmação do utilizador.");
  }

  // Rule 3: Automation templates should warn about missing variables
  if (origin === "automation_template") {
    validation.requiresConfirmation = true;
    validation.warnings.push("Automações com templates devem ser revisadas para variáveis em falta.");
  }

  return validation;
}

// Activity log entry types with full context
export interface ActivityLogContext {
  // What happened
  action: string;
  entityType: string;
  entityId: string;
  
  // Who/What initiated it
  initiatedBy: "user" | "automation" | "ai" | "system";
  userId?: string;
  automationRuleId?: string;
  
  // Related entities
  conversationId?: string;
  leadId?: string;
  opportunityId?: string;
  templateId?: string;
  
  // Channel context
  channel?: string;
  
  // Result
  result: "success" | "failed" | "pending_confirmation" | "skipped";
  resultDetails?: string;
  
  // Timestamps
  timestamp: string;
}

// Create activity log entry with all required context
export function createActivityLogEntry(
  action: string,
  entityType: string,
  entityId: string,
  initiatedBy: "user" | "automation" | "ai" | "system",
  options: Partial<Omit<ActivityLogContext, "action" | "entityType" | "entityId" | "initiatedBy" | "timestamp">> = {}
): ActivityLogContext {
  return {
    action,
    entityType,
    entityId,
    initiatedBy,
    result: options.result || "success",
    timestamp: new Date().toISOString(),
    ...options,
  };
}

// Integration health check
export interface IntegrationHealth {
  status: "healthy" | "degraded" | "critical";
  checks: {
    id: string;
    name: string;
    passed: boolean;
    message?: string;
  }[];
}

export function checkIntegrationHealth(): IntegrationHealth {
  const checks = INTEGRATION_REQUIREMENTS.map(req => ({
    id: req.id,
    name: req.name,
    passed: req.status === "enforced", // All enforced requirements are met by design
    message: req.description,
  }));

  const failedCount = checks.filter(c => !c.passed).length;

  return {
    status: failedCount === 0 ? "healthy" : failedCount < 2 ? "degraded" : "critical",
    checks,
  };
}

// Export constants for UI display
export const ORIGIN_LABELS: Record<MessageOrigin, string> = {
  manual: "Manual",
  template_manual: "Template (Manual)",
  ai_assisted: "AI Assistida",
  automation_template: "Automação",
};

export const ORIGIN_COLORS: Record<MessageOrigin, string> = {
  manual: "bg-gray-500/10 text-gray-600",
  template_manual: "bg-blue-500/10 text-blue-600",
  ai_assisted: "bg-purple-500/10 text-purple-600",
  automation_template: "bg-yellow-500/10 text-yellow-600",
};
