/**
 * LeadChef — Renderizador de templates de mensagens (Fase 9).
 * Substitui variáveis {{var}} por valores do contexto.
 * Nunca quebra se uma variável faltar.
 */

export interface LeadChefTemplateContext {
  firstName?: string | null;
  fullName?: string | null;
  agentName?: string | null;
  leadName?: string | null;
  clientName?: string | null;
  referrerName?: string | null;
  appointmentDate?: string | null;
  appointmentTime?: string | null;
  nextActionDate?: string | null;
  interest?: string | null;
  origin?: string | null;
  companyName?: string | null;
  [key: string]: string | null | undefined;
}

const VAR_REGEX = /\{\{\s*([a-zA-Z_][a-zA-Z0-9_]*)\s*\}\}/g;

export const LEADCHEF_TEMPLATE_VARIABLES = [
  "firstName",
  "fullName",
  "agentName",
  "leadName",
  "clientName",
  "referrerName",
  "appointmentDate",
  "appointmentTime",
  "nextActionDate",
  "interest",
  "origin",
  "companyName",
] as const;

export const LEADCHEF_TEMPLATE_VARIABLE_LABELS: Record<string, string> = {
  firstName: "Primeiro nome",
  fullName: "Nome completo",
  agentName: "Nome do consultor",
  leadName: "Nome do lead",
  clientName: "Nome do cliente",
  referrerName: "Quem referiu",
  appointmentDate: "Data da marcação",
  appointmentTime: "Hora da marcação",
  nextActionDate: "Data da próxima ação",
  interest: "Interesse",
  origin: "Origem",
  companyName: "Empresa",
};

export function extractTemplateVariables(template: string): string[] {
  if (!template) return [];
  const out = new Set<string>();
  let m: RegExpExecArray | null;
  const re = new RegExp(VAR_REGEX);
  while ((m = re.exec(template)) !== null) out.add(m[1]);
  return Array.from(out);
}

export function renderLeadChefTemplate(
  template: string,
  context: LeadChefTemplateContext = {}
): string {
  if (!template) return "";
  return template.replace(VAR_REGEX, (_full, key: string) => {
    const v = context[key];
    if (v == null || v === "") return "";
    return String(v);
  });
}

export function getMissingTemplateVariables(
  template: string,
  context: LeadChefTemplateContext = {}
): string[] {
  const used = extractTemplateVariables(template);
  return used.filter((k) => {
    const v = context[k];
    return v == null || v === "";
  });
}

export function buildContextFromLead(args: {
  leadName?: string | null;
  agentName?: string | null;
  origin?: string | null;
  interest?: string | null;
  appointmentAt?: string | null;
  nextActionAt?: string | null;
  referrerName?: string | null;
  clientName?: string | null;
  companyName?: string | null;
}): LeadChefTemplateContext {
  const name = args.leadName ?? args.clientName ?? null;
  const first = name ? name.trim().split(/\s+/)[0] : null;

  const appt = args.appointmentAt ? new Date(args.appointmentAt) : null;
  const nextAct = args.nextActionAt ? new Date(args.nextActionAt) : null;

  return {
    firstName: first,
    fullName: name,
    leadName: args.leadName ?? null,
    clientName: args.clientName ?? null,
    agentName: args.agentName ?? null,
    referrerName: args.referrerName ?? null,
    interest: args.interest ?? null,
    origin: args.origin ?? null,
    companyName: args.companyName ?? null,
    appointmentDate: appt
      ? appt.toLocaleDateString("pt-PT", { day: "2-digit", month: "2-digit", year: "numeric" })
      : null,
    appointmentTime: appt
      ? appt.toLocaleTimeString("pt-PT", { hour: "2-digit", minute: "2-digit" })
      : null,
    nextActionDate: nextAct
      ? nextAct.toLocaleDateString("pt-PT", { day: "2-digit", month: "2-digit" })
      : null,
  };
}
