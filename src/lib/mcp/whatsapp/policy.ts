/**
 * Política pura das ferramentas MCP WhatsApp.
 *
 * Sem dependências de rede/DB — todas as funções aqui são determinísticas
 * e cobertas por testes unitários.
 */
import { parsePhoneNumberFromString, type CountryCode } from "libphonenumber-js";
import { roleHasCapability, type Capability } from "@/lib/permissions/capabilities";
import type { WorkspaceRole } from "@/contexts/WorkspaceContext";

export type McpWhatsAppPurpose = "transactional" | "marketing";

export type McpWhatsAppErrorCode =
  | "unauthenticated"
  | "workspace_forbidden"
  | "capability_denied"
  | "target_required"
  | "target_ambiguous"
  | "target_not_found"
  | "invalid_phone"
  | "invalid_media_url"
  | "consent_required"
  | "opted_out"
  | "rate_limited"
  | "schedule_invalid"
  | "send_failed";

export class McpWhatsAppError extends Error {
  constructor(readonly code: McpWhatsAppErrorCode, message: string) {
    super(message);
    this.name = "McpWhatsAppError";
  }
}

/** Capabilities exigidas por tipo de operação. */
export const MCP_WHATSAPP_READ_CAPABILITY: Capability = "inbox.read";
export const MCP_WHATSAPP_WRITE_CAPABILITY: Capability = "inbox.reply";

export function assertCapability(
  role: WorkspaceRole | null,
  capability: Capability,
  isSuperAdmin = false,
): void {
  if (isSuperAdmin) return;
  if (!role) {
    throw new McpWhatsAppError("workspace_forbidden", "Sem acesso a este workspace.");
  }
  if (!roleHasCapability(role, capability)) {
    throw new McpWhatsAppError("capability_denied", `Permissão em falta: ${capability}.`);
  }
}

/** Normaliza para E.164. Lança `invalid_phone` quando o número não é válido. */
export function normalizeE164(raw: string, defaultCountry: CountryCode = "PT"): string {
  const parsed = parsePhoneNumberFromString((raw ?? "").trim(), defaultCountry);
  if (!parsed?.isValid()) {
    throw new McpWhatsAppError("invalid_phone", "Número de telefone inválido (use formato internacional).");
  }
  return parsed.format("E.164");
}

export interface TargetInput {
  phone?: string;
  contact_id?: string;
  lead_id?: string;
}

/** Exige exactamente um identificador de destino. */
export function assertSingleTarget(input: TargetInput): "phone" | "contact_id" | "lead_id" {
  const provided = (["phone", "contact_id", "lead_id"] as const).filter((k) => {
    const v = input[k];
    return typeof v === "string" && v.trim().length > 0;
  });
  if (provided.length === 0) {
    throw new McpWhatsAppError("target_required", "Indique phone, contact_id ou lead_id.");
  }
  if (provided.length > 1) {
    throw new McpWhatsAppError("target_ambiguous", "Indique apenas um destino: phone, contact_id ou lead_id.");
  }
  return provided[0];
}

const ALLOWED_MEDIA_EXTENSIONS: Record<"image" | "video", string[]> = {
  image: ["jpg", "jpeg", "png", "webp", "gif"],
  video: ["mp4", "3gp", "mov", "webm"],
};

/** Valida URL pública de media (https, sem credenciais, extensão aceite). */
export function assertMediaUrl(url: string, kind: "image" | "video"): string {
  let parsed: URL;
  try {
    parsed = new URL(url);
  } catch {
    throw new McpWhatsAppError("invalid_media_url", "URL de media inválido.");
  }
  if (parsed.protocol !== "https:") {
    throw new McpWhatsAppError("invalid_media_url", "O URL de media tem de usar HTTPS.");
  }
  if (parsed.username || parsed.password) {
    throw new McpWhatsAppError("invalid_media_url", "O URL de media não pode conter credenciais.");
  }
  if (url.length > 2048) {
    throw new McpWhatsAppError("invalid_media_url", "URL de media demasiado longo.");
  }
  const ext = parsed.pathname.split(".").pop()?.toLowerCase() ?? "";
  if (!ALLOWED_MEDIA_EXTENSIONS[kind].includes(ext)) {
    throw new McpWhatsAppError(
      "invalid_media_url",
      `Extensão não suportada para ${kind}: use ${ALLOWED_MEDIA_EXTENSIONS[kind].join(", ")}.`,
    );
  }
  return parsed.toString();
}

export interface ConsentState {
  optedOut: boolean;
  hasConsent: boolean;
}

/**
 * Fail-closed: opt-out bloqueia sempre; marketing exige consentimento explícito.
 * Transacional segue as regras existentes (só opt-out bloqueia).
 */
export function assertConsent(purpose: McpWhatsAppPurpose, state: ConsentState): void {
  if (state.optedOut) {
    throw new McpWhatsAppError("opted_out", "Destinatário em opt-out — envio bloqueado.");
  }
  if (purpose === "marketing" && state.hasConsent !== true) {
    throw new McpWhatsAppError(
      "consent_required",
      "Sem consentimento WhatsApp explícito para marketing/prospeção.",
    );
  }
}

/** Data de agendamento: futura, ISO válida e no máximo 1 ano à frente. */
export function assertScheduledAt(value: string, now: Date = new Date()): string {
  const when = new Date(value);
  if (Number.isNaN(when.getTime())) {
    throw new McpWhatsAppError("schedule_invalid", "scheduled_at inválido (use ISO 8601).");
  }
  if (when.getTime() <= now.getTime() + 30_000) {
    throw new McpWhatsAppError("schedule_invalid", "scheduled_at tem de ser pelo menos 30s no futuro.");
  }
  if (when.getTime() > now.getTime() + 365 * 24 * 3600 * 1000) {
    throw new McpWhatsAppError("schedule_invalid", "scheduled_at não pode exceder 1 ano.");
  }
  return when.toISOString();
}

/** Chave determinística de idempotência (sem segredos). */
export function buildIdempotencyKey(parts: {
  tool: string;
  workspaceId: string;
  userId: string;
  phone: string;
  payload: string;
  explicit?: string | null;
}): string {
  if (parts.explicit?.trim()) {
    return `${parts.tool}:${parts.workspaceId}:${parts.explicit.trim().slice(0, 120)}`;
  }
  const raw = `${parts.tool}|${parts.workspaceId}|${parts.userId}|${parts.phone}|${parts.payload}`;
  let h1 = 0x811c9dc5;
  let h2 = 0x01000193;
  for (let i = 0; i < raw.length; i++) {
    h1 = Math.imul(h1 ^ raw.charCodeAt(i), 16777619) >>> 0;
    h2 = Math.imul(h2 + raw.charCodeAt(i) + 1, 2246822519) >>> 0;
  }
  return `${parts.tool}:${parts.workspaceId}:${h1.toString(16)}${h2.toString(16)}`;
}

const SECRET_KEYS = [
  "instanceid",
  "instancetoken",
  "clienttoken",
  "client_token",
  "instance_id",
  "instance_token",
  "apikey",
  "api_key",
  "token",
  "secret",
  "authorization",
  "password",
];

/** Remove recursivamente qualquer campo sensível antes de devolver ao cliente MCP. */
export function stripSecrets<T>(value: T): T {
  if (Array.isArray(value)) return value.map((v) => stripSecrets(v)) as unknown as T;
  if (value && typeof value === "object") {
    const out: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(value as Record<string, unknown>)) {
      if (SECRET_KEYS.includes(k.toLowerCase())) continue;
      out[k] = stripSecrets(v);
    }
    return out as unknown as T;
  }
  return value;
}
