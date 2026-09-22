/**
 * AI Commerce Quality Gate — motor puro (sem I/O).
 *
 * Decide se um produto pode ser exposto na loja pública e nos feeds externos.
 * Regras: nada é inventado; um critério em falta é motivo de bloqueio explícito,
 * nunca preenchido automaticamente por este motor.
 */
import type { ReadinessIssue, ReadinessResult } from "./types";

/** Critérios exigidos por omissão para deixar um produto público. */
export const DEFAULT_GATE_REQUIRED_CODES = [
  "name",
  "price",
  "currency",
  "availability",
  "main_image",
  "short_description",
  "category",
  "brand",
  "public_url",
] as const;

export const DEFAULT_GATE_MIN_SCORE = 60;

export interface QualityGateConfig {
  enabled: boolean;
  minScore: number;
  requiredCodes: string[];
  blockStore: boolean;
  blockFeeds: boolean;
}

export const DEFAULT_QUALITY_GATE_CONFIG: QualityGateConfig = {
  enabled: true,
  minScore: DEFAULT_GATE_MIN_SCORE,
  requiredCodes: [...DEFAULT_GATE_REQUIRED_CODES],
  blockStore: true,
  blockFeeds: true,
};

export type GateBlockerKind = "missing_required" | "below_score";

export interface GateBlocker {
  kind: GateBlockerKind;
  code: string;
  label: string;
  message: string;
  /** Onde corrigir: ficha do produto, separador AI Commerce ou feeds. */
  target: "product" | "ai" | "feed";
  field?: string;
}

export type GateStatus = "pass" | "blocked";

export interface QualityGateResult {
  status: GateStatus;
  score: number;
  minScore: number;
  blockers: GateBlocker[];
  /** Códigos obrigatórios em falta (chaves estáveis para correções em massa). */
  missingRequired: string[];
  blockedFromStore: boolean;
  blockedFromFeeds: boolean;
}

export function normalizeGateConfig(raw?: Partial<QualityGateConfig> | null): QualityGateConfig {
  const minScore = typeof raw?.minScore === "number" ? Math.min(100, Math.max(0, Math.round(raw.minScore))) : DEFAULT_GATE_MIN_SCORE;
  const codes = Array.isArray(raw?.requiredCodes)
    ? raw!.requiredCodes.map((c) => String(c || "").trim()).filter(Boolean)
    : [...DEFAULT_GATE_REQUIRED_CODES];
  return {
    enabled: raw?.enabled !== false,
    minScore,
    requiredCodes: Array.from(new Set(codes)),
    blockStore: raw?.blockStore !== false,
    blockFeeds: raw?.blockFeeds !== false,
  };
}

function issueOf(readiness: ReadinessResult, code: string): ReadinessIssue | undefined {
  return readiness.issues.find((i) => i.code === code);
}

/**
 * Avalia o gate a partir do resultado de readiness já calculado.
 * Fail-closed: sem readiness não há publicação quando o gate está ativo.
 */
export function evaluateQualityGate(
  readiness: ReadinessResult,
  config: Partial<QualityGateConfig> | null | undefined = DEFAULT_QUALITY_GATE_CONFIG,
): QualityGateResult {
  const cfg = normalizeGateConfig(config);

  if (!cfg.enabled) {
    return {
      status: "pass",
      score: readiness.score,
      minScore: cfg.minScore,
      blockers: [],
      missingRequired: [],
      blockedFromStore: false,
      blockedFromFeeds: false,
    };
  }

  const blockers: GateBlocker[] = [];
  const missingRequired: string[] = [];

  for (const code of cfg.requiredCodes) {
    if (readiness.passed.includes(code)) continue;
    const issue = issueOf(readiness, code);
    // Critério desativado nos Critérios do workspace: não existe nem falha.
    if (!issue) continue;
    missingRequired.push(code);
    blockers.push({
      kind: "missing_required",
      code,
      label: issue.label,
      message: issue.message,
      target: issue.target,
      field: issue.field,
    });
  }

  if (readiness.score < cfg.minScore) {
    blockers.push({
      kind: "below_score",
      code: "min_score",
      label: "Qualidade mínima",
      message: `Readiness ${readiness.score} abaixo do mínimo exigido (${cfg.minScore}).`,
      target: "ai",
    });
  }

  const blocked = blockers.length > 0;
  return {
    status: blocked ? "blocked" : "pass",
    score: readiness.score,
    minScore: cfg.minScore,
    blockers,
    missingRequired,
    blockedFromStore: blocked && cfg.blockStore,
    blockedFromFeeds: blocked && cfg.blockFeeds,
  };
}

/** Resumo legível dos motivos de bloqueio (ex.: "Preço, Imagem principal"). */
export function gateBlockerSummary(blockers: GateBlocker[], limit = 3): string {
  if (!blockers.length) return "";
  const labels = blockers.map((b) => b.label);
  const head = labels.slice(0, limit).join(", ");
  return labels.length > limit ? `${head} +${labels.length - limit}` : head;
}

/** Agrega motivos de bloqueio por código, para o painel de correção em massa. */
export function groupBlockers(
  rows: { productId: string; blockers: GateBlocker[] }[],
): { code: string; label: string; target: GateBlocker["target"]; productIds: string[] }[] {
  const map = new Map<string, { code: string; label: string; target: GateBlocker["target"]; productIds: string[] }>();
  for (const row of rows) {
    for (const blocker of row.blockers) {
      const entry = map.get(blocker.code) || {
        code: blocker.code,
        label: blocker.label,
        target: blocker.target,
        productIds: [],
      };
      if (!entry.productIds.includes(row.productId)) entry.productIds.push(row.productId);
      map.set(blocker.code, entry);
    }
  }
  return Array.from(map.values()).sort((a, b) => b.productIds.length - a.productIds.length);
}
