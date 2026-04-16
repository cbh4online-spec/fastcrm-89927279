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
