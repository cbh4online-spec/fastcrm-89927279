/**
 * Adaptador do serviço ProfileQuery ("Instagram API") para listas reais de
 * seguidores (/v1/profile/followers) e seguidos (/v1/profile/following).
 *
 * Contrato confirmado na especificação oficial (https://api.profilequery.com/openapi.json,
 * servidor "Production" https://api.profilequery.com, 9/10/2026):
 *  - GET ?handle=<username|id|url>&cursor=<next_cursor anterior>
 *  - Authorization: Bearer <chave>
 *  - 200: { data: { items: [{ id, username, full_name, is_verified, is_private, profile_pic_url }], next_cursor }, meta }
 *    (~25 por página; o Instagram limita muitas contas a ~50 e next_cursor fica null)
 *  - 400 missing_parameter · 401 invalid_api_key · 402 insufficient_credits
 *  - 404 not_found (cobrado) · 502 upstream_error (não cobrado, repetir)
 * O índice geral da documentação menciona `meta.next_cursor`; é aceite como variante.
 *
 * Usa apenas a chave dedicada INSTAGRAM_RELATIONSHIPS_API_KEY (nunca RAPIDAPI_KEY,
 * nunca cookies ou senha de Instagram) e só fala com o host fixo abaixo.
 */

export const RELATIONSHIPS_PROVIDER = "profilequery";
export const RELATIONSHIPS_SECRET_NAME = "INSTAGRAM_RELATIONSHIPS_API_KEY";
export const RELATIONSHIPS_HOST = "https://api.profilequery.com";
export const RELATIONSHIP_SOURCES = ["followers", "following"] as const;
export type RelationshipSource = (typeof RELATIONSHIP_SOURCES)[number];

/** Máximo de perfis por recolha destas origens (o fornecedor raramente passa de ~50). */
export const RELATIONSHIP_MAX_LIMIT = 500;
/** Por organização: no máximo uma recolha ativa e este número por 24 h. */
export const RELATIONSHIP_DAILY_JOBS_PER_WORKSPACE = 10;

export const REQUEST_TIMEOUT_MS = 20_000;
export const MAX_ATTEMPTS = 3;

const USERNAME_RE = /^[A-Za-z0-9._]{1,60}$/;

export const CONFIGURATION_REQUIRED_MESSAGE =
  "Configuração necessária: a recolha de seguidores e de perfis seguidos precisa da chave do serviço ProfileQuery guardada no servidor. Esta recolha não foi iniciada.";

export function isRelationshipSource(source: string): source is RelationshipSource {
  return (RELATIONSHIP_SOURCES as readonly string[]).includes(source);
}

export function relationshipsConfigured(getEnv: (k: string) => string | undefined): boolean {
  const v = getEnv(RELATIONSHIPS_SECRET_NAME);
  return typeof v === "string" && v.trim().length >= 8;
}

export function buildRelationshipsUrl(source: RelationshipSource, handle: string, cursor: string | null): string {
  const url = new URL(`/v1/profile/${source}`, RELATIONSHIPS_HOST);
  url.searchParams.set("handle", handle);
  if (cursor) url.searchParams.set("cursor", cursor);
  if (url.origin !== RELATIONSHIPS_HOST) throw new Error("Host não autorizado");
  return url.toString();
}

export interface RelationshipsPage {
  usernames: string[];
  privateSkipped: number;
  nextCursor: string | null;
}

/** Lê data.items/data.next_cursor (e meta.next_cursor como variante). Não inventa campos. */
export function parseRelationshipsPage(payload: unknown): RelationshipsPage {
  const root = (payload && typeof payload === "object" ? payload : {}) as Record<string, unknown>;
  const data = (root.data && typeof root.data === "object" ? root.data : {}) as Record<string, unknown>;
  const meta = (root.meta && typeof root.meta === "object" ? root.meta : {}) as Record<string, unknown>;
  const items = Array.isArray(data.items) ? data.items : [];
  const seen = new Set<string>();
  let privateSkipped = 0;
  for (const raw of items) {
    if (!raw || typeof raw !== "object") continue;
    const it = raw as Record<string, unknown>;
    const u = typeof it.username === "string" ? it.username.trim().toLowerCase() : "";
    if (!USERNAME_RE.test(u)) continue;
    if (it.is_private === true) {
      privateSkipped += 1;
      continue;
    }
    seen.add(u);
  }
  const rawCursor = data.next_cursor ?? meta.next_cursor ?? null;
  const nextCursor =
    typeof rawCursor === "string" && rawCursor.trim() ? rawCursor.trim()
    : typeof rawCursor === "number" ? String(rawCursor)
    : null;
  return { usernames: [...seen], privateSkipped, nextCursor };
}

export class RelationshipsApiError extends Error {
  constructor(
    message: string,
    public status: number,
    /** Sem sentido repetir (chave, créditos, perfil inexistente/privado). */
    public fatal: boolean,
    /** O fornecedor indica que o pedido foi cobrado. */
    public billed: boolean,
  ) {
    super(message);
    this.name = "RelationshipsApiError";
  }
}

export function relationshipsErrorFor(status: number): RelationshipsApiError {
  if (status === 401) return new RelationshipsApiError("A chave do serviço ProfileQuery é inválida ou foi revogada.", 401, true, false);
  if (status === 403) return new RelationshipsApiError("O serviço ProfileQuery recusou o acesso com esta chave.", 403, true, false);
  if (status === 402) return new RelationshipsApiError("A conta ProfileQuery não tem créditos para este pedido.", 402, true, false);
  if (status === 404) return new RelationshipsApiError("O perfil não existe, é privado ou não tem lista pública disponível (o fornecedor cobra este pedido).", 404, true, true);
  if (status === 400) return new RelationshipsApiError("O @perfil indicado não foi aceite pelo serviço ProfileQuery.", 400, true, false);
  if (status === 429) return new RelationshipsApiError("Limite de pedidos do serviço ProfileQuery atingido. A recolha continua mais tarde.", 429, false, false);
  if (status === 0) return new RelationshipsApiError("O serviço ProfileQuery não respondeu a tempo.", 0, false, false);
  if (status >= 500) return new RelationshipsApiError("O serviço ProfileQuery está temporariamente indisponível.", status, false, false);
  return new RelationshipsApiError(`O serviço ProfileQuery recusou o pedido (código ${status}).`, status, true, false);
}

export interface FetchDeps {
  fetch: typeof fetch;
  sleep: (ms: number) => Promise<void>;
}

const defaultDeps: FetchDeps = {
  fetch: (...a) => fetch(...a),
  sleep: (ms) => new Promise((r) => setTimeout(r, ms)),
};

/** Uma página, com timeout por pedido e até 3 tentativas com backoff só para 429/5xx/timeout. */
export async function fetchRelationshipsPage(
  source: RelationshipSource,
  handle: string,
  cursor: string | null,
  apiKey: string,
  deps: FetchDeps = defaultDeps,
): Promise<RelationshipsPage & { attempts: number }> {
  const url = buildRelationshipsUrl(source, handle, cursor);
  let last: RelationshipsApiError | null = null;
  for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), REQUEST_TIMEOUT_MS);
    let status = 0;
    let retryAfter = 0;
    try {
      const res = await deps.fetch(url, {
        method: "GET",
        headers: { Authorization: `Bearer ${apiKey}`, Accept: "application/json" },
        signal: ctrl.signal,
        redirect: "error",
      });
      status = res.status;
      if (res.ok) {
        const body = await res.json().catch(() => null);
        if (!body || typeof body !== "object" || !("data" in (body as object))) {
          throw new RelationshipsApiError("O serviço ProfileQuery devolveu uma resposta num formato inesperado.", 200, true, false);
        }
        return { ...parseRelationshipsPage(body), attempts: attempt };
      }
      retryAfter = Number(res.headers.get("retry-after") ?? 0);
      await res.body?.cancel().catch(() => undefined);
    } catch (e) {
      if (e instanceof RelationshipsApiError) throw e;
      status = 0;
    } finally {
      clearTimeout(timer);
    }
    last = relationshipsErrorFor(status);
    if (last.fatal) throw last;
    if (attempt < MAX_ATTEMPTS) {
      const backoff = Number.isFinite(retryAfter) && retryAfter > 0
        ? Math.min(retryAfter * 1000, 8000)
        : 1000 * 2 ** (attempt - 1);
      await deps.sleep(backoff);
    }
  }
  throw last ?? relationshipsErrorFor(0);
}

/** Decide o próximo estado da listagem após uma página. */
export function nextListingState(input: {
  previousCursor: string | null;
  page: RelationshipsPage;
  queuedAfter: number;
  limit: number;
}): { cursor: string | null; done: boolean; note: string | null } {
  const { previousCursor, page, queuedAfter, limit } = input;
  if (queuedAfter >= limit) return { cursor: page.nextCursor, done: true, note: null };
  const repeated = !!page.nextCursor && page.nextCursor === previousCursor;
  if (!page.nextCursor || repeated) {
    return {
      cursor: null,
      done: true,
      note:
        `O serviço devolveu ${queuedAfter} perfis públicos e terminou antes do máximo pedido (${limit}). ` +
        "O Instagram limita muitas listas, por isso esta lista pode não estar completa.",
    };
  }
  return { cursor: page.nextCursor, done: false, note: null };
}

/** Validação do pedido de início (antes de criar trabalho ou gastar créditos). */
export function validateRelationshipStart(input: {
  configured: boolean;
  limit: number;
  activeJobs: number;
  jobsLast24h: number;
}): { ok: true; limit: number } | { ok: false; code: string; error: string } {
  if (!input.configured) return { ok: false, code: "configuration_required", error: CONFIGURATION_REQUIRED_MESSAGE };
  if (input.activeJobs > 0) {
    return { ok: false, code: "already_running", error: "Já existe uma recolha de seguidores/seguidos em curso nesta organização." };
  }
  if (input.jobsLast24h >= RELATIONSHIP_DAILY_JOBS_PER_WORKSPACE) {
    return {
      ok: false,
      code: "daily_limit",
      error: `Limite de ${RELATIONSHIP_DAILY_JOBS_PER_WORKSPACE} recolhas de seguidores/seguidos por dia nesta organização atingido.`,
    };
  }
  return { ok: true, limit: Math.min(Math.max(1, Math.floor(input.limit)), RELATIONSHIP_MAX_LIMIT) };
}
