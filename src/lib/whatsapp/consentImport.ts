/**
 * Lógica pura de importação de consentimentos WhatsApp previamente obtidos.
 * Sem efeitos colaterais — usada pela UI e pelos testes.
 *
 * Regras:
 * - `granted` exige captured_at + source + proof_reference válidos (nunca por inferência).
 * - Telefones normalizados para E.164; inválidos são rejeitados.
 * - Deduplicação por telefone: prevalece a linha com captured_at mais recente.
 * - Uma revogação mais recente nunca é substituída por um consentimento anterior.
 */
import { toE164 } from "@/utils/phone";
import type { WhatsAppConsentCategory, WhatsAppConsentStatus } from "@/lib/whatsapp/consent";

export const CONSENT_IMPORT_REQUIRED_FIELDS = [
  "phone",
  "status",
  "captured_at",
  "source",
  "proof_reference",
] as const;

export const CONSENT_IMPORT_OPTIONAL_FIELDS = ["scope", "text_version"] as const;

export type ConsentImportField =
  | (typeof CONSENT_IMPORT_REQUIRED_FIELDS)[number]
  | (typeof CONSENT_IMPORT_OPTIONAL_FIELDS)[number];

export type ConsentImportMapping = Partial<Record<ConsentImportField, string>>;

export interface ConsentImportRawRow {
  [column: string]: string | undefined;
}

export interface ConsentImportValidRow {
  line: number;
  phone: string;
  status: WhatsAppConsentStatus;
  capturedAt: string;
  source: string;
  proofReference: string;
  scope: WhatsAppConsentCategory;
  textVersion: string | null;
}

export interface ConsentImportRejectedRow {
  line: number;
  phone: string;
  reason: string;
}

export interface ConsentImportResult {
  valid: ConsentImportValidRow[];
  rejected: ConsentImportRejectedRow[];
  duplicates: number;
  totalRows: number;
}

const HEADER_ALIASES: Record<ConsentImportField, string[]> = {
  phone: ["phone", "telefone", "telemovel", "telemóvel", "numero", "número", "msisdn"],
  status: ["status", "estado", "consentimento"],
  captured_at: ["captured_at", "data", "data_consentimento", "granted_at", "timestamp"],
  source: ["source", "origem", "canal"],
  proof_reference: ["proof_reference", "prova", "referencia", "referência", "evidencia", "evidência"],
  scope: ["scope", "categoria", "ambito", "âmbito"],
  text_version: ["text_version", "versao", "versão", "versao_texto"],
};

const VALID_SCOPES: WhatsAppConsentCategory[] = ["marketing", "transactional", "all"];

/** Deduz o mapeamento coluna→campo a partir dos cabeçalhos do CSV. */
export function guessConsentMapping(headers: string[]): ConsentImportMapping {
  const mapping: ConsentImportMapping = {};
  const norm = (v: string) => v.trim().toLowerCase().replace(/\s+/g, "_");
  for (const [field, aliases] of Object.entries(HEADER_ALIASES) as [ConsentImportField, string[]][]) {
    const found = headers.find((h) => aliases.includes(norm(h)));
    if (found) mapping[field] = found;
  }
  return mapping;
}

function parseStatus(raw: string): WhatsAppConsentStatus | null {
  const v = raw.trim().toLowerCase();
  if (["granted", "concedido", "sim", "yes", "true", "opt_in", "opt-in"].includes(v)) return "granted";
  if (["revoked", "revogado", "nao", "não", "no", "false", "opt_out", "opt-out"].includes(v)) return "revoked";
  return null;
}

function parseDate(raw: string): string | null {
  const value = raw.trim();
  if (!value) return null;
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return null;
  if (parsed.getTime() > Date.now() + 60_000) return null; // datas futuras não são prova
  return parsed.toISOString();
}

/** Valida e normaliza as linhas do CSV segundo o mapeamento indicado. */
export function validateConsentImport(
  rows: ConsentImportRawRow[],
  mapping: ConsentImportMapping,
): ConsentImportResult {
  const rejected: ConsentImportRejectedRow[] = [];
  const byPhone = new Map<string, ConsentImportValidRow>();
  let duplicates = 0;

  const missing = CONSENT_IMPORT_REQUIRED_FIELDS.filter((f) => !mapping[f]);
  if (missing.length > 0) {
    return {
      valid: [],
      rejected: rows.map((_, i) => ({
        line: i + 2,
        phone: "",
        reason: `Colunas obrigatórias em falta: ${missing.join(", ")}`,
      })),
      duplicates: 0,
      totalRows: rows.length,
    };
  }

  rows.forEach((row, index) => {
    const line = index + 2;
    const get = (field: ConsentImportField) => (mapping[field] ? (row[mapping[field]!] ?? "") : "");
    const rawPhone = get("phone").trim();

    const phone = toE164(rawPhone);
    if (!phone) {
      rejected.push({ line, phone: rawPhone, reason: "Telefone inválido ou não normalizável para E.164" });
      return;
    }

    const status = parseStatus(get("status"));
    if (!status) {
      rejected.push({ line, phone, reason: "Estado inválido (esperado granted ou revoked)" });
      return;
    }

    const capturedAt = parseDate(get("captured_at"));
    const source = get("source").trim();
    const proofReference = get("proof_reference").trim();

    if (status === "granted") {
      if (!capturedAt) {
        rejected.push({ line, phone, reason: "captured_at em falta ou inválido" });
        return;
      }
      if (!source) {
        rejected.push({ line, phone, reason: "source em falta" });
        return;
      }
      if (proofReference.length < 3) {
        rejected.push({ line, phone, reason: "proof_reference em falta ou demasiado curta" });
        return;
      }
    }

    const rawScope = get("scope").trim().toLowerCase();
    const scope = (VALID_SCOPES as string[]).includes(rawScope)
      ? (rawScope as WhatsAppConsentCategory)
      : "marketing";

    const candidate: ConsentImportValidRow = {
      line,
      phone,
      status,
      capturedAt: capturedAt ?? new Date().toISOString(),
      source: source || "manual_import",
      proofReference,
      scope,
      textVersion: get("text_version").trim() || null,
    };

    const existing = byPhone.get(`${phone}|${scope}`);
    if (existing) {
      duplicates += 1;
      // Fica a linha mais recente; empate mantém a primeira.
      if (new Date(candidate.capturedAt) > new Date(existing.capturedAt)) {
        byPhone.set(`${phone}|${scope}`, candidate);
      }
      return;
    }
    byPhone.set(`${phone}|${scope}`, candidate);
  });

  return { valid: Array.from(byPhone.values()), rejected, duplicates, totalRows: rows.length };
}

export interface ExistingConsentSnapshot {
  phone: string;
  scope: string;
  status: WhatsAppConsentStatus;
  updatedAt: string;
}

export interface ConsentImportPlan {
  toUpsert: ConsentImportValidRow[];
  skippedNewerRevocation: ConsentImportRejectedRow[];
  alreadyExisting: number;
}

/**
 * Confronta as linhas válidas com o estado atual do workspace.
 * Nunca substitui uma revogação mais recente por um consentimento anterior.
 */
export function planConsentImport(
  valid: ConsentImportValidRow[],
  existing: ExistingConsentSnapshot[],
): ConsentImportPlan {
  const index = new Map(existing.map((e) => [`${e.phone}|${e.scope}`, e]));
  const toUpsert: ConsentImportValidRow[] = [];
  const skippedNewerRevocation: ConsentImportRejectedRow[] = [];
  let alreadyExisting = 0;

  for (const row of valid) {
    const current = index.get(`${row.phone}|${row.scope}`);
    if (!current) {
      toUpsert.push(row);
      continue;
    }
    if (
      row.status === "granted" &&
      current.status === "revoked" &&
      new Date(current.updatedAt) > new Date(row.capturedAt)
    ) {
      skippedNewerRevocation.push({
        line: row.line,
        phone: row.phone,
        reason: "Existe revogação mais recente — consentimento anterior ignorado",
      });
      continue;
    }
    alreadyExisting += 1;
    toUpsert.push(row);
  }

  return { toUpsert, skippedNewerRevocation, alreadyExisting };
}
