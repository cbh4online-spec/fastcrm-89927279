/**
 * Contrato interno autenticado "worker → transporte".
 *
 * Os transportes (email-send, whatsapp-pro-send, whatsapp-zapi-send) continuam
 * a exigir utilizador (getUser) no envio manual. Este modo alternativo só é
 * aceite quando:
 *   1. SDR_AUTONOMOUS_SEND_ENABLED === "true" (desligado por defeito);
 *   2. SDR_WORKER_SECRET está definido com >= 32 caracteres;
 *   3. a assinatura HMAC-SHA256 de `${ts}.${workspaceId}.${rawBody}` confere;
 *   4. o timestamp está a menos de 120 s do relógio do servidor.
 * O chamador tem ainda de confirmar que o workspaceId do corpo = cabeçalho.
 * Fail-closed: qualquer falha → não autenticado.
 */

export const WORKER_SIG_HEADER = "x-fastcrm-worker-signature";
export const WORKER_TS_HEADER = "x-fastcrm-worker-ts";
export const WORKER_WS_HEADER = "x-fastcrm-worker-workspace";
export const MAX_SKEW_MS = 120_000;

const enc = new TextEncoder();

function toHex(buf: ArrayBuffer): string {
  return Array.from(new Uint8Array(buf)).map((b) => b.toString(16).padStart(2, "0")).join("");
}

async function hmac(secret: string, message: string): Promise<string> {
  const key = await crypto.subtle.importKey("raw", enc.encode(secret), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  return toHex(await crypto.subtle.sign("HMAC", key, enc.encode(message)));
}

function timingSafeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let r = 0;
  for (let i = 0; i < a.length; i++) r |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return r === 0;
}

export interface WorkerEnv {
  enabled: string | undefined; // SDR_AUTONOMOUS_SEND_ENABLED
  secret: string | undefined; // SDR_WORKER_SECRET
}

export function workerModeConfigured(env: WorkerEnv): boolean {
  return env.enabled === "true" && typeof env.secret === "string" && env.secret.length >= 32;
}

export async function signWorkerRequest(
  secret: string,
  workspaceId: string,
  rawBody: string,
  nowMs: number = Date.now(),
): Promise<Record<string, string>> {
  const ts = String(nowMs);
  return {
    [WORKER_SIG_HEADER]: await hmac(secret, `${ts}.${workspaceId}.${rawBody}`),
    [WORKER_TS_HEADER]: ts,
    [WORKER_WS_HEADER]: workspaceId,
  };
}

export type WorkerVerdict =
  | { ok: true; workspaceId: string }
  | { ok: false; reason: string; present: boolean };

export async function verifyWorkerRequest(
  getHeader: (name: string) => string | null,
  rawBody: string,
  env: WorkerEnv,
  nowMs: number = Date.now(),
): Promise<WorkerVerdict> {
  const sig = getHeader(WORKER_SIG_HEADER);
  const present = !!sig;
  if (!sig) return { ok: false, reason: "no_worker_signature", present };
  if (!workerModeConfigured(env)) return { ok: false, reason: "worker_mode_disabled", present };
  const ts = getHeader(WORKER_TS_HEADER);
  const ws = getHeader(WORKER_WS_HEADER);
  if (!ts || !ws) return { ok: false, reason: "missing_worker_headers", present };
  const tsNum = Number(ts);
  if (!Number.isFinite(tsNum) || Math.abs(nowMs - tsNum) > MAX_SKEW_MS) {
    return { ok: false, reason: "stale_worker_signature", present };
  }
  const expected = await hmac(env.secret!, `${ts}.${ws}.${rawBody}`);
  if (!timingSafeEqual(expected, sig)) return { ok: false, reason: "bad_worker_signature", present };
  return { ok: true, workspaceId: ws };
}
