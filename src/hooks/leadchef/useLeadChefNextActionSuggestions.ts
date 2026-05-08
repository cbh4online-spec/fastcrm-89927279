import type { LeadChefStage } from "@/types/leadchef";
import type { LeadChefNextActionSuggestion } from "@/types/leadchefTemplates";
import type { LeadChefTemplateCategory } from "@/utils/leadchef/templates";

interface Args {
  stage: LeadChefStage;
  hasNextAction: boolean;
}

function tomorrow(hour = 10): { iso: string; label: string } {
  const d = new Date();
  d.setDate(d.getDate() + 1);
  d.setHours(hour, 0, 0, 0);
  return {
    iso: d.toISOString(),
    label: `Amanhã às ${d.toLocaleTimeString("pt-PT", { hour: "2-digit", minute: "2-digit" })}`,
  };
}

function todayLater(hour = 17): { iso: string; label: string } {
  const d = new Date();
  d.setHours(hour, 0, 0, 0);
  return {
    iso: d.toISOString(),
    label: `Hoje às ${d.toLocaleTimeString("pt-PT", { hour: "2-digit", minute: "2-digit" })}`,
  };
}

export function getLeadChefNextActionSuggestions({
  stage,
  hasNextAction,
}: Args): LeadChefNextActionSuggestion[] {
  if (hasNextAction) return [];
  const t = todayLater();
  const tm = tomorrow();

  const suggestions: LeadChefNextActionSuggestion[] = [];

  const push = (
    s: Omit<LeadChefNextActionSuggestion, "id"> & { id?: string }
  ) =>
    suggestions.push({
      id: s.id ?? `${stage}:${s.type}`,
      ...s,
    });

  switch (stage) {
    case "new":
    case "to_contact":
      push({
        title: "Contactar hoje",
        description: "Lead novo — fazer primeiro contacto ainda hoje.",
        type: "phone_call",
        whenLabel: t.label,
        whenISO: t.iso,
        templateCategory: "first_contact" as LeadChefTemplateCategory,
      });
      break;
    case "in_conversation":
      push({
        title: "Marcar demonstração",
        description: "Avançar para agendamento de demonstração.",
        type: "demo",
        whenLabel: tm.label,
        whenISO: tm.iso,
      });
      break;
    case "demo_scheduled":
      push({
        title: "Confirmar / lembrar demonstração",
        description: "Enviar confirmação ou lembrete antes da demonstração.",
        type: "whatsapp",
        whenLabel: t.label,
        whenISO: t.iso,
        templateCategory: "demo_confirmation",
      });
      break;
    case "demo_done":
      push({
        title: "Follow-up pós-demonstração",
        description: "Saber feedback e esclarecer dúvidas.",
        type: "follow_up",
        whenLabel: tm.label,
        whenISO: tm.iso,
        templateCategory: "post_demo_follow_up",
      });
      break;
    case "proposal_decision":
      push({
        title: "Follow-up de proposta",
        description: "Acompanhar decisão e esclarecer dúvidas.",
        type: "follow_up",
        whenLabel: tm.label,
        whenISO: tm.iso,
        templateCategory: "proposal_follow_up",
      });
      break;
    case "won":
      push({
        title: "Marcar pós-venda",
        description: "Acompanhar utilização do equipamento.",
        type: "post_sale_visit",
        whenLabel: tm.label,
        whenISO: tm.iso,
        templateCategory: "post_sale",
      });
      push({
        title: "Pedir referência",
        description: "Aproveitar momento positivo para pedir indicações.",
        type: "referral",
        whenLabel: tm.label,
        whenISO: tm.iso,
        templateCategory: "referral_request",
      });
      break;
    case "lost":
      push({
        title: "Reativar mais tarde",
        description: "Voltar a contactar dentro de algumas semanas.",
        type: "follow_up",
        whenLabel: "Em 30 dias",
        whenISO: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
        templateCategory: "reactivation",
      });
      break;
  }

  return suggestions;
}

export function useLeadChefNextActionSuggestions(args: Args): LeadChefNextActionSuggestion[] {
  return getLeadChefNextActionSuggestions(args);
}
