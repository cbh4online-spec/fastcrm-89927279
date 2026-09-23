/**
 * Autenticação interna do dispatcher de sequências WhatsApp Pro (B05/B10).
 * Corre ANTES de criar o cliente service_role e antes de qualquer leitura/mutação.
 *
 * Aceite apenas:
 *   - Authorization: Bearer <SUPABASE_SERVICE_ROLE_KEY> (cron interno / pg_net / Trigger.dev),
 *     comparado em tempo constante;
 *   - se vier cabeçalho de assinatura worker, ela tem de ser válida (nunca é ignorada).
 * Recusa:
 *   - sem Authorization / formato inválido / segredo do servidor em falta → 401;
 *   - Bearer que não é a service role (ex.: JWT de utilizador, anon key) → 403;
 *   - assinatura worker presente mas inválida/expirada → 401.
 */
import { verifyWorkerRequest, WORKER_SIG_HEADER } from "../_shared/sdr-engine/workerAuth.ts";

export type DispatchAuth = { ok: true } | { ok: false; status: 401 | 403; reason: string };

function safeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let r = 0;
  for (let i = 0; i < a.length; i++) r |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return r === 0;
}

export async function authorizeDispatchCall(
  getHeader: (name: string) => string | null,
  rawBody: string,
  env: { serviceRoleKey: string | undefined; workerEnabled: string | undefined; workerSecret: string | undefined },
  nowMs: number = Date.now(),
): Promise<DispatchAuth> {
  if (!env.serviceRoleKey || env.serviceRoleKey.length < 20) return { ok: false, status: 401, reason: "server_not_configured" };
  const auth = getHeader("authorization") ?? getHeader("Authorization");
  if (!auth) return { ok: false, status: 401, reason: "missing_authorization" };
  const m = /^Bearer\s+(\S+)$/.exec(auth.trim());
  if (!m) return { ok: false, status: 401, reason: "malformed_authorization" };
  if (!safeEqual(m[1], env.serviceRoleKey)) return { ok: false, status: 403, reason: "not_internal_caller" };
  if (getHeader(WORKER_SIG_HEADER)) {
    const v = await verifyWorkerRequest(getHeader, rawBody, { enabled: env.workerEnabled, secret: env.workerSecret }, nowMs);
    if (!v.ok) return { ok: false, status: 401, reason: (v as { reason: string }).reason };
  }
  return { ok: true };
}
