/**
 * Seguidores/seguidos reais através do Actor oficial Apify
 * `apify/instagram-followers-following-scraper`, via ligação Apify do projeto (gateway Lovable).
 *
 * Contrato confirmado na API Apify (9/10/2026, build 0.0.150):
 *  - input: { usernames: string[], dataToScrape: "followers"|"following", resultsLimit: integer>=1 }
 *  - dataset: { sourceUsername, userId, username, fullName, profilePicUrl, isVerified, isPrivate, type: FOLLOWER|FOLLOWING }
 *    erro por perfil: { error: "no_items", errorDescription: "Profile does not exist" | "Profile is private" }
 *  - preço: pay-per-event, 0,002 USD por perfil no plano FREE (+0,00001 USD por resultado);
 *    o plano gratuito só cobre a primeira página de resultados.
 * Execução assíncrona: POST /acts/{id}/runs, GET /actor-runs/{id}, GET /datasets/{id}/items?offset&limit.
 * O teto de custo vai sempre em maxItems + maxTotalChargeUsd.
 */

export const APIFY_PROVIDER = "apify";
export const APIFY_ACTOR_ID = "apify~instagram-followers-following-scraper";
export const APIFY_GATEWAY = "https://connector-gateway.lovable.dev/apify";
export const APIFY_PRICE_PER_PROFILE_USD = 0.002;
export const APIFY_PRICE_PER_RESULT_USD = 0.00001;
export const DATASET_PAGE = 100;
export const REQUEST_TIMEOUT_MS = 20_000;
export const MAX_ATTEMPTS = 3;

const USERNAME_RE = /^[a-z0-9._]{1,60}$/;

export type RelationshipSource = "followers" | "following";

export function apifyConfigured(getEnv: (k: string) => string | undefined): boolean {
  return !!getEnv("LOVABLE_API_KEY")?.trim() && !!getEnv("APIFY_API_KEY")?.trim();
}

/** Custo máximo (USD) que uma recolha pode gerar; enviado como teto à Apify. */
export function maxChargeUsd(limit: number): number {
  const n = Math.max(1, Math.floor(limit));
  return Math.round((n * (APIFY_PRICE_PER_PROFILE_USD + APIFY_PRICE_PER_RESULT_USD) + 0.005) * 10000) / 10000;
}

export function buildRunInput(source: RelationshipSource, handle: string, limit: number) {
  return { usernames: [handle.toLowerCase()], dataToScrape: source, resultsLimit: Math.max(1, Math.floor(limit)) };
}

export function buildRunPath(limit: number): string {
  const q = new URLSearchParams({ maxItems: String(Math.max(1, Math.floor(limit))), maxTotalChargeUsd: String(maxChargeUsd(limit)) });
  return `/acts/${APIFY_ACTOR_ID}/runs?${q.toString()}`;
}

/** Estado persistido no cursor do trabalho (evita colunas novas e repetir execuções). */
export interface ApifyCursor { runId: string; datasetId: string; offset: number }

export function encodeCursor(c: ApifyCursor): string {
  return `apify:${c.runId}:${c.datasetId}:${c.offset}`;
}
export function decodeCursor(raw: string | null | undefined): ApifyCursor | null {
  const m = /^apify:([A-Za-z0-9]+):([A-Za-z0-9]+):(\d+)$/.exec(raw ?? "");
  return m ? { runId: m[1], datasetId: m[2], offset: Number(m[3]) } : null;
}

export interface DatasetPage {
  usernames: string[];
  privateSkipped: number;
  /** Erro do Actor para o perfil de origem (inexistente/privado). */
  sourceError: string | null;
  rawCount: number;
}

export function parseDatasetItems(items: unknown, source: RelationshipSource, target: string): DatasetPage {
  const list = Array.isArray(items) ? items : [];
  const expected = source === "followers" ? "FOLLOWER" : "FOLLOWING";
  const out = new Set<string>();
  let privateSkipped = 0;
  let sourceError: string | null = null;
  for (const raw of list) {
    if (!raw || typeof raw !== "object") continue;
    const it = raw as Record<string, unknown>;
    if (typeof it.error === "string") {
      const d = String(it.errorDescription ?? "");
      sourceError = /private/i.test(d)
        ? "O perfil de origem é privado: a lista não está disponível."
        : /not exist/i.test(d)
        ? "O perfil de origem não existe."
        : "A Apify não devolveu resultados para este perfil.";
      continue;
    }
    if (typeof it.type === "string" && it.type !== expected) continue;
    if (typeof it.sourceUsername === "string" && it.sourceUsername.toLowerCase() !== target.toLowerCase()) continue;
    const u = typeof it.username === "string" ? it.username.trim().toLowerCase() : "";
    if (!USERNAME_RE.test(u) || u === target.toLowerCase()) continue;
    if (it.isPrivate === true) { privateSkipped += 1; continue; }
    out.add(u);
  }
  return { usernames: [...out], privateSkipped, sourceError, rawCount: list.length };
}

export type RunPhase = "running" | "succeeded" | "failed";
export function runPhase(status: string): RunPhase {
  if (status === "SUCCEEDED") return "succeeded";
  if (["READY", "RUNNING"].includes(status)) return "running";
  return "failed"; // FAILED, ABORTED, TIMED-OUT, TIMING-OUT, ABORTING
}

export function runFailureMessage(status: string): string {
  if (status === "TIMED-OUT" || status === "TIMING-OUT") return "A execução na Apify excedeu o tempo limite.";
  if (status === "ABORTED" || status === "ABORTING") return "A execução na Apify foi interrompida (pode ter atingido o teto de custo).";
  return "A execução na Apify falhou.";
}

export class ApifyError extends Error {
  constructor(message: string, public status: number, public fatal: boolean) {
    super(message);
    this.name = "ApifyError";
  }
}

export function apifyErrorFor(status: number): ApifyError {
  if (status === 401) return new ApifyError("A ligação Apify não está autorizada. Volte a ligar a conta Apify.", 401, true);
  if (status === 402) return new ApifyError("A conta Apify não tem saldo ou plano para esta execução.", 402, true);
  if (status === 403) return new ApifyError("A conta Apify não tem permissão para usar esta ferramenta.", 403, true);
  if (status === 404) return new ApifyError("A execução ou ferramenta Apify não foi encontrada.", 404, true);
  if (status === 400) return new ApifyError("A Apify recusou os parâmetros da recolha.", 400, true);
  if (status === 429) return new ApifyError("Limite de pedidos da Apify atingido. A recolha continua mais tarde.", 429, false);
  if (status === 0) return new ApifyError("A Apify não respondeu a tempo.", 0, false);
  if (status >= 500) return new ApifyError("A Apify está temporariamente indisponível.", status, false);
  return new ApifyError(`A Apify recusou o pedido (código ${status}).`, status, true);
}

export interface Deps { fetch: typeof fetch; sleep: (ms: number) => Promise<void>; getEnv: (k: string) => string | undefined }
const defaultDeps: Deps = {
  fetch: (i, n) => fetch(i, n),
  sleep: (ms) => new Promise((r) => setTimeout(r, ms)),
  getEnv: (k) => (typeof Deno !== "undefined" ? Deno.env.get(k) : undefined),
};

/** Pedido ao gateway com timeout e até 3 tentativas com backoff (429/5xx/timeout). */
export async function apifyRequest(
  method: "GET" | "POST",
  path: string,
  body: unknown,
  deps: Deps = defaultDeps,
): Promise<unknown> {
  const lovable = deps.getEnv("LOVABLE_API_KEY");
  const conn = deps.getEnv("APIFY_API_KEY");
  if (!lovable || !conn) throw new ApifyError("Configuração necessária: ligação Apify em falta no servidor.", 0, true);
  if (!path.startsWith("/") || path.includes("://")) throw new ApifyError("Caminho Apify inválido.", 400, true);
  let last: ApifyError | null = null;
  for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), REQUEST_TIMEOUT_MS);
    let status = 0;
    let retryAfter = 0;
    try {
      const res = await deps.fetch(`${APIFY_GATEWAY}${path}`, {
        method,
        headers: {
          Authorization: `Bearer ${lovable}`,
          "X-Connection-Api-Key": conn,
          ...(body !== undefined ? { "Content-Type": "application/json" } : {}),
        },
        body: body !== undefined ? JSON.stringify(body) : undefined,
        signal: ctrl.signal,
      });
      status = res.status;
      if (res.ok) return await res.json();
      retryAfter = Number(res.headers.get("retry-after") ?? 0);
      const text = await res.text().catch(() => "");
      console.error(`[APIFY] ${method} ${path.split("?")[0]} -> ${status}: ${text.slice(0, 300)}`);
    } catch (e) {
      if (e instanceof ApifyError) throw e;
      status = 0;
    } finally {
      clearTimeout(timer);
    }
    last = apifyErrorFor(status);
    if (last.fatal) throw last;
    if (attempt < MAX_ATTEMPTS) {
      await deps.sleep(Number.isFinite(retryAfter) && retryAfter > 0 ? Math.min(retryAfter * 1000, 8000) : 1000 * 2 ** (attempt - 1));
    }
  }
  throw last ?? apifyErrorFor(0);
}

export async function startRun(source: RelationshipSource, handle: string, limit: number, deps?: Deps) {
  const res = (await apifyRequest("POST", buildRunPath(limit), buildRunInput(source, handle, limit), deps)) as {
    data?: { id?: string; defaultDatasetId?: string };
  };
  const runId = res?.data?.id;
  const datasetId = res?.data?.defaultDatasetId;
  if (!runId || !datasetId) throw new ApifyError("A Apify não devolveu a execução iniciada.", 200, true);
  return { runId, datasetId };
}

export async function getRunStatus(runId: string, deps?: Deps) {
  const res = (await apifyRequest("GET", `/actor-runs/${encodeURIComponent(runId)}`, undefined, deps)) as {
    data?: { status?: string; usageTotalUsd?: number };
  };
  return { status: String(res?.data?.status ?? "UNKNOWN"), usageUsd: res?.data?.usageTotalUsd ?? null };
}

export async function readDataset(datasetId: string, offset: number, deps?: Deps): Promise<unknown[]> {
  const q = new URLSearchParams({ offset: String(offset), limit: String(DATASET_PAGE), clean: "true" });
  const res = await apifyRequest("GET", `/datasets/${encodeURIComponent(datasetId)}/items?${q}`, undefined, deps);
  if (!Array.isArray(res)) throw new ApifyError("A Apify devolveu resultados num formato inesperado.", 200, true);
  return res;
}

export async function abortRun(runId: string, deps?: Deps) {
  await apifyRequest("POST", `/actor-runs/${encodeURIComponent(runId)}/abort`, undefined, deps);
}
