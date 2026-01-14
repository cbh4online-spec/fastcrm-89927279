import { AutomationTrigger, AutomationActionType, ConditionOperator } from "@/hooks/useAutomations";
import { CRITICAL_FIELDS } from "@/components/automations/CriticalFieldsWarning";

interface AutomationCondition {
  field_name: string;
  operator: ConditionOperator;
  value: string | null;
}

interface AutomationAction {
  action_type: AutomationActionType;
  config: Record<string, unknown>;
}

interface AutomationConfig {
  trigger: AutomationTrigger;
  conditions: AutomationCondition[];
  actions: AutomationAction[];
}

// Triggers that watch for field updates
const FIELD_UPDATE_TRIGGERS: AutomationTrigger[] = [
  "lead_updated",
  "opportunity_updated",
  "contact_updated",
  "company_updated",
  "custom_field_updated",
];

// Actions that modify fields
const FIELD_MODIFYING_ACTIONS: AutomationActionType[] = [
  "update_field",
  "move_opportunity_stage",
  "assign_owner",
  "add_tag",
  "change_lead_status",
];

// Get entity type from trigger
export function getEntityFromTrigger(trigger: AutomationTrigger): string {
  if (trigger.startsWith("lead_")) return "lead";
  if (trigger.startsWith("opportunity_") || trigger === "payment_confirmed") return "opportunity";
  if (trigger.startsWith("contact_")) return "contact";
  if (trigger.startsWith("company_")) return "company";
  if (trigger === "custom_field_updated") return "any";
  if (trigger.startsWith("proposal_")) return "proposal";
  if (trigger.startsWith("message_") || trigger.startsWith("conversation_")) return "conversation";
  if (trigger === "scheduled_time") return "scheduled";
  return "unknown";
}

// Get fields that will be modified by actions
export function getModifiedFields(actions: AutomationAction[]): string[] {
  const fields: string[] = [];

  for (const action of actions) {
    switch (action.action_type) {
      case "update_field":
        const fieldName = action.config.field_name as string;
        if (fieldName) fields.push(fieldName);
        break;
      case "move_opportunity_stage":
        fields.push("stage_id");
        break;
      case "assign_owner":
        fields.push("owner_id");
        break;
      case "add_tag":
        fields.push("tags");
        break;
    }
  }

  return fields;
}

// Check for potential infinite loops
export function detectPotentialLoop(config: AutomationConfig): {
  hasLoop: boolean;
  details?: { triggerField: string; actionField: string };
} {
  // Only check if trigger watches for updates
  if (!FIELD_UPDATE_TRIGGERS.includes(config.trigger)) {
    return { hasLoop: false };
  }

  const modifiedFields = getModifiedFields(config.actions);
  
  // Get fields watched by conditions
  const watchedFields = config.conditions.map((c) => c.field_name);

  // For custom_field_updated trigger, check if we're updating a custom field
  if (config.trigger === "custom_field_updated") {
    const customFieldsModified = modifiedFields.filter((f) => f.startsWith("custom:"));
    if (customFieldsModified.length > 0) {
      return {
        hasLoop: true,
        details: {
          triggerField: "campo personalizado",
          actionField: customFieldsModified[0],
        },
      };
    }
  }

  // Check if any modified field could trigger the same automation
  for (const field of modifiedFields) {
    // If we're modifying status and have a status condition without specific value
    if (field === "status" && watchedFields.includes("status")) {
      const statusCondition = config.conditions.find((c) => c.field_name === "status");
      if (!statusCondition || statusCondition.operator === "not_equals") {
        return {
          hasLoop: true,
          details: { triggerField: "status", actionField: "status" },
        };
      }
    }

    // If we're modifying stage and trigger is opportunity_stage_changed
    if (field === "stage_id" && config.trigger === "opportunity_stage_changed") {
      return {
        hasLoop: true,
        details: { triggerField: "etapa", actionField: "stage_id" },
      };
    }
  }

  return { hasLoop: false };
}

// Check for critical field modifications
export function getCriticalFieldsAffected(
  entityType: string,
  actions: AutomationAction[]
): string[] {
  const modifiedFields = getModifiedFields(actions);
  const criticalForEntity = CRITICAL_FIELDS[entityType as keyof typeof CRITICAL_FIELDS] || [];
  
  return modifiedFields.filter((f) => criticalForEntity.includes(f));
}

// Validate automation configuration
export function validateAutomation(config: AutomationConfig): {
  valid: boolean;
  warnings: string[];
  errors: string[];
} {
  const warnings: string[] = [];
  const errors: string[] = [];

  // Check for potential loops
  const loopCheck = detectPotentialLoop(config);
  if (loopCheck.hasLoop) {
    warnings.push(
      `Potencial loop infinito: o campo "${loopCheck.details?.triggerField}" pode ser modificado repetidamente.`
    );
  }

  // Check for critical fields
  const entityType = getEntityFromTrigger(config.trigger);
  const criticalFields = getCriticalFieldsAffected(entityType, config.actions);
  if (criticalFields.length > 0 && config.conditions.length === 0) {
    warnings.push(
      `Esta automação modifica campos críticos (${criticalFields.join(", ")}) sem condições limitadoras.`
    );
  }

  // Check for actions without proper config
  for (const action of config.actions) {
    if (action.action_type === "update_field" && !action.config.field_name) {
      errors.push("A ação 'Atualizar Campo' requer a seleção de um campo.");
    }
    if (action.action_type === "create_task" && !action.config.title) {
      errors.push("A ação 'Criar Tarefa' requer um título.");
    }
    if (action.action_type === "move_opportunity_stage" && !action.config.stage_id) {
      errors.push("A ação 'Mover Etapa' requer a seleção de uma etapa.");
    }
    if (action.action_type === "send_template_message" && !action.config.template_id) {
      errors.push("A ação 'Enviar com Template' requer a seleção de um template.");
    }
    // Proposal action validations
    if (action.action_type === "create_proposal" && !action.config.proposal_template_id) {
      errors.push("A ação 'Criar Proposta' requer a seleção de um modelo de proposta.");
    }
    if (action.action_type === "send_proposal_link" && !action.config.message_template_id) {
      errors.push("A ação 'Enviar Link da Proposta' requer a seleção de um template de mensagem.");
    }
  }

  return {
    valid: errors.length === 0,
    warnings,
    errors,
  };
}

// Maximum executions per rule per hour to prevent runaway automations
export const MAX_EXECUTIONS_PER_HOUR = 100;

// Check if a rule has exceeded execution limits
export function checkExecutionLimits(
  recentExecutions: number,
  limit: number = MAX_EXECUTIONS_PER_HOUR
): { exceeded: boolean; percentage: number } {
  return {
    exceeded: recentExecutions >= limit,
    percentage: Math.min((recentExecutions / limit) * 100, 100),
  };
}
