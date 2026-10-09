/**
 * Estado apresentado de um trabalho do extrator de Instagram.
 *
 * Regras:
 *  - um erro do fornecedor prevalece sobre "completed" (nunca mostra sucesso inventado);
 *  - origens não suportadas pelo fornecedor (seguidores/seguidos) são sempre falha;
 *  - um trabalho "em curso" sem atualização há demasiado tempo é dado como parado,
 *    para não ficar em espera nem em atualização automática para sempre.
 *
 * As origens não suportadas e a mensagem espelham
 * `supabase/functions/_shared/instagramSources.ts` (teste de paridade).
 */

export const UNSUPPORTED_SOURCES = ["followers", "following"] as const;

export const UNSUPPORTED_SOURCE_MESSAGE =
  "A recolha de seguidores e de perfis seguidos não é suportada pelo fornecedor de Instagram configurado. Nenhum pedido foi feito nem cobrado. Use Lista de @perfis ou Pesquisa na web.";

/** Para trabalhos antigos destas origens (podem ter feito pedidos antes do bloqueio). */
export const UNSUPPORTED_SOURCE_LEGACY_MESSAGE =
  "A recolha de seguidores e de perfis seguidos não é suportada pelo fornecedor de Instagram configurado, por isso esta recolha não obteve perfis. Use Lista de @perfis ou Pesquisa na web.";


/** Sem atualização durante este tempo, um trabalho em curso é dado como parado. */
export const STALL_AFTER_MS = 10 * 60 * 1000;

export function isUnsupportedSource(source: string): boolean {
  return (UNSUPPORTED_SOURCES as readonly string[]).includes(source);
}

export interface JobLike {
  source: string;
  status: string;
  error: string | null;
  found_count: number;
  updated_at: string;
}

export type JobDisplayKind =
  | "queued"
  | "running"
  | "paused"
  | "completed"
  | "partial"
  | "failed"
  | "stalled"
  | "cancelled";

export interface JobDisplay {
  kind: JobDisplayKind;
  label: string;
  /** Explicação humana (sem JSON) quando existe falha ou aviso. */
  message: string | null;
  /** Só trabalhos realmente em curso devem atualizar automaticamente. */
  isActive: boolean;
  isError: boolean;
}

function providerMessage(status: number): string {
  if (status === 404) return "O fornecedor de Instagram não disponibiliza este tipo de recolha.";
  if (status === 401 || status === 403) return "A chave da API de Instagram é inválida ou a subscrição não está ativa.";
  if (status === 402) return "A subscrição da API de Instagram não tem saldo ou plano para este pedido.";
  if (status === 429) return "Limite de pedidos da API de Instagram atingido.";
  if (status >= 500) return "O fornecedor de Instagram está temporariamente indisponível. Tente novamente mais tarde.";
  return `O fornecedor de Instagram recusou o pedido (código ${status}).`;
}

/** Converte o erro gravado (incluindo erros antigos com JSON cru) em texto legível. */
export function friendlyJobError(raw: string | null | undefined, source: string): string | null {
  if (isUnsupportedSource(source)) return UNSUPPORTED_SOURCE_LEGACY_MESSAGE;
  if (!raw || !raw.trim()) return null;
  const looksRaw = /[{}[\]]/.test(raw) || /Instagram API \d{3}/i.test(raw);
  if (!looksRaw) return raw.trim();
  const code = raw.match(/\b([45]\d{2})\b/);
  if (code) return providerMessage(Number(code[1]));
  return "O fornecedor de Instagram devolveu um erro inesperado.";
}

export function resolveJobDisplay(job: JobLike, nowMs: number = Date.now()): JobDisplay {
  const error = friendlyJobError(job.error, job.source);

  if (job.status === "cancelled") {
    return { kind: "cancelled", label: "Cancelado", message: null, isActive: false, isError: false };
  }

  if (job.status === "failed" || isUnsupportedSource(job.source)) {
    return { kind: "failed", label: "Falhou", message: error, isActive: false, isError: true };
  }

  if (job.status === "completed") {
    if (error && (job.found_count ?? 0) === 0) {
      return { kind: "failed", label: "Falhou", message: error, isActive: false, isError: true };
    }
    if (error) {
      return { kind: "partial", label: "Incompleto", message: error, isActive: false, isError: true };
    }
    return { kind: "completed", label: "Concluído", message: null, isActive: false, isError: false };
  }

  if (job.status === "paused") {
    return { kind: "paused", label: "Em pausa", message: error, isActive: false, isError: false };
  }

  if (job.status === "running" || job.status === "pending") {
    const updated = Date.parse(job.updated_at);
    if (Number.isFinite(updated) && nowMs - updated > STALL_AFTER_MS) {
      return {
        kind: "stalled",
        label: "Falhou",
        message:
          error ??
          "A recolha deixou de responder e foi dada como parada. Os perfis já recolhidos ficam guardados.",
        isActive: false,
        isError: true,
      };
    }
    return {
      kind: job.status === "pending" ? "queued" : "running",
      label: job.status === "pending" ? "Na fila" : "A recolher",
      message: error,
      isActive: true,
      isError: false,
    };
  }

  return { kind: "failed", label: "Falhou", message: error, isActive: false, isError: true };
}
