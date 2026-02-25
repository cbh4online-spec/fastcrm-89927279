import { AutomationTemplate, IndustryType } from "@/types/automationWorkflows";

export const AUTOMATION_TEMPLATES: AutomationTemplate[] = [
  // =================== LEAD MANAGEMENT ===================
  {
    id: "lead-new-task",
    name: "Lead Novo → Tarefa de Contacto",
    description: "Quando um novo lead é criado, cria uma tarefa para o responsável entrar em contacto",
    category: "lead",
    industry: ["general", "b2b", "servicos", "formacao", "saude"],
    trigger: "lead_created",
    conditions: [],
    actions: [
      {
        action_type: "create_task",
        config: {
          title: "Contactar novo lead: {{lead.name}}",
          due_in_hours: 4,
          priority: "high",
        },
      },
      {
        action_type: "notify_user",
        config: {
          message: "📣 Novo lead! {{lead.name}} aguarda contacto.",
          notify_type: "push",
        },
      },
    ],
    icon: "UserPlus",
    color: "bg-blue-500",
    popularity: 95,
  },
  {
    id: "lead-qualified-opportunity",
    name: "Lead Qualificado → Criar Oportunidade",
    description: "Quando um lead é marcado como qualificado, cria automaticamente uma oportunidade",
    category: "sales",
    industry: ["general", "b2b", "servicos"],
    trigger: "lead_status_changed",
    conditions: [
      { field_name: "status", operator: "equals", value: "qualified" },
    ],
    actions: [
      {
        action_type: "create_opportunity",
        config: {
          title: "Oportunidade - {{lead.name}}",
          source: "qualified_lead",
        },
      },
      {
        action_type: "add_tag",
        config: { tag: "oportunidade-criada" },
      },
    ],
    icon: "Target",
    color: "bg-green-500",
    popularity: 88,
  },

  // =================== CLIENT REACTIVATION ===================
  {
    id: "client-inactive-reactivation",
    name: "Cliente Inativo → Reativação",
    description: "Quando um cliente não compra há 180 dias, cria tarefa de reativação",
    category: "reactivation",
    industry: ["general", "b2b", "servicos", "ecommerce"],
    trigger: "contact_inactive",
    trigger_config: { inactive_days: 180 },
    conditions: [
      { field_name: "client_status", operator: "equals", value: "cliente" },
    ],
    actions: [
      {
        action_type: "create_task",
        config: {
          title: "Reativar cliente: {{contact.name}}",
          description: "Cliente sem compras há 180 dias. Sugerir campanha de reativação.",
          due_in_days: 3,
        },
      },
      {
        action_type: "add_tag",
        config: { tag: "reativacao-pendente" },
      },
    ],
    icon: "RefreshCw",
    color: "bg-orange-500",
    popularity: 82,
    isNew: true,
  },
  {
    id: "abc-c-reactivation",
    name: "Cliente ABC-C → Alerta Reativação",
    description: "Quando um cliente categoria C fica inativo, notifica para ação de reativação",
    category: "reactivation",
    industry: ["b2b", "servicos"],
    trigger: "custom_field_updated",
    trigger_config: { custom_field: "abc_category" },
    conditions: [
      { field_name: "abc_category", operator: "equals", value: "C" },
      { field_name: "last_purchase_days", operator: "greater_than", value: "90" },
    ],
    actions: [
      {
        action_type: "notify_user",
        config: {
          message: "⚠️ Cliente {{contact.name}} (Cat. C) sem compras há +90 dias",
          notify_type: "push",
        },
      },
    ],
    icon: "AlertTriangle",
    color: "bg-yellow-500",
    popularity: 65,
  },

  // =================== PROPOSALS & SALES ===================
  {
    id: "proposal-accepted-onboarding",
    name: "Proposta Aceite → Onboarding",
    description: "Quando uma proposta é aceite, inicia fluxo de onboarding",
    category: "onboarding",
    industry: ["general", "servicos", "formacao", "saude"],
    trigger: "proposal_accepted",
    conditions: [],
    actions: [
      {
        action_type: "move_opportunity_stage",
        config: { stage_name: "Onboarding" },
      },
      {
        action_type: "change_lead_status",
        config: { status: "customer" },
      },
      {
        action_type: "create_task",
        config: {
          title: "Onboarding: {{lead.name}}",
          description: "Iniciar processo de onboarding para novo cliente",
          due_in_hours: 24,
        },
      },
      {
        action_type: "add_tag",
        config: { tag: "novo-cliente" },
      },
    ],
    icon: "CheckCircle",
    color: "bg-emerald-500",
    popularity: 90,
  },
  {
    id: "proposal-no-response",
    name: "Proposta Sem Resposta → Follow-up",
    description: "Proposta sem resposta após 3 dias, cria tarefa de follow-up",
    category: "follow-up",
    industry: ["general", "b2b", "servicos"],
    trigger: "after_x_days",
    trigger_config: { days: 3, from_event: "proposal_sent" },
    conditions: [
      { field_name: "proposal_status", operator: "equals", value: "pending" },
    ],
    actions: [
      {
        action_type: "create_task",
        config: {
          title: "Follow-up proposta: {{lead.name}}",
          due_in_hours: 4,
          priority: "high",
        },
      },
      {
        action_type: "notify_user",
        config: {
          message: "📋 Proposta de {{lead.name}} sem resposta há 3 dias",
          notify_type: "push",
        },
      },
    ],
    icon: "Clock",
    color: "bg-yellow-500",
    popularity: 78,
  },

  // =================== FINANCIAL ===================
  {
    id: "payment-overdue-alert",
    name: "Pagamento em Atraso → Alerta Financeiro",
    description: "Quando um pagamento fica em atraso, notifica o departamento financeiro",
    category: "financial",
    industry: ["general", "b2b", "servicos"],
    trigger: "payment_overdue",
    trigger_config: { overdue_days: 7 },
    conditions: [],
    actions: [
      {
        action_type: "create_financial_alert",
        config: {
          type: "payment_overdue",
          priority: "high",
        },
      },
      {
        action_type: "notify_user",
        config: {
          message: "⚠️ Pagamento de {{contact.name}} em atraso há 7 dias",
          notify_type: "push",
          notify_role: "financial",
        },
      },
      {
        action_type: "add_tag",
        config: { tag: "pagamento-atraso" },
      },
    ],
    icon: "AlertTriangle",
    color: "bg-red-500",
    popularity: 85,
    isNew: true,
  },
  {
    id: "credit-limit-exceeded",
    name: "Plafond Excedido → Bloquear & Notificar",
    description: "Quando o limite de crédito é ultrapassado, bloqueia e notifica",
    category: "financial",
    industry: ["b2b", "servicos"],
    trigger: "credit_limit_exceeded",
    conditions: [],
    actions: [
      {
        action_type: "block_credit",
        config: {},
      },
      {
        action_type: "create_task",
        config: {
          title: "Analisar crédito: {{contact.name}}",
          description: "Limite de crédito excedido. Analisar situação.",
          priority: "high",
        },
      },
      {
        action_type: "notify_user",
        config: {
          message: "🚨 {{contact.name}} excedeu limite de crédito",
          notify_type: "push",
          notify_role: "financial",
        },
      },
    ],
    icon: "CreditCard",
    color: "bg-red-600",
    popularity: 70,
  },

  // =================== INDUSTRY SPECIFIC - FORMAÇÃO ===================
  {
    id: "formacao-inscricao",
    name: "Inscrição Formação → Confirmação",
    description: "Quando alguém se inscreve numa formação, envia confirmação e cria oportunidade",
    category: "lead",
    industry: ["formacao"],
    trigger: "form_submitted",
    trigger_config: { form_type: "inscricao_formacao" },
    conditions: [],
    actions: [
      {
        action_type: "create_opportunity",
        config: {
          title: "Inscrição: {{form.curso}} - {{lead.name}}",
        },
      },
      {
        action_type: "send_template_message",
        config: {
          template: "confirmacao_inscricao",
          channel: "email",
        },
      },
      {
        action_type: "add_tag",
        config: { tag: "inscrito-formacao" },
      },
    ],
    icon: "GraduationCap",
    color: "bg-purple-500",
    popularity: 75,
  },

  // =================== INDUSTRY SPECIFIC - SAÚDE ===================
  {
    id: "saude-consulta-marcada",
    name: "Consulta Marcada → Triagem",
    description: "Quando uma consulta é marcada, inicia processo de triagem",
    category: "lead",
    industry: ["saude"],
    trigger: "form_submitted",
    trigger_config: { form_type: "marcacao_consulta" },
    conditions: [],
    actions: [
      {
        action_type: "create_task",
        config: {
          title: "Triagem: {{lead.name}}",
          description: "Realizar triagem inicial antes da consulta",
          due_in_hours: 24,
        },
      },
      {
        action_type: "send_template_message",
        config: {
          template: "confirmacao_consulta",
          channel: "sms",
        },
      },
    ],
    icon: "Stethoscope",
    color: "bg-teal-500",
    popularity: 70,
  },
  {
    id: "saude-lembrete-consulta",
    name: "Lembrete de Consulta",
    description: "Envia lembrete 24h antes da consulta",
    category: "follow-up",
    industry: ["saude"],
    trigger: "scheduled_time",
    trigger_config: { hours_before: 24, event: "appointment" },
    conditions: [],
    actions: [
      {
        action_type: "send_template_message",
        config: {
          template: "lembrete_consulta",
          channel: "sms",
        },
      },
    ],
    icon: "Bell",
    color: "bg-blue-500",
    popularity: 80,
  },

  // =================== INDUSTRY SPECIFIC - ENI ===================
  {
    id: "eni-novo-cliente",
    name: "ENI Novo → Verificar NIF",
    description: "Quando um ENI é criado, cria tarefa para verificar dados fiscais",
    category: "onboarding",
    industry: ["eni"],
    trigger: "contact_created",
    conditions: [
      { field_name: "entity_type", operator: "equals", value: "eni" },
    ],
    actions: [
      {
        action_type: "create_task",
        config: {
          title: "Verificar NIF: {{contact.name}}",
          description: "Validar dados fiscais do ENI",
          due_in_hours: 24,
        },
      },
    ],
    icon: "FileSearch",
    color: "bg-indigo-500",
    popularity: 60,
  },

  // =================== INBOX AUTOMATION ===================
  {
    id: "inbox-first-message-welcome",
    name: "1ª Mensagem → Boas-vindas",
    description: "Quando um lead envia a primeira mensagem, envia resposta de boas-vindas",
    category: "lead",
    industry: ["general", "ecommerce", "servicos"],
    trigger: "first_message_from_lead",
    trigger_config: { channels: ["instagram", "whatsapp"] },
    conditions: [],
    actions: [
      {
        action_type: "send_template_message",
        config: {
          template: "boas_vindas",
          delay_seconds: 30,
        },
      },
      {
        action_type: "add_tag",
        config: { tag: "novo-lead-inbox" },
      },
    ],
    icon: "MessageSquare",
    color: "bg-blue-500",
    popularity: 85,
  },
  {
    id: "inbox-no-reply-followup",
    name: "Sem Resposta 24h → Follow-up",
    description: "Se cliente não responde em 24h, cria tarefa de follow-up",
    category: "follow-up",
    industry: ["general", "servicos", "ecommerce"],
    trigger: "conversation_no_reply",
    trigger_config: { no_reply_hours: 24 },
    conditions: [],
    actions: [
      {
        action_type: "create_task",
        config: {
          title: "Follow-up: {{lead.name}} - sem resposta",
          due_in_hours: 2,
        },
      },
      {
        action_type: "notify_user",
        config: {
          message: "⏰ {{lead.name}} não respondeu há 24h",
          notify_type: "push",
        },
      },
    ],
    icon: "Clock",
    color: "bg-yellow-500",
    popularity: 80,
  },
  // =================== PLG (Product-Led Growth) ===================
  {
    id: "plg-signup-qualify",
    name: "Signup + Score Alto → Tarefa Sales",
    description: "Quando um product signal de signup chega e o lead tem score ≥ 70, cria tarefa para a equipa comercial",
    category: "lead",
    industry: ["general", "b2b", "ecommerce"],
    trigger: "product_signal",
    conditions: [
      { field_name: "event_type", operator: "equals", value: "signup" },
      { field_name: "lead_score", operator: "gte", value: "70" },
    ],
    actions: [
      {
        action_type: "create_task",
        config: {
          title: "🔥 High-score signup: {{lead.name}}",
          due_in_hours: 2,
          priority: "high",
        },
      },
    ],
    icon: "Zap",
    color: "bg-emerald-500",
    popularity: 88,
    isNew: true,
  },
  {
    id: "plg-trial-expired-nurture",
    name: "Trial Expirado → Campanha Nurture",
    description: "Quando o trial expira, adiciona o lead a uma campanha de nurture por email",
    category: "follow-up",
    industry: ["general", "b2b", "ecommerce"],
    trigger: "product_signal",
    conditions: [
      { field_name: "event_type", operator: "equals", value: "trial_expired" },
    ],
    actions: [
      {
        action_type: "add_to_campaign",
        config: {
          campaign_type: "nurture",
          message: "Notámos que o seu período de teste terminou. Gostaríamos de ajudar!",
        },
      },
    ],
    icon: "Clock",
    color: "bg-orange-500",
    popularity: 82,
    isNew: true,
  },
  {
    id: "plg-activation-pipeline",
    name: "Ativação → Criar Oportunidade",
    description: "Quando um utilizador ativa o produto, cria automaticamente uma oportunidade no pipeline",
    category: "sales",
    industry: ["general", "b2b"],
    trigger: "product_signal",
    conditions: [
      { field_name: "event_type", operator: "equals", value: "activation" },
    ],
    actions: [
      {
        action_type: "create_opportunity",
        config: {
          title: "Oportunidade PLG - {{lead.name}}",
          source: "product_activation",
        },
      },
    ],
    icon: "TrendingUp",
    color: "bg-blue-500",
    popularity: 85,
    isNew: true,
  },
  {
    id: "plg-upgrade-celebrate",
    name: "Upgrade → Tarefa de Agradecimento",
    description: "Quando um utilizador faz upgrade, cria tarefa para enviar mensagem de agradecimento",
    category: "onboarding",
    industry: ["general", "b2b", "ecommerce"],
    trigger: "product_signal",
    conditions: [
      { field_name: "event_type", operator: "equals", value: "upgrade" },
    ],
    actions: [
      {
        action_type: "create_task",
        config: {
          title: "🎉 Enviar agradecimento: {{lead.name}} fez upgrade",
          due_in_hours: 24,
          priority: "medium",
        },
      },
    ],
    icon: "Gift",
    color: "bg-amber-500",
    popularity: 78,
    isNew: true,
  },
];

export function getTemplatesByIndustry(industry: IndustryType): AutomationTemplate[] {
  return AUTOMATION_TEMPLATES.filter(t => 
    t.industry.includes(industry) || t.industry.includes("general")
  ).sort((a, b) => b.popularity - a.popularity);
}

export function getTemplatesByCategory(category: AutomationTemplate["category"]): AutomationTemplate[] {
  return AUTOMATION_TEMPLATES.filter(t => t.category === category)
    .sort((a, b) => b.popularity - a.popularity);
}

export function getTemplateById(id: string): AutomationTemplate | undefined {
  return AUTOMATION_TEMPLATES.find(t => t.id === id);
}

export function getNewTemplates(): AutomationTemplate[] {
  return AUTOMATION_TEMPLATES.filter(t => t.isNew);
}

export function getPopularTemplates(limit = 10): AutomationTemplate[] {
  return [...AUTOMATION_TEMPLATES]
    .sort((a, b) => b.popularity - a.popularity)
    .slice(0, limit);
}

export const TEMPLATE_CATEGORIES = [
  { id: "lead", label: "Leads", icon: "UserPlus" },
  { id: "sales", label: "Vendas", icon: "Target" },
  { id: "follow-up", label: "Follow-up", icon: "Clock" },
  { id: "financial", label: "Financeiro", icon: "CreditCard" },
  { id: "onboarding", label: "Onboarding", icon: "CheckCircle" },
  { id: "reactivation", label: "Reativação", icon: "RefreshCw" },
  { id: "plg", label: "PLG", icon: "Zap" },
];

export const INDUSTRY_OPTIONS = [
  { id: "general", label: "Geral", description: "Templates universais" },
  { id: "formacao", label: "Formação", description: "Escolas e cursos" },
  { id: "saude", label: "Saúde", description: "Clínicas e consultórios" },
  { id: "servicos", label: "Serviços", description: "Prestadores de serviços" },
  { id: "eni", label: "ENI", description: "Empresários em Nome Individual" },
  { id: "b2b", label: "B2B", description: "Vendas business-to-business" },
  { id: "ecommerce", label: "E-commerce", description: "Lojas online" },
];
