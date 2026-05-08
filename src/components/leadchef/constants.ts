import type { LeadChefStage, LeadChefActivityType } from "@/types/leadchef";

export const LEADCHEF_STAGES: LeadChefStage[] = [
  "new",
  "to_contact",
  "in_conversation",
  "demo_scheduled",
  "demo_done",
  "proposal_decision",
  "won",
  "lost",
  "reactivate_later",
];

export const LEADCHEF_STAGE_LABELS: Record<LeadChefStage, string> = {
  new: "Novo",
  to_contact: "Contactar",
  in_conversation: "Em conversa",
  demo_scheduled: "Demonstração marcada",
  demo_done: "Demonstração realizada",
  proposal_decision: "Proposta / decisão",
  won: "Venda ganha",
  lost: "Perdido",
  reactivate_later: "Reativar mais tarde",
};

/**
 * Cores por estado — usar tokens semânticos quando possível.
 * Mantemos paleta emerald/slate para coerência visual do módulo.
 */
export const LEADCHEF_STAGE_COLORS: Record<LeadChefStage, string> = {
  new: "bg-emerald-50 text-emerald-700 border-emerald-200",
  to_contact: "bg-amber-50 text-amber-700 border-amber-200",
  in_conversation: "bg-sky-50 text-sky-700 border-sky-200",
  demo_scheduled: "bg-indigo-50 text-indigo-700 border-indigo-200",
  demo_done: "bg-violet-50 text-violet-700 border-violet-200",
  proposal_decision: "bg-orange-50 text-orange-700 border-orange-200",
  won: "bg-emerald-100 text-emerald-800 border-emerald-300",
  lost: "bg-rose-50 text-rose-700 border-rose-200",
  reactivate_later: "bg-slate-100 text-slate-700 border-slate-200",
};

export const LEADCHEF_ACTIVITY_LABELS: Record<LeadChefActivityType, string> = {
  phone_call: "Chamada",
  whatsapp: "WhatsApp",
  follow_up: "Follow-up",
  demo: "Demonstração",
  post_sale_visit: "Pós-venda",
  cooking_class: "Aula de cozinha",
  custom_visit: "Visita à medida",
  proposal: "Proposta",
  sale: "Venda",
  referral: "Referência",
  recruitment: "Recrutamento",
  team_meeting: "Reunião de equipa",
  training: "Formação",
  social_media: "Redes sociais",
  note: "Nota",
};

export const LEADCHEF_BRAND_COLOR = "emerald";

// ─── Appointments (Fase 4) ───────────────────────────────────────────────────

import type {
  LeadChefAppointmentType,
  LeadChefAppointmentStatus,
  LeadChefAppointmentOutcome,
} from "@/types/leadchef";

export const LEADCHEF_APPOINTMENT_TYPES: LeadChefAppointmentType[] = [
  "phone_call",
  "whatsapp",
  "follow_up",
  "demo",
  "post_sale_visit",
  "cooking_class",
  "custom_visit",
  "proposal",
  "referral",
  "recruitment",
  "team_meeting",
  "training",
  "note",
  "other",
];

export const LEADCHEF_APPOINTMENT_TYPE_LABELS: Record<LeadChefAppointmentType, string> = {
  phone_call: "Chamada",
  whatsapp: "WhatsApp",
  follow_up: "Follow-up",
  demo: "Demonstração",
  post_sale_visit: "Pós-venda",
  cooking_class: "Aula de cozinha",
  custom_visit: "Visita à medida",
  proposal: "Proposta",
  referral: "Referência",
  recruitment: "Recrutamento",
  team_meeting: "Reunião de equipa",
  training: "Formação",
  note: "Nota",
  other: "Outro",
};

export const LEADCHEF_APPOINTMENT_TYPE_COLORS: Record<LeadChefAppointmentType, string> = {
  phone_call: "bg-sky-50 text-sky-700 border-sky-200",
  whatsapp: "bg-emerald-50 text-emerald-700 border-emerald-200",
  follow_up: "bg-amber-50 text-amber-700 border-amber-200",
  demo: "bg-indigo-50 text-indigo-700 border-indigo-200",
  post_sale_visit: "bg-violet-50 text-violet-700 border-violet-200",
  cooking_class: "bg-rose-50 text-rose-700 border-rose-200",
  custom_visit: "bg-orange-50 text-orange-700 border-orange-200",
  proposal: "bg-fuchsia-50 text-fuchsia-700 border-fuchsia-200",
  referral: "bg-teal-50 text-teal-700 border-teal-200",
  recruitment: "bg-lime-50 text-lime-700 border-lime-200",
  team_meeting: "bg-slate-100 text-slate-700 border-slate-200",
  training: "bg-blue-50 text-blue-700 border-blue-200",
  note: "bg-slate-50 text-slate-700 border-slate-200",
  other: "bg-slate-50 text-slate-700 border-slate-200",
};

export const LEADCHEF_APPOINTMENT_STATUSES: LeadChefAppointmentStatus[] = [
  "scheduled",
  "completed",
  "cancelled",
  "rescheduled",
  "overdue",
];

export const LEADCHEF_APPOINTMENT_STATUS_LABELS: Record<LeadChefAppointmentStatus, string> = {
  scheduled: "Agendado",
  completed: "Concluído",
  cancelled: "Cancelado",
  rescheduled: "Reagendado",
  overdue: "Em atraso",
};

export const LEADCHEF_APPOINTMENT_STATUS_COLORS: Record<LeadChefAppointmentStatus, string> = {
  scheduled: "bg-sky-50 text-sky-700 border-sky-200",
  completed: "bg-emerald-50 text-emerald-700 border-emerald-200",
  cancelled: "bg-slate-100 text-slate-500 border-slate-200",
  rescheduled: "bg-amber-50 text-amber-700 border-amber-200",
  overdue: "bg-rose-50 text-rose-700 border-rose-200",
};

export const LEADCHEF_APPOINTMENT_OUTCOMES: LeadChefAppointmentOutcome[] = [
  "done",
  "no_answer",
  "rescheduled",
  "proposal_sent",
  "won",
  "no_interest",
  "needs_followup",
  "asked_info",
  "asked_later",
];

export const LEADCHEF_APPOINTMENT_OUTCOME_LABELS: Record<LeadChefAppointmentOutcome, string> = {
  done: "Realizado",
  no_answer: "Sem resposta",
  rescheduled: "Reagendado",
  proposal_sent: "Proposta enviada",
  won: "Venda ganha",
  no_interest: "Sem interesse",
  needs_followup: "Precisa de follow-up",
  asked_info: "Pediu informação",
  asked_later: "Pediu contacto mais tarde",
};

