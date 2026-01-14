/**
 * Automation Template Validation
 * Enforces template usage and validates variables before automation actions
 */

import { extractVariables, validateTemplate, VariableContext } from "./templateVariables";

export interface TemplateValidationResult {
  isValid: boolean;
  canExecute: boolean;
  missingVariables: string[];
  unresolvedVariables: string[];
  invalidVariables: string[];
  errors: string[];
  warnings: string[];
}

export interface AutomationActionConfig {
  template_id?: string;
  channel?: string;
  on_missing_fields?: "stop_automation" | "create_task" | "skip_and_log";
  task_title?: string;
}

/**
 * Validates that an automation action has a template configured
 * Automations CANNOT send messages without templates
 */
export function validateAutomationHasTemplate(
  actionType: string,
  config: AutomationActionConfig
): { valid: boolean; error?: string } {
  // Only check message-sending actions
  const messageActions = [
    "send_template_message",
    "send_message",
    "send_email",
    "send_whatsapp",
    "send_instagram_dm",
    "send_sms",
  ];

  if (!messageActions.includes(actionType)) {
    return { valid: true };
  }

  if (!config.template_id) {
    return {
      valid: false,
      error: "Automações não podem enviar mensagens sem template. Selecione um template.",
    };
  }

  return { valid: true };
}

/**
 * Validates template variables before automation execution
 * Returns validation result with action recommendation
 */
export function validateTemplateForAutomation(
  template: {
    id: string;
    name: string;
    content: string;
    subject?: string | null;
    required_variables?: string[];
  },
  context: VariableContext,
  config: AutomationActionConfig
): TemplateValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  // Validate content
  const contentValidation = validateTemplate(template.content, context);
  
  // Validate subject if present
  const subjectValidation = template.subject
    ? validateTemplate(template.subject, context)
    : { isValid: true, missingVariables: [], unresolvedVariables: [], invalidVariables: [] };

  // Combine all issues
  const allMissing = [
    ...new Set([
      ...contentValidation.missingVariables,
      ...subjectValidation.missingVariables,
    ]),
  ];

  const allUnresolved = [
    ...new Set([
      ...contentValidation.unresolvedVariables,
      ...subjectValidation.unresolvedVariables,
    ]),
  ];

  const allInvalid = [
    ...new Set([
      ...contentValidation.invalidVariables,
      ...subjectValidation.invalidVariables,
    ]),
  ];

  // Check required variables
  if (template.required_variables?.length) {
    for (const reqVar of template.required_variables) {
      if (allUnresolved.includes(reqVar) || allMissing.includes(reqVar)) {
        errors.push(`Variável obrigatória "${reqVar}" não está disponível no contexto.`);
      }
    }
  }

  // Add warnings for invalid variables
  if (allInvalid.length > 0) {
    warnings.push(`Template contém variáveis inválidas: ${allInvalid.join(", ")}`);
  }

  // Determine if automation can execute
  const hasIssues = allMissing.length > 0 || allUnresolved.length > 0;
  let canExecute = !hasIssues;

  if (hasIssues) {
    // Check on_missing_fields config
    switch (config.on_missing_fields) {
      case "stop_automation":
        canExecute = false;
        errors.push("Automação será interrompida devido a variáveis não resolvidas.");
        break;
      case "create_task":
        canExecute = false; // Don't send, but create task
        warnings.push("Será criada uma tarefa para revisão manual.");
        break;
      case "skip_and_log":
        canExecute = false; // Skip this action
        warnings.push("Esta ação será ignorada e a automação continuará.");
        break;
      default:
        // Default to stop for safety
        canExecute = false;
        errors.push("Automação será interrompida por segurança.");
    }
  }

  return {
    isValid: !hasIssues && allInvalid.length === 0,
    canExecute,
    missingVariables: allMissing,
    unresolvedVariables: allUnresolved,
    invalidVariables: allInvalid,
    errors,
    warnings,
  };
}

/**
 * Get human-readable description of validation result
 */
export function formatValidationMessage(result: TemplateValidationResult): string {
  const parts: string[] = [];

  if (result.isValid) {
    parts.push("✅ Template validado com sucesso.");
  } else {
    if (result.missingVariables.length > 0) {
      parts.push(`❌ Variáveis em falta: ${result.missingVariables.join(", ")}`);
    }
    if (result.unresolvedVariables.length > 0) {
      parts.push(`⚠️ Variáveis não resolvidas: ${result.unresolvedVariables.join(", ")}`);
    }
    if (result.invalidVariables.length > 0) {
      parts.push(`⚠️ Variáveis inválidas: ${result.invalidVariables.join(", ")}`);
    }
  }

  if (result.errors.length > 0) {
    parts.push(...result.errors);
  }

  if (result.warnings.length > 0) {
    parts.push(...result.warnings);
  }

  return parts.join("\n");
}

/**
 * Checks if an automation action is a message action that requires template
 */
export function isMessageAction(actionType: string): boolean {
  return [
    "send_template_message",
    "send_message",
    "send_email",
    "send_whatsapp",
    "send_instagram_dm",
    "send_sms",
  ].includes(actionType);
}

/**
 * Pre-validates all actions in an automation before saving
 */
export function preValidateAutomationActions(
  actions: Array<{ action_type: string; config: AutomationActionConfig }>
): { valid: boolean; errors: string[] } {
  const errors: string[] = [];

  for (let i = 0; i < actions.length; i++) {
    const action = actions[i];
    const validation = validateAutomationHasTemplate(action.action_type, action.config);
    
    if (!validation.valid && validation.error) {
      errors.push(`Ação ${i + 1}: ${validation.error}`);
    }
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}
