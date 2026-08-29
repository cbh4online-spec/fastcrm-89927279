/**
 * Guardas server-side do módulo "Contacto 1:1 validado".
 *
 * Módulo puro (sem dependências) para poder ser usado tanto pelas edge functions
 * (Deno) como pelos testes (Vitest). Nenhum envio pode ocorrer sem `allowed === true`.
 */

export type OutreachChannel = "email" | "whatsapp" | "social";
export type OutreachLinkMode = "disabled" | "simulation" | "live";

export interface GuardValidation {
  is_validated: boolean;
  legal_basis: string | null;
  allowed_channels: string[] | null;
}

export interface GuardSuppression {
  reason: string;
}

export interface GuardDraft {
  id: string;
  status: string;
  body: string;
}

export interface GuardLimits {
  daily_limit: number;
  per_company_limit: number;
  cooldown_days: number;
}

export interface GuardUsage {
  todayCount: number;
  companyCount: number;
  lastContactAt: string | null;
}

export interface GuardInput {
  channel: OutreachChannel;
  phone?: string | null;
  validation: GuardValidation | null;
  suppressions: GuardSuppression[];
  draft: GuardDraft | null;
  usage: GuardUsage;
  limits: GuardLimits;
  now?: number;
}

export interface GuardFailure {
  id: string;
  reason: string;
}

export interface GuardResult {
  allowed: boolean;
  failures: GuardFailure[];
}

const STOP_REASONS = new Set(["opt_out", "blocked", "replied", "manual"]);

export function isPlausiblePhone(raw?: string | null): boolean {
  if (!raw) return false;
  const digits = raw.replace(/\D/g, "");
  return digits.length >= 9 && digits.length <= 15;
}

/** Avalia todos os bloqueios obrigatórios antes de qualquer contacto. */
export function evaluateSendGuards(input: GuardInput): GuardResult {
  const failures: GuardFailure[] = [];
  const now = input.now ?? Date.now();
  const { validation, suppressions, draft, usage, limits } = input;

  if (!validation?.is_validated) {
    failures.push({ id: "validated", reason: "Entidade não está marcada como validada." });
  }
  if (!validation?.legal_basis) {
    failures.push({ id: "legal_basis", reason: "Base legal/consentimento não registado." });
  }
  if (!(validation?.allowed_channels ?? []).includes(input.channel)) {
    failures.push({ id: "channel_allowed", reason: "Canal não autorizado para esta entidade." });
  }
  if (input.channel === "whatsapp" && !isPlausiblePhone(input.phone)) {
    failures.push({ id: "phone", reason: "Telefone em falta ou inválido." });
  }

  const stop = suppressions.find((s) => STOP_REASONS.has(s.reason));
  if (stop) {
    failures.push({ id: "suppression", reason: `Supressão activa (${stop.reason}).` });
  }

  if (!draft) {
    failures.push({ id: "draft", reason: "Sem rascunho criado." });
  } else if (draft.status !== "reviewed" && draft.status !== "used") {
    failures.push({ id: "reviewed", reason: "Rascunho não revisto por humano." });
  } else if (!draft.body?.trim()) {
    failures.push({ id: "draft_body", reason: "Rascunho vazio." });
  }

  const lastAt = usage.lastContactAt ? new Date(usage.lastContactAt).getTime() : null;
  if (lastAt !== null && now - lastAt < limits.cooldown_days * 24 * 60 * 60 * 1000) {
    failures.push({ id: "cooldown", reason: `Cooldown de ${limits.cooldown_days} dias por cumprir.` });
  }
  if (usage.todayCount >= limits.daily_limit) {
    failures.push({ id: "daily_limit", reason: "Limite diário atingido." });
  }
  if (usage.companyCount >= limits.per_company_limit) {
    failures.push({ id: "company_limit", reason: "Limite por empresa atingido." });
  }

  return { allowed: failures.length === 0, failures };
}

/**
 * Decide o resultado do adaptador. Bloqueado por defeito:
 * só devolve `live` quando os guardas passam E a ligação está explicitamente em modo live.
 */
export function resolveSendMode(opts: {
  guards: GuardResult;
  link: { enabled: boolean; mode: OutreachLinkMode } | null;
  connectionStatus?: string | null;
}): { action: "blocked" | "simulated" | "live"; reason?: string } {
  if (!opts.guards.allowed) {
    return { action: "blocked", reason: opts.guards.failures.map((f) => f.id).join(",") };
  }
  // Fail-closed: ligação ausente, desactivada, com modo ausente/ambíguo → bloqueado.
  const link = opts.link;
  if (!link || link.enabled !== true) {
    return { action: "blocked", reason: "channel_link_disabled" };
  }
  const mode = link.mode;
  if (mode !== "simulation" && mode !== "live") {
    return { action: "blocked", reason: "channel_link_disabled" };
  }
  if (mode === "simulation") {
    return { action: "simulated" };
  }
  if (opts.connectionStatus !== "connected") {
    return { action: "blocked", reason: "provider_not_connected" };
  }
  return { action: "live" };
}

/** Deteta pedidos de opt-out em texto inbound (PT/EN). */
const OPTOUT_PATTERNS = [
  /\bstop\b/i,
  /\bunsubscribe\b/i,
  /\bopt[\s-]?out\b/i,
  /n[ãa]o\s+(quero|desejo|pretendo)\s+(mais\s+)?(receber|contacto|mensagens)/i,
  /remover?\s+(-me\s+)?da\s+(lista|base)/i,
  /parem?\s+de\s+(me\s+)?(enviar|contactar)/i,
  /cancelar\s+subscri[çc][ãa]o/i,
];

export function detectOptOut(text?: string | null): boolean {
  if (!text) return false;
  return OPTOUT_PATTERNS.some((re) => re.test(text));
}

/** Classifica um evento inbound do webhook em supressão a criar. */
export function classifyInboundEvent(evt: {
  type: "message" | "status" | "block";
  text?: string | null;
  status?: string | null;
}): { suppression: "opt_out" | "blocked" | "replied" | null } {
  if (evt.type === "block") return { suppression: "blocked" };
  if (evt.type === "message") {
    if (detectOptOut(evt.text)) return { suppression: "opt_out" };
    return { suppression: "replied" };
  }
  return { suppression: null };
}
