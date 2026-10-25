/**
 * FastCRM WhatsApp Pro — API de leitura da extensão (núcleo testável, sem I/O direto).
 * Apenas duas ações: "workspaces" e "lookup". Nunca envia mensagens nem escreve dados.
 */
import { roleHasCapability, type WorkspaceRole } from "../_shared/capabilities.ts";

export const MAX_BODY_BYTES = 1024;
export const RESULT_LIMIT = 10;
export const WORKSPACE_LIMIT = 50;
export const REQUEST_TIMEOUT_MS = 10_000;
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const EXT_ORIGIN_RE = /^chrome-extension:\/\/[a-p]{32}$/;

export interface ApiConfig { enabled: boolean; clientId: string; allowedOrigin: string; supabaseUrl: string; anonKey: string; pilotWorkspaceIds: ReadonlySet<string> }

/** Lista explícita de workspaces piloto (UUIDs separados por vírgula). Inválida/vazia => null. */
export function parsePilotIds(raw: string | undefined): ReadonlySet<string> | null {
  if (!raw) return null;
  const ids = raw.split(",").map((x) => x.trim().toLowerCase()).filter(Boolean);
  if (!ids.length || ids.length > 50 || ids.some((id) => !UUID_RE.test(id))) return null;
  return new Set(ids);
}

export function readConfig(env: (k: string) => string | undefined): ApiConfig | null {
  const cfg = {
    enabled: env("FASTCRM_WA_EXTENSION_API_ENABLED") === "true",
    clientId: env("FASTCRM_WA_EXTENSION_OAUTH_CLIENT_ID") ?? "",
    allowedOrigin: env("FASTCRM_WA_EXTENSION_ALLOWED_ORIGIN") ?? "",
    supabaseUrl: env("SUPABASE_URL") ?? "",
    anonKey: env("SUPABASE_ANON_KEY") ?? "",
    pilotWorkspaceIds: parsePilotIds(env("FASTCRM_WA_EXTENSION_PILOT_WORKSPACE_IDS")),
  };
  if (!cfg.pilotWorkspaceIds) return null;
  if (!cfg.enabled || !/^[A-Za-z0-9._-]{8,128}$/.test(cfg.clientId) || !EXT_ORIGIN_RE.test(cfg.allowedOrigin)
    || !cfg.supabaseUrl.startsWith("https://") || !cfg.anonKey) return null;
  return cfg as ApiConfig;
}

export function corsHeaders(origin: string): Record<string, string> {
  return {
    "Access-Control-Allow-Origin": origin,
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Allow-Headers": "authorization, content-type, apikey",
    "Access-Control-Max-Age": "600",
    Vary: "Origin",
  };
}

export const BASE_HEADERS = { "Content-Type": "application/json", "Cache-Control": "no-store", Vary: "Origin" };

// ---------- Telefone (espelha src/pages/whatsapp-pro/lookup.ts) ----------
export function normalizePhone(raw: unknown): string | null {
  if (typeof raw !== "string") return null;
  const t = raw.trim();
  if (!t || t.length > 40) return null;
  let d = t.replace(/[\s\-.()/\u00A0]/g, "");
  if (d.startsWith("+")) d = d.slice(1);
  else if (d.startsWith("00")) d = d.slice(2);
  else if (/^[239]\d{8}$/.test(d)) d = `351${d}`;
  else return null;
  if (!/^[1-9]\d{7,14}$/.test(d)) return null;
  if (d.startsWith("351") && !/^351[239]\d{8}$/.test(d)) return null;
  return `+${d}`;
}

export function phoneVariants(raw: unknown): string[] {
  const e164 = normalizePhone(raw);
  if (!e164) return [];
  const d = e164.slice(1);
  const v = [e164, `00${d}`, d];
  if (/^351[239]\d{8}$/.test(d)) v.push(d.slice(3));
  return v;
}

// ---------- Pedido ----------
export type ParsedRequest =
  | { ok: true; action: "workspaces" }
  | { ok: true; action: "lookup"; workspaceId: string; variants: string[] }
  | { ok: false; status: number; error: string };

export function parseBody(text: string): ParsedRequest {
  if (new TextEncoder().encode(text).length > MAX_BODY_BYTES) return { ok: false, status: 413, error: "payload_too_large" };
  let body: unknown;
  try { body = JSON.parse(text); } catch { return { ok: false, status: 422, error: "invalid_json" }; }
  if (!body || typeof body !== "object" || Array.isArray(body)) return { ok: false, status: 422, error: "invalid_body" };
  const b = body as Record<string, unknown>;
  const keys = Object.keys(b);
  if (b.action === "workspaces") {
    return keys.length === 1 ? { ok: true, action: "workspaces" } : { ok: false, status: 422, error: "unexpected_fields" };
  }
  if (b.action === "lookup") {
    if (keys.some((k) => !["action", "workspace_id", "phone"].includes(k))) return { ok: false, status: 422, error: "unexpected_fields" };
    if (typeof b.workspace_id !== "string" || !UUID_RE.test(b.workspace_id)) return { ok: false, status: 422, error: "invalid_workspace" };
    const variants = phoneVariants(b.phone);
    if (!variants.length) return { ok: false, status: 422, error: "invalid_phone" };
    return { ok: true, action: "lookup", workspaceId: b.workspace_id.toLowerCase(), variants };
  }
  return { ok: false, status: 422, error: "invalid_action" };
}

export function bearerToken(header: string | null): string | null {
  const m = /^Bearer ([A-Za-z0-9._-]{16,8192})$/.exec(header ?? "");
  return m ? m[1] : null;
}

// ---------- Dependências injetadas (cliente com o contexto do utilizador) ----------
export interface Member { workspace_id: string; role: string; name?: string | null }
export interface Instance { supabase_url: string; status: string }
export interface Deps {
  getClaims(token: string): Promise<Record<string, unknown> | null>;
  getUserId(token: string): Promise<string | null>;
  listMemberships(userId: string, limit: number): Promise<Member[]>;
  getMembership(userId: string, workspaceId: string): Promise<Member | null>;
  getInstance(workspaceId: string): Promise<Instance | null | "error">;
  findContacts(workspaceId: string, variants: string[], limit: number): Promise<Record<string, unknown>[]>;
  findLeads(workspaceId: string, variants: string[], limit: number): Promise<Record<string, unknown>[]>;
  now(): number;
}

export interface Result { status: number; body: Record<string, unknown> }
const fail = (status: number, error: string): Result => ({ status, body: { error } });

/** Autenticação: claims verificadas + client_id exato + utilizador existente e coincidente. */
export async function authenticate(token: string, cfg: ApiConfig, deps: Deps): Promise<{ userId: string } | Result> {
  const claims = await deps.getClaims(token).catch(() => null);
  if (!claims) return fail(401, "invalid_token");
  const exp = claims.exp;
  if (typeof exp !== "number" || exp * 1000 <= deps.now()) return fail(401, "invalid_token");
  if (claims.client_id !== cfg.clientId) return fail(403, "client_not_allowed");
  if (claims.role !== "authenticated" || typeof claims.sub !== "string") return fail(401, "invalid_token");
  const userId = await deps.getUserId(token).catch(() => null);
  if (!userId || userId !== claims.sub) return fail(401, "invalid_token");
  return { userId };
}

const canRead = (role: string) => roleHasCapability(role as WorkspaceRole, "crm.read");

export async function handleAction(req: Exclude<ParsedRequest, { ok: false }>, userId: string, cfg: ApiConfig, deps: Deps): Promise<Result> {
  if (req.action === "workspaces") {
    const rows = await deps.listMemberships(userId, WORKSPACE_LIMIT);
    const workspaces = rows.filter((r) => canRead(r.role) && cfg.pilotWorkspaceIds.has(String(r.workspace_id).toLowerCase())).slice(0, WORKSPACE_LIMIT)
      .map((r) => ({ id: r.workspace_id, name: r.name ?? null, role: r.role }));
    return { status: 200, body: { workspaces } };
  }

  // lookup — workspace fora do piloto é recusado antes de qualquer leitura.
  if (!cfg.pilotWorkspaceIds.has(req.workspaceId)) return fail(403, "workspace_not_in_pilot");
  // lookup — membership explícita obrigatória (sem bypass de super admin).
  const member = await deps.getMembership(userId, req.workspaceId);
  if (!member || member.workspace_id !== req.workspaceId || !canRead(member.role)) return fail(403, "forbidden");

  const instance = await deps.getInstance(req.workspaceId);
  if (instance === "error") return fail(503, "unavailable");
  if (instance) {
    if (instance.status === "suspended" || instance.status === "inactive") return fail(403, "workspace_suspended");
    if (instance.supabase_url.replace(/\/+$/, "") !== cfg.supabaseUrl.replace(/\/+$/, "")) return fail(409, "workspace_instance_unsupported");
  }

  const [contacts, leads] = await Promise.all([
    deps.findContacts(req.workspaceId, req.variants, RESULT_LIMIT),
    deps.findLeads(req.workspaceId, req.variants, RESULT_LIMIT),
  ]);
  const own = (r: Record<string, unknown>) => r.workspace_id === req.workspaceId;
  return {
    status: 200,
    body: {
      workspace_id: req.workspaceId,
      contacts: contacts.filter(own).slice(0, RESULT_LIMIT).map((r) => ({
        id: r.id, workspace_id: r.workspace_id, name: r.name ?? null, phone: r.phone ?? r.whatsapp_number ?? null, company: r.company ?? null,
      })),
      leads: leads.filter(own).slice(0, RESULT_LIMIT).map((r) => ({
        id: r.id, workspace_id: r.workspace_id, name: r.name ?? null, phone: r.phone ?? null, status: r.status ?? null,
      })),
      exhaustive: false,
    },
  };
}

// ---------- Rate limit simples por utilizador (por isolate; melhor esforço) ----------
export function createRateLimiter(max = 30, windowMs = 60_000) {
  const hits = new Map<string, number[]>();
  return (key: string, now: number) => {
    const list = (hits.get(key) ?? []).filter((t) => now - t < windowMs);
    if (list.length >= max) { hits.set(key, list); return false; }
    list.push(now);
    hits.set(key, list);
    if (hits.size > 5000) hits.clear();
    return true;
  };
}
