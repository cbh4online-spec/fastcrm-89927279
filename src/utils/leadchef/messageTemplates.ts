/**
 * Templates simples de mensagens (PT) para WhatsApp / contacto inicial.
 * Mantém-se neutro, sem referências a marcas.
 */

export type LeadChefTemplateKey =
  | "first_contact"
  | "demo_confirmation"
  | "demo_reminder"
  | "post_demo_followup"
  | "referral_request"
  | "reactivation";

interface TemplateContext {
  leadName?: string | null;
  consultantName?: string | null;
  date?: string | null;
}

function firstName(name?: string | null): string {
  if (!name) return "";
  return name.trim().split(/\s+/)[0] ?? "";
}

export const LEADCHEF_TEMPLATE_LABELS: Record<LeadChefTemplateKey, string> = {
  first_contact: "Primeiro contacto",
  demo_confirmation: "Confirmação de demonstração",
  demo_reminder: "Lembrete de demonstração",
  post_demo_followup: "Follow-up pós-demonstração",
  referral_request: "Pedido de referência",
  reactivation: "Reativação",
};

export function buildLeadChefMessage(
  key: LeadChefTemplateKey,
  ctx: TemplateContext = {}
): string {
  const n = firstName(ctx.leadName) || "Olá";
  const c = ctx.consultantName ? ` ${ctx.consultantName}` : "";
  const d = ctx.date ?? "";

  switch (key) {
    case "first_contact":
      return `Olá ${n}, tudo bem? Sou${c || " consultor(a)"} e gostava de marcar uma breve apresentação consigo. Quando lhe é mais fácil falarmos?`;
    case "demo_confirmation":
      return `Olá ${n}, só a confirmar a nossa demonstração${d ? ` para ${d}` : ""}. Mantém-se? Obrigado(a)!`;
    case "demo_reminder":
      return `Olá ${n}, este é um lembrete da nossa demonstração${d ? ` marcada para ${d}` : ""}. Até já!`;
    case "post_demo_followup":
      return `Olá ${n}, espero que tenha gostado da demonstração. Posso esclarecer alguma dúvida ou avançar com a próxima etapa?`;
    case "referral_request":
      return `Olá ${n}, gostou da experiência? Se conhecer alguém a quem isto possa ser útil, agradecia se me indicasse. Obrigado(a)!`;
    case "reactivation":
      return `Olá ${n}, há algum tempo que não falamos. Faz sentido retomarmos a conversa agora?`;
    default:
      return `Olá ${n}!`;
  }
}
