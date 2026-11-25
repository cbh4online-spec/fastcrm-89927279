/**
 * Mapa centralizado de labels para origens de leads/contactos.
 * Qualquer source raw (ex: "public_booking") é traduzido para label legível.
 */
export const LEAD_SOURCE_LABELS: Record<string, string> = {
  instagram: "Instagram",
  facebook: "Facebook",
  whatsapp: "WhatsApp",
  website: "Website",
  referral: "Referência",
  email: "Email",
  linkedin: "LinkedIn",
  evento: "Evento",
  form: "Formulário",
  public_booking: "Agendamento",
  imo_connect: "ImoAI Connect",
  manual: "Manual",
  import: "Importação",
  api: "API",
  outro: "Outro",
  ghl: "GoHighLevel",
  ghl_auto_sync: "GoHighLevel (sync automático)",
  ghl_sync: "GoHighLevel (sync)",
  meta_lead_ads: "Meta Lead Ads",
  "lead facebook": "Lead Facebook",
  "lead-enricher": "Lead Enricher",
  google_local: "Google Local",
  instagram_extractor: "Extrator Instagram",
  professional_prospecting: "Prospeção profissional",
  web_search: "Pesquisa web",
  registo: "Registo",
  landing: "Landing page",
  prospecao: "Prospeção",
  indicacao: "Indicação",
  sms: "SMS",
  funnel: "Funil",
};

/** Devolve o label legível para uma source, ou a source original se não mapeada. */
export function getSourceLabel(source: string | null | undefined): string {
  if (!source) return "—";
  return LEAD_SOURCE_LABELS[source.toLowerCase()] || source;
}

/** Lista de origens para selects (inclui todas as chaves do mapa). */
export const LEAD_SOURCE_OPTIONS = Object.entries(LEAD_SOURCE_LABELS).map(([value, label]) => ({
  value,
  label,
}));

const LEAD_STATUS_LABELS: Record<string, string> = {
  new: "Novo", contacted: "Contactado", in_progress: "Em progresso", qualified: "Qualificado",
  proposal: "Proposta", negotiation: "Negociação", converted: "Convertido", won: "Ganho",
  completed: "Concluído", lost: "Perdido", unqualified: "Não qualificado",
};
export function getLeadStatusLabel(status: string): string {
  return LEAD_STATUS_LABELS[status.toLowerCase()] || status;
}

const LEAD_TEMPERATURE_LABELS: Record<string, string> = { hot: "Quente", warm: "Morno", cold: "Frio" };
export function getLeadTemperatureLabel(t: string): string {
  return LEAD_TEMPERATURE_LABELS[t.toLowerCase()] || t;
}
