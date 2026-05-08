/**
 * Mapeamento de cabeçalhos de import → campos canónicos LeadChef.
 */

export type CanonicalField =
  | "name"
  | "phone"
  | "email"
  | "origin"
  | "interest"
  | "notes"
  | "next_action_at"
  | "next_action_type"
  | "temperature"
  | "stage"
  | "referred_by"
  | "authorization_status";

export const CANONICAL_FIELDS: { key: CanonicalField; label: string; required?: boolean }[] = [
  { key: "name", label: "Nome", required: true },
  { key: "phone", label: "Telefone" },
  { key: "email", label: "Email" },
  { key: "origin", label: "Origem" },
  { key: "interest", label: "Interesse" },
  { key: "notes", label: "Notas" },
  { key: "next_action_at", label: "Data próxima ação" },
  { key: "next_action_type", label: "Próxima ação" },
  { key: "temperature", label: "Temperatura" },
  { key: "stage", label: "Etapa" },
  { key: "referred_by", label: "Indicado por" },
  { key: "authorization_status", label: "Autorização" },
];

const ALIASES: Record<CanonicalField, string[]> = {
  name: ["nome", "name", "cliente", "lead"],
  phone: ["telefone", "phone", "telemovel", "telemóvel", "whatsapp", "tlm", "tel"],
  email: ["email", "e-mail", "correio"],
  origin: ["origem", "origin", "fonte", "source"],
  interest: ["interesse", "interest", "produto"],
  notes: ["notas", "notes", "observacoes", "observações", "obs"],
  next_action_at: ["data próxima ação", "data proxima acao", "próxima data", "next_action_at", "data"],
  next_action_type: ["próxima ação", "proxima acao", "next action", "next_action_type", "ação"],
  temperature: ["temperatura", "temperature", "temp"],
  stage: ["etapa", "stage", "fase", "estado"],
  referred_by: ["indicado por", "referido por", "referred by", "referencia"],
  authorization_status: ["autorização", "autorizacao", "authorization", "consentimento"],
};

const STAGE_MAP: Record<string, string> = {
  "novo": "to_contact",
  "a contactar": "to_contact",
  "to_contact": "to_contact",
  "em conversa": "talking",
  "talking": "talking",
  "demo agendada": "demo_scheduled",
  "demo_scheduled": "demo_scheduled",
  "demo concluída": "demo_done",
  "demo_done": "demo_done",
  "proposta": "proposal_decision",
  "proposal_decision": "proposal_decision",
  "ganho": "won",
  "won": "won",
  "perdido": "lost",
  "lost": "lost",
};

const TEMP_MAP: Record<string, "cold" | "warm" | "hot"> = {
  frio: "cold",
  cold: "cold",
  morno: "warm",
  warm: "warm",
  quente: "hot",
  hot: "hot",
};

export function autoDetectMapping(headers: string[]): Partial<Record<CanonicalField, string>> {
  const mapping: Partial<Record<CanonicalField, string>> = {};
  const lower = headers.map((h) => ({ original: h, low: h.toLowerCase().trim() }));
  (Object.keys(ALIASES) as CanonicalField[]).forEach((field) => {
    const aliases = ALIASES[field];
    const found = lower.find((h) => aliases.some((a) => h.low === a || h.low.includes(a)));
    if (found) mapping[field] = found.original;
  });
  return mapping;
}

export function normalizeStage(raw: string | undefined): string | null {
  if (!raw) return null;
  return STAGE_MAP[raw.toLowerCase().trim()] ?? null;
}

export function normalizeTemperature(raw: string | undefined): "cold" | "warm" | "hot" {
  if (!raw) return "warm";
  return TEMP_MAP[raw.toLowerCase().trim()] ?? "warm";
}

export function normalizeDate(raw: string | undefined): string | null {
  if (!raw) return null;
  const t = raw.trim();
  // ISO
  if (/^\d{4}-\d{2}-\d{2}/.test(t)) {
    const d = new Date(t);
    return isNaN(d.getTime()) ? null : d.toISOString();
  }
  // dd/mm/yyyy ou dd-mm-yyyy
  const m = t.match(/^(\d{1,2})[/-](\d{1,2})[/-](\d{2,4})(?:\s+(\d{1,2}):(\d{2}))?/);
  if (m) {
    const [, d, mo, y, h = "9", mi = "0"] = m;
    const year = y.length === 2 ? 2000 + Number(y) : Number(y);
    const dt = new Date(year, Number(mo) - 1, Number(d), Number(h), Number(mi));
    return isNaN(dt.getTime()) ? null : dt.toISOString();
  }
  return null;
}
