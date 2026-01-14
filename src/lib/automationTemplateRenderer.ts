import { 
  renderTemplate, 
  validateTemplate, 
  VariableContext 
} from "./templateVariables";

export interface AutomationTemplateConfig {
  template_id: string;
  channel: string;
  on_missing_fields: "stop_automation" | "create_task" | "skip_and_log";
  task_title?: string;
}

export interface TemplateRenderResult {
  success: boolean;
  renderedContent?: string;
  renderedSubject?: string;
  missingVariables: string[];
  action: "sent" | "task_created" | "skipped" | "stopped";
  taskTitle?: string;
  error?: string;
}

/**
 * Build variable context from automation trigger data
 */
export function buildContextFromTriggerData(
  entityType: string,
  entityData: Record<string, unknown>,
  userData?: { id?: string; email?: string; full_name?: string }
): VariableContext {
  const context: VariableContext = {};

  // Map entity data based on type
  switch (entityType) {
    case "lead":
      context.lead = {
        id: entityData.id as string,
        name: entityData.name as string,
        email: entityData.email as string,
        phone: entityData.phone as string,
        source: entityData.source as string,
        status: entityData.status as string,
        created_at: entityData.created_at as string,
      };
      break;

    case "opportunity":
      context.opportunity = {
        id: entityData.id as string,
        title: entityData.title as string,
        value: entityData.value as number,
        status: entityData.status as string,
        stage: entityData.stage_name as string,
        expected_close_date: entityData.expected_close_date as string,
        notes: entityData.notes as string,
      };
      // If lead data is available in opportunity context
      if (entityData.lead) {
        const lead = entityData.lead as Record<string, unknown>;
        context.lead = {
          id: lead.id as string,
          name: lead.name as string,
          email: lead.email as string,
          phone: lead.phone as string,
          source: lead.source as string,
          status: lead.status as string,
        };
      }
      break;

    case "contact":
      context.contact = {
        id: entityData.id as string,
        name: entityData.name as string,
        email: entityData.email as string,
        phone: entityData.phone as string,
        company: entityData.company as string,
        job_title: entityData.job_title as string,
      };
      break;

    case "company":
      context.company = {
        id: entityData.id as string,
        name: entityData.name as string,
        email: entityData.email as string,
        phone: entityData.phone as string,
        industry: entityData.industry as string,
        size: entityData.size as string,
        website: entityData.website as string,
        address: entityData.address as string,
      };
      break;
  }

  // Add user context
  if (userData) {
    context.user = {
      id: userData.id,
      full_name: userData.full_name || "Equipe",
      email: userData.email || "",
    };
  }

  return context;
}

/**
 * Render a template with automation context and handle missing variables
 */
export function renderAutomationTemplate(
  template: {
    id: string;
    name: string;
    content: string;
    subject?: string | null;
  },
  context: VariableContext,
  config: AutomationTemplateConfig
): TemplateRenderResult {
  // Validate template
  const contentValidation = validateTemplate(template.content, context);
  const subjectValidation = template.subject 
    ? validateTemplate(template.subject, context) 
    : { isValid: true, missingVariables: [] as string[], unresolvedVariables: [] as string[] };

  const allMissing = [
    ...contentValidation.missingVariables,
    ...contentValidation.unresolvedVariables,
    ...subjectValidation.missingVariables,
    ...subjectValidation.unresolvedVariables,
  ];

  const uniqueMissing = [...new Set(allMissing)];

  // If there are missing variables, handle based on config
  // NOTE: "send_partial" has been removed - automations must NEVER send messages with unresolved variables
  if (uniqueMissing.length > 0) {
    switch (config.on_missing_fields) {
      case "stop_automation":
        return {
          success: false,
          missingVariables: uniqueMissing,
          action: "stopped",
          error: `Automação interrompida: variáveis não resolvidas (${uniqueMissing.join(", ")})`,
        };

      case "create_task":
        return {
          success: false,
          missingVariables: uniqueMissing,
          action: "task_created",
          taskTitle: config.task_title || `Completar mensagem de template "${template.name}"`,
        };

      case "skip_and_log":
        return {
          success: false,
          missingVariables: uniqueMissing,
          action: "skipped",
        };

      default:
        // Default to stopping automation for safety - never send with unresolved variables
        return {
          success: false,
          missingVariables: uniqueMissing,
          action: "stopped",
          error: `Automação interrompida: variáveis não resolvidas (${uniqueMissing.join(", ")})`,
        };
    }
  }

  // All variables resolved - render template
  return {
    success: true,
    renderedContent: renderTemplate(template.content, context),
    renderedSubject: template.subject 
      ? renderTemplate(template.subject, context) 
      : undefined,
    missingVariables: [],
    action: "sent",
  };
}

/**
 * Get entity type from automation trigger
 */
export function getEntityTypeFromTrigger(trigger: string): string {
  if (trigger.startsWith("lead_")) return "lead";
  if (trigger.startsWith("opportunity_")) return "opportunity";
  if (trigger.startsWith("contact_")) return "contact";
  if (trigger.startsWith("company_")) return "company";
  return "unknown";
}

/**
 * Format automation action result for logging
 */
export function formatTemplateActionLog(
  result: TemplateRenderResult,
  templateInfo: { id: string; name: string; channel: string }
): Record<string, unknown> {
  return {
    action_type: "send_template_message",
    details: {
      template_id: templateInfo.id,
      template_name: templateInfo.name,
      channel: templateInfo.channel,
      rendered_content: result.renderedContent,
      rendered_subject: result.renderedSubject,
      missing_variables: result.missingVariables,
      action: result.action,
      stopped: result.action === "stopped",
      skipped: result.action === "skipped",
      task_created: result.action === "task_created",
      task_title: result.taskTitle,
      error: result.error,
    },
  };
}
