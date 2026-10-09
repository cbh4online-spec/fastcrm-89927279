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
  consent_source?: string | null;
  consent_recorded_at?: string | null;
  recipient_category?: string | null;
  relationship_kind?: string | null;
  analogous_offer_confirmed?: boolean | null;
  optout_at_collection_confirmed?: boolean | null;
  generic_corporate_address_confirmed?: boolean | null;
  dgc_checked_at?: string | null;
  dgc_list_reference?: string | null;
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

/** A processing basis alone does not establish permission to use a channel. */
export function evaluateContactPermission(
  validation: GuardValidation | null,
  channel: OutreachChannel,
  now = Date.now(),
): GuardFailure[] {
  if (!validation?.legal_basis) {
    return [{ id: "legal_basis", reason: "Fundamento de contacto por registar." }];
  }

  const source = validation.consent_source?.trim();
  const evidenceAt = validation.consent_recorded_at
    ? Date.parse(validation.consent_recorded_at)
    : NaN;

  if (validation.legal_basis === "consent") {
    if (!source || !Number.isFinite(evidenceAt) || evidenceAt > now) {
      return [{ id: "consent_evidence", reason: "Registe a origem e a data reais do consentimento para este canal." }];
    }
    return [];
  }

  // The customer exception is limited to an analogous offer and a documented
  // opportunity to object at collection. WhatsApp and social need explicit consent.
  if (validation.legal_basis === "existing_customer") {
    if (channel !== "email") {
      return [{ id: "channel_consent", reason: "Este canal requer consentimento explícito registado." }];
    }
    if (validation.relationship_kind !== "existing_customer" || !source ||
        !validation.analogous_offer_confirmed || !validation.optout_at_collection_confirmed) {
      return [{ id: "customer_evidence", reason: "Confirme a venda anterior, a oferta análoga e a possibilidade de oposição na recolha." }];
    }
    return [];
  }

  // Only a generic corporate email may use this reviewed opt-out path.
  if (validation.legal_basis === "corporate_opt_out") {
    if (channel !== "email") {
      return [{ id: "channel_consent", reason: "Este canal requer consentimento explícito registado." }];
    }
    const checkedAt = validation.dgc_checked_at ? Date.parse(validation.dgc_checked_at) : NaN;
    const thisMonth = Number.isFinite(checkedAt) &&
      new Date(checkedAt).getUTCFullYear() === new Date(now).getUTCFullYear() &&
      new Date(checkedAt).getUTCMonth() === new Date(now).getUTCMonth() &&
      checkedAt <= now;
    if (validation.recipient_category !== "corporate" || !validation.generic_corporate_address_confirmed ||
        !source || !validation.dgc_list_reference?.trim() || !thisMonth) {
      return [{ id: "corporate_evidence", reason: "Confirme endereço genérico da pessoa coletiva e consulta da lista DGC deste mês." }];
    }
    return [];
  }

  return [{ id: "legal_basis_unsupported", reason: "Reavalie a autorização para marketing deste registo." }];
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
  failures.push(...evaluateContactPermission(validation, input.channel, now));
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
