/**
 * fastcrm-whatsapp-extension-api — INATIVA por omissão (503) até configuração admin.
 * Ver docs/fastcrm-whatsapp-pro/V0.4B-API-LEITURA.md.
 * Todas as leituras usam o token OAuth do utilizador (RLS aplica-se). Sem service_role.
 */
import { createClient } from "npm:@supabase/supabase-js@2";
import {
  BASE_HEADERS, REQUEST_TIMEOUT_MS, authenticate, bearerToken, corsHeaders, createRateLimiter,
  handleAction, parseBody, readConfig, type Deps,
} from "./core.ts";

const allow = createRateLimiter();

function json(status: number, body: unknown, extra: Record<string, string> = {}) {
  return new Response(JSON.stringify(body), { status, headers: { ...BASE_HEADERS, ...extra } });
}

function buildDeps(url: string, anonKey: string, token: string): Deps {
  const db = createClient(url, anonKey, {
    global: { headers: { Authorization: `Bearer ${token}` } },
    auth: { persistSession: false, autoRefreshToken: false },
  });
  return {
    async getClaims(t) {
      const { data, error } = await db.auth.getClaims(t);
      return error || !data?.claims ? null : (data.claims as Record<string, unknown>);
    },
    async getUserId(t) {
      const { data, error } = await db.auth.getUser(t);
      return error ? null : data.user?.id ?? null;
    },
    async listMemberships(userId, limit) {
      const { data, error } = await db.from("workspace_members")
        .select("workspace_id, role, workspaces(name)").eq("user_id", userId).limit(limit);
      if (error) throw new Error("db");
      // deno-lint-ignore no-explicit-any
      return (data ?? []).map((r: any) => ({ workspace_id: r.workspace_id, role: r.role, name: r.workspaces?.name ?? null }));
    },
    async getMembership(userId, workspaceId) {
      const { data, error } = await db.from("workspace_members").select("workspace_id, role")
        .eq("user_id", userId).eq("workspace_id", workspaceId).limit(1).maybeSingle();
      if (error) throw new Error("db");
      return data;
    },
    async getInstance(workspaceId) {
      const { data, error } = await db.from("workspace_instances").select("supabase_url, status")
        .eq("workspace_id", workspaceId).order("created_at", { ascending: false }).limit(1).maybeSingle();
      return error ? "error" : data;
    },
    async findContacts(workspaceId, variants, limit) {
      const values = variants.join(",");
      const { data, error } = await db.from("contacts").select("id, workspace_id, name, phone, whatsapp_number, company")
        .eq("workspace_id", workspaceId).is("deleted_at", null).is("archived_at", null)
        .or(`phone.in.(${values}),whatsapp_number.in.(${values})`).order("id").limit(limit);
      if (error) throw new Error("db");
      return data ?? [];
    },
    async findLeads(workspaceId, variants, limit) {
      const { data, error } = await db.from("leads").select("id, workspace_id, name, phone, status")
        .eq("workspace_id", workspaceId).is("archived_at", null).in("phone", variants).order("id").limit(limit);
      if (error) throw new Error("db");
      return data ?? [];
    },
    now: () => Date.now(),
  };
}

async function handle(req: Request): Promise<Response> {
  const cfg = readConfig((k) => Deno.env.get(k));
  if (!cfg) return json(503, { error: "disabled" });

  const origin = req.headers.get("Origin");
  if (origin !== cfg.allowedOrigin) return json(403, { error: "origin_not_allowed" });
  const cors = corsHeaders(origin);
  if (req.method === "OPTIONS") return new Response(null, { status: 204, headers: { ...cors, "Cache-Control": "no-store" } });
  if (req.method !== "POST") return json(405, { error: "method_not_allowed" }, cors);
  if (!(req.headers.get("Content-Type") ?? "").toLowerCase().startsWith("application/json")) return json(415, { error: "unsupported_media_type" }, cors);

  const token = bearerToken(req.headers.get("Authorization"));
  if (!token) return json(401, { error: "invalid_token" }, cors);

  const text = await req.text();
  const parsed = parseBody(text);
  if (!parsed.ok) return json(parsed.status, { error: parsed.error }, cors);

  const deps = buildDeps(cfg.supabaseUrl, cfg.anonKey, token);
  const auth = await authenticate(token, cfg, deps);
  if ("status" in auth) return json(auth.status, auth.body, cors);
  if (!allow(auth.userId, Date.now())) return json(429, { error: "rate_limited" }, cors);

  const result = await handleAction(parsed, auth.userId, cfg, deps);
  return json(result.status, result.body, cors);
}

Deno.serve(async (req) => {
  let timer: number | undefined;
  try {
    return await Promise.race([
      handle(req),
      new Promise<Response>((resolve) => { timer = setTimeout(() => resolve(json(504, { error: "timeout" })), REQUEST_TIMEOUT_MS); }),
    ]);
  } catch {
    return json(500, { error: "internal_error" });
  } finally {
    clearTimeout(timer);
  }
});
