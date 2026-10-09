/**
 * Estado apresentado de um trabalho do extrator de Instagram.
 *
 * Regras:
 *  - um erro do fornecedor prevalece sobre "completed" (nunca mostra sucesso inventado);
 *  - seguidores/seguidos antigos (sem fornecedor ProfileQuery) são sempre falha;
 *  - uma nota da listagem (lista terminou antes do máximo) é informação, não erro;
 *  - um trabalho "em curso" sem atualização há demasiado tempo é dado como parado,
 *    para não ficar em espera nem em atualização automática para sempre.
 *
 * As origens não suportadas e a mensagem espelham
 * `supabase/functions/_shared/instagramSources.ts` (teste de paridade).
 */

export const UNSUPPORTED_SOURCES = ["followers", "following"] as const;

export const UNSUPPORTED_SOURCE_MESSAGE =
  "A recolha de seguidores e de perfis seguidos não está disponível no fornecedor instagram-looter2. Use o serviço ProfileQuery quando estiver configurado, ou Lista de @perfis / Pesquisa na web.";

/** Trabalhos antigos destas origens feitos com instagram-looter2 (o pedido devolveu 404). */
export const UNSUPPORTED_SOURCE_LEGACY_MESSAGE =
  "Esta recolha antiga usou o fornecedor anterior, que não disponibiliza seguidores nem perfis seguidos: o pedido devolveu erro 404 e não foram obtidos perfis.";

export const RELATIONSHIPS_PROVIDER = "profilequery";

/** Mesmo texto que `CONFIGURATION_REQUIRED_MESSAGE` em `_shared/instagramRelationships.ts`. */
export const CONFIGURATION_REQUIRED_MESSAGE =
  "Configuração necessária: a recolha de seguidores e de perfis seguidos precisa da chave do serviço ProfileQuery guardada no servidor. Esta recolha não foi iniciada.";

/** Trabalho de seguidores/seguidos que não foi criado pelo fornecedor ProfileQuery. */
export function isLegacyRelationshipJob(source: string, provider: string | null | undefined): boolean {
  return isUnsupportedSource(source) && provider !== RELATIONSHIPS_PROVIDER;
}

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
  provider?: string | null;
  listing_note?: string | null;
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
export function friendlyJobError(
  raw: string | null | undefined,
  source: string,
  provider?: string | null,
): string | null {
  if (isLegacyRelationshipJob(source, provider)) return UNSUPPORTED_SOURCE_LEGACY_MESSAGE;
  if (!raw || !raw.trim()) return null;
  const looksRaw = /[{}[\]]/.test(raw) || /Instagram API \d{3}/i.test(raw);
  if (!looksRaw) return raw.trim();
  const code = raw.match(/\b([45]\d{2})\b/);
  if (code) return providerMessage(Number(code[1]));
  return "O fornecedor de Instagram devolveu um erro inesperado.";
}

export function resolveJobDisplay(job: JobLike, nowMs: number = Date.now()): JobDisplay {
  const error = friendlyJobError(job.error, job.source, job.provider);
  const note = job.listing_note?.trim() || null;

  if (job.status === "cancelled") {
    return { kind: "cancelled", label: "Cancelado", message: null, isActive: false, isError: false };
  }

  if (job.status === "failed" || isLegacyRelationshipJob(job.source, job.provider)) {
    return { kind: "failed", label: "Falhou", message: error, isActive: false, isError: true };
  }

  if (job.status === "completed") {
    if (error && (job.found_count ?? 0) === 0) {
      return { kind: "failed", label: "Falhou", message: error, isActive: false, isError: true };
    }
    if (error) {
      return { kind: "partial", label: "Incompleto", message: error, isActive: false, isError: true };
    }
    return { kind: "completed", label: "Concluído", message: note, isActive: false, isError: false };
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
