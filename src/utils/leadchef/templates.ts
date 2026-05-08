/**
 * LeadChef — Categorias de templates e templates padrão (Fase 9).
 */

export type LeadChefTemplateCategory =
  | "first_contact"
  | "demo_confirmation"
  | "demo_reminder"
  | "post_demo_follow_up"
  | "proposal_follow_up"
  | "referral_request"
  | "referral_first_contact"
  | "post_sale"
  | "cooking_class_invite"
  | "reactivation"
  | "recruitment_conversation"
  | "thank_you"
  | "custom";

export const LEADCHEF_TEMPLATE_CATEGORIES: LeadChefTemplateCategory[] = [
  "first_contact",
  "demo_confirmation",
  "demo_reminder",
  "post_demo_follow_up",
  "proposal_follow_up",
  "referral_request",
  "referral_first_contact",
  "post_sale",
  "cooking_class_invite",
  "reactivation",
  "recruitment_conversation",
  "thank_you",
  "custom",
];

export const LEADCHEF_TEMPLATE_CATEGORY_LABELS: Record<LeadChefTemplateCategory, string> = {
  first_contact: "Primeiro contacto",
  demo_confirmation: "Confirmação de demonstração",
  demo_reminder: "Lembrete de demonstração",
  post_demo_follow_up: "Follow-up pós-demonstração",
  proposal_follow_up: "Follow-up de proposta",
  referral_request: "Pedido de referência",
  referral_first_contact: "Primeiro contacto a referência",
  post_sale: "Pós-venda",
  cooking_class_invite: "Convite para aula",
  reactivation: "Reativação",
  recruitment_conversation: "Conversa de recrutamento",
  thank_you: "Agradecimento",
  custom: "Personalizado",
};

export interface LeadChefDefaultTemplate {
  category: LeadChefTemplateCategory;
  name: string;
  body: string;
}

export const LEADCHEF_DEFAULT_TEMPLATES: LeadChefDefaultTemplate[] = [
  {
    category: "first_contact",
    name: "Primeiro contacto",
    body:
      "Olá {{firstName}}, tudo bem? Sou {{agentName}}. Recebi o teu contacto sobre uma experiência culinária e gostava de perceber melhor como te posso ajudar. Tens disponibilidade para falarmos hoje?",
  },
  {
    category: "demo_confirmation",
    name: "Confirmação de demonstração",
    body:
      "Olá {{firstName}}, confirmo a nossa demonstração para {{appointmentDate}} às {{appointmentTime}}. Qualquer alteração diz-me, por favor. Até já!",
  },
  {
    category: "demo_reminder",
    name: "Lembrete de demonstração",
    body:
      "Olá {{firstName}}, só para lembrar a nossa demonstração marcada para {{appointmentTime}}. Até já!",
  },
  {
    category: "post_demo_follow_up",
    name: "Follow-up pós-demonstração",
    body:
      "Olá {{firstName}}, obrigada pelo tempo de hoje. Gostava de saber o que achaste da experiência e se ficou alguma dúvida que eu possa esclarecer.",
  },
  {
    category: "proposal_follow_up",
    name: "Follow-up de proposta",
    body:
      "Olá {{firstName}}, estou a dar seguimento à proposta que vimos. Queres que te ajude a comparar as opções ou esclarecer algum ponto?",
  },
  {
    category: "referral_request",
    name: "Pedido de referência",
    body:
      "Olá {{firstName}}, lembrei-me de te perguntar: conheces alguém que pudesse gostar de uma experiência culinária como a que fizemos? Se sim, posso contactar com a tua autorização.",
  },
  {
    category: "referral_first_contact",
    name: "Primeiro contacto a referência",
    body:
      "Olá {{firstName}}, tudo bem? O teu contacto foi-me indicado por {{referrerName}}, que achou que poderias gostar de conhecer uma experiência culinária personalizada. Posso explicar-te melhor?",
  },
  {
    category: "post_sale",
    name: "Pós-venda",
    body:
      "Olá {{firstName}}, como está a correr a utilização do equipamento? Queria marcar contigo um acompanhamento rápido para te ajudar a tirar mais partido no dia a dia.",
  },
  {
    category: "cooking_class_invite",
    name: "Convite para aula",
    body:
      "Olá {{firstName}}, vou organizar uma aula de cozinha e lembrei-me de ti. Gostarias de participar?",
  },
  {
    category: "reactivation",
    name: "Reativação",
    body:
      "Olá {{firstName}}, tudo bem? Ficámos de falar mais tarde sobre uma experiência culinária. Ainda faz sentido retomarmos a conversa?",
  },
  {
    category: "thank_you",
    name: "Agradecimento",
    body: "Olá {{firstName}}, obrigada pela disponibilidade. Qualquer questão, estou por aqui.",
  },
];

// ─── Automations defaults ────────────────────────────────────────────────────

export type LeadChefAutomationKey =
  | "lead_no_contact_24h"
  | "demo_done_no_followup"
  | "proposal_pending_3d"
  | "won_no_postsale"
  | "referral_authorized_no_contact"
  | "client_potential_referral"
  | "reactivation_due";

export interface LeadChefAutomationDefault {
  key: LeadChefAutomationKey;
  name: string;
  description: string;
  trigger_type: string;
  action_type: string;
  config: Record<string, unknown>;
  is_enabled: boolean;
}

export const LEADCHEF_DEFAULT_AUTOMATIONS: LeadChefAutomationDefault[] = [
  {
    key: "lead_no_contact_24h",
    name: "Lead novo sem contacto",
    description: "Avisa quando um lead novo está há mais de 24h sem contacto.",
    trigger_type: "lead_created_no_contact",
    action_type: "create_alert",
    config: { delayHours: 24, templateCategory: "first_contact" },
    is_enabled: true,
  },
  {
    key: "demo_done_no_followup",
    name: "Demonstração realizada sem follow-up",
    description: "Sugere follow-up no dia seguinte para demonstrações sem próxima ação.",
    trigger_type: "stage_demo_done_no_next",
    action_type: "suggest_action",
    config: { delayHours: 24, templateCategory: "post_demo_follow_up" },
    is_enabled: true,
  },
  {
    key: "proposal_pending_3d",
    name: "Proposta pendente",
    description: "Alerta quando uma proposta está há mais de 3 dias sem decisão.",
    trigger_type: "stage_proposal_pending",
    action_type: "create_alert",
    config: { delayDays: 3, templateCategory: "proposal_follow_up" },
    is_enabled: true,
  },
  {
    key: "won_no_postsale",
    name: "Venda ganha sem pós-venda",
    description: "Sugere marcar pós-venda quando a venda fica fechada sem visita.",
    trigger_type: "stage_won_no_postsale",
    action_type: "suggest_action",
    config: { templateCategory: "post_sale" },
    is_enabled: true,
  },
  {
    key: "referral_authorized_no_contact",
    name: "Referência autorizada sem contacto",
    description: "Avisa quando uma referência autorizada ainda não foi contactada.",
    trigger_type: "referral_authorized_no_contact",
    action_type: "create_alert",
    config: { templateCategory: "referral_first_contact" },
    is_enabled: true,
  },
  {
    key: "client_potential_referral",
    name: "Cliente com potencial de referência",
    description: "Sugere pedido de referência a clientes marcados com potencial.",
    trigger_type: "client_potential_referral",
    action_type: "suggest_action",
    config: { templateCategory: "referral_request" },
    is_enabled: true,
  },
  {
    key: "reactivation_due",
    name: "Reativação futura",
    description: "Avisa quando uma reativação agendada está vencida.",
    trigger_type: "stage_reactivate_later_due",
    action_type: "create_alert",
    config: { templateCategory: "reactivation" },
    is_enabled: true,
  },
];
