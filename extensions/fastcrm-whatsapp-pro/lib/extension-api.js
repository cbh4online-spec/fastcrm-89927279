/**
 * Cliente da API de leitura (só usado no service worker).
 * Endpoint fixo, POST JSON, sem cookies, sem redirects, timeout. Respostas reduzidas a campos allowlisted.
 */
import { API_ENDPOINT, API_TIMEOUT_MS, API_REQUIRES_PUBLIC_KEY, PUBLIC_API_KEY, isLookupReady } from "./oauth-config.js";
import { normalizePhone } from "./phone.js";
import { UUID_RE } from "./urls.js";

export const MAX_RESULTS = 10;
export const MAX_WORKSPACES = 50;

const STATUS_ERRORS = { 401: "sessao_expirada", 403: "acesso_negado", 409: "instancia_nao_suportada", 429: "limite_excedido", 503: "servico_desativado" };

export function mapHttpError(status) {
  return STATUS_ERRORS[status] ?? "erro_servico";
}

const str = (v, max) => (typeof v === "string" ? v.slice(0, max) : null);
const uuid = (v) => (typeof v === "string" && UUID_RE.test(v) ? v.toLowerCase() : null);

export function sanitizeWorkspaces(body) {
  if (!body || !Array.isArray(body.workspaces)) return null;
  const out = [];
  for (const w of body.workspaces.slice(0, MAX_WORKSPACES)) {
    const id = uuid(w?.id);
    if (!id) continue;
    out.push({ id, name: str(w.name, 120) || "Workspace sem nome", role: str(w.role, 30) });
  }
  return out;
}

export function sanitizeLookup(body, workspaceId) {
  if (!body || uuid(body.workspace_id) !== workspaceId || !Array.isArray(body.contacts) || !Array.isArray(body.leads)) return null;
  const pick = (rows, extra) => rows.filter((r) => uuid(r?.workspace_id) === workspaceId && uuid(r?.id)).slice(0, MAX_RESULTS)
    .map((r) => ({ id: uuid(r.id), name: str(r.name, 120) || "Sem nome", phone: str(r.phone, 40), [extra]: str(r[extra], 120) }));
  return { contacts: pick(body.contacts, "company"), leads: pick(body.leads, "status") };
}

export function createExtensionApi({ fetchImpl = fetch, getToken, ready = () => isLookupReady() }) {
  async function call(payload) {
    if (!ready()) return { ok: false, error: "api_nao_configurada" };
    const token = await getToken();
    if (!token) return { ok: false, error: "desligado" };
    const headers = { "Content-Type": "application/json", Authorization: `Bearer ${token}` };
    if (API_REQUIRES_PUBLIC_KEY) headers.apikey = PUBLIC_API_KEY;
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), API_TIMEOUT_MS);
    try {
      const res = await fetchImpl(API_ENDPOINT, {
        method: "POST", headers, body: JSON.stringify(payload), signal: controller.signal,
        credentials: "omit", redirect: "error", cache: "no-store",
      });
      if (!res.ok) return { ok: false, error: mapHttpError(res.status), httpStatus: res.status };
      return { ok: true, body: await res.json() };
    } catch {
      return { ok: false, error: "rede_indisponivel" };
    } finally {
      clearTimeout(timer);
    }
  }

  async function listWorkspaces() {
    const r = await call({ action: "workspaces" });
    if (!r.ok) return r;
    const workspaces = sanitizeWorkspaces(r.body);
    return workspaces ? { ok: true, workspaces } : { ok: false, error: "resposta_invalida" };
  }

  async function lookup(workspaceId, phone, allowedIds) {
    const ws = uuid(workspaceId);
    if (!ws || !allowedIds.has(ws)) return { ok: false, error: "workspace_invalido" };
    if (typeof phone !== "string" || phone.length > 40) return { ok: false, error: "telefone_invalido" };
    const n = normalizePhone(phone);
    if (!n.ok) return { ok: false, error: "telefone_invalido" };
    const r = await call({ action: "lookup", workspace_id: ws, phone: n.e164 });
    if (!r.ok) return r;
    const results = sanitizeLookup(r.body, ws);
    return results ? { ok: true, ...results } : { ok: false, error: "resposta_invalida" };
  }

  return { listWorkspaces, lookup };
}
