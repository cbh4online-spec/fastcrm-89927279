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
