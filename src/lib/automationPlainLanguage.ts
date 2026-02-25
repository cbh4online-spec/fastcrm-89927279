import { AutomationTrigger, AutomationActionType, ConditionOperator } from "@/hooks/useAutomations";

// Generate plain language description of a trigger
const triggerDescriptions: Record<AutomationTrigger, string> = {
  lead_created: "Quando um novo lead é criado",
  lead_updated: "Quando um lead é atualizado",
  lead_status_changed: "Quando o estado de um lead muda",
  lead_no_response: "Quando um lead não responde",
  lead_score_changed: "Quando o score de um lead muda",
  lead_temperature_changed: "Quando a temperatura de um lead muda",
  opportunity_created: "Quando uma nova oportunidade é criada",
  opportunity_updated: "Quando uma oportunidade é atualizada",
  opportunity_stage_changed: "Quando uma oportunidade muda de etapa",
  opportunity_value_changed: "Quando o valor de uma oportunidade muda",
  contact_created: "Quando um novo contacto é criado",
  contact_updated: "Quando um contacto é atualizado",
  contact_score_changed: "Quando o score de um contacto muda",
  contact_temperature_changed: "Quando a temperatura de um contacto muda",
  company_created: "Quando uma nova empresa é criada",
  company_updated: "Quando uma empresa é atualizada",
  company_score_changed: "Quando o score de uma empresa muda",
  company_temperature_changed: "Quando a temperatura de uma empresa muda",
  custom_field_updated: "Quando um campo personalizado é alterado",
  payment_confirmed: "Quando um pagamento é confirmado",
  message_received: "Quando uma mensagem é recebida",
  first_message_from_lead: "Quando um lead envia a primeira mensagem",
  conversation_no_reply: "Quando não há resposta na conversa",
  conversation_resolved: "Quando uma conversa é resolvida",
  conversation_priority_changed: "Quando a prioridade da conversa muda",
  proposal_created: "Quando uma proposta é criada",
  proposal_viewed: "Quando uma proposta é visualizada",
  proposal_paid: "Quando uma proposta é paga",
  scheduled_time: "Em data/hora agendada",
  tag_added: "Quando uma tag é adicionada",
  tag_removed: "Quando uma tag é removida",
  form_submitted: "Quando um formulário é submetido",
  store_purchase_completed: "Quando uma compra é efetuada na loja",
  store_cart_abandoned: "Quando um carrinho é abandonado",
  store_repurchase: "Quando um cliente faz uma recompra",
  store_first_purchase: "Quando um cliente faz a primeira compra",
  store_order_status_changed: "Quando o estado de uma encomenda muda",
  health_label_changed: "Quando o estado de saúde de um deal muda",
  health_score_below_threshold: "Quando o score de saúde cai abaixo do limite",
  health_score_dropped: "Quando o score de saúde diminui significativamente",
  forecast_confidence_below_threshold: "Quando a confiança do forecast cai abaixo do limite",
  forecast_drop_percentage: "Quando o forecast cai uma percentagem significativa",
};

/**
 * Get human-readable label for a trigger
 */
export function getTriggerLabel(trigger: AutomationTrigger | string): string {
  return triggerDescriptions[trigger as AutomationTrigger] || trigger;
}

// Generate plain language description of an operator
const operatorDescriptions: Record<ConditionOperator, (fieldLabel: string, value: string | null) => string> = {
  equals: (field, value) => `${field} é igual a "${value}"`,
  not_equals: (field, value) => `${field} é diferente de "${value}"`,
  contains: (field, value) => `${field} contém "${value}"`,
  not_contains: (field, value) => `${field} não contém "${value}"`,
  greater_than: (field, value) => `${field} é maior que ${value}`,
  less_than: (field, value) => `${field} é menor que ${value}`,
  is_empty: (field) => `${field} está vazio`,
  is_not_empty: (field) => `${field} não está vazio`,
};

// Generate plain language description of an action
const actionDescriptions: Record<AutomationActionType, (config: Record<string, unknown>) => string> = {
  create_task: (config) => {
    const title = config.task_title as string || config.title as string || "nova tarefa";
    return `Criar tarefa "${title}"`;
  },
  assign_owner: (config) => {
    return `Atribuir responsável`;
  },
  move_opportunity_stage: (config) => {
    return `Mover oportunidade para nova etapa`;
  },
  add_tag: (config) => {
    const tag = config.tag as string || "tag";
    return `Adicionar tag "${tag}"`;
  },
  send_message: (config) => {
    const channel = config.channel as string || "canal";
    return `Enviar mensagem via ${channel}`;
  },
  send_template_message: (config) => {
    const channel = config.channel as string || "canal";
    return `Enviar mensagem de template via ${channel}`;
  },
  notify_user: (config) => {
    return `Notificar utilizador`;
  },
  create_opportunity: (config) => {
    return `Criar nova oportunidade`;
  },
  update_field: (config) => {
    const fieldName = config.field_name as string || "campo";
    const value = config.field_value as string || config.value as string || "valor";
    return `Atualizar ${fieldName} para "${value}"`;
  },
  create_proposal: (config) => {
    return `Criar proposta a partir de modelo`;
  },
  send_proposal_link: (config) => {
    const channel = config.channel as string || "canal";
    return `Enviar link da proposta via ${channel}`;
  },
  wait_time: (config) => {
    const hours = config.wait_hours as number;
    const days = config.wait_days as number;
    if (days) return `Aguardar ${days} dia(s)`;
    if (hours) return `Aguardar ${hours} hora(s)`;
    return `Aguardar tempo definido`;
  },
  stop_automation: () => {
    return `Parar automação`;
  },
  change_lead_status: (config) => {
    const status = config.new_status as string || "novo estado";
    return `Alterar estado do lead para "${status}"`;
  },
  send_followup_email: () => `Enviar e-mail de follow-up`,
  trigger_upsell_offer: () => `Enviar oferta de upsell`,
  start_onboarding_flow: () => `Iniciar fluxo de onboarding`,
  activate_ai_assistant: () => `Ativar assistente IA`,
  schedule_repurchase_reminder: (config) => {
    const days = config.reminder_days as number || 30;
    return `Agendar lembrete de recompra (${days} dias)`;
  },
};

export interface Condition {
  field_name: string;
  operator: ConditionOperator;
  value: string | null;
}

export interface Action {
  action_type: AutomationActionType;
  config: Record<string, unknown>;
}

export interface PlainLanguageRule {
  trigger: string;
  conditions: string[];
  actions: string[];
  fullSummary: string;
}

// Field name to label mapping
const fieldLabels: Record<string, string> = {
  name: "Nome",
  email: "Email",
  phone: "Telefone",
  status: "Estado",
  source: "Origem",
  tags: "Tags",
  title: "Título",
  value: "Valor",
  stage_id: "Etapa",
  expected_close_date: "Data prevista de fecho",
  company: "Empresa",
  job_title: "Cargo",
  industry: "Setor",
  size: "Tamanho",
  website: "Website",
  price: "Preço",
};

function getFieldLabel(fieldName: string): string {
  if (fieldName.startsWith("custom:")) {
    return "Campo personalizado";
  }
  return fieldLabels[fieldName] || fieldName;
}

/**
 * Generate a plain language summary of an automation rule
 */
export function generatePlainLanguageSummary(
  trigger: AutomationTrigger,
  conditions: Condition[],
  actions: Action[]
): PlainLanguageRule {
  const triggerText = triggerDescriptions[trigger] || trigger;
  
  const conditionTexts = conditions.map((c) => {
    const fieldLabel = getFieldLabel(c.field_name);
    const opFn = operatorDescriptions[c.operator];
    return opFn ? opFn(fieldLabel, c.value) : `${fieldLabel} ${c.operator} ${c.value}`;
  });
  
  const actionTexts = actions.map((a) => {
    const descFn = actionDescriptions[a.action_type];
    return descFn ? descFn(a.config) : a.action_type;
  });

  // Build full summary
  let fullSummary = triggerText;
  
  if (conditionTexts.length > 0) {
    fullSummary += `, se ${conditionTexts.join(" e ")}`;
  }
  
  if (actionTexts.length > 0) {
    fullSummary += `, então ${actionTexts.join(", ")}`;
  }

  return {
    trigger: triggerText,
    conditions: conditionTexts,
    actions: actionTexts,
    fullSummary,
  };
}

/**
 * Format execution log in plain language
 */
export function formatExecutionLog(
  status: string,
  ruleName: string,
  actionsExecuted?: unknown[],
  errorMessage?: string
): string {
  const statusText: Record<string, string> = {
    pending: "Aguardando execução",
    running: "A executar",
    completed: "Executado com sucesso",
    failed: "Falhou",
  };

  let message = `${statusText[status] || status}: "${ruleName}"`;
  
  if (actionsExecuted && Array.isArray(actionsExecuted) && actionsExecuted.length > 0) {
    message += ` - ${actionsExecuted.length} ação(ões) executada(s)`;
  }
  
  if (errorMessage) {
    message += ` - Erro: ${errorMessage}`;
  }

  return message;
}
