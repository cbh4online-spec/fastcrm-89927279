// _shared/hmac.ts — Validação centralizada de assinaturas/secrets para webhooks.
// Padrão: defense-in-depth. Suporta HMAC-SHA256 (Meta/Twilio-like) e shared secrets.
// Regras:
// - Comparação timing-safe.
// - Falha fechada se secret obrigatório estiver ausente (configurable).
// - Regista sempre o resultado em webhook_security_events (via supabase admin client passado pelo caller).
import { createClient, SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

export type ValidationMode = "hmac" | "shared_secret" | "token" | "none";
export type ValidationOutcome =
  | "valid"
  | "invalid"
  | "missing_secret"
  | "no_signature"
  | "error"
  | "skipped";

export interface ValidateOptions {
  mode: ValidationMode;
  rawBody: string;
  secret: string | null | undefined;
  /** Header com assinatura (HMAC) ou token (shared_secret/token) */
  signatureHeader?: string | null;
  /** Provider name para logging */
  provider: string;
  functionName: string;
  workspaceId?: string | null;
  instanceId?: string | null;
  remoteIp?: string | null;
  /** Algoritmo HMAC. Default: SHA-256 */
  algorithm?: "SHA-256" | "SHA-1" | "SHA-512";
  /** Encoding esperado da assinatura: hex (default) ou base64 */
  signatureEncoding?: "hex" | "base64";
  /** Prefixo a ignorar (e.g. "sha256=") */
  signaturePrefix?: string;
  /** Se true e secret não estiver definido, retorna 'skipped' (modo legado/opcional) */
  optional?: boolean;
}

export interface ValidateResult {
  ok: boolean;
  outcome: ValidationOutcome;
  reason?: string;
}

function timingSafeEqual(a: Uint8Array, b: Uint8Array): boolean {
  if (a.length !== b.length) return false;
  let r = 0;
  for (let i = 0; i < a.length; i++) r |= a[i] ^ b[i];
  return r === 0;
}

function hexToBytes(hex: string): Uint8Array | null {
  const clean = hex.trim().toLowerCase().replace(/[^0-9a-f]/g, "");
  if (clean.length === 0 || clean.length % 2 !== 0) return null;
  const out = new Uint8Array(clean.length / 2);
  for (let i = 0; i < out.length; i++) out[i] = parseInt(clean.slice(i * 2, i * 2 + 2), 16);
  return out;
}

function b64ToBytes(b64: string): Uint8Array | null {
  try {
    const bin = atob(b64.trim());
    const out = new Uint8Array(bin.length);
    for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
    return out;
  } catch { return null; }
}

async function computeHmac(secret: string, body: string, algo: string): Promise<Uint8Array> {
  const enc = new TextEncoder();
  const key = await crypto.subtle.importKey(
    "raw",
    enc.encode(secret),
    { name: "HMAC", hash: algo },
    false,
    ["sign"],
  );
  const sig = await crypto.subtle.sign("HMAC", key, enc.encode(body));
  return new Uint8Array(sig);
}

export async function validateWebhook(opts: ValidateOptions): Promise<ValidateResult> {
  const { mode, secret, optional } = opts;
  if (mode === "none") return { ok: true, outcome: "skipped", reason: "mode_none" };

  if (!secret) {
    if (optional) return { ok: true, outcome: "skipped", reason: "no_secret_configured" };
    return { ok: false, outcome: "missing_secret", reason: "secret_required_but_missing" };
  }

  if (mode === "shared_secret" || mode === "token") {
    const incoming = (opts.signatureHeader ?? "").trim();
    if (!incoming) return { ok: false, outcome: "no_signature", reason: "no_token_provided" };
    const a = new TextEncoder().encode(incoming);
    const b = new TextEncoder().encode(secret);
    return timingSafeEqual(a, b)
      ? { ok: true, outcome: "valid" }
      : { ok: false, outcome: "invalid", reason: "token_mismatch" };
  }

  // HMAC
  let sigStr = (opts.signatureHeader ?? "").trim();
  if (!sigStr) return { ok: false, outcome: "no_signature", reason: "no_signature_header" };
  if (opts.signaturePrefix && sigStr.startsWith(opts.signaturePrefix)) {
    sigStr = sigStr.slice(opts.signaturePrefix.length);
  } else if (sigStr.startsWith("sha256=") || sigStr.startsWith("sha1=") || sigStr.startsWith("sha512=")) {
    sigStr = sigStr.split("=")[1] ?? sigStr;
  }
  const enc = opts.signatureEncoding ?? "hex";
  const provided = enc === "hex" ? hexToBytes(sigStr) : b64ToBytes(sigStr);
  if (!provided) return { ok: false, outcome: "invalid", reason: "signature_decode_failed" };
  try {
    const expected = await computeHmac(secret, opts.rawBody, opts.algorithm ?? "SHA-256");
    return timingSafeEqual(provided, expected)
      ? { ok: true, outcome: "valid" }
      : { ok: false, outcome: "invalid", reason: "hmac_mismatch" };
  } catch (e) {
    return { ok: false, outcome: "error", reason: e instanceof Error ? e.message : String(e) };
  }
}

/** Regista evento de segurança. Não bloqueia em caso de erro. */
export async function logSecurityEvent(
  admin: SupabaseClient,
  data: {
    workspace_id?: string | null;
    provider: string;
    instance_id?: string | null;
    function_name: string;
    validation_mode: ValidationMode;
    outcome: ValidationOutcome;
    reason?: string | null;
    remote_ip?: string | null;
    signature_header?: string | null;
    duration_ms?: number;
    payload_size?: number;
  },
): Promise<void> {
  try {
    await admin.from("webhook_security_events").insert({
      workspace_id: data.workspace_id ?? null,
      provider: data.provider,
      instance_id: data.instance_id ?? null,
      function_name: data.function_name,
      validation_mode: data.validation_mode,
      outcome: data.outcome,
      reason: data.reason ?? null,
      remote_ip: data.remote_ip ?? null,
      signature_header: data.signature_header ? data.signature_header.slice(0, 64) : null,
      duration_ms: data.duration_ms ?? null,
      payload_size: data.payload_size ?? null,
    });
  } catch (_) { /* noop */ }
}

export function getRemoteIp(req: Request): string | null {
  return (
    req.headers.get("cf-connecting-ip") ||
    req.headers.get("x-real-ip") ||
    req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    null
  );
}

export function makeAdmin(): SupabaseClient {
  return createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    { auth: { persistSession: false } },
  );
}
