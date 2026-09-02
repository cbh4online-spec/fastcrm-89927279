/**
 * FastCRM WhatsApp Conversion Engine — taxonomia comercial.
 *
 * Módulo puro (sem React, sem Supabase) para poder ser reutilizado
 * tanto no frontend como em edge functions.
 */

export type TemplateFamily =
  | "lead_new"
  | "qualification"
  | "scheduling"
  | "proposal"
  | "closing"
  | "reactivation"
  | "post_sale";

export const TEMPLATE_FAMILY_LABELS: Record<TemplateFamily, string> = {
  lead_new: "Nova lead",
  qualification: "Qualificação",
  scheduling: "Agendamento",
  proposal: "Proposta",
  closing: "Fecho",
  reactivation: "Reativação",
  post_sale: "Pós-venda",
};

export type ExecutionMode = "automatic" | "assisted" | "manual";

export const EXECUTION_MODE_LABELS: Record<ExecutionMode, string> = {
  automatic: "Automático",
  assisted: "Assistido",
  manual: "Manual",
};

/** Próxima melhor ação comercial. */
export type NextBestActionKind =
  | "SEND_MESSAGE"
  | "ASK_QUESTION"
  | "SCHEDULE_MEETING"
  | "SEND_PROPOSAL"
  | "FOLLOW_UP_PROPOSAL"
  | "HANDLE_OBJECTION"
  | "FOLLOW_UP"
  | "REACTIVATE"
  | "WAIT"
  | "STOP_CONTACT";

export const NEXT_BEST_ACTION_LABELS: Record<NextBestActionKind, string> = {
  SEND_MESSAGE: "Enviar mensagem",
  ASK_QUESTION: "Fazer pergunta de qualificação",
  SCHEDULE_MEETING: "Propor agendamento",
  SEND_PROPOSAL: "Enviar proposta",
  FOLLOW_UP_PROPOSAL: "Follow-up da proposta",
  HANDLE_OBJECTION: "Tratar objeção",
  FOLLOW_UP: "Follow-up",
  REACTIVATE: "Reativar",
  WAIT: "Aguardar",
  STOP_CONTACT: "Parar contacto",
};

export type LeadTemperature = "quente" | "morna" | "exploratoria" | "fria";

export const TEMPERATURE_LABELS: Record<LeadTemperature, string> = {
  quente: "Quente",
  morna: "Morna",
  exploratoria: "Exploratória",
  fria: "Fria",
};
