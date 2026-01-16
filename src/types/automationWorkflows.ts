// Types for multi-step workflows
export type WorkflowStatus = "draft" | "active" | "paused" | "archived";

export type WorkflowStepType = 
  | "trigger"
  | "condition"
  | "action"
  | "delay"
  | "branch"
  | "end";

export type DelayUnit = "minutes" | "hours" | "days" | "weeks";

export interface WorkflowDelay {
  value: number;
  unit: DelayUnit;
}

export interface WorkflowBranch {
  id: string;
  label: string;
  condition: {
    field: string;
    operator: string;
    value: string | null;
  };
  nextStepId: string | null;
}

export interface WorkflowStep {
  id: string;
  type: WorkflowStepType;
  position: { x: number; y: number };
  data: {
    trigger?: string;
    trigger_config?: Record<string, unknown>;
    action_type?: string;
    action_config?: Record<string, unknown>;
    condition?: {
      field: string;
      operator: string;
      value: string | null;
    };
    delay?: WorkflowDelay;
    branches?: WorkflowBranch[];
    label?: string;
  };
  nextStepId: string | null;
}

export interface Workflow {
  id: string;
  workspace_id: string;
  name: string;
  description: string | null;
  status: WorkflowStatus;
  steps: WorkflowStep[];
  created_by: string;
  created_at: string;
  updated_at: string;
  last_run_at: string | null;
  run_count: number;
  success_count: number;
  error_count: number;
}

// Industry-specific templates
export type IndustryType = 
  | "formacao"
  | "saude"
  | "servicos"
  | "eni"
  | "b2b"
  | "ecommerce"
  | "general";

export interface AutomationTemplate {
  id: string;
  name: string;
  description: string;
  category: "lead" | "sales" | "follow-up" | "financial" | "onboarding" | "reactivation";
  industry: IndustryType[];
  trigger: string;
  trigger_config?: Record<string, unknown>;
  conditions: Array<{
    field_name: string;
    operator: string;
    value: string | null;
  }>;
  actions: Array<{
    action_type: string;
    config: Record<string, unknown>;
  }>;
  icon: string;
  color: string;
  popularity: number;
  isNew?: boolean;
}

// Extended triggers
export type ExtendedTrigger =
  | "lead_created"
  | "lead_updated"
  | "lead_status_changed"
  | "lead_no_response"
  | "lead_score_changed"
  | "lead_temperature_changed"
  | "opportunity_created"
  | "opportunity_updated"
  | "opportunity_stage_changed"
  | "opportunity_value_changed"
  | "opportunity_won"
  | "opportunity_lost"
  | "contact_created"
  | "contact_updated"
  | "contact_score_changed"
  | "contact_temperature_changed"
  | "contact_inactive"
  | "company_created"
  | "company_updated"
  | "company_score_changed"
  | "company_temperature_changed"
  | "custom_field_updated"
  // Financial triggers
  | "payment_received"
  | "payment_overdue"
  | "invoice_created"
  | "invoice_overdue"
  | "proposal_created"
  | "proposal_viewed"
  | "proposal_accepted"
  | "proposal_rejected"
  | "proposal_paid"
  | "payment_confirmed"
  | "credit_limit_exceeded"
  // Inbox triggers
  | "message_received"
  | "first_message_from_lead"
  | "conversation_no_reply"
  | "conversation_resolved"
  | "conversation_priority_changed"
  // Form triggers
  | "form_submitted"
  | "form_field_filled"
  // Time-based triggers
  | "scheduled_time"
  | "recurring_daily"
  | "recurring_weekly"
  | "recurring_monthly"
  | "after_x_days"
  | "specific_date"
  | "anniversary"
  // Tag triggers
  | "tag_added"
  | "tag_removed";

// Extended actions
export type ExtendedAction =
  | "create_task"
  | "move_opportunity_stage"
  | "send_message"
  | "notify_user"
  | "assign_owner"
  | "add_tag"
  | "remove_tag"
  | "create_opportunity"
  | "update_field"
  | "send_template_message"
  | "create_proposal"
  | "send_proposal_link"
  | "wait_time"
  | "stop_automation"
  | "change_lead_status"
  | "change_contact_status"
  // Financial actions
  | "block_credit"
  | "adjust_credit_limit"
  | "create_financial_alert"
  | "create_invoice"
  // Communication actions
  | "send_email"
  | "send_whatsapp"
  | "send_sms"
  | "create_inbox_message"
  // System actions
  | "call_webhook"
  | "trigger_automation"
  | "create_internal_note"
  | "log_activity";

// Trigger category for UI organization
export interface TriggerCategory {
  id: string;
  label: string;
  icon: string;
  triggers: Array<{
    value: ExtendedTrigger;
    label: string;
    description: string;
    requiresConfig?: boolean;
  }>;
}

// Action category for UI organization  
export interface ActionCategory {
  id: string;
  label: string;
  icon: string;
  actions: Array<{
    value: ExtendedAction;
    label: string;
    description: string;
    requiresConfig?: boolean;
  }>;
}

export const TRIGGER_CATEGORIES: TriggerCategory[] = [
  {
    id: "crm",
    label: "CRM",
    icon: "Users",
    triggers: [
      { value: "lead_created", label: "Lead Criado", description: "Quando um novo lead é criado" },
      { value: "lead_updated", label: "Lead Atualizado", description: "Quando um lead é modificado" },
      { value: "lead_status_changed", label: "Estado do Lead Alterado", description: "Quando o estado muda" },
      { value: "lead_score_changed", label: "Score Alterado", description: "Quando o lead score muda" },
      { value: "lead_temperature_changed", label: "Temperatura Alterada", description: "Quando a temperatura muda" },
      { value: "contact_created", label: "Contacto Criado", description: "Quando um contacto é criado" },
      { value: "contact_updated", label: "Contacto Atualizado", description: "Quando um contacto é modificado" },
      { value: "contact_inactive", label: "Contacto Inativo", description: "Quando um contacto fica inativo", requiresConfig: true },
      { value: "company_created", label: "Empresa Criada", description: "Quando uma empresa é criada" },
      { value: "company_updated", label: "Empresa Atualizada", description: "Quando uma empresa é modificada" },
      { value: "custom_field_updated", label: "Campo Personalizado Alterado", description: "Quando um campo custom muda", requiresConfig: true },
    ],
  },
  {
    id: "opportunities",
    label: "Oportunidades",
    icon: "Target",
    triggers: [
      { value: "opportunity_created", label: "Oportunidade Criada", description: "Quando uma oportunidade é criada" },
      { value: "opportunity_updated", label: "Oportunidade Atualizada", description: "Quando uma oportunidade é modificada" },
      { value: "opportunity_stage_changed", label: "Etapa Alterada", description: "Quando a etapa muda" },
      { value: "opportunity_value_changed", label: "Valor Alterado", description: "Quando o valor muda" },
      { value: "opportunity_won", label: "Oportunidade Ganha", description: "Quando uma oportunidade é fechada como ganha" },
      { value: "opportunity_lost", label: "Oportunidade Perdida", description: "Quando uma oportunidade é perdida" },
    ],
  },
  {
    id: "financial",
    label: "Financeiro",
    icon: "CreditCard",
    triggers: [
      { value: "payment_received", label: "Pagamento Recebido", description: "Quando um pagamento é recebido" },
      { value: "payment_overdue", label: "Pagamento em Atraso", description: "Quando um pagamento está atrasado", requiresConfig: true },
      { value: "invoice_created", label: "Fatura Criada", description: "Quando uma fatura é criada" },
      { value: "invoice_overdue", label: "Fatura em Atraso", description: "Quando uma fatura está atrasada", requiresConfig: true },
      { value: "proposal_created", label: "Proposta Criada", description: "Quando uma proposta é criada" },
      { value: "proposal_viewed", label: "Proposta Visualizada", description: "Quando uma proposta é visualizada" },
      { value: "proposal_accepted", label: "Proposta Aceite", description: "Quando uma proposta é aceite" },
      { value: "proposal_rejected", label: "Proposta Rejeitada", description: "Quando uma proposta é rejeitada" },
      { value: "proposal_paid", label: "Proposta Paga", description: "Quando uma proposta é paga" },
      { value: "credit_limit_exceeded", label: "Plafond Excedido", description: "Quando o limite de crédito é ultrapassado" },
    ],
  },
  {
    id: "inbox",
    label: "Inbox",
    icon: "MessageSquare",
    triggers: [
      { value: "message_received", label: "Mensagem Recebida", description: "Quando uma mensagem é recebida", requiresConfig: true },
      { value: "first_message_from_lead", label: "1ª Mensagem do Lead", description: "Quando um lead envia a primeira mensagem", requiresConfig: true },
      { value: "conversation_no_reply", label: "Sem Resposta", description: "Quando não há resposta após X horas", requiresConfig: true },
      { value: "conversation_resolved", label: "Conversa Resolvida", description: "Quando uma conversa é resolvida" },
      { value: "conversation_priority_changed", label: "Prioridade Alterada", description: "Quando a prioridade muda", requiresConfig: true },
    ],
  },
  {
    id: "forms",
    label: "Formulários",
    icon: "FileText",
    triggers: [
      { value: "form_submitted", label: "Formulário Submetido", description: "Quando um formulário é submetido", requiresConfig: true },
      { value: "form_field_filled", label: "Campo Preenchido", description: "Quando um campo específico é preenchido", requiresConfig: true },
    ],
  },
  {
    id: "time",
    label: "Tempo",
    icon: "Clock",
    triggers: [
      { value: "scheduled_time", label: "Data/Hora Agendada", description: "Numa data e hora específica", requiresConfig: true },
      { value: "recurring_daily", label: "Diariamente", description: "Executa todos os dias", requiresConfig: true },
      { value: "recurring_weekly", label: "Semanalmente", description: "Executa todas as semanas", requiresConfig: true },
      { value: "recurring_monthly", label: "Mensalmente", description: "Executa todos os meses", requiresConfig: true },
      { value: "after_x_days", label: "Após X Dias", description: "Após um número de dias", requiresConfig: true },
      { value: "anniversary", label: "Aniversário", description: "Na data de aniversário", requiresConfig: true },
    ],
  },
  {
    id: "tags",
    label: "Tags",
    icon: "Tag",
    triggers: [
      { value: "tag_added", label: "Tag Adicionada", description: "Quando uma tag é adicionada", requiresConfig: true },
      { value: "tag_removed", label: "Tag Removida", description: "Quando uma tag é removida", requiresConfig: true },
    ],
  },
];

export const ACTION_CATEGORIES: ActionCategory[] = [
  {
    id: "crm",
    label: "CRM",
    icon: "Users",
    actions: [
      { value: "create_task", label: "Criar Tarefa", description: "Cria uma tarefa para um utilizador" },
      { value: "update_field", label: "Atualizar Campo", description: "Atualiza um campo da entidade", requiresConfig: true },
      { value: "change_lead_status", label: "Alterar Estado do Lead", description: "Muda o estado do lead", requiresConfig: true },
      { value: "change_contact_status", label: "Alterar Estado do Contacto", description: "Muda o estado do contacto", requiresConfig: true },
      { value: "create_opportunity", label: "Criar Oportunidade", description: "Cria uma nova oportunidade" },
      { value: "move_opportunity_stage", label: "Mover Etapa", description: "Move a oportunidade para outra etapa", requiresConfig: true },
      { value: "assign_owner", label: "Atribuir Responsável", description: "Atribui um responsável", requiresConfig: true },
      { value: "add_tag", label: "Adicionar Tag", description: "Adiciona uma tag", requiresConfig: true },
      { value: "remove_tag", label: "Remover Tag", description: "Remove uma tag", requiresConfig: true },
      { value: "create_internal_note", label: "Criar Nota Interna", description: "Adiciona uma nota interna", requiresConfig: true },
      { value: "log_activity", label: "Registar Atividade", description: "Regista uma atividade no histórico", requiresConfig: true },
    ],
  },
  {
    id: "communication",
    label: "Comunicação",
    icon: "MessageSquare",
    actions: [
      { value: "send_template_message", label: "Enviar Mensagem (Template)", description: "Envia mensagem usando template", requiresConfig: true },
      { value: "send_email", label: "Enviar Email", description: "Envia um email", requiresConfig: true },
      { value: "send_whatsapp", label: "Enviar WhatsApp", description: "Envia uma mensagem WhatsApp", requiresConfig: true },
      { value: "send_sms", label: "Enviar SMS", description: "Envia um SMS", requiresConfig: true },
      { value: "notify_user", label: "Notificar Utilizador", description: "Notifica um utilizador interno", requiresConfig: true },
      { value: "create_inbox_message", label: "Criar Mensagem Inbox", description: "Cria uma mensagem no inbox", requiresConfig: true },
    ],
  },
  {
    id: "proposals",
    label: "Propostas",
    icon: "FileText",
    actions: [
      { value: "create_proposal", label: "Criar Proposta", description: "Cria uma nova proposta", requiresConfig: true },
      { value: "send_proposal_link", label: "Enviar Link da Proposta", description: "Envia o link da proposta", requiresConfig: true },
    ],
  },
  {
    id: "financial",
    label: "Financeiro",
    icon: "CreditCard",
    actions: [
      { value: "block_credit", label: "Bloquear Crédito", description: "Bloqueia o crédito do cliente" },
      { value: "adjust_credit_limit", label: "Ajustar Plafond", description: "Ajusta o limite de crédito", requiresConfig: true },
      { value: "create_financial_alert", label: "Criar Alerta Financeiro", description: "Cria um alerta financeiro", requiresConfig: true },
      { value: "create_invoice", label: "Criar Fatura", description: "Cria uma nova fatura", requiresConfig: true },
    ],
  },
  {
    id: "system",
    label: "Sistema",
    icon: "Cog",
    actions: [
      { value: "wait_time", label: "Aguardar Tempo", description: "Aguarda um período antes de continuar", requiresConfig: true },
      { value: "stop_automation", label: "Parar Automação", description: "Interrompe a execução" },
      { value: "call_webhook", label: "Chamar Webhook", description: "Chama um webhook externo", requiresConfig: true },
      { value: "trigger_automation", label: "Disparar Outra Automação", description: "Dispara outra automação", requiresConfig: true },
    ],
  },
];
